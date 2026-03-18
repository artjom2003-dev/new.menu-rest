"""
Извлечение меню и описаний из кешированных HTML страниц afisha.ru и restoclub.ru.

Шаг 1: JSON-меню из restoclub (placeChosenMenu + placePhotoMenu)
Шаг 2: PDF-меню из restoclub и afisha (скачивание + парсинг через pdfplumber)
Шаг 3: Обновление описаний (полные тексты вместо обрезанных og:description)

Запуск:
    python -m enrichment.menu_extractor                  # всё
    python -m enrichment.menu_extractor --step json      # только JSON-меню restoclub
    python -m enrichment.menu_extractor --step pdf       # только PDF-меню
    python -m enrichment.menu_extractor --step desc      # только описания
"""
import argparse
import json
import re
import sqlite3
import time
import random
from pathlib import Path
from html import unescape

from tqdm import tqdm

from utils.db import get_connection
from config.settings import PROCESSED_DIR, REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, USER_AGENT

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
AFISHA_DIR = RAW_DIR / "afisha"
RESTOCLUB_DIR = RAW_DIR / "restoclub"
PDF_CACHE_DIR = RAW_DIR / "menu_pdfs"


# ─── Утилиты ────────────────────────────────────────────────────────────────

def _extract_next_data(html: str) -> dict | None:
    """Извлечь __NEXT_DATA__ JSON из HTML."""
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html, re.DOTALL,
    )
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _find_restaurant_id(conn: sqlite3.Connection, source: str,
                         source_id: str) -> int | None:
    """Найти restaurant_id в pipeline.db по source + source_id."""
    row = conn.execute(
        "SELECT id FROM restaurants WHERE source = ? AND source_id = ? AND is_duplicate = 0",
        (source, source_id),
    ).fetchone()
    return row[0] if row else None


def _find_restaurant_by_merge(conn: sqlite3.Connection, source: str,
                               source_id: str) -> int | None:
    """Найти restaurant_id, учитывая merged_into_id (дубликат → основная запись)."""
    # Сначала ищем напрямую (не дубликат)
    rid = _find_restaurant_id(conn, source, source_id)
    if rid:
        return rid
    # Если помечен дубликатом — берём merged_into_id
    row = conn.execute(
        "SELECT merged_into_id FROM restaurants WHERE source = ? AND source_id = ? AND is_duplicate = 1",
        (source, source_id),
    ).fetchone()
    return row[0] if row and row[0] else None


# ─── Шаг 1: JSON-меню из Restoclub ──────────────────────────────────────────

def extract_restoclub_menus(conn: sqlite3.Connection):
    """Извлечь блюда из placeChosenMenu и placePhotoMenu в кеше restoclub."""
    print("\n" + "=" * 60)
    print("  RESTOCLUB: извлечение JSON-меню из кеша")
    print("=" * 60)

    cities = [d.name for d in RESTOCLUB_DIR.iterdir() if d.is_dir()]
    if not cities:
        print("[!] Кеш restoclub пуст")
        return

    total_dishes = 0
    total_restaurants = 0
    skipped_no_match = 0

    for city in sorted(cities):
        city_dir = RESTOCLUB_DIR / city
        files = list(city_dir.glob("*.html"))
        if not files:
            continue

        print(f"\n[{city}] {len(files)} файлов...")

        for f in tqdm(files, desc=f"  {city}", unit="file"):
            html = f.read_text(encoding="utf-8", errors="replace")
            nd = _extract_next_data(html)
            if not nd:
                continue

            resp = (nd.get("props", {}).get("pageProps", {})
                    .get("response", {}).get("data", {}))
            place = resp.get("place", {})
            slug = place.get("slug", f.stem)

            source_id = f"restoclub:{city}/{slug}"
            rest_id = _find_restaurant_by_merge(conn, "restoclub", source_id)
            if not rest_id:
                skipped_no_match += 1
                continue

            # Уже есть блюда для этого ресторана?
            existing = conn.execute(
                "SELECT COUNT(*) FROM dishes WHERE restaurant_id = ? AND source = 'restoclub'",
                (rest_id,),
            ).fetchone()[0]
            if existing > 0:
                continue

            pm = resp.get("placeMenu", {})
            dishes_added = 0

            # 1) placeChosenMenu — категории с блюдами
            chosen = pm.get("placeChosenMenu", [])
            for cat_obj in chosen:
                category = cat_obj.get("category", "")
                items = cat_obj.get("items", [])
                for item in items:
                    name = (item.get("name") or "").strip()
                    if not name:
                        continue
                    price = item.get("price")
                    _insert_dish(conn, rest_id, name, category, price,
                                 source="restoclub")
                    dishes_added += 1

            # 2) placePhotoMenu — блюда с фото (более подробные)
            photo_menu = resp.get("placePhotoMenu")
            if photo_menu and isinstance(photo_menu, list):
                for item in photo_menu:
                    name = (item.get("name") or "").strip()
                    if not name:
                        continue
                    price = item.get("price")
                    photo = None
                    media = item.get("media", {})
                    if isinstance(media, dict):
                        cover = media.get("cover", {})
                        if isinstance(cover, dict):
                            photo = cover.get("webp") or cover.get("jpg")
                    category_id = item.get("categoryId")
                    badge = item.get("badge", "")
                    _insert_dish(conn, rest_id, name, None, price,
                                 photo_url=photo, source="restoclub-photo")
                    dishes_added += 1

            if dishes_added > 0:
                total_dishes += dishes_added
                total_restaurants += 1

        conn.commit()

    print(f"\n[done] Restoclub JSON-меню:")
    print(f"  Ресторанов с меню: {total_restaurants:,}")
    print(f"  Блюд добавлено: {total_dishes:,}")
    print(f"  Не найдено в БД: {skipped_no_match:,}")


def _insert_dish(conn: sqlite3.Connection, rest_id: int, name: str,
                 category: str | None, price: float | None,
                 description: str | None = None,
                 composition: str | None = None,
                 weight: str | None = None,
                 photo_url: str | None = None,
                 source: str = "restoclub"):
    """Вставить блюдо, игнорируя дубликаты (name+restaurant_id+source)."""
    for _attempt in range(5):
        try:
            conn.execute("""
                INSERT INTO dishes (restaurant_id, name, category, price,
                                    description, composition, weight, photo_url, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rest_id, name, category, price,
                  description, composition, weight, photo_url, source))
            return
        except sqlite3.IntegrityError:
            return
        except sqlite3.OperationalError:
            time.sleep(2 * (_attempt + 1))


# ─── Шаг 2: PDF-меню ────────────────────────────────────────────────────────

def _download_pdf(session, url: str, cache_path: Path) -> Path | None:
    """Скачать PDF в кеш, вернуть путь."""
    if cache_path.exists() and cache_path.stat().st_size > 100:
        return cache_path

    try:
        resp = session.get(url, timeout=30)
        if resp.status_code != 200:
            return None
        if len(resp.content) < 500:  # слишком маленький — не PDF
            return None
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(resp.content)
        time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
        return cache_path
    except Exception:
        return None


def _parse_pdf_menu(pdf_path: Path) -> list[dict]:
    """Парсинг PDF-меню через pdfplumber → список блюд."""
    try:
        import pdfplumber
    except ImportError:
        print("[!] pdfplumber не установлен: pip install pdfplumber")
        return []

    dishes = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            current_category = None
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    # Попробуем извлечь из таблиц
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if not row:
                                continue
                            cells = [c.strip() if c else "" for c in row]
                            dish = _parse_menu_row(cells, current_category)
                            if dish:
                                if dish.get("is_category"):
                                    current_category = dish["name"]
                                else:
                                    dishes.append(dish)
                    continue

                lines = text.split("\n")
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    parsed = _parse_menu_line(line, current_category)
                    if parsed:
                        if parsed.get("is_category"):
                            current_category = parsed["name"]
                        else:
                            dishes.append(parsed)
    except Exception:
        return []

    return dishes


def _parse_menu_line(line: str, current_category: str | None) -> dict | None:
    """Парсинг одной строки меню."""
    line = line.strip()
    if not line or len(line) < 3:
        return None

    # Пропускаем служебные строки
    skip_patterns = [
        r"^\d+$",  # просто числа
        r"^стр\.?\s*\d+",  # номера страниц
        r"^www\.", r"^http",  # URL
        r"^тел[\.:]\s", r"^\+7",  # телефоны
        r"^меню$", r"^menu$",
    ]
    for pat in skip_patterns:
        if re.match(pat, line, re.IGNORECASE):
            return None

    # Попытка извлечь цену в конце строки
    # Форматы: "Борщ 450", "Борщ ....... 450", "Борщ / 250г 450₽", "Борщ 1 200"
    price_match = re.search(
        r'[\s.…_/]{2,}(\d[\d\s]*\d)\s*[₽руб.р]*\s*$|'
        r'\s+(\d{2,6})\s*[₽руб.р]*\s*$',
        line,
    )

    if price_match:
        price_str = (price_match.group(1) or price_match.group(2) or "").replace(" ", "")
        try:
            price = float(price_str)
        except ValueError:
            price = None
        name = line[:price_match.start()].strip().rstrip(".")
        if name and len(name) >= 2 and price and 10 <= price <= 100000:
            # Вес в скобках или через /
            weight = None
            w_match = re.search(r'[/(\s](\d{1,4}\s*(?:г|мл|гр|ml|g))\s*[)/]?', name)
            if w_match:
                weight = w_match.group(1)
                name = name[:w_match.start()].strip()

            return {
                "name": name,
                "price": price,
                "category": current_category,
                "weight": weight,
            }

    # Строка может быть категорией (заглавные, короткая, без цены)
    if (len(line) < 40 and line == line.upper() and
            not any(c.isdigit() for c in line)):
        return {"name": line.title(), "is_category": True}

    # Или категория в формате "=== САЛАТЫ ===" или "--- Горячее ---"
    cat_match = re.match(r'^[=\-–—\s*#]+(.+?)[=\-–—\s*#]+$', line)
    if cat_match and len(cat_match.group(1)) < 40:
        return {"name": cat_match.group(1).strip(), "is_category": True}

    return None


def _parse_menu_row(cells: list[str], current_category: str | None) -> dict | None:
    """Парсинг строки таблицы из PDF."""
    if not cells or all(not c for c in cells):
        return None

    # Типичные форматы таблиц: [name, weight, price] или [name, price]
    name = cells[0].strip() if cells[0] else ""
    if not name or len(name) < 2:
        return None

    price = None
    weight = None
    for cell in reversed(cells[1:]):
        if not cell:
            continue
        cell = cell.strip().replace(" ", "")
        # Цена
        if re.match(r'^\d{2,6}$', cell):
            p = float(cell)
            if 10 <= p <= 100000:
                price = p
                continue
        # Вес
        if re.match(r'^\d{1,4}\s*(?:г|мл|гр)$', cell, re.IGNORECASE):
            weight = cell
            continue

    if price:
        return {
            "name": name,
            "price": price,
            "weight": weight,
            "category": current_category,
        }
    return None


def extract_pdf_menus(conn: sqlite3.Connection):
    """Скачать и распарсить PDF-меню из restoclub и afisha."""
    print("\n" + "=" * 60)
    print("  PDF-МЕНЮ: скачивание и парсинг")
    print("=" * 60)

    import requests
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/pdf,*/*",
    })

    total_pdfs = 0
    total_dishes = 0
    total_restaurants = 0
    failed = 0

    # --- Restoclub PDFs ---
    print("\n[Restoclub PDFs]")
    rc_pdfs = _collect_restoclub_pdf_urls(conn)
    print(f"  Найдено {len(rc_pdfs)} PDF-ссылок")

    for info in tqdm(rc_pdfs, desc="  RC PDFs", unit="pdf"):
        rest_id = info["rest_id"]
        pdf_url = info["url"]
        pdf_name = info["name"]

        # Уже есть блюда из PDF?
        existing = conn.execute(
            "SELECT COUNT(*) FROM dishes WHERE restaurant_id = ? AND source LIKE 'pdf-%'",
            (rest_id,),
        ).fetchone()[0]
        if existing > 0:
            continue

        # Кеш-путь
        pdf_hash = re.sub(r'[^\w]', '_', pdf_url.split("/")[-1])
        cache_path = PDF_CACHE_DIR / "restoclub" / f"{rest_id}_{pdf_hash}"

        pdf_path = _download_pdf(session, pdf_url, cache_path)
        if not pdf_path:
            failed += 1
            continue

        dishes = _parse_pdf_menu(pdf_path)
        if dishes:
            for d in dishes:
                _insert_dish(
                    conn, rest_id, d["name"], d.get("category"),
                    d.get("price"), weight=d.get("weight"),
                    source=f"pdf-restoclub",
                )
            total_dishes += len(dishes)
            total_restaurants += 1
        total_pdfs += 1

        if total_pdfs % 50 == 0:
            conn.commit()

    conn.commit()

    # --- Afisha PDFs ---
    print("\n[Afisha PDFs]")
    af_pdfs = _collect_afisha_pdf_urls(conn)
    print(f"  Найдено {len(af_pdfs)} PDF-ссылок")

    for info in tqdm(af_pdfs, desc="  AF PDFs", unit="pdf"):
        rest_id = info["rest_id"]
        pdf_url = info["url"]

        existing = conn.execute(
            "SELECT COUNT(*) FROM dishes WHERE restaurant_id = ? AND source LIKE 'pdf-%'",
            (rest_id,),
        ).fetchone()[0]
        if existing > 0:
            continue

        pdf_hash = re.sub(r'[^\w]', '_', pdf_url.split("/")[-1])
        cache_path = PDF_CACHE_DIR / "afisha" / f"{rest_id}_{pdf_hash}"

        pdf_path = _download_pdf(session, pdf_url, cache_path)
        if not pdf_path:
            failed += 1
            continue

        dishes = _parse_pdf_menu(pdf_path)
        if dishes:
            for d in dishes:
                _insert_dish(
                    conn, rest_id, d["name"], d.get("category"),
                    d.get("price"), weight=d.get("weight"),
                    source="pdf-afisha",
                )
            total_dishes += len(dishes)
            total_restaurants += 1
        total_pdfs += 1

        if total_pdfs % 50 == 0:
            conn.commit()

    conn.commit()

    print(f"\n[done] PDF-меню:")
    print(f"  PDF скачано: {total_pdfs:,}")
    print(f"  Ресторанов с блюдами: {total_restaurants:,}")
    print(f"  Блюд добавлено: {total_dishes:,}")
    print(f"  Ошибок скачивания: {failed:,}")


def _collect_restoclub_pdf_urls(conn: sqlite3.Connection) -> list[dict]:
    """Собрать PDF-ссылки из кеша restoclub."""
    results = []
    cities = [d.name for d in RESTOCLUB_DIR.iterdir() if d.is_dir()]

    for city in sorted(cities):
        city_dir = RESTOCLUB_DIR / city
        for f in city_dir.glob("*.html"):
            html = f.read_text(encoding="utf-8", errors="replace")
            nd = _extract_next_data(html)
            if not nd:
                continue

            resp = (nd.get("props", {}).get("pageProps", {})
                    .get("response", {}).get("data", {}))
            place = resp.get("place", {})
            slug = place.get("slug", f.stem)

            source_id = f"restoclub:{city}/{slug}"
            rest_id = _find_restaurant_by_merge(conn, "restoclub", source_id)
            if not rest_id:
                continue

            pm = resp.get("placeMenu", {})
            menu_files = pm.get("placeMenuFile", [])
            for mf in menu_files:
                url = mf.get("url", "")
                if not url:
                    continue
                if url.startswith("/"):
                    url = f"https://www.restoclub.ru{url}"
                results.append({
                    "rest_id": rest_id,
                    "url": url,
                    "name": mf.get("name", ""),
                })

    return results


def _collect_afisha_pdf_urls(conn: sqlite3.Connection) -> list[dict]:
    """Собрать PDF-ссылки из кеша afisha."""
    results = []

    # Шаблонные PDF которые встречаются на каждой странице — пропускаем
    template_pdfs = set()

    for city_dir in AFISHA_DIR.iterdir():
        if not city_dir.is_dir():
            continue
        city = city_dir.name

        # Первый проход: собираем частоту URL для фильтрации шаблонов
        url_counts: dict[str, int] = {}
        file_data: list[tuple[Path, list[dict]]] = []

        for f in city_dir.glob("*.html"):
            html = f.read_text(encoding="utf-8", errors="replace")
            nd = _extract_next_data(html)
            if not nd:
                continue
            d = nd.get("props", {}).get("pageProps", {}).get("data", {})
            menu = d.get("menu")
            if not menu or not isinstance(menu, list):
                continue

            for item in menu:
                href = item.get("href", "")
                if href and href.endswith(".pdf"):
                    url_counts[href] = url_counts.get(href, 0) + 1

            file_data.append((f, menu))

        # URL встречающийся >50 раз — шаблонный
        for url, cnt in url_counts.items():
            if cnt > 50:
                template_pdfs.add(url)

        # Второй проход: собираем уникальные PDF
        for f, menu in file_data:
            slug = f.stem
            source_id = f"afisha:{city}/{slug}"
            rest_id = _find_restaurant_by_merge(conn, "afisha", source_id)
            if not rest_id:
                continue

            for item in menu:
                href = item.get("href", "")
                if href and href.endswith(".pdf") and href not in template_pdfs:
                    results.append({
                        "rest_id": rest_id,
                        "url": href,
                        "name": item.get("title", ""),
                    })

    print(f"  (Шаблонных PDF отфильтровано: {len(template_pdfs)})")
    return results


# ─── Шаг 3: Обновление описаний ─────────────────────────────────────────────

def update_descriptions(conn: sqlite3.Connection):
    """Обновить описания ресторанов из кеша (полные тексты)."""
    print("\n" + "=" * 60)
    print("  ОПИСАНИЯ: извлечение полных текстов")
    print("=" * 60)

    updated_rc = _update_restoclub_descriptions(conn)
    updated_af = _update_afisha_descriptions(conn)

    print(f"\n[done] Описания обновлены:")
    print(f"  Restoclub: {updated_rc:,}")
    print(f"  Afisha: {updated_af:,}")


def _update_restoclub_descriptions(conn: sqlite3.Connection) -> int:
    """Обновить описания из кеша restoclub."""
    print("\n[Restoclub описания]")
    updated = 0
    cities = [d.name for d in RESTOCLUB_DIR.iterdir() if d.is_dir()]

    for city in sorted(cities):
        city_dir = RESTOCLUB_DIR / city
        files = list(city_dir.glob("*.html"))
        if not files:
            continue

        for f in tqdm(files, desc=f"  {city}", unit="file"):
            html = f.read_text(encoding="utf-8", errors="replace")
            nd = _extract_next_data(html)
            if not nd:
                continue

            resp = (nd.get("props", {}).get("pageProps", {})
                    .get("response", {}).get("data", {}))
            place = resp.get("place", {})
            slug = place.get("slug", f.stem)
            new_desc = (place.get("description") or "").strip()

            if not new_desc or len(new_desc) < 30:
                continue

            source_id = f"restoclub:{city}/{slug}"
            rest_id = _find_restaurant_by_merge(conn, "restoclub", source_id)
            if not rest_id:
                continue

            # Обновляем только если текущее описание короче
            cur_desc = conn.execute(
                "SELECT description FROM restaurants WHERE id = ?", (rest_id,)
            ).fetchone()
            cur_len = len(cur_desc[0]) if cur_desc and cur_desc[0] else 0

            if len(new_desc) > cur_len:
                conn.execute(
                    "UPDATE restaurants SET description = ? WHERE id = ?",
                    (new_desc, rest_id),
                )
                updated += 1

        conn.commit()

    return updated


def _update_afisha_descriptions(conn: sqlite3.Connection) -> int:
    """Обновить описания из кеша afisha."""
    print("\n[Afisha описания]")
    updated = 0

    for city_dir in AFISHA_DIR.iterdir():
        if not city_dir.is_dir():
            continue
        city = city_dir.name
        files = list(city_dir.glob("*.html"))
        if not files:
            continue

        for f in tqdm(files, desc=f"  {city}", unit="file"):
            html = f.read_text(encoding="utf-8", errors="replace")
            nd = _extract_next_data(html)
            if not nd:
                continue

            d = nd.get("props", {}).get("pageProps", {}).get("data", {})
            desc_obj = d.get("description", {})
            if not isinstance(desc_obj, dict):
                continue

            inner = desc_obj.get("description", {})
            if not isinstance(inner, dict):
                continue

            # Предпочитаем afisha (редакционное), затем owner
            new_desc = (inner.get("afisha") or inner.get("owner") or "").strip()
            if not new_desc or len(new_desc) < 30:
                continue

            slug = f.stem
            source_id = f"afisha:{city}/{slug}"
            rest_id = _find_restaurant_by_merge(conn, "afisha", source_id)
            if not rest_id:
                continue

            cur_desc = conn.execute(
                "SELECT description FROM restaurants WHERE id = ?", (rest_id,)
            ).fetchone()
            cur_len = len(cur_desc[0]) if cur_desc and cur_desc[0] else 0

            if len(new_desc) > cur_len:
                conn.execute(
                    "UPDATE restaurants SET description = ? WHERE id = ?",
                    (new_desc, rest_id),
                )
                updated += 1

        conn.commit()

    return updated


# ─── Точка входа ─────────────────────────────────────────────────────────────

def run_menu_extraction(step: str | None = None):
    """Основная функция."""
    conn = get_connection()

    # Убедимся что есть индекс для быстрого поиска
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_dishes_restid_source
        ON dishes(restaurant_id, source)
    """)
    conn.commit()

    if step is None or step == "json":
        extract_restoclub_menus(conn)

    if step is None or step == "desc":
        update_descriptions(conn)

    if step is None or step == "pdf":
        extract_pdf_menus(conn)

    # Финальная статистика
    total_dishes = conn.execute("SELECT COUNT(*) FROM dishes").fetchone()[0]
    rest_with_dishes = conn.execute(
        "SELECT COUNT(DISTINCT restaurant_id) FROM dishes"
    ).fetchone()[0]
    print(f"\n{'='*60}")
    print(f"  ИТОГО: {total_dishes:,} блюд у {rest_with_dishes:,} ресторанов")
    print(f"{'='*60}")

    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Menu & description extractor")
    parser.add_argument("--step", choices=["json", "pdf", "desc"],
                        help="Запустить отдельный шаг")
    args = parser.parse_args()
    run_menu_extraction(args.step)


if __name__ == "__main__":
    main()
