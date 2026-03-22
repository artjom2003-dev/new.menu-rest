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

# Compiled patterns for junk detection (avoid recompiling per-call)
_JUNK_PATTERNS = [
    re.compile(r"^\d[\d\s.,]*$"),                          # pure numbers: "100", "1 200", "3,5"
    re.compile(r"^стр\.?\s*\d+", re.I),                    # page numbers
    re.compile(r"^(www\.|https?://)", re.I),                # URLs
    re.compile(r"^(тел[\.:]\s|\+7|\+\d{1,3}\s?\(|8[\s(-]\d{3})", re.I),  # phones
    re.compile(r"^(меню|menu|wine list|bar card|напитки)$", re.I),  # headers
    re.compile(r"^\d+\s*шт\.?$", re.I),                    # "1шт", "2 шт."
    re.compile(r"^(ул\.|пр\.|г\.|пер\.|наб\.|пл\.)?\s*[А-Яа-яA-Za-z]+\s+(ул|пр|д|стр|корп|офис)[\.\s]", re.I),  # addresses
    re.compile(r"^[а-яa-z\s]{0,2}$"),                       # too short (1-2 lowercase chars)
    re.compile(r"^\d{1,4}\s*(г|мл|гр|ml|g|л|кг|oz)\s*$", re.I),  # bare weight: "100 г", "1000 мл"
    re.compile(r"^(page|стр\.?|©|copyright|все права)", re.I),  # footer junk
    re.compile(r"^(входной\s+билет|депозит|вход\s+\d)", re.I),  # ticket/deposit (separate detection)
    re.compile(r"^\*{2,}"),                                 # decorative asterisks
    re.compile(r"^[-=_*.·•]{3,}$"),                        # pure separator lines
]

_TICKET_PATTERNS = [
    re.compile(r"входной\s+билет", re.I),
    re.compile(r"депозит\s+\d", re.I),
    re.compile(r"вход\s+\d+\s*(₽|руб|р\.)", re.I),
    re.compile(r"cover\s+charge", re.I),
    re.compile(r"входная\s+плата", re.I),
]

# Price pattern: handles "430.-", "1 200", "450₽", "350 р.", "1,200", "100.00"
_PRICE_RE = re.compile(
    r'[\s.…·_—–\-]{2,}(\d[\d\s]*\d)\s*[₽руб.р\-]*\s*$|'   # dots/dashes separator + price
    r'\s+(\d{1,2}[\s,]\d{3})\s*[₽руб.р\-]*\s*$|'           # "1 200" or "1,200"
    r'\s+(\d{2,6})\s*[₽руб.р\-]*\s*$',                      # simple trailing price
)

# Weight pattern: extracts "100г", "250 мл", "1л" etc from names
_WEIGHT_IN_NAME_RE = re.compile(
    r'(?:^|\s|/)(\d{1,5}\s*(?:г|мл|гр|ml|g|л|кг|oz|cl))\b\.?\s*',
    re.I,
)


def _fix_kerning(text: str) -> str:
    """Fix spaced-out kerning artifacts like 'К Р А С Н О Е' → 'КРАСНОЕ'.

    Detects sequences of single characters separated by spaces.
    Also handles doubled chars like 'Ttaaccooss' → 'Tacos'.
    """
    # Fix single-char-space sequences: "К Р А С Н О Е" → "КРАСНОЕ"
    # Match 3+ single chars separated by single spaces
    def _collapse_spaced(m):
        return m.group(0).replace(" ", "")

    text = re.sub(
        r'(?<!\S)(\S\s){2,}\S(?!\S)',  # 3+ single non-space chars with spaces between
        _collapse_spaced,
        text,
    )

    # Fix doubled characters: "Ttaaccooss" → "Tacos"
    # Only apply if most chars are doubled (heuristic: >60% of char pairs are same)
    def _fix_doubled(word):
        if len(word) < 6 or len(word) % 2 != 0:
            return word
        pairs = [(word[i], word[i + 1]) for i in range(0, len(word) - 1, 2)]
        same_pairs = sum(1 for a, b in pairs if a.lower() == b.lower())
        if same_pairs / len(pairs) >= 0.6:
            return "".join(a for a, b in pairs)
        return word

    words = text.split()
    fixed_words = [_fix_doubled(w) for w in words]
    return " ".join(fixed_words)


_BROKEN_ENCODING_RE = re.compile(r'[À-ÿ]{3,}')  # Latin chars that should be Cyrillic
_WINE_DESC_RE = re.compile(
    r'(сухое|полусухое|полусладкое|сладкое|брют).{0,30}'
    r'(Франция|Италия|Испания|Чили|Аргентина|Австралия|Германия|Австрия|'
    r'Грузия|Россия|Португалия|Новая Зеландия|ЮАР|США)|'
    r'(Франция|Италия|Испания|Чили|Аргентина|Австралия|Германия|Австрия|'
    r'Грузия|Россия|Португалия|Новая Зеландия|ЮАР|США).{0,30}'
    r'(сухое|полусухое|полусладкое|сладкое|брют)|'
    r',\s*\d{1,2}[.,]\d%',  # "14,5%" — alcohol percentage
    re.I,
)
_MERCH_RE = re.compile(
    r'^(бейсболка|кепка|футболка|худи|шоппер|стикер|магнит|значок|'
    r'подарочн\w+ (набор|серт|карт)|сертификат)',
    re.I,
)


def _is_junk_dish(name: str, price: float | None = None) -> bool:
    """Return True if name/price combination looks like junk, not a real dish."""
    if not name:
        return True

    # Too short (less than 2 real alphabetic chars)
    alpha_chars = sum(1 for c in name if c.isalpha())
    if alpha_chars < 2:
        return True

    # Check against junk patterns
    for pat in _JUNK_PATTERNS:
        if pat.search(name):
            return True

    # Price sanity — nothing real costs <50₽ or >50000₽
    if price is not None:
        if price < 50 or price > 50000:
            return True

    # Name is suspiciously long (probably a disclaimer or description paragraph)
    if len(name) > 200:
        return True

    # Fragment detection: starts with lowercase Cyrillic = word was cut mid-way by column split
    if name and '\u0430' <= name[0] <= '\u044f':
        return True

    # Broken encoding (Latin chars that should be Cyrillic: "Ýðë Ãðåé")
    if _BROKEN_ENCODING_RE.search(name):
        return True

    # Wine/alcohol description, not a dish ("Испания, сухое, 14.5%")
    if _WINE_DESC_RE.search(name):
        return True

    # Merchandise, not food
    if _MERCH_RE.search(name):
        return True

    # Multiple prices in one line = concatenated dishes, skip
    price_matches = re.findall(r'\b\d{3,5}\b', name)
    if len(price_matches) >= 3:
        return True

    # Slash-separated items with embedded prices: "блюдо 380/ блюдо 870"
    if re.search(r'\d{3,5}\s*/\s*\.?\s*\w', name):
        return True

    # Extra strict for dishes without price — must look like a real dish name
    if price is None:
        # Must have at least 3 alphabetic chars
        if alpha_chars < 3:
            return True
        # Must start with uppercase letter (Cyrillic or Latin)
        if not re.match(r'^[А-ЯA-Z«"(]', name):
            return True
        # Too long = description paragraph, not a dish
        if len(name) > 80:
            return True
        # Description-like sentences (contains verb-like patterns)
        if re.search(r'\b(это|является|предлагаем|приглашаем|добро пожаловать|'
                     r'присоединяйтесь|каждый (вечер|день)|в сердце|создан с|'
                     r'превращается|действует с|заказы на|помеченные|принимаются|'
                     r'обращаем|уважаемые|рекламным|юридически|'
                     r'богатый выбор|мы предлагаем|посещение)\b', name, re.I):
            return True
        # URL-like
        if re.search(r'\.(ru|com|org|net)\b', name, re.I):
            return True
        # Schedule/time patterns
        if re.search(r'с\s+\d{1,2}[\s:]+(до|по)\s+\d', name, re.I):
            return True
        # Wine without price = wine list description, not a dish
        if re.search(r'\b(Prosecco|Brut|Shiraz|Sauvignon|Chardonnay|Merlot|'
                     r'Cabernet|Pinot|Riesling|Champagne|Cuvée|Reserva|'
                     r'Crianza|Gran Reserva)\b', name, re.I):
            return True

    return False


def _clean_dish_name(name: str) -> tuple[str | None, str | None, float | None]:
    """Clean dish name, extract weight and embedded price.

    Returns: (cleaned_name, weight, price_from_name) or (None, None, None) if junk.
    """
    if not name:
        return None, None, None

    name = name.strip()

    # Remove trailing dots/dashes/underscores separators
    name = re.sub(r'[.…·_—–\-]{2,}\s*$', '', name).strip()
    # Remove leading dots/dashes
    name = re.sub(r'^[.…·_—–\-]{2,}\s*', '', name).strip()

    # Fix kerning
    name = _fix_kerning(name)

    # Extract weight from beginning: "110 г Мясо" → weight="110 г", name="Мясо"
    weight = None
    m = re.match(r'^(\d{1,5}\s*(?:г|мл|гр|ml|g|л|кг|oz|cl))[\s./]+(.+)', name, re.I)
    if m:
        weight = m.group(1).strip()
        name = m.group(2).strip()

    # Extract weight from end: "Мясо 110г" or "Мясо / 250г"
    if not weight:
        m = re.search(r'[\s/(](\d{1,5}\s*(?:г|мл|гр|ml|g|л|кг|oz|cl))\s*[)/]?\s*$', name, re.I)
        if m:
            weight = m.group(1).strip()
            name = name[:m.start()].strip().rstrip("/").strip()

    # Extract weight in middle: "Мясо 100г в соусе" — only if clearly weight
    if not weight:
        m = re.search(r'\b(\d{1,5}\s*(?:г|мл|гр))\b', name, re.I)
        if m:
            weight = m.group(1).strip()
            name = (name[:m.start()] + " " + name[m.end():]).strip()
            name = re.sub(r'\s{2,}', ' ', name)

    # Extract price embedded in name (e.g. after dots): "Блюдо......210"
    price_from_name = None
    m = re.search(r'[.…·]{3,}\s*(\d{2,6})\s*$', name)
    if m:
        try:
            price_from_name = float(m.group(1))
            if 10 <= price_from_name <= 50000:
                name = name[:m.start()].strip()
            else:
                price_from_name = None
        except ValueError:
            pass

    # Final cleanup
    name = re.sub(r'\s{2,}', ' ', name).strip()
    name = name.strip('.,;:!? \t-–—')

    # Validate
    if _is_junk_dish(name):
        return None, None, None

    return name, weight, price_from_name


def _detect_columns(page) -> list:
    """Detect if a page has multiple text columns.

    Uses two strategies:
    1. Word-start x0 positions — groups word beginnings into clusters
    2. Character x0 histogram — finds gaps in character distribution

    Returns list of (x0, x1) tuples for each detected column,
    or empty list if single column / not enough data.
    """
    from collections import Counter

    page_width = page.width

    # Strategy 1: Use word start positions (more reliable for two-column detection)
    try:
        words = page.extract_words()
    except Exception:
        words = []

    if words and len(words) >= 10:
        # Group words by approximate line (y position, 8pt buckets)
        lines_by_y = {}
        for w in words:
            y_key = round(w['top'] / 8) * 8
            if y_key not in lines_by_y:
                lines_by_y[y_key] = []
            lines_by_y[y_key].append(int(w['x0']))

        # For each line, find the leftmost word (column start) and detect
        # additional column starts via large gaps within the same line
        line_starts = []
        for y_key, x_positions in lines_by_y.items():
            xs = sorted(x_positions)
            line_starts.append(xs[0])  # leftmost word = likely column 1 start
            # Large gap within line suggests a second column start
            for i in range(len(xs) - 1):
                if xs[i + 1] - xs[i] > 80:
                    line_starts.append(xs[i + 1])

        if line_starts:
            # Histogram of line-start positions (20px buckets)
            start_buckets = Counter(x // 20 * 20 for x in line_starts)
            sorted_keys = sorted(start_buckets.keys())

            if len(sorted_keys) >= 2:
                # Find prominent peaks (column left-margins)
                peaks = []
                for k in sorted_keys:
                    count = start_buckets[k]
                    left_count = start_buckets.get(k - 20, 0)
                    right_count = start_buckets.get(k + 20, 0)
                    if count >= 3 and count >= left_count and count >= right_count:
                        peaks.append((k, count))

                # Merge peaks within 60px
                merged_peaks = []
                for k, c in sorted(peaks):
                    if merged_peaks and k - merged_peaks[-1][0] <= 60:
                        if c > merged_peaks[-1][1]:
                            merged_peaks[-1] = (k, c)
                    else:
                        merged_peaks.append((k, c))

                # Need at least 2 distinct peaks separated by > 100px
                if len(merged_peaks) >= 2:
                    by_count = sorted(merged_peaks, key=lambda x: -x[1])
                    top2 = sorted(by_count[:2], key=lambda x: x[0])
                    gap = top2[1][0] - top2[0][0]

                    if gap >= 100 and top2[0][1] >= 3 and top2[1][1] >= 3:
                        # Verify right "column" isn't just a price column
                        # by checking if its text is mostly numeric
                        col2_start = top2[1][0]
                        col2_words = [w for w in words
                                      if int(w['x0']) >= col2_start - 10]
                        if col2_words:
                            numeric_words = sum(
                                1 for w in col2_words
                                if re.match(r'^[\d\s.,/₽руб.р\-]+$',
                                            w['text'].strip())
                            )
                            numeric_ratio = numeric_words / len(col2_words)
                            if numeric_ratio > 0.7:
                                # Right side is just prices, not a real column
                                return []

                        # Place midpoint between col1 right edge and col2 start
                        col1_rights = [x for x in line_starts
                                       if x < col2_start - 40]
                        col1_right_edge = (max(col1_rights) + 40
                                           if col1_rights
                                           else top2[0][0] + 60)
                        midpoint = (col1_right_edge + col2_start) / 2
                        return [
                            (0, midpoint),
                            (midpoint, page_width),
                        ]

    # Strategy 2: Character-level gap detection (fallback)
    chars = page.chars
    if not chars or len(chars) < 20:
        return []

    x_starts = [int(c['x0']) for c in chars if c.get('text', '').strip()]
    if not x_starts:
        return []

    buckets = Counter(x // 10 * 10 for x in x_starts)
    sorted_keys = sorted(buckets.keys())
    if len(sorted_keys) < 4:
        return []

    # Find gaps: regions where char density drops to 0 for 50+ px
    gaps = []
    for i in range(len(sorted_keys) - 1):
        gap_start = sorted_keys[i] + 10
        gap_end = sorted_keys[i + 1]
        gap_size = gap_end - gap_start
        if gap_size >= 50:
            gap_center = (gap_start + gap_end) / 2
            if 0.15 * page_width < gap_center < 0.85 * page_width:
                gaps.append((gap_start, gap_end))

    if not gaps:
        return []

    columns = []
    col_start = 0
    for gap_start, gap_end in gaps:
        columns.append((col_start, gap_start))
        col_start = gap_end
    columns.append((col_start, int(page_width)))

    min_col_width = 0.15 * page_width
    columns = [(x0, x1) for x0, x1 in columns if (x1 - x0) >= min_col_width]

    return columns if len(columns) >= 2 else []


def _extract_column_text(page, x0: float, x1: float) -> str:
    """Extract text from a vertical slice of a page.

    Uses word-aware cropping: includes any word whose center falls within
    the column boundaries, preventing mid-word cuts.
    """
    try:
        words = page.extract_words()
        if words:
            # Find words whose horizontal center is within this column
            col_words = []
            for w in words:
                word_center = (w['x0'] + w['x1']) / 2
                if x0 - 2 <= word_center <= x1 + 2:
                    col_words.append(w)
            if col_words:
                # Reconstruct text line-by-line using y-position grouping
                lines_by_y = {}
                for w in col_words:
                    y_key = round(w['top'] / 4) * 4
                    if y_key not in lines_by_y:
                        lines_by_y[y_key] = []
                    lines_by_y[y_key].append(w)
                text_lines = []
                for y_key in sorted(lines_by_y):
                    line_words = sorted(lines_by_y[y_key], key=lambda w: w['x0'])
                    text_lines.append(" ".join(w['text'] for w in line_words))
                return "\n".join(text_lines)
        # Fallback: simple crop with generous margin
        cropped = page.crop((max(0, x0 - 15), 0, min(page.width, x1 + 15), page.height))
        text = cropped.extract_text()
        return text or ""
    except Exception:
        return ""


def _detect_ticket_menu(text: str) -> bool:
    """Check if text mentions entrance tickets / deposits (not a food menu)."""
    for pat in _TICKET_PATTERNS:
        if pat.search(text):
            return True
    return False


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


def _parse_pdf_menu(pdf_path: Path) -> tuple[list[dict], dict]:
    """Парсинг PDF-меню через pdfplumber → (список блюд, metadata).

    metadata keys:
        - is_ticket_menu: bool — if entrance ticket/deposit detected
        - pages: int — number of pages
        - multi_column_pages: int — pages with detected multi-column layout
    """
    try:
        import pdfplumber
    except ImportError:
        print("[!] pdfplumber не установлен: pip install pdfplumber")
        return [], {}

    dishes = []
    metadata = {"is_ticket_menu": False, "pages": 0, "multi_column_pages": 0}
    all_text = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            metadata["pages"] = len(pdf.pages)
            current_category = None

            for page in pdf.pages:
                # Strategy 1: detect columns and parse each separately
                columns = _detect_columns(page)

                if columns:
                    metadata["multi_column_pages"] += 1
                    for col_x0, col_x1 in columns:
                        col_text = _extract_column_text(page, col_x0, col_x1)
                        if col_text:
                            all_text.append(col_text)
                            current_category = _parse_text_lines(
                                col_text, current_category, dishes
                            )
                    continue

                # Strategy 2: full page text extraction
                text = page.extract_text()
                if text:
                    all_text.append(text)
                    current_category = _parse_text_lines(
                        text, current_category, dishes
                    )
                    continue

                # Strategy 3: table extraction for pages with no extractable text
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

    except Exception:
        return [], metadata

    # Check for ticket-based menu
    full_text = "\n".join(all_text)
    if _detect_ticket_menu(full_text):
        metadata["is_ticket_menu"] = True

    return dishes, metadata


def _parse_text_lines(text: str, current_category: str | None,
                      dishes: list[dict]) -> str | None:
    """Parse lines from extracted text, appending dishes and returning last category."""
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
    return current_category


def _parse_menu_line(line: str, current_category: str | None) -> dict | None:
    """Парсинг одной строки меню с улучшенной обработкой."""
    line = line.strip()
    if not line or len(line) < 3:
        return None

    # Fix kerning artifacts first
    line = _fix_kerning(line)

    # Quick junk check — skip obvious non-menu lines
    for pat in _JUNK_PATTERNS:
        if pat.match(line):
            return None

    # ── Category detection ──

    # Format: "=== САЛАТЫ ===" or "--- Горячее ---" or "*** Десерты ***"
    cat_match = re.match(r'^[=\-–—\s*#·•]{2,}(.+?)[=\-–—\s*#·•]{2,}$', line)
    if cat_match and len(cat_match.group(1).strip()) < 50:
        cat_name = cat_match.group(1).strip()
        if not re.search(r'\d{2,}', cat_name):  # no prices in category
            return {"name": cat_name, "is_category": True}

    # ALL CAPS short line without digits → category
    if (len(line) < 50 and line == line.upper() and
            sum(1 for c in line if c.isalpha()) >= 2 and
            not re.search(r'\d{2,}', line)):
        title = line.title()
        # Reject broken kerning categories like "Гг Оо Рр Яя..."
        if not re.search(r'([А-Яа-яA-Za-z])\1', title):
            return {"name": title, "is_category": True}

    # Title-case short line without digits that looks like a section header
    if (len(line) < 40 and not re.search(r'\d', line) and
            re.match(r'^[А-ЯA-Z][а-яa-zА-ЯA-Z\s&/,]+$', line)):
        # Heuristic: if next to dishes, short non-priced lines are categories
        alpha = sum(1 for c in line if c.isalpha())
        if alpha >= 3 and alpha == len(line.replace(" ", "")):
            return {"name": line.strip(), "is_category": True}

    # ── Price extraction ──
    # Handles: "430.-", "1 200", "450₽", "350 р.", "1,200.00", dots separator

    price = None
    name_part = line

    # Pattern 1: price after dots/dashes separator: "Борщ...........450"
    m = re.search(r'[.…·_—–\-]{3,}\s*(\d[\d\s,]*\d?)\s*[₽руб.р\-]*\s*$', line)
    if not m:
        # Pattern 2: price at end with space: "Борщ 450", "Борщ 1 200.-"
        m = re.search(
            r'\s+(\d{1,2}[\s,]\d{3})\s*[₽руб.р\-]*\s*$|'  # "1 200" or "1,200"
            r'\s+(\d{2,6})\s*[₽руб.р\-]*\s*$',              # "450" or "450.-"
            line,
        )

    if m:
        price_str = (m.group(1) or m.group(2) or "").replace(" ", "").replace(",", "")
        # Handle trailing ".-" in price string
        price_str = price_str.rstrip(".-")
        try:
            price = float(price_str)
        except ValueError:
            price = None
        name_part = line[:m.start()].strip()

    # ── Name cleaning ──
    cleaned_name, weight, price_from_name = _clean_dish_name(name_part)

    # Use price from name if we didn't find one at end of line
    if price is None and price_from_name is not None:
        price = price_from_name

    # Validate price if present
    if price is not None and not (50 <= price <= 50000):
        price = None  # discard suspicious price, keep the dish

    if not cleaned_name:
        return None

    # Apply junk filter
    if _is_junk_dish(cleaned_name, price):
        return None

    # Accept dishes WITH or WITHOUT price
    # Dishes without price are common in PDFs (price in separate column/line)
    return {
        "name": cleaned_name,
        "price": price,
        "category": current_category,
        "weight": weight,
    }


def _parse_menu_row(cells: list[str], current_category: str | None) -> dict | None:
    """Парсинг строки таблицы из PDF с улучшенной валидацией."""
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
        cell_clean = cell.strip().replace(" ", "")
        # Цена (handle "450.-" format too)
        price_str = re.sub(r'[₽руб.р\-]+$', '', cell_clean)
        if re.match(r'^\d{2,6}$', price_str):
            p = float(price_str)
            if 10 <= p <= 50000:
                price = p
                continue
        # Вес
        if re.match(r'^\d{1,5}\s*(?:г|мл|гр|ml|g|л|кг|oz|cl)$', cell.strip(), re.I):
            weight = cell.strip()
            continue

    # Clean and validate name
    cleaned_name, extra_weight, price_from_name = _clean_dish_name(name)
    if not weight and extra_weight:
        weight = extra_weight
    if not price and price_from_name:
        price = price_from_name

    # Validate price range
    if price is not None and not (50 <= price <= 50000):
        price = None

    if not cleaned_name:
        return None

    if _is_junk_dish(cleaned_name, price):
        return None

    # Category: single cell, no price, short text
    if not price and len(cells) <= 2:
        alpha = sum(1 for c in cleaned_name if c.isalpha())
        if alpha >= 2 and len(cleaned_name) < 50 and cleaned_name[0].isupper():
            return {"name": cleaned_name, "is_category": True}

    # Accept dishes with or without price
    return {
        "name": cleaned_name,
        "price": price,
        "weight": weight,
        "category": current_category,
    }


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

    # Delete old PDF dishes before re-parsing (idempotent re-run)
    old_count = conn.execute(
        "SELECT COUNT(*) FROM dishes WHERE source LIKE 'pdf-%'"
    ).fetchone()[0]
    if old_count > 0:
        conn.execute("DELETE FROM dishes WHERE source LIKE 'pdf-%'")
        conn.commit()
        print(f"  Удалено {old_count:,} старых PDF-блюд для перепарсинга")

    total_pdfs = 0
    total_dishes = 0
    total_restaurants = 0
    failed = 0
    ticket_restaurants = []  # track ticket/deposit-based menus
    multi_col_count = 0

    # --- Restoclub PDFs ---
    print("\n[Restoclub PDFs]")
    rc_pdfs = _collect_restoclub_pdf_urls(conn)
    print(f"  Найдено {len(rc_pdfs)} PDF-ссылок")

    for info in tqdm(rc_pdfs, desc="  RC PDFs", unit="pdf"):
        rest_id = info["rest_id"]
        pdf_url = info["url"]
        pdf_name = info["name"]

        # Кеш-путь
        pdf_hash = re.sub(r'[^\w]', '_', pdf_url.split("/")[-1])
        cache_path = PDF_CACHE_DIR / "restoclub" / f"{rest_id}_{pdf_hash}"

        pdf_path = _download_pdf(session, pdf_url, cache_path)
        if not pdf_path:
            failed += 1
            continue

        dishes, metadata = _parse_pdf_menu(pdf_path)

        if metadata.get("is_ticket_menu"):
            ticket_restaurants.append(rest_id)
        if metadata.get("multi_column_pages", 0) > 0:
            multi_col_count += 1

        if dishes:
            for d in dishes:
                _insert_dish(
                    conn, rest_id, d["name"], d.get("category"),
                    d.get("price"), weight=d.get("weight"),
                    source="pdf-restoclub",
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

        pdf_hash = re.sub(r'[^\w]', '_', pdf_url.split("/")[-1])
        cache_path = PDF_CACHE_DIR / "afisha" / f"{rest_id}_{pdf_hash}"

        pdf_path = _download_pdf(session, pdf_url, cache_path)
        if not pdf_path:
            failed += 1
            continue

        dishes, metadata = _parse_pdf_menu(pdf_path)

        if metadata.get("is_ticket_menu"):
            ticket_restaurants.append(rest_id)
        if metadata.get("multi_column_pages", 0) > 0:
            multi_col_count += 1

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
    print(f"  Multi-column PDF: {multi_col_count:,}")
    if ticket_restaurants:
        print(f"  Ticket/deposit-based menus: {len(ticket_restaurants)} restaurants")
        print(f"    IDs: {ticket_restaurants[:20]}{'...' if len(ticket_restaurants) > 20 else ''}")


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
