"""
Reparse all cached PDF menus from data/raw/menu_pdfs/ (restoclub + afisha).

NO network requests — only parses already-downloaded PDFs.
Deletes existing pdf-% dishes first (clean slate), then re-parses and inserts.
Finally runs menu_cleanup to standardize categories.

Usage:
    python scripts/reparse_cached_pdfs.py
"""
import os
import sys
import sqlite3
import threading
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

# Windows UTF-8 stdout fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tqdm import tqdm

PDF_CACHE_DIR = PROJECT_ROOT / "data" / "raw" / "menu_pdfs"

# Max file size to parse (larger PDFs are usually image-scans, very slow)
MAX_PDF_SIZE = 50 * 1024 * 1024  # 50 MB — parse everything reasonable
# Number of parallel workers
NUM_WORKERS = 6


def collect_cached_pdfs() -> list[tuple[Path, str]]:
    """Collect all cached PDF files from restoclub/ and afisha/ subdirs."""
    results = []
    for subdir, source_label in [("restoclub", "pdf-restoclub"), ("afisha", "pdf-afisha")]:
        d = PDF_CACHE_DIR / subdir
        if not d.exists():
            print(f"  [!] Directory not found: {d}")
            continue
        for f in sorted(d.iterdir()):
            if f.is_file():
                results.append((f, source_label))
    return results


def extract_restaurant_id(filename: str) -> int | None:
    """Extract restaurant_id from filename like '100009_27f1a6c1_..._pdf'."""
    parts = filename.split("_", 1)
    if not parts:
        return None
    try:
        return int(parts[0])
    except ValueError:
        return None


def get_valid_restaurant_ids(conn: sqlite3.Connection) -> set[int]:
    """Load all valid (non-duplicate) restaurant IDs from DB."""
    rows = conn.execute(
        "SELECT id FROM restaurants WHERE is_duplicate = 0"
    ).fetchall()
    return {row[0] for row in rows}


def parse_single_pdf(pdf_path_str: str) -> tuple[list[dict], dict]:
    """Parse a single PDF in a worker process. Returns (dishes, metadata)."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from enrichment.menu_extractor import _parse_pdf_menu

    pdf_path = Path(pdf_path_str)
    dishes, metadata = _parse_pdf_menu(pdf_path)
    return dishes if dishes else [], metadata


def main():
    print("=" * 60)
    print("  REPARSE CACHED PDFs — local only, no network")
    print("=" * 60)

    from utils.db import get_connection
    from enrichment.menu_extractor import _insert_dish
    from enrichment.menu_cleanup import run as run_cleanup

    conn = get_connection()

    # Ensure index exists
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_dishes_restid_source
        ON dishes(restaurant_id, source)
    """)
    conn.commit()

    # Step 0: Load valid restaurant IDs
    valid_ids = get_valid_restaurant_ids(conn)
    print(f"\nValid restaurant IDs in DB: {len(valid_ids):,}")

    # Step 1: Collect cached PDFs
    print("\nCollecting cached PDFs...")
    all_pdfs = collect_cached_pdfs()
    print(f"  Total cached files: {len(all_pdfs):,}")

    if not all_pdfs:
        print("No PDFs found. Exiting.")
        conn.close()
        return

    # Step 2: Delete existing pdf-% dishes (clean slate)
    old_count = conn.execute(
        "SELECT COUNT(*) FROM dishes WHERE source LIKE 'pdf-%'"
    ).fetchone()[0]
    if old_count > 0:
        conn.execute("DELETE FROM dishes WHERE source LIKE 'pdf-%'")
        conn.commit()
        print(f"\nDeleted {old_count:,} old PDF dishes (clean slate)")
    else:
        print("\nNo existing PDF dishes to delete")

    # Pre-filter: extract IDs and skip non-PDFs / invalid IDs / too large
    tasks = []  # (pdf_path_str, source_label, rest_id)
    skipped_no_id = 0
    skipped_invalid_id = 0
    skipped_not_pdf = 0
    skipped_too_large = 0
    skipped_too_small = 0

    for pdf_path, source_label in all_pdfs:
        # Skip non-PDF files (e.g. _png suffix)
        if pdf_path.name.endswith("_png") or pdf_path.name.endswith("_jpg"):
            skipped_not_pdf += 1
            continue

        fsize = pdf_path.stat().st_size
        if fsize < 500:
            skipped_too_small += 1
            continue
        if fsize > MAX_PDF_SIZE:
            skipped_too_large += 1
            continue

        rest_id = extract_restaurant_id(pdf_path.name)
        if rest_id is None:
            skipped_no_id += 1
            continue

        if rest_id not in valid_ids:
            skipped_invalid_id += 1
            continue

        tasks.append((str(pdf_path), source_label, rest_id))

    print(f"\n  Valid PDFs to parse: {len(tasks):,}")
    print(f"  Skipped (no ID): {skipped_no_id:,}")
    print(f"  Skipped (invalid ID): {skipped_invalid_id:,}")
    print(f"  Skipped (not PDF): {skipped_not_pdf:,}")
    print(f"  Skipped (too large >{MAX_PDF_SIZE//1024//1024}MB): {skipped_too_large:,}")
    print(f"  Skipped (too small): {skipped_too_small:,}")

    # Step 3: Parse PDFs in parallel
    print(f"\nParsing PDFs ({NUM_WORKERS} workers)...")
    total_pdfs_processed = 0
    total_dishes = 0
    restaurants_with_menu = set()
    ticket_restaurants = set()
    failed = 0

    # Submit all at once, collect as they complete
    with ProcessPoolExecutor(max_workers=NUM_WORKERS) as executor:
        # Submit tasks
        future_map = {}
        for pdf_path_str, source_label, rest_id in tasks:
            fut = executor.submit(parse_single_pdf, pdf_path_str)
            future_map[fut] = (pdf_path_str, source_label, rest_id)

        pbar = tqdm(total=len(tasks), desc="  PDFs", unit="pdf")

        for fut in as_completed(future_map):
            pdf_path_str, source_label, rest_id = future_map[fut]
            try:
                dishes, metadata = fut.result(timeout=120)
                total_pdfs_processed += 1

                # Skip ticket/entrance-fee restaurants
                if metadata.get("is_ticket_menu"):
                    ticket_restaurants.add(rest_id)
                    pbar.update(1)
                    continue

                if dishes:
                    for d in dishes:
                        _insert_dish(
                            conn, rest_id, d["name"], d.get("category"),
                            d.get("price"), weight=d.get("weight"),
                            source=source_label,
                        )
                    total_dishes += len(dishes)
                    restaurants_with_menu.add(rest_id)

            except Exception as e:
                failed += 1
                if failed <= 10:
                    fname = Path(pdf_path_str).name
                    tqdm.write(f"  [ERROR] {fname}: {type(e).__name__}: {e}")

            pbar.update(1)

            # Commit periodically
            if pbar.n % 200 == 0:
                conn.commit()

        pbar.close()

    conn.commit()

    # Step 4: Print stats before cleanup
    print("\n" + "=" * 60)
    print("  PDF REPARSE RESULTS (before cleanup)")
    print("=" * 60)
    print(f"  PDFs processed:         {total_pdfs_processed:,}")
    print(f"  Dishes extracted:       {total_dishes:,}")
    print(f"  Restaurants with menu:  {len(restaurants_with_menu):,}")
    print(f"  Ticket restaurants:     {len(ticket_restaurants):,}")
    print(f"  Failed to parse:        {failed:,}")
    print(f"  Skipped (no ID):        {skipped_no_id:,}")
    print(f"  Skipped (invalid ID):   {skipped_invalid_id:,}")
    print(f"  Skipped (not PDF):      {skipped_not_pdf:,}")
    print(f"  Skipped (too large):    {skipped_too_large:,}")
    if ticket_restaurants:
        print(f"  Ticket restaurant IDs:  {sorted(ticket_restaurants)[:30]}{'...' if len(ticket_restaurants) > 30 else ''}")

    conn.close()

    # Step 5: Run menu_cleanup to standardize categories
    print("\n" + "=" * 60)
    print("  Running menu_cleanup...")
    print("=" * 60)
    run_cleanup()

    print("\nDone!")


if __name__ == "__main__":
    main()
