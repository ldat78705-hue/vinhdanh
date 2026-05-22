import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('mau_vinh_danh (4).json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total templates: {len(data)}")
for i, t in enumerate(data):
    print(f"  {i}: id={t.get('id','?')}, name={t.get('name','?')}, width={t.get('width','?')}, height={t.get('height','?')}")
    print(f"       keys: {list(t.keys())}")
    if 'texts' in t:
        print(f"       text keys: {list(t['texts'].keys())}")
    if 'avatar' in t:
        print(f"       avatar: {t['avatar']}")
    if 'hiddenFields' in t:
        print(f"       hiddenFields: {t['hiddenFields']}")
    bg = t.get('backgroundDataUrl', '')
    print(f"       bg length: {len(bg)}")
