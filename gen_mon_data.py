import pandas as pd
import re
import json
from collections import defaultdict

ALIASES = {
    '정상어학원': '정상',
    '깊생': '깊은생각',
    '미탐': '미래탐구',
    '유튜엠': '유투엠',
    '황소': '황소수학',
}
DISPLAY_NAMES = {
    '수미사': '수학에미친사람들',
    '황소수학': '생각하는황소',
}
US_ACADEMIES = {'올림피아드', '유투엠'}

def apply_alias(name):
    name = name.strip()
    return ALIASES.get(name, name)

def canonical(name):
    name = apply_alias(name)
    return DISPLAY_NAMES.get(name, name)

df = pd.read_excel('C:\\Users\\sykim\\업로드전용\\SynologyDrive\\자동화\\marketingtool\\DB.xlsx')

# Normalize 작성일 to YYYY.MM
def parse_date(d):
    if pd.isna(d):
        return None
    s = str(d).strip()
    m = re.match(r'(\d{4})-(\d{2})', s)
    if m:
        return f"{m.group(1)}.{int(m.group(2)):02d}"
    return None

df['date_key'] = df['작성일'].apply(parse_date)

# ALL_MONTHS sorted
all_months_set = set(df['date_key'].dropna())
ALL_MONTHS = sorted(all_months_set)
DATE_TO_IDX = {m: i for i, m in enumerate(ALL_MONTHS)}

# MON_MONTHS display: '24.1', '25.12', etc.
def fmt_month(ym):
    yr, mo = ym.split('.')
    return str(int(yr[2:])) + '.' + str(int(mo))

MON_MONTHS_DISPLAY = [fmt_month(m) for m in ALL_MONTHS]

# YEAR_RANGE
year_range = {}
for yr in ['2024', '2025', '2026']:
    idxs = [i for i, m in enumerate(ALL_MONTHS) if m.startswith(yr)]
    if idxs:
        year_range[yr + '년'] = [min(idxs), max(idxs)]

REGIONS = ['광진', '성동', '동대문', '중랑', '중계', '미사', '송파']

# Extract all academy names from 기타 column to determine canonical counts
academy_row_counts = defaultdict(set)  # canonical -> set of row indices

for idx, row in df.iterrows():
    gita = row['기타']
    if pd.isna(gita):
        continue
    names_raw = [x.strip() for x in str(gita).split(',')]
    seen_canonicals = set()
    for n in names_raw:
        if not n:
            continue
        c = canonical(n)
        seen_canonicals.add(c)
    for c in seen_canonicals:
        academy_row_counts[c].add(idx)

# Filter: >= 3 mentions
eligible = {c: rows for c, rows in academy_row_counts.items() if len(rows) >= 3}

print("Eligible academies (>=3 mentions):")
for c, rows in sorted(eligible.items(), key=lambda x: -len(x[1])):
    print(f"  {c}: {len(rows)}")

# Build data per academy
def build_academy(ac_name):
    us = ac_name in US_ACADEMIES

    # Mentions: region x period counts
    mentions = defaultdict(lambda: defaultdict(int))
    monthly = defaultdict(lambda: [0] * len(ALL_MONTHS))

    matching_rows = []
    for idx, row in df.iterrows():
        gita = row['기타']
        if pd.isna(gita):
            continue
        names_raw = [canonical(x.strip()) for x in str(gita).split(',') if x.strip()]
        if ac_name in names_raw:
            matching_rows.append(row)

    for row in matching_rows:
        region = str(row['지역']).strip() if not pd.isna(row['지역']) else None
        dk = row['date_key']
        yr = dk[:4] + '년' if dk else None

        regions_to_update = ['전체']
        if region and region in REGIONS:
            regions_to_update.append(region)

        for r in regions_to_update:
            mentions[r]['전체'] += 1
            if yr:
                mentions[r][yr] += 1
            if dk:
                mentions[r][dk] += 1

        if dk and dk in DATE_TO_IDX:
            midx = DATE_TO_IDX[dk]
            monthly['전체'][midx] += 1
            if region and region in REGIONS:
                monthly[region][midx] += 1

    # Only keep regions with data
    monthly_out = {}
    for r, arr in monthly.items():
        if any(v > 0 for v in arr):
            monthly_out[r] = arr

    # pros/cons from rows where 경쟁학원 == ac_name
    ac_rows = df[df['경쟁학원'].apply(lambda x: str(x).strip() if not pd.isna(x) else '') == ac_name]

    pros_map = defaultdict(list)
    cons_map = defaultdict(list)

    for _, row in ac_rows.iterrows():
        title = str(row['제목']).strip() if not pd.isna(row['제목']) else ''
        link = str(row['링크']).strip() if not pd.isna(row['링크']) else ''
        row_region = str(row['지역']).strip() if not pd.isna(row['지역']) else ''
        row_date = row['date_key'] if not pd.isna(row['date_key']) else ''
        post = {'text': title, 'url': link if link and link != 'nan' else '', 'region': row_region, 'date': row_date}

        pros_val = row['장점']
        if not pd.isna(pros_val):
            for tag in str(pros_val).split(','):
                tag = tag.strip()
                if tag:
                    pros_map[tag].append(post)

        cons_val = row['단점']
        if not pd.isna(cons_val):
            for tag in str(cons_val).split(','):
                tag = tag.strip()
                if tag:
                    cons_map[tag].append(post)

    pros = [{'label': lbl, 'count': len(posts), 'posts': posts} for lbl, posts in pros_map.items()]
    cons = [{'label': lbl, 'count': len(posts), 'posts': posts} for lbl, posts in cons_map.items()]

    # allPosts from 기타 matching rows (max 10, with link)
    all_posts = []
    for row in matching_rows[:10]:
        title = str(row['제목']).strip() if not pd.isna(row['제목']) else ''
        link = str(row['링크']).strip() if not pd.isna(row['링크']) else ''
        all_posts.append({'text': title, 'url': link if link and link != 'nan' else ''})

    return {
        'name': ac_name,
        'us': us,
        'mentions': {r: dict(v) for r, v in mentions.items()},
        'monthly': monthly_out,
        'pros': pros,
        'cons': cons,
        'allPosts': all_posts,
    }

academies = []
for ac_name in sorted(eligible.keys()):
    a = build_academy(ac_name)
    academies.append(a)

# Sort by total mentions desc
academies.sort(key=lambda x: -(x['mentions'].get('전체', {}).get('전체', 0)))

print("\n=== Academy total mentions ===")
for a in academies:
    total = a['mentions'].get('전체', {}).get('전체', 0)
    region_counts = {r: a['mentions'].get(r, {}).get('전체', 0) for r in REGIONS if r in a['mentions']}
    print(f"  {a['name']}: 전체={total}, regions={region_counts}")

# Generate JS
def js_str(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

lines = ['var MON_DATA = [']
for i, ac in enumerate(academies):
    comma = ',' if i < len(academies) - 1 else ''

    # mentions block - sort keys: 전체 first, then years, then months
    def sort_key(k):
        if k == '전체': return (0, '')
        if '년' in k: return (1, k)
        return (2, k)

    m_parts = []
    for region, period_dict in ac['mentions'].items():
        inner = ','.join(f"{js_str(k)}:{v}" for k, v in sorted(period_dict.items(), key=lambda x: sort_key(x[0])))
        m_parts.append(f"    {js_str(region)}: {{{inner}}}")
    mentions_block = 'mentions: {\n' + ',\n'.join(m_parts) + '\n  }'

    # monthly block
    mo_parts = []
    # 전체 first
    if '전체' in ac['monthly']:
        arr = ac['monthly']['전체']
        mo_parts.append(f"    {js_str('전체')}: [{','.join(str(v) for v in arr)}]")
    for region, arr in ac['monthly'].items():
        if region == '전체':
            continue
        mo_parts.append(f"    {js_str(region)}: [{','.join(str(v) for v in arr)}]")
    monthly_block = 'monthly: {\n' + ',\n'.join(mo_parts) + '\n  }'

    # pros
    pros_items = []
    for p in ac['pros']:
        posts_js = '[' + ','.join('{text:' + js_str(pp['text']) + ',url:' + js_str(pp['url']) + ',region:' + js_str(pp.get('region','')) + ',date:' + js_str(pp.get('date','')) + '}' for pp in p['posts']) + ']'
        pros_items.append(f"    {{label:{js_str(p['label'])},count:{p['count']},posts:{posts_js}}}")
    pros_block = 'pros: [\n' + ',\n'.join(pros_items) + '\n  ]'

    # cons
    cons_items = []
    for c in ac['cons']:
        posts_js = '[' + ','.join('{text:' + js_str(pp['text']) + ',url:' + js_str(pp['url']) + ',region:' + js_str(pp.get('region','')) + ',date:' + js_str(pp.get('date','')) + '}' for pp in c['posts']) + ']'
        cons_items.append(f"    {{label:{js_str(c['label'])},count:{c['count']},posts:{posts_js}}}")
    cons_block = 'cons: [\n' + ',\n'.join(cons_items) + '\n  ]'

    # allPosts
    ap_items = ['{text:' + js_str(p['text']) + ',url:' + js_str(p['url']) + '}' for p in ac['allPosts']]
    allposts_block = 'allPosts: [' + ','.join(ap_items) + ']'

    lines.append(f"  {{")
    lines.append(f"    name: {js_str(ac['name'])}, us: {'true' if ac['us'] else 'false'},")
    lines.append(f"    {mentions_block},")
    lines.append(f"    {monthly_block},")
    lines.append(f"    {pros_block},")
    lines.append(f"    {cons_block},")
    lines.append(f"    {allposts_block}")
    lines.append(f"  }}{comma}")

lines.append('];')

# MON_MONTHS
lines.append(f"var MON_MONTHS = [{','.join(js_str(m) for m in MON_MONTHS_DISPLAY)}];")

# MON_DATE_TO_IDX
idx_parts = ','.join(f"{js_str(k)}:{v}" for k, v in DATE_TO_IDX.items())
lines.append(f"var MON_DATE_TO_IDX = {{{idx_parts}}};")

# MON_YEAR_RANGE
yr_parts = ','.join(f"{js_str(k)}:[{v[0]},{v[1]}]" for k, v in year_range.items())
lines.append(f"var MON_YEAR_RANGE = {{{yr_parts}}};")

# MON_REGIONS (방이 instead of 송파)
display_regions_ordered = ['광진', '성동', '동대문', '중랑', '중계', '미사', '방이']
data_regions = set()
for ac in academies:
    for r in ac['mentions']:
        if r != '전체':
            data_regions.add(r)

final_display_regions = []
for r in display_regions_ordered:
    db_r = '송파' if r == '방이' else r
    if db_r in data_regions:
        final_display_regions.append(r)

lines.append(f"var MON_REGIONS = [{','.join(js_str(r) for r in final_display_regions)}];")
lines.append(f"var MON_REGION_MAP = {{'방이':'송파'}};")

output = '\n'.join(lines) + '\n'
out_path = 'C:\\Users\\sykim\\업로드전용\\SynologyDrive\\자동화\\marketingtool\\mon_data_new.js'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\nWritten to {out_path}")
print(f"Total academies: {len(academies)}")
print(f"ALL_MONTHS ({len(ALL_MONTHS)}): {ALL_MONTHS[0]} ~ {ALL_MONTHS[-1]}")
