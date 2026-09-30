import os
import random

random.seed(42)

out_dir = os.path.abspath('sample_test_datasets')
os.makedirs(out_dir, exist_ok=True)

prefixes = [
    'Apex', 'Quantum', 'Nexus', 'Vertex', 'Horizon', 'Starlight', 'Beacon', 'Pinnacle',
    'Acro', 'Vanguard', 'Omni', 'BlueWave', 'Silverline', 'Cascade', 'Zenith', 'Titan',
    'Solaris', 'Falcon', 'Atlas', 'Nova', 'Pulse', 'Optima', 'Meridian', 'Vortex',
    'Astra', 'Summit', 'Global', 'Prime', 'Synergy', 'Crest', 'Echo', 'Sterling',
    'Matrix', 'Aura', 'Velocity', 'Frontier', 'Catalyst', 'Brahma', 'Krishna', 'Shree',
    'Ganesh', 'Om', 'Saraswati', 'Ecole', 'Maison', 'Atelier', 'Societe', 'Boutique'
]

roots = [
    'Infotech', 'Technologies', 'Consulting', 'Logistics', 'Solutions', 'Holdings',
    'Industries', 'Ventures', 'Enterprises', 'Labs', 'Analytics', 'Systems',
    'Capital', 'Partners', 'Services', 'Trading', 'Pharma', 'BioLabs', 'Robotics',
    'Energy', 'Retail', 'Design', 'Media', 'Dynamics', 'Works', 'Foods', 'Cafe',
    'Bistro', 'Automotive', 'Studio', 'Network', 'Software', 'Digital', 'Crafts'
]

suffixes = [
    'Inc', 'LLC', 'Corp', 'Corporation', 'Ltd', 'Limited', 'Pvt Ltd', 'Private Limited',
    'SARL', 'GmbH', 'SA', 'LLP', 'PLC', 'NV', 'BV', 'Group', 'Enterprises'
]

streets = [
    'Main St', 'Broadway', 'Market St', 'Park Ave', 'Oak Rd', 'Cedar Lane',
    'Elm St', 'Pine Rd', 'Maple Ave', 'Washington Blvd', 'Lincoln Way',
    'MG Road', 'Indira Nagar', 'Anna Salai', 'Brigade Road', 'Ring Road', 'Sector 18',
    'Rue de Paris', 'Boulevard Haussmann', 'Avenue des Champs', 'Rue de la Paix',
    'Friedrichstrasse', 'Hauptstrasse', 'Bahnhofstrasse', 'Oxford St', 'King St'
]

cities_by_country = {
    'US': [('New York', 'NY', '10001'), ('Los Angeles', 'CA', '90001'), ('Chicago', 'IL', '60601'), ('Houston', 'TX', '77001'), ('Seattle', 'WA', '98101'), ('Austin', 'TX', '73301'), ('Miami', 'FL', '33101')],
    'India': [('Bengaluru', 'Karnataka', '560001'), ('Mumbai', 'Maharashtra', '400001'), ('Delhi', 'Delhi', '110001'), ('Hyderabad', 'Telangana', '500001'), ('Pune', 'Maharashtra', '411001'), ('Chennai', 'Tamil Nadu', '600001')],
    'France': [('Paris', 'Ile-de-France', '75001'), ('Lyon', 'Auvergne-Rhone-Alpes', '69001'), ('Marseille', 'Provence-Alpes-Cote d Azur', '13001'), ('Bordeaux', 'Nouvelle-Aquitaine', '33000'), ('Lille', 'Hauts-de-France', '59000')],
    'Germany': [('Berlin', 'Berlin', '10115'), ('Munich', 'Bavaria', '80331'), ('Frankfurt', 'Hesse', '60311'), ('Hamburg', 'Hamburg', '20095'), ('Stuttgart', 'Baden-Wurttemberg', '70173')],
    'UK': [('London', 'Greater London', 'EC1A 1BB'), ('Manchester', 'Greater Manchester', 'M1 1AE'), ('Birmingham', 'West Midlands', 'B1 1BB'), ('Edinburgh', 'Midlothian', 'EH1 1YZ')],
    'Canada': [('Toronto', 'ON', 'M5H 2N2'), ('Vancouver', 'BC', 'V6B 1A1'), ('Montreal', 'QC', 'H2Y 1C6'), ('Calgary', 'AB', 'T2P 1J9')],
    'Australia': [('Sydney', 'NSW', '2000'), ('Melbourne', 'VIC', '3000'), ('Brisbane', 'QLD', '4000')],
    'Singapore': [('Singapore', 'Central', '018956'), ('Singapore', 'Marina Bay', '018989')]
}

countries = list(cities_by_country.keys())

def generate_base_entity(idx):
    country = random.choice(countries)
    city_info = random.choice(cities_by_country[country])
    prefix = random.choice(prefixes)
    root = random.choice(roots)
    suffix = random.choice(suffixes)
    
    name = f"{prefix} {root} {suffix}"
    street_num = random.randint(10, 9999)
    street = random.choice(streets)
    city, state, zip_code = city_info
    
    address = f"{street_num} {street}, {city}, {state} {zip_code}"
    return {
        'name': name,
        'prefix': prefix,
        'root': root,
        'street_num': street_num,
        'street': street,
        'city': city,
        'state': state,
        'zip': zip_code,
        'country': country,
        'address': address
    }

def mutate_name(base):
    r = random.random()
    p = base['prefix']
    root = base['root']
    if r < 0.35:
        alt_suffix = random.choice(suffixes)
        return f"{p} {root} {alt_suffix}"
    elif r < 0.65:
        return f"{p} {root}"
    elif r < 0.85:
        return f"{p} & {root} Co."
    else:
        return f"{p} {root} Technologies {random.choice(suffixes)}"

def mutate_address(base):
    street = base['street']
    replacements = {'Street': 'St', 'St': 'Street', 'Road': 'Rd', 'Rd': 'Road', 'Avenue': 'Ave', 'Ave': 'Avenue', 'Boulevard': 'Blvd', 'Blvd': 'Boulevard'}
    for k, v in replacements.items():
        if f' {k}' in street:
            street = street.replace(f' {k}', f' {v}')
            break
    
    r = random.random()
    snum = base['street_num']
    city = base['city']
    state = base['state']
    zcode = base['zip']
    
    if r < 0.3:
        return f"{snum} {street}, {city}, {state}"
    elif r < 0.6:
        suite = random.randint(100, 999)
        return f"{snum} {street}, Suite {suite}, {city}, {state} {zcode}"
    elif r < 0.85:
        return f"{snum} {street}, {city}"
    else:
        return f"{city}, {state}, {snum} {street}"

N_ROWS = 5000

s1_entities = []
s2_entities = []
s3_entities = []

# 1. Generate 5,000 Source 1 records
for i in range(1, N_ROWS + 1):
    base = generate_base_entity(i)
    s1_id = f"S1-8000{i:05d}"
    s1_entities.append((s1_id, base['name'], base['address'], base['country'], base))

# 2. Generate Source 2 records (60% matches with variations, 40% unique)
for i in range(1, N_ROWS + 1):
    s2_id = f"S2-8100{i:05d}"
    if i <= 3000:
        base = s1_entities[i - 1][4]
        name2 = mutate_name(base)
        addr2 = mutate_address(base)
        s2_entities.append((s2_id, name2, addr2, base['country']))
    else:
        dist = generate_base_entity(i + 10000)
        s2_entities.append((s2_id, dist['name'], dist['address'], dist['country']))

# 3. Generate Source 3 records (50% matches with variations, 50% unique)
for i in range(1, N_ROWS + 1):
    s3_id = f"S3-8200{i:05d}"
    if i <= 2500:
        base = s1_entities[i - 1][4]
        name3 = mutate_name(base)
        addr3 = mutate_address(base)
        s3_entities.append((s3_id, name3, addr3, base['country']))
    else:
        dist = generate_base_entity(i + 20000)
        s3_entities.append((s3_id, dist['name'], dist['address'], dist['country']))

# Shuffle S2 and S3 rows to test non-aligned ordering
random.shuffle(s2_entities)
random.shuffle(s3_entities)

# Write output TSV files
f1_path = os.path.join(out_dir, 'source1_5k.tsv')
f2_path = os.path.join(out_dir, 'source2_5k.tsv')
f3_path = os.path.join(out_dir, 'source3_5k.tsv')

with open(f1_path, 'w', encoding='utf-8') as f:
    f.write('entity_id\tbusiness_name\tbusiness_address\tcountry\n')
    for row in s1_entities:
        f.write(f"{row[0]}\t{row[1]}\t{row[2]}\t{row[3]}\n")

with open(f2_path, 'w', encoding='utf-8') as f:
    f.write('entity_id\tbusiness_name\tbusiness_address\tcountry\n')
    for row in s2_entities:
        f.write(f"{row[0]}\t{row[1]}\t{row[2]}\t{row[3]}\n")

with open(f3_path, 'w', encoding='utf-8') as f:
    f.write('entity_id\tbusiness_name\tbusiness_address\tcountry\n')
    for row in s3_entities:
        f.write(f"{row[0]}\t{row[1]}\t{row[2]}\t{row[3]}\n")

print("Generated files successfully:")
for p in [f1_path, f2_path, f3_path]:
    with open(p, 'r', encoding='utf-8') as f:
        lines = len(f.readlines())
    print(f" - {os.path.basename(p)}: {lines} lines (Header + {lines-1} data rows) [{os.path.getsize(p)/1024:.1f} KB]")
