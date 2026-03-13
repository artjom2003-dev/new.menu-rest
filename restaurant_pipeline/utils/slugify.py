"""
Транслитерация и генерация slug для русских названий.
"""
import re
import unicodedata

_TRANSLIT_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def transliterate(text: str) -> str:
    """Транслитерация русского текста в латиницу."""
    result = []
    for char in text:
        lower = char.lower()
        if lower in _TRANSLIT_MAP:
            tr = _TRANSLIT_MAP[lower]
            result.append(tr)
        else:
            result.append(char)
    return ''.join(result)


def make_slug(name: str, max_length: int = 200) -> str:
    """Генерация slug из названия."""
    if not name:
        return ""
    text = transliterate(name.strip().lower())
    # Нормализация unicode
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Заменяем не-буквы-цифры на дефис
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    # Убираем двойные дефисы
    text = re.sub(r'-+', '-', text)
    return text[:max_length] if text else "restaurant"


def make_unique_slug(name: str, existing_slugs: set, max_length: int = 200) -> str:
    """Генерация уникального slug."""
    base = make_slug(name, max_length - 5)
    if not base:
        base = "restaurant"
    slug = base
    counter = 2
    while slug in existing_slugs:
        slug = f"{base}-{counter}"
        counter += 1
    existing_slugs.add(slug)
    return slug
