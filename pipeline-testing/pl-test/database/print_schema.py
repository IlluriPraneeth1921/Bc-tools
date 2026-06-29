import json

with open(r'c:\Whitelisted\Projects\WIDHS Testing\pl-test\database\stage2_schema.json') as f:
    data = json.load(f)

for table, info in data.items():
    print(f'\n{table} ({info["column_count"]} cols):')
    for col in info['columns']:
        ml = f'({col["max_length"]})' if col['max_length'] else ''
        print(f'  {col["ordinal"]:2d}. {col["name"]:<45} {col["data_type"]}{ml}')
