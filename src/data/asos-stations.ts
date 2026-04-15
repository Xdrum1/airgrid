/**
 * ASOS reference stations + metro bounding boxes for v1.4 weather
 * scoring and grid-based visualizations.
 *
 * Source: FAA NASR / ADS-B / ICAO station registry. Stations selected
 * by proximity to tracked AirIndex markets. Coordinates are WGS-84.
 *
 * Single source of truth — imported by both scripts/generate-grid-prototype.ts
 * and scripts/preview-v14-scoring.ts (and anything that needs ASOS proximity).
 */

export interface AsosStation {
  id: string;       // ICAO or FAA 3-char identifier
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export interface MetroBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Metro bounding boxes (same as v1.4 analysis)
export const METRO_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  los_angeles:    { minLat: 33.60, maxLat: 34.35, minLng: -118.70, maxLng: -117.65 },
  new_york:       { minLat: 40.45, maxLat: 41.00, minLng: -74.30, maxLng: -73.65 },
  dallas:         { minLat: 32.55, maxLat: 33.10, minLng: -97.40, maxLng: -96.50 },
  miami:          { minLat: 25.55, maxLat: 26.10, minLng: -80.50, maxLng: -80.05 },
  orlando:        { minLat: 28.20, maxLat: 28.80, minLng: -81.60, maxLng: -81.00 },
  las_vegas:      { minLat: 35.90, maxLat: 36.35, minLng: -115.40, maxLng: -114.90 },
  chicago:        { minLat: 41.60, maxLat: 42.10, minLng: -88.00, maxLng: -87.50 },
  houston:        { minLat: 29.50, maxLat: 30.10, minLng: -95.80, maxLng: -95.00 },
  san_francisco:  { minLat: 37.20, maxLat: 37.90, minLng: -122.55, maxLng: -121.80 },
  denver:         { minLat: 39.50, maxLat: 39.95, minLng: -105.20, maxLng: -104.70 },
  phoenix:        { minLat: 33.20, maxLat: 33.75, minLng: -112.30, maxLng: -111.70 },
  atlanta:        { minLat: 33.55, maxLat: 34.00, minLng: -84.60, maxLng: -84.15 },
  seattle:        { minLat: 47.35, maxLat: 47.80, minLng: -122.50, maxLng: -122.10 },
  washington_dc:  { minLat: 38.70, maxLat: 39.10, minLng: -77.25, maxLng: -76.85 },
  boston:         { minLat: 42.20, maxLat: 42.50, minLng: -71.25, maxLng: -70.90 },
  tampa:          { minLat: 27.70, maxLat: 28.15, minLng: -82.70, maxLng: -82.30 },
  austin:         { minLat: 30.10, maxLat: 30.55, minLng: -97.95, maxLng: -97.55 },
  nashville:      { minLat: 35.95, maxLat: 36.30, minLng: -87.00, maxLng: -86.55 },
  columbus:       { minLat: 39.80, maxLat: 40.15, minLng: -83.15, maxLng: -82.75 },
  san_diego:      { minLat: 32.60, maxLat: 33.05, minLng: -117.30, maxLng: -116.90 },
  charlotte:      { minLat: 35.05, maxLat: 35.45, minLng: -81.00, maxLng: -80.65 },
  minneapolis:    { minLat: 44.80, maxLat: 45.15, minLng: -93.50, maxLng: -93.05 },
  san_antonio:    { minLat: 29.20, maxLat: 29.70, minLng: -98.80, maxLng: -98.30 },
  cincinnati:     { minLat: 39.00, maxLat: 39.35, minLng: -84.75, maxLng: -84.30 },
  salt_lake_city: { minLat: 40.55, maxLat: 40.95, minLng: -112.15, maxLng: -111.70 },
};

export const ASOS_STATIONS: AsosStation[] = [
  { id: "MIA", name: "Miami International", state: "FL", lat: 25.7959, lng: -80.2870 },
  { id: "FLL", name: "Fort Lauderdale-Hollywood Intl", state: "FL", lat: 26.0726, lng: -80.1527 },
  { id: "OPF", name: "Miami-Opa Locka Executive", state: "FL", lat: 25.9070, lng: -80.2784 },
  { id: "TMB", name: "Miami Executive", state: "FL", lat: 25.6479, lng: -80.4328 },
  { id: "HWO", name: "North Perry (Hollywood)", state: "FL", lat: 26.0015, lng: -80.2407 },
  { id: "PBI", name: "Palm Beach International", state: "FL", lat: 26.6832, lng: -80.0956 },
  { id: "BCT", name: "Boca Raton", state: "FL", lat: 26.3785, lng: -80.1077 },
  { id: "MCO", name: "Orlando International", state: "FL", lat: 28.4312, lng: -81.3081 },
  { id: "SFB", name: "Orlando Sanford Intl", state: "FL", lat: 28.7776, lng: -81.2375 },
  { id: "ORL", name: "Orlando Executive", state: "FL", lat: 28.5455, lng: -81.3329 },
  { id: "ISM", name: "Kissimmee Gateway", state: "FL", lat: 28.2898, lng: -81.4371 },
  { id: "TPA", name: "Tampa International", state: "FL", lat: 27.9755, lng: -82.5332 },
  { id: "PIE", name: "St. Pete-Clearwater Intl", state: "FL", lat: 27.9115, lng: -82.6874 },
  { id: "TPF", name: "Peter O Knight", state: "FL", lat: 27.9155, lng: -82.4493 },
  { id: "LAL", name: "Lakeland Linder Intl", state: "FL", lat: 27.9889, lng: -82.0186 },
  { id: "DAB", name: "Daytona Beach Intl", state: "FL", lat: 29.1799, lng: -81.0581 },
  { id: "MLB", name: "Melbourne Intl", state: "FL", lat: 28.1028, lng: -80.6453 },
  { id: "VRB", name: "Vero Beach Regional", state: "FL", lat: 27.6556, lng: -80.4179 },
  { id: "LAX", name: "Los Angeles Intl", state: "CA", lat: 33.9425, lng: -118.4081 },
  { id: "BUR", name: "Hollywood Burbank", state: "CA", lat: 34.2007, lng: -118.3587 },
  { id: "LGB", name: "Long Beach", state: "CA", lat: 33.8178, lng: -118.1516 },
  { id: "SNA", name: "John Wayne / Orange County", state: "CA", lat: 33.6757, lng: -117.8683 },
  { id: "VNY", name: "Van Nuys", state: "CA", lat: 34.2098, lng: -118.4901 },
  { id: "ONT", name: "Ontario Intl", state: "CA", lat: 34.0559, lng: -117.6005 },
  { id: "SMO", name: "Santa Monica", state: "CA", lat: 34.0158, lng: -118.4513 },
  { id: "HHR", name: "Hawthorne Municipal", state: "CA", lat: 33.9228, lng: -118.3352 },
  { id: "SFO", name: "San Francisco Intl", state: "CA", lat: 37.6213, lng: -122.3790 },
  { id: "OAK", name: "Oakland Intl", state: "CA", lat: 37.7213, lng: -122.2207 },
  { id: "SJC", name: "San Jose Intl", state: "CA", lat: 37.3639, lng: -121.9289 },
  { id: "HWD", name: "Hayward Executive", state: "CA", lat: 37.6589, lng: -122.1217 },
  { id: "SAN", name: "San Diego Intl", state: "CA", lat: 32.7338, lng: -117.1933 },
  { id: "MYF", name: "Montgomery Field", state: "CA", lat: 32.8156, lng: -117.1396 },
  { id: "DFW", name: "Dallas/Fort Worth Intl", state: "TX", lat: 32.8998, lng: -97.0403 },
  { id: "DAL", name: "Dallas Love Field", state: "TX", lat: 32.8471, lng: -96.8518 },
  { id: "AFW", name: "Alliance (Fort Worth)", state: "TX", lat: 32.9874, lng: -97.3187 },
  { id: "FTW", name: "Meacham (Fort Worth)", state: "TX", lat: 32.8198, lng: -97.3624 },
  { id: "ADS", name: "Addison", state: "TX", lat: 32.9687, lng: -96.8364 },
  { id: "IAH", name: "George Bush Intercontinental", state: "TX", lat: 29.9902, lng: -95.3368 },
  { id: "HOU", name: "William P. Hobby", state: "TX", lat: 29.6454, lng: -95.2789 },
  { id: "EFD", name: "Ellington Field", state: "TX", lat: 29.6073, lng: -95.1588 },
  { id: "DWH", name: "David Wayne Hooks", state: "TX", lat: 30.0618, lng: -95.5526 },
  { id: "AUS", name: "Austin-Bergstrom Intl", state: "TX", lat: 30.1945, lng: -97.6699 },
  { id: "SAT", name: "San Antonio Intl", state: "TX", lat: 29.5337, lng: -98.4698 },
  { id: "PHX", name: "Phoenix Sky Harbor", state: "AZ", lat: 33.4373, lng: -112.0078 },
  { id: "SDL", name: "Scottsdale", state: "AZ", lat: 33.6229, lng: -111.9105 },
  { id: "DVT", name: "Phoenix Deer Valley", state: "AZ", lat: 33.6883, lng: -112.0826 },
  { id: "CHD", name: "Chandler Municipal", state: "AZ", lat: 33.2691, lng: -111.8108 },
  { id: "FFZ", name: "Falcon Field (Mesa)", state: "AZ", lat: 33.4608, lng: -111.7283 },
  { id: "IWA", name: "Phoenix-Mesa Gateway", state: "AZ", lat: 33.3078, lng: -111.6554 },
  { id: "GYR", name: "Goodyear", state: "AZ", lat: 33.4225, lng: -112.3758 },
  { id: "JFK", name: "John F. Kennedy Intl", state: "NY", lat: 40.6413, lng: -73.7781 },
  { id: "LGA", name: "LaGuardia", state: "NY", lat: 40.7769, lng: -73.8740 },
  { id: "EWR", name: "Newark Liberty Intl", state: "NJ", lat: 40.6895, lng: -74.1745 },
  { id: "TEB", name: "Teterboro", state: "NJ", lat: 40.8501, lng: -74.0608 },
  { id: "HPN", name: "Westchester County", state: "NY", lat: 41.0670, lng: -73.7076 },
  { id: "FRG", name: "Republic (Farmingdale)", state: "NY", lat: 40.7288, lng: -73.4134 },
  { id: "ISP", name: "Long Island MacArthur", state: "NY", lat: 40.7952, lng: -73.1002 },
  { id: "ORD", name: "Chicago O'Hare", state: "IL", lat: 41.9786, lng: -87.9048 },
  { id: "MDW", name: "Chicago Midway", state: "IL", lat: 41.7868, lng: -87.7522 },
  { id: "PWK", name: "Chicago Executive", state: "IL", lat: 42.1142, lng: -87.9015 },
  { id: "DPA", name: "DuPage", state: "IL", lat: 41.9078, lng: -88.2486 },
  { id: "LAS", name: "Harry Reid Intl (Las Vegas)", state: "NV", lat: 36.0840, lng: -115.1537 },
  { id: "VGT", name: "North Las Vegas", state: "NV", lat: 36.2107, lng: -115.1942 },
  { id: "HND", name: "Henderson Executive", state: "NV", lat: 35.9728, lng: -115.1344 },
  { id: "DEN", name: "Denver Intl", state: "CO", lat: 39.8561, lng: -104.6737 },
  { id: "APA", name: "Centennial", state: "CO", lat: 39.5701, lng: -104.8487 },
  { id: "BJC", name: "Rocky Mountain Metro", state: "CO", lat: 39.9088, lng: -105.1172 },
  { id: "ATL", name: "Hartsfield-Jackson Atlanta Intl", state: "GA", lat: 33.6407, lng: -84.4277 },
  { id: "PDK", name: "DeKalb-Peachtree", state: "GA", lat: 33.8756, lng: -84.3020 },
  { id: "FTY", name: "Fulton County Brown Field", state: "GA", lat: 33.7790, lng: -84.5215 },
  { id: "SEA", name: "Seattle-Tacoma Intl", state: "WA", lat: 47.4502, lng: -122.3088 },
  { id: "BFI", name: "King County Intl (Boeing Field)", state: "WA", lat: 47.5300, lng: -122.3020 },
  { id: "PAE", name: "Paine Field (Everett)", state: "WA", lat: 47.9063, lng: -122.2815 },
  { id: "BOS", name: "Boston Logan Intl", state: "MA", lat: 42.3656, lng: -71.0096 },
  { id: "BED", name: "Hanscom Field", state: "MA", lat: 42.4700, lng: -71.2890 },
  { id: "DCA", name: "Reagan National", state: "DC", lat: 38.8512, lng: -77.0402 },
  { id: "IAD", name: "Washington Dulles Intl", state: "VA", lat: 38.9531, lng: -77.4565 },
  { id: "BWI", name: "Baltimore/Washington Intl", state: "MD", lat: 39.1754, lng: -76.6684 },
  { id: "BNA", name: "Nashville Intl", state: "TN", lat: 36.1263, lng: -86.6774 },
  { id: "JWN", name: "John C. Tune", state: "TN", lat: 36.1824, lng: -86.8870 },
  { id: "CLT", name: "Charlotte Douglas Intl", state: "NC", lat: 35.2140, lng: -80.9431 },
  { id: "JQF", name: "Concord-Padgett Regional", state: "NC", lat: 35.3878, lng: -80.7091 },
  { id: "MSP", name: "Minneapolis-St. Paul Intl", state: "MN", lat: 44.8848, lng: -93.2223 },
  { id: "STP", name: "St. Paul Downtown", state: "MN", lat: 44.9345, lng: -93.0600 },
  { id: "FCM", name: "Flying Cloud (Eden Prairie)", state: "MN", lat: 44.8272, lng: -93.4570 },
  { id: "CMH", name: "John Glenn Columbus Intl", state: "OH", lat: 39.9980, lng: -82.8919 },
  { id: "LCK", name: "Rickenbacker Intl", state: "OH", lat: 39.8138, lng: -82.9278 },
  { id: "CVG", name: "Cincinnati/Northern Kentucky Intl", state: "KY", lat: 39.0489, lng: -84.6678 },
  { id: "LUK", name: "Cincinnati Municipal Lunken", state: "OH", lat: 39.1032, lng: -84.4186 },
  { id: "SLC", name: "Salt Lake City Intl", state: "UT", lat: 40.7899, lng: -111.9791 },
  { id: "PVU", name: "Provo Municipal", state: "UT", lat: 40.2192, lng: -111.7234 },
  { id: "OGD", name: "Ogden-Hinckley", state: "UT", lat: 41.1959, lng: -112.0121 },
];
