import re, json

html = open('data/raw/tripadvisor/moscow/d691623-Cafe_Pushkin-Moscow_Central_Russia.html', encoding='utf-8').read()

pattern = r'<script[^>]*type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>'
blocks = re.findall(pattern, html, re.DOTALL)

for i, b in enumerate(blocks):
    try:
        obj = json.loads(b)
        if isinstance(obj, dict) and obj.get("@type") == "FoodEstablishment":
            print(json.dumps(obj, indent=2, ensure_ascii=False)[:3000])
    except json.JSONDecodeError:
        pass
