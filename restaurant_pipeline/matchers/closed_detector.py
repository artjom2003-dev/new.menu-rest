"""
Детекция закрытых ресторанов.

Ресторан считается закрытым если:
- Legacy-ресторан НЕ найден ни в OSM, ни в других актуальных источниках
- Нет активности (отзывов) > 12 месяцев
"""
import sqlite3
from utils.db import get_connection, log_import


def detect_closed_restaurants():
    """
    Помечает legacy-рестораны как closed/unknown,
    если они не подтверждены из актуальных источников.
    """
    print(f"\n{'='*60}")
    print("ДЕТЕКЦИЯ ЗАКРЫТЫХ РЕСТОРАНОВ")
    print(f"{'='*60}\n")

    conn = get_connection()

    # Legacy-рестораны без совпадений в OSM (не смержены ни с кем)
    legacy_only = conn.execute("""
        SELECT COUNT(*) FROM restaurants
        WHERE source = 'legacy'
          AND is_duplicate = 0
          AND source_ids IS NULL
    """).fetchone()[0]

    # Legacy-рестораны со совпадениями (подтверждены)
    confirmed = conn.execute("""
        SELECT COUNT(*) FROM restaurants
        WHERE source = 'legacy'
          AND is_duplicate = 0
          AND source_ids IS NOT NULL
    """).fetchone()[0]

    print(f"  Legacy без подтверждения: {legacy_only:,}")
    print(f"  Legacy подтверждены:      {confirmed:,}")

    # Помечаем неподтверждённые как unknown
    conn.execute("""
        UPDATE restaurants
        SET status = 'unknown'
        WHERE source = 'legacy'
          AND is_duplicate = 0
          AND source_ids IS NULL
          AND status = 'active'
    """)
    updated = conn.execute("SELECT changes()").fetchone()[0]
    conn.commit()

    print(f"  -> Помечено unknown: {updated:,}")
    log_import('closed_detector', 'detection', 'completed', updated)

    conn.close()


if __name__ == '__main__':
    detect_closed_restaurants()
