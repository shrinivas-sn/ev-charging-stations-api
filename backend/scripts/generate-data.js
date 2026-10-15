"use strict";

/**
 * Deterministic generator for the bundled SAMPLE dataset.
 *
 * This dataset is synthetic. It is NOT official Government of India data and
 * must not be presented as such. It exists so the API, the spatial index, the
 * documentation and the front end can be built and tested against a realistic
 * shape (coordinates per station, connector mixes, capacity spread, state and
 * district distribution) before the official source is ingested.
 *
 * The official source to ingest instead is:
 *   "State, District, City and Location wise Electric Vehicle (EV) Charging
 *    Stations in India", Ministry of Power / Bureau of Energy Efficiency,
 *   published via Open Government Data (https://data.gov.in) under GODL-India.
 * That dataset carries per-station latitude/longitude, charge point operator,
 * charger type and charger rating, so it maps onto the records produced here.
 *
 * Output is seeded, so re-running produces byte-identical files.
 *
 * Usage: node backend/scripts/generate-data.js
 */

const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");

const SEED = Number(process.env.DATASET_SEED) || 20261015;
const SNAPSHOT_DATE = process.env.DATASET_SNAPSHOT_DATE || "2026-10-15";

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(SEED);

function pickWeighted(items) {
  const roll = random();
  let accumulated = 0;
  for (const item of items) {
    accumulated += item.weight;
    if (roll <= accumulated) return item;
  }
  return items[items.length - 1];
}

function pickOne(items) {
  return items[Math.floor(random() * items.length)];
}

// ---------------------------------------------------------------------------
// Coverage: all 28 states + 8 union territories
// ---------------------------------------------------------------------------

const REGIONS = [
  // --- existing coverage ---
  {
    state: "Maharashtra", state_code: "MH", target_count: 3420,
    cities: [
      { city: "Mumbai", district: "Mumbai City", lat: 19.076, lng: 72.8777, weight: 0.45 },
      { city: "Pune", district: "Pune", lat: 18.5204, lng: 73.8567, weight: 0.28 },
      { city: "Nagpur", district: "Nagpur", lat: 21.1458, lng: 79.0882, weight: 0.12 },
      { city: "Nashik", district: "Nashik", lat: 19.9975, lng: 73.7898, weight: 0.08 },
      { city: "Thane", district: "Thane", lat: 19.2183, lng: 72.9781, weight: 0.07 }
    ]
  },
  {
    state: "Delhi", state_code: "DL", target_count: 2860,
    cities: [
      { city: "New Delhi", district: "New Delhi", lat: 28.6139, lng: 77.209, weight: 0.35 },
      { city: "South Delhi", district: "South Delhi", lat: 28.5355, lng: 77.2066, weight: 0.25 },
      { city: "North Delhi", district: "North Delhi", lat: 28.7188, lng: 77.1648, weight: 0.15 },
      { city: "East Delhi", district: "East Delhi", lat: 28.6315, lng: 77.2917, weight: 0.15 },
      { city: "Dwarka", district: "South West Delhi", lat: 28.5921, lng: 77.046, weight: 0.1 }
    ]
  },
  {
    state: "Karnataka", state_code: "KA", target_count: 2780,
    cities: [
      { city: "Bengaluru", district: "Bengaluru Urban", lat: 12.9716, lng: 77.5946, weight: 0.65 },
      { city: "Mysuru", district: "Mysuru", lat: 12.2958, lng: 76.6394, weight: 0.12 },
      { city: "Hubballi", district: "Dharwad", lat: 15.3647, lng: 75.124, weight: 0.09 },
      { city: "Mangaluru", district: "Dakshina Kannada", lat: 12.9141, lng: 74.856, weight: 0.08 },
      { city: "Belagavi", district: "Belagavi", lat: 15.8497, lng: 74.4977, weight: 0.06 }
    ]
  },
  {
    state: "Tamil Nadu", state_code: "TN", target_count: 2420,
    cities: [
      { city: "Chennai", district: "Chennai", lat: 13.0827, lng: 80.2707, weight: 0.5 },
      { city: "Coimbatore", district: "Coimbatore", lat: 11.0168, lng: 76.9558, weight: 0.2 },
      { city: "Madurai", district: "Madurai", lat: 9.9252, lng: 78.1198, weight: 0.12 },
      { city: "Tiruchirappalli", district: "Tiruchirappalli", lat: 10.7905, lng: 78.7047, weight: 0.1 },
      { city: "Salem", district: "Salem", lat: 11.6643, lng: 78.146, weight: 0.08 }
    ]
  },
  {
    state: "Gujarat", state_code: "GJ", target_count: 2150,
    cities: [
      { city: "Ahmedabad", district: "Ahmedabad", lat: 23.0225, lng: 72.5714, weight: 0.45 },
      { city: "Surat", district: "Surat", lat: 21.1702, lng: 72.8311, weight: 0.25 },
      { city: "Vadodara", district: "Vadodara", lat: 22.3072, lng: 73.1812, weight: 0.15 },
      { city: "Rajkot", district: "Rajkot", lat: 22.3039, lng: 70.8022, weight: 0.1 },
      { city: "Gandhinagar", district: "Gandhinagar", lat: 23.2156, lng: 72.6369, weight: 0.05 }
    ]
  },
  {
    state: "Uttar Pradesh", state_code: "UP", target_count: 2010,
    cities: [
      { city: "Noida", district: "Gautam Buddha Nagar", lat: 28.5355, lng: 77.391, weight: 0.35 },
      { city: "Lucknow", district: "Lucknow", lat: 26.8467, lng: 80.9462, weight: 0.25 },
      { city: "Ghaziabad", district: "Ghaziabad", lat: 28.6692, lng: 77.4538, weight: 0.2 },
      { city: "Kanpur", district: "Kanpur Nagar", lat: 26.4499, lng: 80.3319, weight: 0.1 },
      { city: "Varanasi", district: "Varanasi", lat: 25.3176, lng: 82.9739, weight: 0.1 }
    ]
  },
  {
    state: "Telangana", state_code: "TS", target_count: 1480,
    cities: [
      { city: "Hyderabad", district: "Hyderabad", lat: 17.385, lng: 78.4867, weight: 0.75 },
      { city: "Warangal", district: "Warangal", lat: 17.9689, lng: 79.5941, weight: 0.12 },
      { city: "Nizamabad", district: "Nizamabad", lat: 18.6725, lng: 78.0941, weight: 0.07 },
      { city: "Karimnagar", district: "Karimnagar", lat: 18.4386, lng: 79.1288, weight: 0.06 }
    ]
  },
  {
    state: "Rajasthan", state_code: "RJ", target_count: 1390,
    cities: [
      { city: "Jaipur", district: "Jaipur", lat: 26.9124, lng: 75.7873, weight: 0.5 },
      { city: "Jodhpur", district: "Jodhpur", lat: 26.2389, lng: 73.0243, weight: 0.2 },
      { city: "Udaipur", district: "Udaipur", lat: 24.5854, lng: 73.7125, weight: 0.15 },
      { city: "Kota", district: "Kota", lat: 25.2138, lng: 75.8648, weight: 0.15 }
    ]
  },
  {
    state: "Kerala", state_code: "KL", target_count: 1240,
    cities: [
      { city: "Kochi", district: "Ernakulam", lat: 9.9312, lng: 76.2673, weight: 0.4 },
      { city: "Thiruvananthapuram", district: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366, weight: 0.3 },
      { city: "Kozhikode", district: "Kozhikode", lat: 11.2588, lng: 75.7804, weight: 0.18 },
      { city: "Thrissur", district: "Thrissur", lat: 10.5276, lng: 76.2144, weight: 0.12 }
    ]
  },
  {
    state: "Haryana", state_code: "HR", target_count: 1150,
    cities: [
      { city: "Gurugram", district: "Gurugram", lat: 28.4595, lng: 77.0266, weight: 0.6 },
      { city: "Faridabad", district: "Faridabad", lat: 28.4089, lng: 77.3178, weight: 0.25 },
      { city: "Panchkula", district: "Panchkula", lat: 30.6942, lng: 76.8606, weight: 0.15 }
    ]
  },
  {
    state: "West Bengal", state_code: "WB", target_count: 980,
    cities: [
      { city: "Kolkata", district: "Kolkata", lat: 22.5726, lng: 88.3639, weight: 0.7 },
      { city: "Howrah", district: "Howrah", lat: 22.5958, lng: 88.2636, weight: 0.15 },
      { city: "Siliguri", district: "Darjeeling", lat: 26.7271, lng: 88.3953, weight: 0.15 }
    ]
  },
  {
    state: "Andhra Pradesh", state_code: "AP", target_count: 920,
    cities: [
      { city: "Visakhapatnam", district: "Visakhapatnam", lat: 17.6868, lng: 83.2185, weight: 0.45 },
      { city: "Vijayawada", district: "NTR", lat: 16.5062, lng: 80.648, weight: 0.35 },
      { city: "Tirupati", district: "Tirupati", lat: 13.6288, lng: 79.4192, weight: 0.2 }
    ]
  },
  {
    state: "Madhya Pradesh", state_code: "MP", target_count: 880,
    cities: [
      { city: "Indore", district: "Indore", lat: 22.7196, lng: 75.8577, weight: 0.45 },
      { city: "Bhopal", district: "Bhopal", lat: 23.2599, lng: 77.4126, weight: 0.35 },
      { city: "Gwalior", district: "Gwalior", lat: 26.2183, lng: 78.1828, weight: 0.2 }
    ]
  },
  {
    state: "Punjab", state_code: "PB", target_count: 810,
    cities: [
      { city: "Ludhiana", district: "Ludhiana", lat: 30.901, lng: 75.8573, weight: 0.4 },
      { city: "Amritsar", district: "Amritsar", lat: 31.634, lng: 74.8723, weight: 0.35 },
      { city: "Jalandhar", district: "Jalandhar", lat: 31.326, lng: 75.5762, weight: 0.25 }
    ]
  },
  {
    state: "Odisha", state_code: "OD", target_count: 640,
    cities: [
      { city: "Bhubaneswar", district: "Khordha", lat: 20.2961, lng: 85.8245, weight: 0.65 },
      { city: "Cuttack", district: "Cuttack", lat: 20.4625, lng: 85.8828, weight: 0.35 }
    ]
  },
  {
    state: "Goa", state_code: "GA", target_count: 420,
    cities: [
      { city: "Panaji", district: "North Goa", lat: 15.4909, lng: 73.8278, weight: 0.55 },
      { city: "Margao", district: "South Goa", lat: 15.2832, lng: 73.9862, weight: 0.45 }
    ]
  },
  {
    state: "Chandigarh", state_code: "CH", target_count: 360,
    cities: [{ city: "Chandigarh", district: "Chandigarh", lat: 30.7333, lng: 76.7794, weight: 1.0 }]
  },
  {
    state: "Assam", state_code: "AS", target_count: 320,
    cities: [
      { city: "Guwahati", district: "Kamrup Metropolitan", lat: 26.1445, lng: 91.7362, weight: 0.8 },
      { city: "Dibrugarh", district: "Dibrugarh", lat: 27.4728, lng: 94.912, weight: 0.2 }
    ]
  },
  {
    state: "Bihar", state_code: "BR", target_count: 310,
    cities: [
      { city: "Patna", district: "Patna", lat: 25.5941, lng: 85.1376, weight: 0.7 },
      { city: "Gaya", district: "Gaya", lat: 24.7914, lng: 85.0002, weight: 0.3 }
    ]
  },
  {
    state: "Uttarakhand", state_code: "UK", target_count: 290,
    cities: [
      { city: "Dehradun", district: "Dehradun", lat: 30.3165, lng: 78.0322, weight: 0.65 },
      { city: "Haridwar", district: "Haridwar", lat: 29.9457, lng: 78.1642, weight: 0.35 }
    ]
  },
  {
    state: "Himachal Pradesh", state_code: "HP", target_count: 210,
    cities: [
      { city: "Shimla", district: "Shimla", lat: 31.1048, lng: 77.1734, weight: 0.5 },
      { city: "Dharamshala", district: "Kangra", lat: 32.219, lng: 76.3234, weight: 0.5 }
    ]
  },
  {
    state: "Jharkhand", state_code: "JH", target_count: 208,
    cities: [
      { city: "Ranchi", district: "Ranchi", lat: 23.3441, lng: 85.3096, weight: 0.55 },
      { city: "Jamshedpur", district: "East Singhbhum", lat: 22.8046, lng: 86.2029, weight: 0.45 }
    ]
  },

  // --- newly added states ---
  {
    state: "Chhattisgarh", state_code: "CG", target_count: 260,
    cities: [
      { city: "Raipur", district: "Raipur", lat: 21.2514, lng: 81.6296, weight: 0.45 },
      { city: "Bhilai", district: "Durg", lat: 21.1938, lng: 81.3509, weight: 0.25 },
      { city: "Bilaspur", district: "Bilaspur", lat: 22.0797, lng: 82.1409, weight: 0.2 },
      { city: "Korba", district: "Korba", lat: 22.3595, lng: 82.7501, weight: 0.1 }
    ]
  },
  {
    state: "Meghalaya", state_code: "ML", target_count: 110,
    cities: [
      { city: "Shillong", district: "East Khasi Hills", lat: 25.5788, lng: 91.8933, weight: 0.65 },
      { city: "Tura", district: "West Garo Hills", lat: 25.514, lng: 90.2024, weight: 0.35 }
    ]
  },
  {
    state: "Manipur", state_code: "MN", target_count: 90,
    cities: [
      { city: "Imphal", district: "Imphal West", lat: 24.817, lng: 93.9368, weight: 0.7 },
      { city: "Thoubal", district: "Thoubal", lat: 24.6388, lng: 94.0101, weight: 0.3 }
    ]
  },
  {
    state: "Nagaland", state_code: "NL", target_count: 90,
    cities: [
      { city: "Kohima", district: "Kohima", lat: 25.6751, lng: 94.1086, weight: 0.4 },
      { city: "Dimapur", district: "Dimapur", lat: 25.9063, lng: 93.7276, weight: 0.6 }
    ]
  },
  {
    state: "Arunachal Pradesh", state_code: "AR", target_count: 80,
    cities: [
      { city: "Itanagar", district: "Papum Pare", lat: 27.0844, lng: 93.6053, weight: 0.55 },
      { city: "Pasighat", district: "East Siang", lat: 28.0667, lng: 95.3333, weight: 0.25 },
      { city: "Tawang", district: "Tawang", lat: 27.5859, lng: 91.8594, weight: 0.2 }
    ]
  },
  {
    state: "Mizoram", state_code: "MZ", target_count: 80,
    cities: [
      { city: "Aizawl", district: "Aizawl", lat: 23.7271, lng: 92.7176, weight: 0.75 },
      { city: "Lunglei", district: "Lunglei", lat: 22.8879, lng: 92.7355, weight: 0.25 }
    ]
  },
  {
    state: "Tripura", state_code: "TR", target_count: 80,
    cities: [
      { city: "Agartala", district: "West Tripura", lat: 23.8315, lng: 91.2868, weight: 0.7 },
      { city: "Dharmanagar", district: "North Tripura", lat: 24.3738, lng: 92.1725, weight: 0.3 }
    ]
  },
  {
    state: "Sikkim", state_code: "SK", target_count: 70,
    cities: [
      { city: "Gangtok", district: "Gangtok", lat: 27.3389, lng: 88.6065, weight: 0.65 },
      { city: "Namchi", district: "Namchi", lat: 27.167, lng: 88.36, weight: 0.35 }
    ]
  },

  // --- newly added union territories ---
  {
    state: "Jammu and Kashmir", state_code: "JK", target_count: 300,
    cities: [
      { city: "Srinagar", district: "Srinagar", lat: 34.0837, lng: 74.7973, weight: 0.4 },
      { city: "Jammu", district: "Jammu", lat: 32.7266, lng: 74.857, weight: 0.4 },
      { city: "Anantnag", district: "Anantnag", lat: 33.7311, lng: 75.1487, weight: 0.1 },
      { city: "Baramulla", district: "Baramulla", lat: 34.1985, lng: 74.3637, weight: 0.1 }
    ]
  },
  {
    state: "Puducherry", state_code: "PY", target_count: 120,
    cities: [
      { city: "Puducherry", district: "Puducherry", lat: 11.9416, lng: 79.8083, weight: 0.7 },
      { city: "Karaikal", district: "Karaikal", lat: 10.9254, lng: 79.838, weight: 0.3 }
    ]
  },
  {
    state: "Dadra and Nagar Haveli and Daman and Diu", state_code: "DN", target_count: 60,
    cities: [
      { city: "Silvassa", district: "Dadra and Nagar Haveli", lat: 20.2737, lng: 73.0166, weight: 0.45 },
      { city: "Daman", district: "Daman", lat: 20.3974, lng: 72.8328, weight: 0.35 },
      { city: "Diu", district: "Diu", lat: 20.7144, lng: 70.9874, weight: 0.2 }
    ]
  },
  {
    state: "Ladakh", state_code: "LA", target_count: 50,
    cities: [
      { city: "Leh", district: "Leh", lat: 34.1526, lng: 77.5771, weight: 0.65 },
      { city: "Kargil", district: "Kargil", lat: 34.5539, lng: 76.1349, weight: 0.35 }
    ]
  },
  {
    state: "Andaman and Nicobar Islands", state_code: "AN", target_count: 40,
    cities: [
      { city: "Port Blair", district: "South Andaman", lat: 11.6234, lng: 92.7265, weight: 1.0 }
    ]
  },
  {
    state: "Lakshadweep", state_code: "LD", target_count: 20,
    cities: [{ city: "Kavaratti", district: "Lakshadweep", lat: 10.5669, lng: 72.642, weight: 1.0 }]
  }
];

const OPERATORS = [
  { name: "Tata Power EZ Charge", weight: 0.28, type: "Private" },
  { name: "Jio-bp pulse", weight: 0.19, type: "Private" },
  { name: "Statiq", weight: 0.13, type: "Private" },
  { name: "Ather Grid", weight: 0.1, type: "Private" },
  { name: "ChargeZone", weight: 0.08, type: "Private" },
  { name: "Kazam", weight: 0.07, type: "Private" },
  { name: "Zeon Charging", weight: 0.05, type: "Private" },
  { name: "CESL Public Charging", weight: 0.04, type: "Government" },
  { name: "Discom Municipal Charging", weight: 0.06, type: "Government" }
];

const CONNECTOR_CONFIGS = [
  {
    connectors: [
      { type: "CCS-2", power_kw: 60, count: 2 },
      { type: "Type-2 AC", power_kw: 22, count: 1 }
    ],
    total_capacity_kw: 142
  },
  {
    connectors: [
      { type: "CCS-2", power_kw: 120, count: 2 },
      { type: "Type-2 AC", power_kw: 22, count: 2 }
    ],
    total_capacity_kw: 284
  },
  {
    connectors: [
      { type: "CCS-2", power_kw: 30, count: 2 },
      { type: "Type-2 AC", power_kw: 7.4, count: 2 }
    ],
    total_capacity_kw: 74.8
  },
  {
    connectors: [
      { type: "Bharat DC-001", power_kw: 15, count: 2 },
      { type: "Bharat AC-001", power_kw: 10, count: 1 }
    ],
    total_capacity_kw: 40
  },
  {
    connectors: [{ type: "Type-2 AC", power_kw: 22, count: 2 }],
    total_capacity_kw: 44
  }
];

const LOCATION_TAGS = [
  "Metro Station Parking",
  "Fuel Retail Outlet",
  "Highway Toll Plaza Service Area",
  "Commercial Tech Park",
  "Shopping Mall Basement Parking",
  "Municipal Multi-level Car Parking",
  "Railway Station Drop-off Zone",
  "Hotel and Resort Parking",
  "Airport Terminal Long-term Parking",
  "EV Fleet Depot Hub"
];

// Consistent, deterministic business-hours style string per station.
const AVAILABILITY = ["24x7", "24x7", "24x7", "06:00-23:00", "00:00-24:00"];

console.log(`Generating synthetic sample EV charging station dataset (seed ${SEED})...`);

const stations = [];
let stationId = 1;

for (const region of REGIONS) {
  for (let index = 0; index < region.target_count; index += 1) {
    const city = pickWeighted(region.cities);
    const operator = pickWeighted(OPERATORS);
    const config = pickOne(CONNECTOR_CONFIGS);
    const locationTag = pickOne(LOCATION_TAGS);

    // Jitter around the city centre so stations cluster realistically.
    const latJitter = (random() - 0.5) * 0.18;
    const lngJitter = (random() - 0.5) * 0.18;

    stations.push({
      id: stationId,
      name: `${operator.name} - ${city.city} ${locationTag} #${(index % 45) + 1}`,
      operator: operator.name,
      operator_type: operator.type,
      state: region.state,
      state_code: region.state_code,
      district: city.district,
      city: city.city,
      address: `${locationTag}, Sector ${((index * 7) % 65) + 1}, ${city.city}, ${city.district}, ${region.state} - India`,
      latitude: Number((city.lat + latJitter).toFixed(6)),
      longitude: Number((city.lng + lngJitter).toFixed(6)),
      connectors: config.connectors,
      total_capacity_kw: config.total_capacity_kw,
      access_type: "Public",
      status: "Operational",
      availability: pickOne(AVAILABILITY)
    });

    stationId += 1;
  }
}

console.log(`Generated ${stations.length} stations across ${REGIONS.length} states/UTs.`);

if (new Set(REGIONS.map((r) => r.state_code)).size !== REGIONS.length) {
  throw new Error("Duplicate state codes in REGIONS — state_code must be unique.");
}
if (stations.some((s) => !Number.isFinite(s.latitude) || Math.abs(s.latitude) > 90)) {
  throw new Error("Generated an out-of-range latitude.");
}

const stateAggregates = REGIONS.map((region) => {
  const inState = stations.filter((station) => station.state === region.state);
  const operatorCounts = new Map();
  const cityCounts = new Map();
  for (const station of inState) {
    operatorCounts.set(station.operator, (operatorCounts.get(station.operator) || 0) + 1);
    cityCounts.set(station.city, (cityCounts.get(station.city) || 0) + 1);
  }

  return {
    state: region.state,
    state_code: region.state_code,
    total_stations: inState.length,
    total_capacity_kw: Number(
      inState.reduce((sum, s) => sum + s.total_capacity_kw, 0).toFixed(2)
    ),
    major_cities: region.cities.map((c) => c.city),
    top_operators: [...operatorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ operator: name, count })),
    top_cities: [...cityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ city: name, count }))
  };
});

const datasetMeta = {
  dataset_name: "Electric Vehicle Charging Stations in India (generated sample)",
  dataset_status: "generated-sample",
  provenance: {
    is_official: false,
    summary:
      "Synthetic sample data generated by backend/scripts/generate-data.js. It is not official Government of India data and must not be presented as such.",
    generator: "backend/scripts/generate-data.js",
    seed: SEED,
    target_source: {
      name: "State, District, City and Location wise Electric Vehicle (EV) Charging Stations in India",
      publisher: "Ministry of Power / Bureau of Energy Efficiency",
      catalog_url: "https://data.gov.in",
      license: "Government Open Data License - India (GODL-India)",
      license_url: "https://data.gov.in/godl",
      note:
        "The official dataset carries per-station latitude/longitude, charge point operator, charger type and charger rating. Ingest it to replace this sample wholesale."
    }
  },
  snapshot_date: SNAPSHOT_DATE,
  verified_at: new Date().toISOString(),
  total_stations: stations.length,
  coverage: {
    states_and_union_territories: stateAggregates.length,
    cities: new Set(stations.map((s) => s.city)).size,
    districts: new Set(stations.map((s) => s.district)).size,
    charge_point_operators: new Set(stations.map((s) => s.operator)).size
  },
  disclaimer:
    "Directory, location and connector specifications only. No real-time socket availability, no pricing, no booking."
};

fs.writeFileSync(path.join(DATA_DIR, "stations.json"), JSON.stringify(stations, null, 2), "utf8");
fs.writeFileSync(path.join(DATA_DIR, "states.json"), JSON.stringify(stateAggregates, null, 2), "utf8");
fs.writeFileSync(path.join(DATA_DIR, "meta.json"), JSON.stringify(datasetMeta, null, 2), "utf8");

console.log("Wrote stations.json, states.json and meta.json to backend/data/");
