"""
Определение "здорового выбора" среди блюд.
Помечает блюда как is_healthy_choice на основе калорийности, ключевых слов в названии и составе.
"""
import sys
import os
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.db import get_connection, log_import

HEALTHY_KEYWORDS = [
    'салат', 'гриль', 'овощ', 'паров', 'запечен', 'диетическ',
    'фитнес', 'детокс', 'смузи', 'боул', 'веган', 'постн',
    'шпинат', 'брокколи', 'киноа', 'авокадо', 'тофу',
    'зелен', 'лёгк', 'легк', 'витамин', 'органическ',
]

UNHEALTHY_KEYWORDS = [
    'фри', 'жарен', 'фритюр', 'сахар', 'крем', 'торт',
    'пирожн', 'сливочн', 'майонез', 'копчен', 'бекон',
    'колбас', 'наггетс', 'шоколад', 'глазур', 'карамел',
    'панировк', 'во фритюр', 'сало',
]


def _get_field(row, index, name):
    """Получить значение поля — работает и с Row (dict-like) и с tuple."""
    try:
        return row[name]
    except (TypeError, IndexError):
        try:
            return row[index]
        except (TypeError, IndexError):
            return None


def run_healthy_choice_detector():
    """Основная функция: пометить здоровые блюда."""
    print("\n[Healthy Choice] Определение здоровых блюд...")
    log_import('enrichment', 'healthy_choice_detector', 'started')

    conn = get_connection()

    # Убедимся что колонка существует
    cols = [row[1] for row in conn.execute("PRAGMA table_info(dishes)").fetchall()]
    if 'is_healthy_choice' not in cols:
        conn.execute("ALTER TABLE dishes ADD COLUMN is_healthy_choice INTEGER DEFAULT 0")
        conn.commit()

    # Сброс предыдущих меток
    conn.execute("UPDATE dishes SET is_healthy_choice = 0")

    dishes = conn.execute(
        "SELECT id, name, composition, calories FROM dishes"
    ).fetchall()

    total = len(dishes)
    healthy_count = 0
    calorie_match = 0
    keyword_match = 0

    for dish in dishes:
        dish_id = _get_field(dish, 0, 'id')
        name = _get_field(dish, 1, 'name') or ''
        composition = _get_field(dish, 2, 'composition') or ''
        calories = _get_field(dish, 3, 'calories')

        name_lower = name.lower()
        comp_lower = composition.lower()
        text = name_lower + ' ' + comp_lower

        is_healthy = False
        reason = None

        # Rule 1: Low calorie (< 400 kcal)
        if calories is not None and isinstance(calories, (int, float)) and calories > 0 and calories < 400:
            is_healthy = True
            reason = 'calories'
            calorie_match += 1

        # Rule 2: Healthy keywords in name or composition
        if any(kw in text for kw in HEALTHY_KEYWORDS):
            is_healthy = True
            if reason is None:
                reason = 'keyword'
                keyword_match += 1

        # Rule 3: Unhealthy override — cancel healthy status
        if any(kw in text for kw in UNHEALTHY_KEYWORDS):
            is_healthy = False

        if is_healthy:
            conn.execute(
                "UPDATE dishes SET is_healthy_choice = 1 WHERE id = ?",
                (dish_id,)
            )
            healthy_count += 1

    conn.commit()

    # Статистика
    print(f"\n  [Healthy Choice] Результаты:")
    print(f"    Всего блюд: {total}")
    print(f"    Здоровый выбор: {healthy_count}")
    print(f"      - По калорийности (<400): {calorie_match}")
    print(f"      - По ключевым словам: {keyword_match}")
    if total > 0:
        print(f"    Доля здоровых: {healthy_count / total * 100:.1f}%")

    log_import('enrichment', 'healthy_choice_detector', 'completed', healthy_count)
    conn.close()
    print("  [Healthy Choice] Готово.")


if __name__ == '__main__':
    run_healthy_choice_detector()
