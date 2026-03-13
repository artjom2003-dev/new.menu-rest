"""
Menu-Rest Restaurant Pipeline — точка входа.

Использование:
    python main.py --phase 1          # Полная Фаза 1 (Legacy + OSM + Merge)
    python main.py --phase 2          # Фаза 2 (Обогащение данных)
    python main.py --step legacy      # Только импорт legacy БД
    python main.py --step osm         # Только импорт OSM
    python main.py --step osm-high    # OSM только Москва+СПб
    python main.py --step osm-medium  # OSM приоритетные города
    python main.py --step dedup       # Дедупликация
    python main.py --step closed      # Детекция закрытых
    python main.py --step export      # Экспорт CSV
    python main.py --step stats       # Показать статистику
    python main.py --step hours       # Парсинг рабочих часов
    python main.py --step features    # Извлечение фич из legacy
    python main.py --step osm-tags    # Загрузка OSM тегов (API, долго)
    python main.py --step kbzhu       # Оценка КБЖУ блюд
    python main.py --step allergens   # Определение аллергенов
    python main.py --step descriptions # Генерация описаний
    python main.py --step districts   # Извлечение районов из адресов
    python main.py --step healthy     # Определение здоровых блюд
    python main.py --step restoclub   # Парсинг restoclub.ru (~17K ресторанов)
    python main.py --step afisha      # Парсинг afisha.ru (467 городов)
    python main.py --city Москва      # Pipeline для одного города
"""
import sys
import os
import time
import argparse
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    os.environ.setdefault('PYTHONIOENCODING', 'utf-8')

# Добавляем корень pipeline в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from utils.db import init_db, get_connection
from ingestion.legacy_parser import run_legacy_import
from ingestion.osm_import import run_osm_import, run_osm_import_priority
from matchers.dedup import run_deduplication
from matchers.closed_detector import detect_closed_restaurants
from export.csv_export import export_restaurants_csv, print_stats
from config.cities import get_all_cities, HIGH_PRIORITY, MEDIUM_PRIORITY
from enrichment.working_hours_parser import run_working_hours_parser
from enrichment.legacy_features import run_legacy_features
from enrichment.osm_features import run_osm_features_enrichment
from enrichment.kbzhu_estimator import run_kbzhu_estimator
from enrichment.allergen_detector import run_allergen_detector
from enrichment.description_generator import run_description_generator
from enrichment.district_extractor import run_district_extractor
from enrichment.district_geo_matcher import run_district_geo_matcher
from enrichment.healthy_choice_detector import run_healthy_choice_detector
from scrapers.restoclub import run as run_restoclub
from scrapers.afisha import run as run_afisha


def run_phase1(osm_priority: str = 'all'):
    """Фаза 1: Каркас базы."""
    print("\n" + "=" * 60)
    print("  MENU-REST PIPELINE — ФАЗА 1: КАРКАС")
    print("=" * 60)

    start = time.time()

    # 1. Инициализация БД
    init_db()

    # 2. Импорт Legacy
    run_legacy_import()

    # 3. Импорт OSM
    run_osm_import_priority(osm_priority)

    # 4. Дедупликация
    run_deduplication()

    # 5. Детекция закрытых
    detect_closed_restaurants()

    # 6. Статистика
    print_stats()

    # 7. Экспорт
    export_restaurants_csv()

    elapsed = time.time() - start
    print(f"\n✅ Фаза 1 завершена за {elapsed / 60:.1f} минут")


def run_phase2():
    """Фаза 2: Обогащение данных."""
    print("\n" + "=" * 60)
    print("  MENU-REST PIPELINE — ФАЗА 2: ОБОГАЩЕНИЕ")
    print("=" * 60)

    start = time.time()

    # 1. Парсинг рабочих часов (из текста → структура)
    run_working_hours_parser()

    # 2. Извлечение фич из legacy данных (has_wifi, has_delivery, текст описаний)
    run_legacy_features()

    # 3. Загрузка OSM тегов и извлечение фич (requires API, long-running)
    print("\n[Phase 2] OSM tags enrichment — это долгий процесс (API запросы).")
    print("  Запустите отдельно: python main.py --step osm-tags")

    # 4. Оценка КБЖУ для существующих блюд
    run_kbzhu_estimator()

    # 5. Определение аллергенов по названиям/составу блюд
    run_allergen_detector()

    # 6. Генерация описаний для ресторанов без описания
    run_description_generator()

    # 7. Извлечение районов из адресов
    run_district_extractor()

    # 8. Определение здоровых блюд
    run_healthy_choice_detector()

    elapsed = time.time() - start
    print(f"\n✅ Фаза 2 завершена за {elapsed / 60:.1f} минут")
    print("   ⚠ OSM tags enrichment запустите отдельно (python main.py --step osm-tags)")


def run_single_city(city_name: str):
    """Pipeline для одного города."""
    all_cities = get_all_cities()
    city = None
    for c in all_cities:
        if c[0].lower() == city_name.lower():
            city = c
            break

    if not city:
        print(f"[!] Город '{city_name}' не найден в конфигурации.")
        print("Доступные города:")
        for c in all_cities:
            print(f"  - {c[0]}")
        return

    init_db()
    print(f"\nPipeline для города: {city[0]}")
    run_osm_import([city])
    print_stats()


def main():
    parser = argparse.ArgumentParser(description="Menu-Rest Restaurant Pipeline")
    parser.add_argument('--phase', type=int, choices=[1, 2, 3],
                        help='Запустить полную фазу')
    parser.add_argument('--step', type=str,
                        choices=['legacy', 'osm', 'osm-high', 'osm-medium',
                                 'dedup', 'closed', 'export', 'stats', 'init',
                                 'hours', 'features', 'osm-tags', 'kbzhu',
                                 'allergens', 'descriptions', 'districts',
                                 'districts-geo', 'healthy', 'restoclub', 'afisha'],
                        help='Запустить отдельный шаг')
    parser.add_argument('--city', type=str,
                        help='Запустить pipeline для одного города')

    args = parser.parse_args()

    if args.city:
        run_single_city(args.city)
    elif args.phase == 1:
        run_phase1()
    elif args.phase == 2:
        run_phase2()
    elif args.step == 'init':
        init_db()
        print("БД инициализирована.")
    elif args.step == 'legacy':
        init_db()
        run_legacy_import()
    elif args.step == 'osm':
        init_db()
        run_osm_import()
    elif args.step == 'osm-high':
        init_db()
        run_osm_import_priority('high')
    elif args.step == 'osm-medium':
        init_db()
        run_osm_import_priority('medium')
    elif args.step == 'dedup':
        run_deduplication()
    elif args.step == 'closed':
        detect_closed_restaurants()
    elif args.step == 'export':
        export_restaurants_csv()
    elif args.step == 'stats':
        print_stats()
    elif args.step == 'hours':
        run_working_hours_parser()
    elif args.step == 'features':
        run_legacy_features()
    elif args.step == 'osm-tags':
        run_osm_features_enrichment()
    elif args.step == 'kbzhu':
        run_kbzhu_estimator()
    elif args.step == 'allergens':
        run_allergen_detector()
    elif args.step == 'descriptions':
        run_description_generator()
    elif args.step == 'districts':
        run_district_extractor()
    elif args.step == 'districts-geo':
        run_district_geo_matcher()
    elif args.step == 'healthy':
        run_healthy_choice_detector()
    elif args.step == 'restoclub':
        init_db()
        run_restoclub(resume=True)
    elif args.step == 'afisha':
        init_db()
        run_afisha(resume=True)
    else:
        parser.print_help()
        print("\nПримеры:")
        print("  python main.py --phase 1          # Полная Фаза 1")
        print("  python main.py --step legacy       # Только Legacy импорт")
        print("  python main.py --step osm-high     # OSM: Москва + СПб")
        print("  python main.py --city Казань        # Pipeline для Казани")


if __name__ == '__main__':
    main()
