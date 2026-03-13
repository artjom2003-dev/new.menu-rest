"""
Парсер рабочих часов ресторанов.

Парсит текстовое поле opening_hours из таблицы restaurants
в структурированные строки таблицы working_hours.

Поддерживает два формата:
  1) Legacy: "Пн: 10:00-22:00; Вт: 10:00-22:00; ..."
  2) OSM:   "Mo-Fr 09:00-21:00; Sa 10:00-22:00; Su off"
"""
import re
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.db import get_connection, log_import

# --- Day mappings (0=Monday ... 6=Sunday) ---

LEGACY_DAYS = {
    'пн': 0, 'вт': 1, 'ср': 2, 'чт': 3, 'пт': 4, 'сб': 5, 'вс': 6,
}

OSM_DAYS = {
    'mo': 0, 'tu': 1, 'we': 2, 'th': 3, 'fr': 4, 'sa': 5, 'su': 6,
}

CLOSED_KEYWORDS = {'off', 'closed', 'выходной', 'закрыто'}


def _expand_day_range(start: int, end: int) -> list[int]:
    """Expand a day range (e.g. 0->4 = Mon-Fri). Wraps around week."""
    if start <= end:
        return list(range(start, end + 1))
    # wrap: e.g. Fr-Mo = [4,5,6,0]
    return list(range(start, 7)) + list(range(0, end + 1))


def _parse_time_range(time_str: str) -> tuple[str, str, bool]:
    """
    Parse a time string like '09:00-21:00', 'off', '24/7', 'выходной'.
    Returns (open_time, close_time, is_closed).
    """
    time_str = time_str.strip().lower()

    if time_str in CLOSED_KEYWORDS:
        return (None, None, True)

    if time_str == '24/7':
        return ('00:00', '24:00', False)

    m = re.match(r'(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})', time_str)
    if m:
        return (m.group(1), m.group(2), False)

    return (None, None, False)


def _detect_format(text: str) -> str:
    """Detect whether text is legacy or OSM format."""
    lower = text.lower()
    # Legacy markers: Russian day abbreviations followed by colon
    if re.search(r'(пн|вт|ср|чт|пт|сб|вс)\s*:', lower):
        return 'legacy'
    # OSM markers
    if re.search(r'\b(mo|tu|we|th|fr|sa|su)\b', lower, re.IGNORECASE):
        return 'osm'
    # 24/7 standalone
    if '24/7' in text:
        return 'osm'
    # Fallback: if it has Russian day names without colon, still legacy
    if re.search(r'(пн|вт|ср|чт|пт|сб|вс)', lower):
        return 'legacy'
    return 'unknown'


def _parse_legacy(text: str) -> dict[int, tuple[str, str, bool]]:
    """
    Parse legacy format: "Пн: 10:00-22:00; Вт: 10:00-22:00; ..."
    Also handles ranges like "Пн-Пт: 10:00-22:00".
    Returns {day_of_week: (open, close, is_closed)}.
    """
    result = {}
    # Split by ; or newline
    parts = re.split(r'[;\n]', text)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Match: "Day(-Day|,Day)*: time" or "Day(-Day|,Day)*  time"
        m = re.match(
            r'([А-Яа-яёЁ,\-\s]+?)\s*[:]\s*(.+)',
            part, re.IGNORECASE
        )
        if not m:
            # Try without colon: "Пн-Пт 10:00-22:00"
            m = re.match(
                r'([А-Яа-яёЁ,\-\s]+?)\s+(\d{1,2}:\d{2}.+|выходной|закрыто)',
                part, re.IGNORECASE
            )
        if not m:
            continue

        days_str = m.group(1).strip().lower()
        time_str = m.group(2).strip()

        days = _resolve_legacy_days(days_str)
        open_t, close_t, is_closed = _parse_time_range(time_str)

        for d in days:
            result[d] = (open_t, close_t, is_closed)

    return result


def _resolve_legacy_days(days_str: str) -> list[int]:
    """Resolve legacy day specification like 'пн-пт', 'пн,ср,пт', 'сб'."""
    days = []

    # Split by comma first
    segments = [s.strip() for s in days_str.split(',')]
    for seg in segments:
        # Check for range: пн-пт
        range_match = re.match(r'(\w+)\s*[-–—]\s*(\w+)', seg)
        if range_match:
            start_name = range_match.group(1).lower()
            end_name = range_match.group(2).lower()
            start = LEGACY_DAYS.get(start_name)
            end = LEGACY_DAYS.get(end_name)
            if start is not None and end is not None:
                days.extend(_expand_day_range(start, end))
        else:
            d = LEGACY_DAYS.get(seg.lower())
            if d is not None:
                days.append(d)

    return days


def _parse_osm(text: str) -> dict[int, tuple[str, str, bool]]:
    """
    Parse OSM opening_hours format.
    Examples:
      "Mo-Fr 09:00-21:00; Sa 10:00-22:00; Su off"
      "24/7"
      "Mo-Fr 09:00-13:00,14:00-18:00" (takes last range for simplicity)
      "Mo,We,Fr 10:00-20:00"
    Returns {day_of_week: (open, close, is_closed)}.
    """
    result = {}

    # Handle 24/7
    if '24/7' in text:
        for d in range(7):
            result[d] = ('00:00', '24:00', False)
        # Parse additional rules that may override
        text_remainder = text.replace('24/7', '').strip('; ,')
        if not text_remainder:
            return result
        # Fall through to parse overrides

    # Split rules by ; or ,  (but not comma inside time ranges)
    # OSM uses ; as primary separator, comma sometimes for day lists
    # Strategy: split by ; first, then handle each rule
    rules = re.split(r'\s*;\s*', text)

    for rule in rules:
        rule = rule.strip()
        if not rule or rule == '24/7':
            continue

        # Try to match: DAYS TIME
        # Days portion: Mo-Fr, Mo,We,Fr, Mo, PH (public holiday - skip)
        m = re.match(
            r'((?:Mo|Tu|We|Th|Fr|Sa|Su)[\w,\-\s]*?)\s+'
            r'(off|closed|\d{1,2}:\d{2}.+)',
            rule, re.IGNORECASE
        )
        if m:
            days_str = m.group(1).strip()
            time_str = m.group(2).strip()

            days = _resolve_osm_days(days_str)

            # Time might have multiple ranges: "09:00-13:00,14:00-18:00"
            # We take the overall span (first open, last close)
            time_parts = re.split(r'\s*,\s*', time_str)
            # Filter only valid time ranges
            valid_times = []
            for tp in time_parts:
                parsed = _parse_time_range(tp)
                if parsed[0] is not None:
                    valid_times.append(parsed)
                elif parsed[2]:  # is_closed
                    valid_times.append(parsed)

            if valid_times:
                if valid_times[0][2]:  # closed
                    open_t, close_t, is_closed = None, None, True
                else:
                    # Take first open and last close for overall span
                    open_t = valid_times[0][0]
                    close_t = valid_times[-1][1]
                    is_closed = False

                for d in days:
                    result[d] = (open_t, close_t, is_closed)
            continue

        # Try standalone "off" or time without day spec
        lower_rule = rule.lower().strip()
        if lower_rule in CLOSED_KEYWORDS:
            # Applies to all days not yet set? Skip, ambiguous.
            continue

    return result


def _resolve_osm_days(days_str: str) -> list[int]:
    """Resolve OSM day specification like 'Mo-Fr', 'Mo,We,Fr', 'Sa'."""
    days = []

    # Split by comma
    segments = [s.strip() for s in days_str.split(',')]
    for seg in segments:
        # Check for range: Mo-Fr
        range_match = re.match(r'(\w{2})\s*[-–—]\s*(\w{2})', seg)
        if range_match:
            start_name = range_match.group(1).lower()
            end_name = range_match.group(2).lower()
            start = OSM_DAYS.get(start_name)
            end = OSM_DAYS.get(end_name)
            if start is not None and end is not None:
                days.extend(_expand_day_range(start, end))
        else:
            d = OSM_DAYS.get(seg.strip().lower()[:2])
            if d is not None:
                days.append(d)

    return days


def parse_opening_hours(text: str) -> dict[int, tuple[str, str, bool]] | None:
    """
    Main parser entry. Detects format and delegates.
    Returns {day_of_week: (open_time, close_time, is_closed)} or None on failure.
    """
    if not text or not text.strip():
        return None

    text = text.strip()

    # Handle bare "closed" / "off"
    if text.lower() in CLOSED_KEYWORDS:
        return {d: (None, None, True) for d in range(7)}

    # Handle bare time range without days (= every day)
    bare_time = re.match(r'^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$', text)
    if bare_time:
        return {d: (bare_time.group(1), bare_time.group(2), False) for d in range(7)}

    fmt = _detect_format(text)

    if fmt == 'legacy':
        return _parse_legacy(text)
    elif fmt == 'osm':
        return _parse_osm(text)
    else:
        return None


def run_working_hours_parser():
    """
    Main entry point: parse opening_hours for all restaurants
    and insert structured rows into working_hours table.
    """
    print(f"\n{'='*60}")
    print("ПАРСИНГ РАБОЧИХ ЧАСОВ")
    print(f"{'='*60}\n")

    log_import('working_hours_parser', 'parsing', 'started')

    conn = get_connection()

    # Fetch all restaurants with opening_hours
    rows = conn.execute("""
        SELECT id, opening_hours
        FROM restaurants
        WHERE opening_hours IS NOT NULL
          AND opening_hours != ''
          AND is_duplicate = 0
    """).fetchall()

    total = len(rows)
    parsed_ok = 0
    parsed_fail = 0
    total_hours_inserted = 0
    failed_samples = []

    print(f"  Ресторанов с opening_hours: {total:,}")

    for row in rows:
        rest_id = row[0] if isinstance(row, tuple) else row['id']
        hours_text = row[1] if isinstance(row, tuple) else row['opening_hours']

        result = parse_opening_hours(hours_text)

        if not result:
            parsed_fail += 1
            if len(failed_samples) < 5:
                failed_samples.append((rest_id, hours_text[:80]))
            continue

        # Idempotent: clear existing hours for this restaurant
        conn.execute("DELETE FROM working_hours WHERE restaurant_id = ?", (rest_id,))

        # Insert parsed hours
        for day_of_week, (open_time, close_time, is_closed) in result.items():
            conn.execute(
                """INSERT OR REPLACE INTO working_hours
                   (restaurant_id, day_of_week, open_time, close_time, is_closed)
                   VALUES (?, ?, ?, ?, ?)""",
                (rest_id, day_of_week, open_time, close_time, 1 if is_closed else 0)
            )
            total_hours_inserted += 1

        parsed_ok += 1

    conn.commit()

    # Stats
    print(f"\n  Результаты:")
    print(f"    Успешно распознано:  {parsed_ok:,}")
    print(f"    Не удалось:         {parsed_fail:,}")
    print(f"    Строк working_hours: {total_hours_inserted:,}")

    if failed_samples:
        print(f"\n  Примеры нераспознанных (до 5):")
        for rid, sample in failed_samples:
            print(f"    id={rid}: {sample}")

    success_rate = (parsed_ok / total * 100) if total > 0 else 0
    print(f"\n  Процент успеха: {success_rate:.1f}%")

    log_import('working_hours_parser', 'parsing', 'completed', parsed_ok)

    conn.close()

    return parsed_ok, parsed_fail


if __name__ == '__main__':
    run_working_hours_parser()
