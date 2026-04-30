import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';

export interface MetroEntry {
  /** Каноническое имя как в БД, например "Шаболовская" */
  name: string;
  /** city slug из БД, например "moscow" */
  city: string;
  /** Центроид ресторанов на этой станции */
  lat: number;
  lng: number;
  /** Сколько ресторанов привязано — для разрешения конфликтов и фильтрации мусора */
  count: number;
}

/**
 * Динамический индекс станций метро. На старте бэкенда тянет все DISTINCT metro_station
 * из БД, фильтрует мусор (количество <2, мусорные строки от скрейперов), индексирует
 * по нормализованному имени и стему. Lookup толерантен к падежам, регистру и тире.
 *
 * Преимущества над хардкодом:
 *  - Покрывает ВСЕ станции во всех городах (Москва ~250, СПБ ~70, региональные).
 *  - Координаты точные — центроид реальных ресторанов на станции.
 *  - Новая станция / новый город → автоматически подхватывается на следующем рестарте.
 *  - При конфликте (омонимы Маяковская МСК/СПБ) выигрывает город с большим числом ресторанов.
 */
@Injectable()
export class MetroIndexService implements OnModuleInit {
  private readonly logger = new Logger(MetroIndexService.name);
  private byKey = new Map<string, MetroEntry>(); // normalized lookup key → entry
  private entries: MetroEntry[] = [];
  private loaded = false;

  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async onModuleInit() {
    try {
      await this.refresh();
    } catch (e) {
      this.logger.error(`metro index init failed: ${(e as Error).message}`);
    }
  }

  async refresh() {
    const rows = (await this.restaurantRepo.query(`
      SELECT
        r.metro_station AS name,
        c.slug AS city,
        AVG(r.lat)::float AS lat,
        AVG(r.lng)::float AS lng,
        COUNT(*)::int AS cnt
      FROM restaurants r
      JOIN cities c ON c.id = r.city_id
      WHERE r.metro_station IS NOT NULL
        AND r.metro_station <> ''
        AND r.status = 'published'
        AND r.lat IS NOT NULL AND r.lng IS NOT NULL
        AND char_length(r.metro_station) BETWEEN 2 AND 60
        -- Отсеиваем мусор от старых скрейперов (видно в реальных данных)
        AND r.metro_station NOT ILIKE 'В меню%'
        AND r.metro_station NOT ILIKE 'А еще%'
        AND r.metro_station NOT ILIKE 'А ещё%'
        AND r.metro_station NOT ILIKE 'В связи%'
        AND r.metro_station NOT ILIKE 'Бренд-шеф%'
        AND r.metro_station NOT ILIKE 'В общем%'
        AND r.metro_station NOT ILIKE 'Здесь%'
        AND r.metro_station NOT ILIKE '%наличии%'
        AND r.metro_station NOT ILIKE '%представлены%'
        AND r.metro_station NOT ILIKE 'и %'
        AND r.metro_station NOT LIKE '%.%' -- предложения, типа "Здесь готовят. Лучшие..."
      GROUP BY r.metro_station, c.slug
      HAVING COUNT(*) >= 2
    `)) as Array<{ name: string; city: string; lat: number; lng: number; cnt: number }>;

    this.entries = rows.map(r => ({
      name: r.name,
      city: r.city,
      lat: r.lat,
      lng: r.lng,
      count: r.cnt,
    }));

    this.byKey.clear();
    for (const e of this.entries) {
      for (const key of generateLookupKeys(e.name)) {
        const existing = this.byKey.get(key);
        // Конфликт (омоним в разных городах) — побеждает запись с большим числом ресторанов
        if (!existing || e.count > existing.count) this.byKey.set(key, e);
      }
    }

    this.loaded = true;
    this.logger.log(
      `metro index: ${this.entries.length} stations (${this.byKey.size} lookup keys) — ` +
      Object.entries(rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.city] = (acc[r.city] || 0) + 1;
        return acc;
      }, {})).map(([c, n]) => `${c}=${n}`).join(', '),
    );
  }

  /**
   * Найти станцию по тексту от пользователя: "шаболовской" / "Шаболовка" /
   * "м. Шаболовская" / "Китай-Город" / "китай город" → запись из БД.
   */
  lookup(rawText: string | undefined | null): MetroEntry | undefined {
    if (!rawText || !this.loaded) return undefined;
    const candidates = generateQueryKeys(rawText);
    for (const c of candidates) {
      const hit = this.byKey.get(c);
      if (hit) return hit;
    }
    return undefined;
  }

  /** Все записи (для тестов/отладки) */
  all(): MetroEntry[] {
    return this.entries;
  }
}

/**
 * Сгенерировать lookup-ключи для канонического имени станции из БД.
 * "Шаболовская" → ['шаболовская', 'шаболовск', 'шаболов']
 * "Китай-город" → ['китай-город', 'китайгород', 'китай город', 'китай-горо', 'китайгоро', 'китай горо']
 */
function generateLookupKeys(canonicalName: string): string[] {
  const normalized = normalize(canonicalName);
  const keys = new Set<string>();
  keys.add(normalized);
  // Варианты с/без тире/пробела
  if (normalized.includes('-')) {
    keys.add(normalized.replace(/-/g, ' '));
    keys.add(normalized.replace(/-/g, ''));
  }
  if (normalized.includes(' ')) {
    keys.add(normalized.replace(/\s+/g, '-'));
    keys.add(normalized.replace(/\s+/g, ''));
  }
  // Стеммированные варианты для каждого
  for (const k of [...keys]) {
    const stem = stemRu(k);
    if (stem !== k && stem.length >= 4) keys.add(stem);
    // Ещё более короткий стем — снимаем 1-2 буквы для тяжёлых склонений
    if (stem.length >= 6) {
      keys.add(stem.slice(0, -1));
      keys.add(stem.slice(0, -2));
    }
  }
  return [...keys];
}

/**
 * Сгенерировать кандидатные ключи для пользовательского ввода.
 * "на Шаболовской" уже extractKeywords отдаст "шаболовской" — здесь
 * добавляем варианты нормализации/стемминга.
 */
function generateQueryKeys(rawText: string): string[] {
  const normalized = normalize(rawText);
  const keys: string[] = [normalized];
  // Если есть тире/пробел — пробуем без них
  if (normalized.includes('-')) keys.push(normalized.replace(/-/g, ''), normalized.replace(/-/g, ' '));
  if (normalized.includes(' ')) keys.push(normalized.replace(/\s+/g, '-'), normalized.replace(/\s+/g, ''));
  // Стеммированные
  const stem = stemRu(normalized);
  if (stem !== normalized && stem.length >= 4) keys.push(stem);
  // Постепенное укорачивание для падежей которые не покрылись стеммером
  if (stem.length >= 6) {
    keys.push(stem.slice(0, -1));
    keys.push(stem.slice(0, -2));
  }
  return keys;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

/**
 * Снять русские окончания падежей. "шаболовской" → "шаболов". "тверская" → "твер".
 * Длинные формы первыми (regex alternation matches left-to-right).
 */
function stemRu(s: string): string {
  if (s.length <= 5) return s;
  return s.replace(/(?:ского|скому|скими|скую|ская|ское|ский|ской|ого|ому|ыми|ими|ые|ых|их|ой|ая|ую|ое|ам|ям|ах|ях|ом|ем|ы|и|а|е|у|о|й)$/, '');
}
