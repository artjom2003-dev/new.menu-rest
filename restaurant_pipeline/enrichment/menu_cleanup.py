"""
Menu cleanup: cleans junk dishes, standardizes categories, fixes names.
Run: python -m enrichment.menu_cleanup
"""

import re
import sqlite3
import sys
import os

# Windows UTF-8 stdout fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "pipeline.db")

# ── Standard categories ──────────────────────────────────────────────────────

STANDARD_CATEGORIES = [
    "Салаты", "Супы", "Горячее", "Паста", "Пицца", "Суши и роллы",
    "Десерты", "Напитки безалкогольные", "Алкоголь", "Пиво", "Вино",
    "Завтраки", "Гарниры", "Закуски", "Стейки и гриль", "Бургеры",
    "Хлеб и выпечка", "Морепродукты", "Соусы", "Детское меню",
]

# ── Category mapping rules (keyword → standard) ─────────────────────────────
# Order matters: more specific rules first.

CATEGORY_RULES = [
    # Wine (before general alcohol)
    (r"вин[оа]|шампанск|игрист|шабли|каберне|мерло|пино|совиньон|"
     r"шардоне|рислинг|розовое|белое вино|красное вино|портвейн|херес|"
     r"кава|просекко|розе", "Вино"),
    # Beer
    (r"пив[оа]|beer|эль|лагер|стаут|бутылочн\w+ пив", "Пиво"),
    # Spirits / hard alcohol
    (r"виски|водк[аи]|коньяк|бренди|ром\b|джин\b|текил[аы]|настойк|"
     r"ликёр|ликер|абсент|граппа|бурбон|кальвадос|мескаль|"
     r"биттер|вермут|порто|шот[ыа]|спиртн|scotch|whisky|whiskey|"
     r"bourbon|rum|gin|tequila|vodka|cognac", "Алкоголь"),
    # Non-alcoholic drinks
    (r"кофе|чай\b|чаи\b|чайн|сок[иа]?\b|лимонад|смузи|молочн\w+ коктейл|"
     r"милк.?шейк|фреш|минеральн|газирован|безалкогол|"
     r"какао|шоколадн\w+ напит|горяч\w+ напит|cold.?brew|латте|"
     r"капучино|эспрессо|улун|пунш|морс|компот|фруктов\w+ вод", "Напитки безалкогольные"),
    # Sushi & rolls
    (r"суши|роллы?|сашими|сеты?\b|маки|нигири|темпура.?ролл|"
     r"wok|вок\b", "Суши и роллы"),
    # Pizza
    (r"пицц[аы]", "Пицца"),
    # Pasta
    (r"паст[аы]|ризотто|спагетти|равиоли|лазань|фетучини|пенне|"
     r"тальятелле|карбонар|итальянск\w+ паст", "Паста"),
    # Salads
    (r"салат", "Салаты"),
    # Soups
    (r"суп[ыа]?\b|бульон|щи\b|борщ|солянк|гаспач|том.?ям|"
     r"минестрон|первые блюд|харчо|рассольник|окрошк|уха\b", "Супы"),
    # Desserts
    (r"десерт|торт[ыа]?\b|мороженн?ое|чизкейк|пирожн|тирамису|"
     r"панна.?котта|брауни|макарон|птифур|профитрол|медовик|"
     r"наполеон|штрудел|круассан|маффин|кулинари", "Десерты"),
    # Steaks & grill
    (r"стейк|гриль|шашлык|барбекю|bbq|мангал|углях|тондыр|садж|"
     r"каре\b|рибай|филе.?миньон|т.?бон", "Стейки и гриль"),
    # Burgers
    (r"бургер|burger", "Бургеры"),
    # Breakfast
    (r"завтрак|бизнес.?ланч|бранч", "Завтраки"),
    # Garnishes
    (r"гарнир", "Гарниры"),
    # Appetizers / cold dishes
    (r"закуск|холодн\w+ блюд|антипаст|тартар|карпачч|брускет", "Закуски"),
    # Hot main dishes (broad — after more specific)
    (r"горяч\w+\s*(блюд|закуск)|горячее|главн\w+ блюд|"
     r"мясн\w+ блюд|рыбн\w+ блюд|блюда из мяс|блюда из рыб|"
     r"блюда из птиц|вторые блюд|фирменн|предложен\w+ шеф|"
     r"блюда на|плов|блины|блинчик|хачапури|пирог|"
     r"дегустац|сезонн\w+ блюд|постн\w+ меню|еда|"
     r"по домашн|арабск|китайск|буйвол", "Горячее"),
    # Seafood
    (r"морепродукт|устриц|креветк|лобстер|краб", "Морепродукты"),
    # Bread & pastry
    (r"хлеб|выпечк|хлебн", "Хлеб и выпечка"),
    # Sauces
    (r"соус", "Соусы"),
    # Kids
    (r"детск", "Детское меню"),
    # Cocktails fallback (alcoholic cocktails → Алкоголь, bar menu)
    (r"коктейл\w+\s*(на основе|алкогол)|алкогольн\w+ коктейл|"
     r"барн\w+ меню|классик[аи]", "Алкоголь"),
    # Hookah and other — skip (return None)
    (r"кальян|hookah", None),
]

# ── Dish-name-based category guessing ────────────────────────────────────────

DISH_NAME_RULES = [
    (r"салат|цезарь|оливье|греческ|винегрет", "Салаты"),
    (r"\bсуп\b|борщ|солянк|щи\b|бульон|харчо|окрошк|гаспач|том.?ям|уха\b", "Супы"),
    (r"пицц[аы]|маргарит|пепперон|четыре сыра", "Пицца"),
    (r"паст[аы]\b|спагетти|карбонар|болоньез|лазань|равиоли|ризотто|фетучин", "Паста"),
    (r"ролл\b|ролл[ыа]|суши|маки\b|сашими|филадельф|калифорни", "Суши и роллы"),
    (r"стейк|рибай|филе.?миньон|т.?бон|шашлык|каре\b|гриль", "Стейки и гриль"),
    (r"бургер|чизбургер|гамбургер", "Бургеры"),
    (r"десерт|торт\b|чизкейк|тирамису|панна.?кот|мороженое|брауни|штрудел", "Десерты"),
    (r"лимонад|морс|компот|смузи|фреш|сок\b|молочн\w+ коктейл", "Напитки безалкогольные"),
    (r"гарнир|картофел|рис\b|пюре\b|овощи на", "Гарниры"),
    (r"соус\b", "Соусы"),
    (r"хлеб|лепёшк|лепешк|фокачч|чиабатт|булочк|круассан", "Хлеб и выпечка"),
    (r"креветк|мидии|устриц|кальмар|осьминог|лобстер|краб", "Морепродукты"),
]

# Compile all regexes once
_CATEGORY_RULES_COMPILED = [(re.compile(pat, re.IGNORECASE), std) for pat, std in CATEGORY_RULES]
_DISH_NAME_RULES_COMPILED = [(re.compile(pat, re.IGNORECASE), std) for pat, std in DISH_NAME_RULES]

# ── Junk detection patterns ──────────────────────────────────────────────────

RE_PURE_NUMBERS = re.compile(r"^\d+$")
RE_UNIT_JUNK = re.compile(r"^(\d+)?\s*шт\.?$", re.IGNORECASE)
RE_PHONE = re.compile(r"\+7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}|тел[:\.]", re.IGNORECASE)
RE_ADDRESS = re.compile(
    r"(шоссе|проспект|улица|ул\.|пр-т|пр\.)\s*[,]?\s*\d",
    re.IGNORECASE,
)
RE_DISCLAIMER = re.compile(
    r"^(на фотографи|все цены|цены указан|цены могут|"
    r"возможны изменени|меню является|состав блюд|"
    r"калорийность|обращаем ваше|внимание!|"
    r"уважаемые гости|доставка осуществ)",
    re.IGNORECASE,
)
RE_URL = re.compile(r"^(www\.|https?://)", re.IGNORECASE)
RE_BROKEN_ENCODING = re.compile(r"[À-ÿ]{3,}")  # Latin chars that should be Cyrillic
RE_WINE_DESC = re.compile(
    r"(сухое|полусухое|полусладкое|сладкое|брют).{0,30}"
    r"(Франция|Италия|Испания|Чили|Аргентина|Австралия|Германия|Австрия|"
    r"Грузия|Россия|Португалия|Новая Зеландия|ЮАР|США)|"
    r"(Франция|Италия|Испания|Чили|Аргентина|Австралия|Германия|Австрия|"
    r"Грузия|Россия|Португалия|Новая Зеландия|ЮАР|США).{0,30}"
    r"(сухое|полусухое|полусладкое|сладкое|брют)|"
    r",\s*\d{1,2}[.,]\d%",  # "14,5%" — alcohol percentage
    re.IGNORECASE,
)
RE_MERCH = re.compile(
    r"^(бейсболка|кепка|футболка|худи|шоппер|стикер|магнит|значок|"
    r"подарочн\w+ (набор|серт|карт)|сертификат)",
    re.IGNORECASE,
)
RE_LOWERCASE_CYRILLIC_START = re.compile(r"^[а-яё]")  # fragment from column split
RE_MULTI_PRICES = re.compile(r"\b\d{3,5}\b")

# ── Weight extraction from name ──────────────────────────────────────────────

RE_WEIGHT_PREFIX = re.compile(
    r"^(\d{1,5})\s*(г|гр|мл)\b[.,]?\s*",
    re.IGNORECASE,
)
RE_WEIGHT_SUFFIX = re.compile(
    r"\s+(\d{1,5})\s*(г|гр|мл)\.?\s*$",
    re.IGNORECASE,
)

# ── Name cleaning ────────────────────────────────────────────────────────────

RE_TRAILING_DOTS = re.compile(r"\.{2,}\s*$")
RE_TRAILING_PRICE = re.compile(r"\.\-\s*$")

# ── Kerning fix ──────────────────────────────────────────────────────────────


def fix_kerning(text: str) -> str:
    """
    Fix spaced-out kerning like 'С О У С А' → 'СОУСА' or 'К Р А С Н О Е' → 'КРАСНОЕ'.
    Also fix doubled letters like 'Ttaaccooss' → 'Tacos'.
    """
    if not text:
        return text

    # Detect kerning: single chars separated by spaces (at least 3 groups)
    # e.g. "С О У С А" — each token is 1 char
    tokens = text.split()
    if len(tokens) >= 3 and all(len(t) == 1 for t in tokens):
        collapsed = "".join(tokens)
        # Title-case it
        return collapsed.capitalize()

    # Detect doubled-letter pattern: TtAaCcOoSs → Tacos
    # Check if string length is even and pairs match (case-insensitive)
    if len(text) >= 6 and len(text) % 2 == 0:
        pairs_match = True
        result_chars = []
        for i in range(0, len(text), 2):
            if text[i].lower() == text[i + 1].lower():
                result_chars.append(text[i])
            else:
                pairs_match = False
                break
        if pairs_match:
            fixed = "".join(result_chars)
            # Only accept if the result looks reasonable (not already normal text)
            if fixed != text:
                return fixed.capitalize()

    return text


def is_junk_dish(name: str, price) -> bool:
    """Return True if the dish should be deleted."""
    stripped = name.strip()
    if len(stripped) < 3:
        return True
    if RE_PURE_NUMBERS.match(stripped):
        return True
    if RE_UNIT_JUNK.match(stripped):
        return True
    if RE_PHONE.search(stripped):
        return True
    if RE_ADDRESS.search(stripped):
        return True
    if RE_DISCLAIMER.match(stripped):
        return True
    if RE_URL.match(stripped):
        return True
    # Price sanity — nothing real <50₽, portions don't cost >15000₽
    if price is not None:
        if price < 50 or price > 50000:
            return True
    # Fragment: starts with lowercase Cyrillic = word cut by column split
    if RE_LOWERCASE_CYRILLIC_START.match(stripped):
        return True
    # Broken encoding (Latin instead of Cyrillic: "Ýðë Ãðåé")
    if RE_BROKEN_ENCODING.search(stripped):
        return True
    # Wine/alcohol description line, not a dish
    if RE_WINE_DESC.search(stripped):
        return True
    # Merchandise
    if RE_MERCH.search(stripped):
        return True
    # Multiple prices in name = concatenated dishes
    if len(RE_MULTI_PRICES.findall(stripped)) >= 3:
        return True
    # Slash-separated items with embedded prices: "блюдо 380/ блюдо 870"
    if re.search(r'\d{3,5}\s*/\s*\.?\s*\w', stripped):
        return True
    return False


def map_category(raw_cat: str) -> str | None:
    """Map a raw category to a standard one. Returns None if no match / should be null."""
    if not raw_cat:
        return None

    # Clean whitespace/newlines
    cleaned = raw_cat.strip().replace("\n", " ").replace("\u200b", "").strip()
    if not cleaned:
        return None

    # Fix kerning first
    cleaned = fix_kerning(cleaned)

    # Check if it's just dots / garbage
    if re.match(r"^[.\-\s]+$", cleaned):
        return None

    # Reject broken kerning categories like "Гг Оо Рр Яя Чч..."
    if re.search(r'([А-Яа-яA-Za-z])\1{1,}', cleaned) and len(cleaned) > 10:
        # Check if most character pairs repeat — likely kerning artifact
        pairs = [(cleaned[i], cleaned[i+1]) for i in range(0, len(cleaned)-1, 2)
                 if cleaned[i].isalpha() and i+1 < len(cleaned)]
        if pairs and sum(1 for a, b in pairs if a.lower() == b.lower()) / len(pairs) > 0.5:
            return None

    # Already a standard category?
    for std in STANDARD_CATEGORIES:
        if cleaned.lower() == std.lower():
            return std

    # Apply rules
    for pattern, std_cat in _CATEGORY_RULES_COMPILED:
        if pattern.search(cleaned):
            return std_cat

    # If nothing matched, keep None (will try dish-name guessing later)
    return None


def guess_category_from_name(dish_name: str) -> str | None:
    """Try to infer category from dish name."""
    if not dish_name:
        return None
    for pattern, std_cat in _DISH_NAME_RULES_COMPILED:
        if pattern.search(dish_name):
            return std_cat
    return None


def clean_name(name: str, current_weight: str | None):
    """
    Clean dish name: extract weight, remove trailing dots/price artifacts.
    Returns (cleaned_name, new_weight_or_None).
    """
    cleaned = name.strip()
    new_weight = None

    # Extract weight from prefix: "110 г Мясо" → weight=110г, name="Мясо"
    m = RE_WEIGHT_PREFIX.match(cleaned)
    if m and len(cleaned) > m.end():  # ensure there's something after the weight
        remainder = cleaned[m.end():].strip()
        if len(remainder) >= 2:  # meaningful remainder
            new_weight = f"{m.group(1)} {m.group(2).lower()}"
            cleaned = remainder

    # Extract weight from suffix: "Стейк 200г" → weight=200г, name="Стейк"
    if new_weight is None:
        m = RE_WEIGHT_SUFFIX.search(cleaned)
        if m:
            new_weight = f"{m.group(1)} {m.group(2).lower()}"
            cleaned = cleaned[: m.start()].strip()

    # Remove trailing dots
    cleaned = RE_TRAILING_DOTS.sub("", cleaned).strip()
    # Remove trailing ".-"
    cleaned = RE_TRAILING_PRICE.sub("", cleaned).strip()

    # Only return new weight if dish didn't already have one
    if current_weight:
        new_weight = None

    return cleaned, new_weight


# ══════════════════════════════════════════════════════════════════════════════


def _db_execute_retry(conn_or_cur, sql, params=(), max_retries=10):
    """Execute with retry on database locked."""
    for attempt in range(max_retries):
        try:
            return conn_or_cur.execute(sql, params)
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                import time
                time.sleep(2 * (attempt + 1))
            else:
                raise


def _db_commit_retry(conn, max_retries=10):
    """Commit with retry on database locked."""
    for attempt in range(max_retries):
        try:
            conn.commit()
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                import time
                time.sleep(2 * (attempt + 1))
            else:
                raise


def run():
    conn = sqlite3.connect(DB_PATH, timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=300000")
    cur = conn.cursor()

    # ── Stats ─────────────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM dishes")
    total_before = cur.fetchone()[0]
    print(f"Total dishes before cleanup: {total_before}")

    # ── Step 1: Delete junk dishes ────────────────────────────────────────
    print("\n=== Step 1: Removing junk dishes ===")
    cur.execute("SELECT id, name, price FROM dishes")
    junk_ids = []
    for row in cur.fetchall():
        dish_id, name, price = row
        if name and is_junk_dish(name, price):
            junk_ids.append(dish_id)

    if junk_ids:
        # Delete in batches to avoid long locks
        batch_size = 500
        for i in range(0, len(junk_ids), batch_size):
            batch = junk_ids[i:i + batch_size]
            placeholders = ",".join("?" * len(batch))
            _db_execute_retry(cur, f"DELETE FROM dish_allergens WHERE dish_id IN ({placeholders})", batch)
            _db_execute_retry(cur, f"DELETE FROM dishes WHERE id IN ({placeholders})", batch)
            _db_commit_retry(conn)
            if (i // batch_size) % 20 == 0 and i > 0:
                print(f"    ... deleted {i:,}/{len(junk_ids):,}")

    print(f"  Junk dishes removed: {len(junk_ids)}")

    # ── Step 2: Fix weight/price in dish names ────────────────────────────
    print("\n=== Step 2: Fixing names (weight extraction, trailing artifacts) ===")
    cur.execute("SELECT id, name, weight FROM dishes")
    rows = cur.fetchall()
    weight_extracted = 0
    names_cleaned = 0

    for dish_id, name, weight in rows:
        if not name:
            continue
        cleaned, new_weight = clean_name(name, weight)
        updates = {}
        if cleaned != name:
            updates["name"] = cleaned
            names_cleaned += 1
        if new_weight:
            updates["weight"] = new_weight
            weight_extracted += 1
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            vals = list(updates.values()) + [dish_id]
            cur.execute(f"UPDATE dishes SET {set_clause} WHERE id = ?", vals)

    _db_commit_retry(conn)
    print(f"  Weights extracted from names: {weight_extracted}")
    print(f"  Names cleaned (dots/artifacts): {names_cleaned}")

    # ── Step 3 & 4: Standardize categories (with kerning fix) ─────────────
    print("\n=== Step 3-4: Standardizing categories (with kerning fix) ===")
    cur.execute("SELECT DISTINCT category FROM dishes WHERE category IS NOT NULL")
    raw_categories = [r[0] for r in cur.fetchall()]

    cat_mapping = {}  # raw → standard
    for raw in raw_categories:
        std = map_category(raw)
        if std is not None or map_category(raw) is None:
            cat_mapping[raw] = std

    categories_standardized = 0
    for raw, std in cat_mapping.items():
        if std is not None and raw != std:
            cur.execute("UPDATE dishes SET category = ? WHERE category = ?", (std, raw))
            categories_standardized += cur.rowcount
        elif std is None:
            # Set to NULL — will try name-based guessing next
            cur.execute("UPDATE dishes SET category = NULL WHERE category = ?", (raw,))
            categories_standardized += cur.rowcount

    _db_commit_retry(conn)
    print(f"  Categories standardized/cleaned: {categories_standardized}")

    # ── Step 3b: Guess category from dish name for NULL categories ────────
    print("\n=== Step 3b: Guessing category from dish names ===")
    cur.execute("SELECT id, name FROM dishes WHERE category IS NULL")
    null_cat_rows = cur.fetchall()
    guessed = 0
    for dish_id, name in null_cat_rows:
        if not name:
            continue
        cat = guess_category_from_name(name)
        if cat:
            cur.execute("UPDATE dishes SET category = ? WHERE id = ?", (cat, dish_id))
            guessed += 1

    _db_commit_retry(conn)
    print(f"  Categories guessed from dish name: {guessed}")

    # ── Step 5: Print final statistics ────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM dishes")
    total_after = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM dishes WHERE category IS NULL")
    no_cat = cur.fetchone()[0]

    cur.execute("SELECT category, COUNT(*) as cnt FROM dishes WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC")
    cat_stats = cur.fetchall()

    print("\n" + "=" * 60)
    print("FINAL STATISTICS")
    print("=" * 60)
    print(f"  Total dishes before:  {total_before}")
    print(f"  Junk removed:         {len(junk_ids)}")
    print(f"  Total dishes after:   {total_after}")
    print(f"  Weights extracted:    {weight_extracted}")
    print(f"  Names cleaned:        {names_cleaned - weight_extracted}")
    print(f"  Categories mapped:    {categories_standardized}")
    print(f"  Categories guessed:   {guessed}")
    print(f"  Still no category:    {no_cat}")
    print(f"\nCategory distribution:")
    for cat, cnt in cat_stats:
        print(f"    {cat:30s} {cnt:>6d}")
    if no_cat:
        print(f"    {'(no category)':30s} {no_cat:>6d}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    run()
