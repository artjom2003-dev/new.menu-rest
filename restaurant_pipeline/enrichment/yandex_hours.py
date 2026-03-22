"""
Сверка ресторанов с Яндекс Картами (через парсинг HTML).

Для каждого ресторана с координатами:
  1. Загружает страницу Яндекс Карт с поисковым запросом (имя + адрес)
  2. Извлекает JSON-state из встроенного <script> тега
  3. Если организация status == "closed" → помечаем как закрытую
  4. Если найдена и открыта → обновляем часы работы

Запуск:
  cd restaurant_pipeline
  python main.py --step yandex

  # или напрямую:
  python -m enrichment.yandex_hours
  python -m enrichment.yandex_hours --limit 100
  python -m enrichment.yandex_hours --city Москва
  python -m enrichment.yandex_hours --reset       # сбросить прогресс
"""
import sys
import os
import json
import time
import random
import re
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

# Unbuffered output (важно для Windows)
os.environ['PYTHONUNBUFFERED'] = '1'
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import requests
from rapidfuzz import fuzz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.db import log_import
from config.settings import USER_AGENT, PIPELINE_DB, PROCESSED_DIR


def _get_connection() -> sqlite3.Connection:
    """Соединение с увеличенным timeout (OneDrive лочит файлы)."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(PIPELINE_DB), timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=300000")  # 5 min wait for lock
    conn.row_factory = sqlite3.Row
    return conn

# ─── Настройки ───────────────────────────────────────────────────────────────

# Пауза между запросами (сек)
REQUEST_DELAY_MIN = 2.0
REQUEST_DELAY_MAX = 4.0

# Пауза при блокировке / капче (сек)
BLOCK_DELAY = 120

# Порог схожести имён для матчинга
NAME_SIMILARITY_THRESHOLD = 0.55

# Размер батча для коммита в БД
COMMIT_BATCH = 50

# User-Agent ротация
USER_AGENTS = [
    USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
]


# ─── HTTP ────────────────────────────────────────────────────────────────────

def _create_session() -> requests.Session:
    """Создать сессию с cookies от Яндекс Карт."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "ru,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    # Получаем начальные cookies
    try:
        s.get("https://yandex.ru/maps/", timeout=15)
        print(f"[Yandex] Сессия создана, cookies: {len(s.cookies)}")
    except Exception as e:
        print(f"[Yandex] Ошибка инициализации: {e}")
    return s


def _search_yandex(session: requests.Session, name: str, address: str,
                   lat: float, lng: float) -> list[dict]:
    """
    Поиск организации через HTML-страницу Яндекс Карт.
    Возвращает список бизнес-результатов из встроенного JSON state.
    """
    query = name
    if address:
        query = f"{name} {address}"

    try:
        resp = session.get("https://yandex.ru/maps/", params={
            "text": query,
            "ll": f"{lng},{lat}",
            "z": "17",
            "mode": "search",
        }, timeout=20)

        if resp.status_code == 429:
            return [{"_error": "rate_limit"}]
        if resp.status_code == 403:
            return [{"_error": "forbidden"}]
        if resp.status_code >= 400:
            return [{"_error": f"http_{resp.status_code}"}]

        html = resp.text

        # Проверка на капчу (реальная капча — когда нет результатов и есть форма)
        if "SmartCaptcha" in html and '{"config":{"requestId"' not in html:
            return [{"_error": "captcha"}]

        # Извлекаем JSON state из <script> тега
        # Ищем маркер initial state — {"config":{ — без тяжёлых regex
        marker = '{"config":{"requestId"'
        pos = html.find(marker)
        if pos < 0:
            return []

        # Находим конец script-тега после этого маркера
        end_tag = html.find('</script>', pos)
        if end_tag < 0:
            return []

        json_str = html[pos:end_tag].rstrip().rstrip(';')
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            return []

        # Навигация: data → stack[0] → results → items
        stack = data.get("stack", [])
        if not stack:
            return []

        results = stack[0].get("results", {})
        items = results.get("items", [])

        # Фильтруем только бизнес-результаты
        businesses = [
            item for item in items
            if item.get("type") == "business"
        ]
        return businesses

    except requests.exceptions.Timeout:
        return [{"_error": "timeout"}]
    except Exception as e:
        return [{"_error": str(e)}]


# ─── Матчинг и извлечение данных ─────────────────────────────────────────────

def _normalize_name(name: str) -> str:
    """Нормализация имени для сравнения."""
    name = name.lower().strip()
    for ch in '"\'«»""„()[]':
        name = name.replace(ch, '')
    for word in ['ресторан', 'кафе', 'бар', 'паб', 'столовая', 'кофейня',
                 'пиццерия', 'бистро', 'гастробар', 'гастропаб', 'траттория',
                 'кондитерская', 'пекарня', 'буфет', 'чайхана', 'шашлычная']:
        name = name.replace(word, '')
    return name.strip()


def _is_match(our_name: str, yandex_name: str) -> bool:
    """Проверка совпадения имён."""
    norm_ours = _normalize_name(our_name)
    norm_yandex = _normalize_name(yandex_name)

    if not norm_ours or not norm_yandex:
        return False

    # Точное совпадение
    if norm_ours == norm_yandex:
        return True

    # Одно имя содержит другое (Лефорт ⊂ Банкет-холл Лефорт)
    if norm_ours in norm_yandex or norm_yandex in norm_ours:
        return True

    # Fuzzy matching
    ratio = fuzz.token_sort_ratio(norm_ours, norm_yandex) / 100.0
    if ratio >= NAME_SIMILARITY_THRESHOLD:
        return True

    # Partial ratio — для случаев когда одно имя значительно длиннее
    partial = fuzz.partial_ratio(norm_ours, norm_yandex) / 100.0
    if partial >= 0.75:
        return True

    return False


def _is_permanently_closed(item: dict) -> bool:
    """Проверить, закрыто ли заведение навсегда (по полю status)."""
    status = item.get("status", "")
    return status in ("closed", "permanent-closed")


def _extract_working_hours(item: dict) -> list[dict] | None:
    """
    Извлечь часы работы из item.workingTime.
    Формат Яндекса: workingTime — массив из 7 элементов (Пн=0..Вс=6),
    каждый элемент — массив интервалов [{from: {hours, minutes}, to: {hours, minutes}}]
    """
    wt = item.get("workingTime")
    if not wt or not isinstance(wt, list):
        return None

    result = []
    for day_idx, slots in enumerate(wt):
        if day_idx >= 7:
            break

        if not slots:
            # Нет интервалов → выходной
            result.append({
                "day": day_idx,
                "open": None,
                "close": None,
                "is_closed": True,
            })
        else:
            slot = slots[0]  # Берём первый интервал
            fr = slot.get("from", {})
            to = slot.get("to", {})
            open_h = fr.get("hours", 0)
            open_m = fr.get("minutes", 0)
            close_h = to.get("hours", 0)
            close_m = to.get("minutes", 0)

            open_time = f"{open_h:02d}:{open_m:02d}"
            close_time = f"{close_h:02d}:{close_m:02d}"

            # 00:00 - 00:00 = круглосуточно
            is_24h = (open_time == "00:00" and close_time == "00:00")
            if is_24h:
                close_time = "23:59"

            result.append({
                "day": day_idx,
                "open": open_time,
                "close": close_time,
                "is_closed": False,
            })

    return result if result else None


# ─── Миграция БД ─────────────────────────────────────────────────────────────

def _ensure_columns(conn: sqlite3.Connection):
    """Добавить служебные колонки если их нет."""
    cols = [row[1] for row in conn.execute("PRAGMA table_info(restaurants)").fetchall()]

    migrations = [
        ("yandex_checked_at", "ALTER TABLE restaurants ADD COLUMN yandex_checked_at TEXT"),
        ("yandex_matched", "ALTER TABLE restaurants ADD COLUMN yandex_matched INTEGER DEFAULT 0"),
        ("yandex_closed", "ALTER TABLE restaurants ADD COLUMN yandex_closed INTEGER DEFAULT 0"),
        ("yandex_name", "ALTER TABLE restaurants ADD COLUMN yandex_name TEXT"),
        ("yandex_hours_raw", "ALTER TABLE restaurants ADD COLUMN yandex_hours_raw TEXT"),
    ]

    for col_name, sql in migrations:
        if col_name not in cols:
            conn.execute(sql)
            print(f"  [DB] Добавлена колонка: {col_name}")

    conn.commit()


def _db_retry(conn, sql, params=(), max_retries=30):
    """Execute SQL with retry on database locked."""
    for attempt in range(max_retries):
        try:
            conn.execute(sql, params)
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                time.sleep(min(5, 1 + attempt * 0.5))
            else:
                raise


def _db_commit_retry(conn, max_retries=30):
    """Commit with retry on database locked."""
    for attempt in range(max_retries):
        try:
            conn.commit()
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                time.sleep(min(5, 1 + attempt * 0.5))
            else:
                raise


# ─── Основная логика ─────────────────────────────────────────────────────────

def run_yandex_hours(city: str = None, limit: int = 0, reset: bool = False):
    """
    Основная функция: сверка ресторанов с Яндекс Картами.
    """
    print("\n" + "=" * 60)
    print("  ЯНДЕКС КАРТЫ: сверка часов работы и закрытых заведений")
    print("=" * 60)

    conn = _get_connection()
    _ensure_columns(conn)

    if reset:
        conn.execute("PRAGMA busy_timeout = 30000")  # 30 сек ожидание лока
        conn.execute("UPDATE restaurants SET yandex_checked_at = NULL, yandex_matched = 0, "
                      "yandex_closed = 0, yandex_name = NULL, yandex_hours_raw = NULL")
        conn.commit()
        print("[Yandex] Прогресс сброшен.")

    # Выборка ресторанов для проверки
    where = [
        "is_duplicate = 0",
        "lat IS NOT NULL",
        "lng IS NOT NULL",
        "yandex_checked_at IS NULL",
    ]
    params = []

    if city:
        where.append("city = ?")
        params.append(city)

    query = f"""
        SELECT id, name, city, address, lat, lng, phone, status, opening_hours
        FROM restaurants
        WHERE {' AND '.join(where)}
        ORDER BY
            CASE WHEN city = 'Москва' THEN 0
                 WHEN city = 'Санкт-Петербург' THEN 1
                 ELSE 2 END,
            id
    """
    if limit > 0:
        query += f" LIMIT {limit}"

    rows = conn.execute(query, params).fetchall()
    total = len(rows)

    if total == 0:
        already = conn.execute(
            "SELECT COUNT(*) FROM restaurants WHERE yandex_checked_at IS NOT NULL"
        ).fetchone()[0]
        print(f"[Yandex] Все рестораны уже проверены ({already} шт.).")
        print("         Для повторной проверки: --reset")
        conn.close()
        return

    print(f"[Yandex] К проверке: {total:,} ресторанов")
    if city:
        print(f"         Город: {city}")

    stats = {
        "checked": 0,
        "matched": 0,
        "closed": 0,
        "hours_updated": 0,
        "not_found": 0,
        "errors": 0,
    }

    try:
        log_import('enrichment', 'yandex_hours', 'started', total)
    except Exception:
        pass

    session = _create_session()
    consecutive_errors = 0
    max_consecutive_errors = 15

    start_time = time.time()

    for idx, row in enumerate(rows):
        rest_id = row['id']
        rest_name = row['name']
        rest_addr = row['address'] or ''
        rest_lat = row['lat']
        rest_lng = row['lng']

        # Прогресс
        if (idx + 1) % 100 == 0 or idx == 0:
            elapsed = time.time() - start_time
            rate = (idx + 1) / elapsed if elapsed > 0 else 0
            eta_s = (total - idx - 1) / rate if rate > 0 else 0
            eta_h = eta_s / 3600
            print(f"\n[Yandex] {idx + 1:,}/{total:,} "
                  f"({(idx + 1) / total * 100:.1f}%) | "
                  f"Найдено: {stats['matched']} | "
                  f"Закрыто: {stats['closed']} | "
                  f"Часы: {stats['hours_updated']} | "
                  f"Ошибки: {stats['errors']} | "
                  f"ETA: {eta_h:.1f}ч", flush=True)

        # Поиск на Яндексе
        results = _search_yandex(session, rest_name, rest_addr, rest_lat, rest_lng)

        # Обработка ошибок
        if results and isinstance(results[0], dict) and "_error" in results[0]:
            error = results[0]["_error"]
            stats["errors"] += 1
            consecutive_errors += 1

            if error in ("rate_limit", "forbidden", "captcha"):
                print(f"  [{error}] Ждём {BLOCK_DELAY}с, пересоздаём сессию...")
                time.sleep(BLOCK_DELAY)
                session = _create_session()
                if consecutive_errors >= max_consecutive_errors:
                    print(f"\n[!] {max_consecutive_errors} ошибок подряд, останавливаемся.")
                    print("    Прогресс сохранён. Перезапустите позже.")
                    break
                continue  # Повторим этот ресторан

            # Другие ошибки (timeout и пр.) — помечаем и идём дальше
            _db_retry(conn,
                "UPDATE restaurants SET yandex_checked_at = ? WHERE id = ?",
                (datetime.now().isoformat(), rest_id)
            )
            if consecutive_errors >= max_consecutive_errors:
                print(f"\n[!] {max_consecutive_errors} ошибок подряд, останавливаемся.")
                break
            time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
            continue

        consecutive_errors = 0
        stats["checked"] += 1
        now = datetime.now().isoformat()

        # Ищем совпадение среди результатов
        matched_item = None
        for item in results:
            yandex_name = item.get("title", "")
            if _is_match(rest_name, yandex_name):
                matched_item = item
                break

        if matched_item is None:
            stats["not_found"] += 1
            # Сохраняем имя первого результата (если был) для отладки
            first_name = results[0].get("title", "") if results else ""
            _db_retry(conn,
                "UPDATE restaurants SET yandex_checked_at = ?, yandex_matched = 0, "
                "yandex_name = ? WHERE id = ?",
                (now, first_name or None, rest_id)
            )
        else:
            yandex_name = matched_item.get("title", "")
            stats["matched"] += 1

            if _is_permanently_closed(matched_item):
                # Заведение закрыто навсегда
                stats["closed"] += 1
                _db_retry(conn,
                    "UPDATE restaurants SET yandex_checked_at = ?, yandex_matched = 1, "
                    "yandex_closed = 1, yandex_name = ?, status = 'closed' WHERE id = ?",
                    (now, yandex_name, rest_id)
                )
            else:
                # Извлекаем часы работы
                hours = _extract_working_hours(matched_item)
                hours_json = json.dumps(hours, ensure_ascii=False) if hours else None

                _db_retry(conn,
                    "UPDATE restaurants SET yandex_checked_at = ?, yandex_matched = 1, "
                    "yandex_closed = 0, yandex_name = ?, yandex_hours_raw = ? WHERE id = ?",
                    (now, yandex_name, hours_json, rest_id)
                )

                if hours:
                    stats["hours_updated"] += 1
                    # Обновляем structured working_hours
                    _db_retry(conn,
                        "DELETE FROM working_hours WHERE restaurant_id = ?",
                        (rest_id,)
                    )
                    for h in hours:
                        _db_retry(conn,
                            "INSERT INTO working_hours "
                            "(restaurant_id, day_of_week, open_time, close_time, is_closed) "
                            "VALUES (?, ?, ?, ?, ?)",
                            (rest_id, h["day"], h["open"], h["close"],
                             1 if h["is_closed"] else 0)
                        )

                    # Текстовое представление
                    days_ru = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
                    parts = []
                    for h in hours:
                        if h["is_closed"]:
                            parts.append(f"{days_ru[h['day']]}: выходной")
                        else:
                            parts.append(f"{days_ru[h['day']]}: {h['open']}-{h['close']}")
                    _db_retry(conn,
                        "UPDATE restaurants SET opening_hours = ? WHERE id = ?",
                        ("; ".join(parts), rest_id)
                    )

        # Коммит батчами
        if (idx + 1) % COMMIT_BATCH == 0:
            _db_commit_retry(conn)

        # Задержка между запросами
        time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

    # Финальный коммит
    _db_commit_retry(conn)

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("  РЕЗУЛЬТАТЫ СВЕРКИ С ЯНДЕКС КАРТАМИ")
    print("=" * 60)
    print(f"  Проверено:          {stats['checked']:,}")
    print(f"  Найдено совпадений: {stats['matched']:,}")
    print(f"  Закрыто навсегда:   {stats['closed']:,}")
    print(f"  Часы обновлены:     {stats['hours_updated']:,}")
    print(f"  Не найдено:         {stats['not_found']:,}")
    print(f"  Ошибки:             {stats['errors']:,}")
    print(f"  Время:              {elapsed / 3600:.1f} часов")

    # Итого по всей базе
    total_checked = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE yandex_checked_at IS NOT NULL"
    ).fetchone()[0]
    total_closed = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE yandex_closed = 1"
    ).fetchone()[0]
    total_remaining = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE yandex_checked_at IS NULL "
        "AND is_duplicate = 0 AND lat IS NOT NULL"
    ).fetchone()[0]

    print(f"\n  Всего проверено:    {total_checked:,}")
    print(f"  Всего закрытых:     {total_closed:,}")
    print(f"  Осталось:           {total_remaining:,}")

    conn.close()

    try:
        log_import('enrichment', 'yandex_hours', 'completed', stats['checked'],
                   json.dumps(stats, ensure_ascii=False))
    except Exception:
        pass  # не критично, лог — просто для статистики


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Яндекс Карты: сверка часов и закрытых")
    parser.add_argument('--city', type=str, help='Фильтр по городу')
    parser.add_argument('--limit', type=int, default=0, help='Лимит ресторанов')
    parser.add_argument('--reset', action='store_true', help='Сбросить прогресс')
    args = parser.parse_args()
    run_yandex_hours(city=args.city, limit=args.limit, reset=args.reset)
