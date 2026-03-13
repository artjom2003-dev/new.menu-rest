"""
Экспорт данных из pipeline DB в CSV.
"""
import csv
from pathlib import Path
from utils.db import get_connection
from config.settings import PROCESSED_DIR


def export_restaurants_csv(output_dir: Path = None):
    """Экспорт ресторанов в CSV."""
    if output_dir is None:
        output_dir = PROCESSED_DIR / "export"
    output_dir.mkdir(parents=True, exist_ok=True)

    conn = get_connection()

    # Рестораны
    filename = output_dir / "restaurants.csv"
    rows = conn.execute("""
        SELECT r.id, r.name, r.slug, r.city, r.address, r.metro_station,
               r.lat, r.lng, r.phone, r.email, r.website, r.description,
               r.cuisine, r.price_range, r.average_bill, r.rating,
               r.review_count, r.opening_hours, r.status, r.source,
               r.has_wifi, r.has_delivery, r.instagram, r.vk
        FROM restaurants r
        WHERE r.is_duplicate = 0
        ORDER BY r.city, r.name
    """).fetchall()

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'id', 'name', 'slug', 'city', 'address', 'metro_station',
            'lat', 'lng', 'phone', 'email', 'website', 'description',
            'cuisine', 'price_range', 'average_bill', 'rating',
            'review_count', 'opening_hours', 'status', 'source',
            'has_wifi', 'has_delivery', 'instagram', 'vk'
        ])
        for row in rows:
            writer.writerow(list(row))

    print(f"[Export] restaurants.csv: {len(rows):,} записей -> {filename}")

    # Блюда
    filename = output_dir / "dishes.csv"
    rows = conn.execute("""
        SELECT d.id, d.restaurant_id, r.name as restaurant_name,
               d.category, d.name, d.description, d.price, d.weight,
               d.calories, d.protein, d.fat, d.carbs, d.source
        FROM dishes d
        JOIN restaurants r ON r.id = d.restaurant_id
        WHERE r.is_duplicate = 0
        ORDER BY d.restaurant_id, d.category, d.name
    """).fetchall()

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'id', 'restaurant_id', 'restaurant_name',
            'category', 'name', 'description', 'price', 'weight',
            'calories', 'protein', 'fat', 'carbs', 'source'
        ])
        for row in rows:
            writer.writerow(list(row))

    print(f"[Export] dishes.csv: {len(rows):,} записей -> {filename}")

    conn.close()


def print_stats():
    """Вывести статистику pipeline DB."""
    conn = get_connection()

    print(f"\n{'='*60}")
    print("СТАТИСТИКА PIPELINE DB")
    print(f"{'='*60}")

    total = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE is_duplicate = 0"
    ).fetchone()[0]
    print(f"\n  Всего ресторанов (уникальных): {total:,}")

    # По источникам
    print("\n  По источникам:")
    for row in conn.execute("""
        SELECT source, COUNT(*) as cnt
        FROM restaurants WHERE is_duplicate = 0
        GROUP BY source ORDER BY cnt DESC
    """):
        print(f"    {row['source']:15s} {row['cnt']:>8,}")

    # По городам (топ-15)
    print("\n  Топ-15 городов:")
    for row in conn.execute("""
        SELECT city, COUNT(*) as cnt
        FROM restaurants WHERE is_duplicate = 0 AND city IS NOT NULL
        GROUP BY city ORDER BY cnt DESC LIMIT 15
    """):
        print(f"    {row['city']:25s} {row['cnt']:>8,}")

    # По статусам
    print("\n  По статусам:")
    for row in conn.execute("""
        SELECT status, COUNT(*) as cnt
        FROM restaurants WHERE is_duplicate = 0
        GROUP BY status ORDER BY cnt DESC
    """):
        print(f"    {row['status']:15s} {row['cnt']:>8,}")

    # Контент
    photos = conn.execute("SELECT COUNT(*) FROM photos").fetchone()[0]
    dishes = conn.execute("SELECT COUNT(*) FROM dishes").fetchone()[0]
    reviews = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    cuisines_links = conn.execute("SELECT COUNT(*) FROM restaurant_cuisines").fetchone()[0]

    print(f"\n  Контент:")
    print(f"    Фотографий:         {photos:>8,}")
    print(f"    Блюд (меню):        {dishes:>8,}")
    print(f"    Отзывов:            {reviews:>8,}")
    print(f"    Связей кухонь:      {cuisines_links:>8,}")

    print(f"\n{'='*60}")
    conn.close()


if __name__ == '__main__':
    print_stats()
    export_restaurants_csv()
