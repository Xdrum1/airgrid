#!/bin/bash
# Fetch building heights for remaining demo sites
# Run with: bash scripts/fetch-remaining-buildings.sh

SITES=(
  "04FD|27.92937222|-82.33698333|Tampa General Brandon"
  "6FL1|30.26500555|-81.44265|Mayo Clinic Jacksonville"
  "FA61|30.34955277|-81.665475|Shands Jacksonville"
  "7CL1|37.83615888|-122.26680333|UCSF Oakland"
  "18CN|37.765775|-122.39035833|UCSF Mission Bay"
  "CN10|33.82838611|-118.29738888|Harbor UCLA"
  "15CA|37.43515833|-122.17435833|Stanford Health Care"
  "CA95|34.15529722|-118.3279|St Joseph Burbank"
  "37FA|28.57555611|-81.3684025|Advent Health Orlando"
  "6FD8|26.10336944|-80.14047222|Broward Health"
)

for site in "${SITES[@]}"; do
  IFS='|' read -r id lat lng name <<< "$site"
  echo "=== $id ($name) ==="

  result=$(curl -s -H "User-Agent: AirIndex/1.0" \
    "https://overpass-api.de/api/interpreter" \
    --data-urlencode "data=[out:json][timeout:30];(way[\"building\"][\"height\"](around:500,$lat,$lng);way[\"building\"][\"building:levels\"](around:500,$lat,$lng););out center;" 2>&1)

  echo "$result" | python3 -c "
import json, sys, math
try:
    data = json.load(sys.stdin)
except:
    print('  FAILED to parse response')
    sys.exit(0)

elements = data.get('elements', [])
FAC_LAT, FAC_LNG = $lat, $lng
buildings = []
for e in elements:
    tags = e.get('tags', {})
    center = e.get('center', {})
    if not center.get('lat'): continue
    h = tags.get('height', '')
    levels = tags.get('building:levels', '')
    hm = float(h.replace(' m','').replace('m','')) if h else (int(levels)*3 if levels else 0)
    if hm <= 0: continue
    buildings.append({'name': tags.get('name','unnamed'), 'heightM': round(hm,1), 'heightFt': round(hm*3.28), 'lat': center['lat'], 'lng': center['lon'], 'distanceM': round(math.sqrt(((center['lat']-FAC_LAT)*111320)**2 + ((center['lon']-FAC_LNG)*111320*math.cos(FAC_LAT*math.pi/180))**2))})

buildings.sort(key=lambda b: -b['heightM'])
print(f'  {len(buildings)} buildings with height data')
if buildings:
    print(f'  Tallest: {buildings[0][\"name\"][:30]} — {buildings[0][\"heightM\"]}m ({buildings[0][\"heightFt\"]}ft)')

output = {'facilityId':'$id','facilityName':'$name','lat':FAC_LAT,'lng':FAC_LNG,'buildingCount':len(buildings),'buildings':buildings[:15]}
with open('data/buildings/$id.json','w') as f:
    json.dump(output, f, indent=2)
print(f'  Written to data/buildings/$id.json')
"

  echo ""
  sleep 3
done

echo "=== DONE ==="
