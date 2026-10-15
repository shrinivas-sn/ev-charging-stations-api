"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");

const STATES_DATA = [
  {
    state: "Maharashtra",
    state_code: "MH",
    center: { lat: 19.7515, lng: 75.7139 },
    cities: [
      { city: "Mumbai", district: "Mumbai City", lat: 19.076, lng: 72.8777, weight: 0.45 },
      { city: "Pune", district: "Pune", lat: 18.5204, lng: 73.8567, weight: 0.28 },
      { city: "Nagpur", district: "Nagpur", lat: 21.1458, lng: 79.0882, weight: 0.12 },
      { city: "Nashik", district: "Nashik", lat: 19.9975, lng: 73.7898, weight: 0.08 },
      { city: "Thane", district: "Thane", lat: 19.2183, lng: 72.9781, weight: 0.07 }
    ],
    target_count: 3420
  },
  {
    state: "Delhi",
    state_code: "DL",
    center: { lat: 28.7041, lng: 77.1025 },
    cities: [
      { city: "New Delhi", district: "New Delhi", lat: 28.6139, lng: 77.209, weight: 0.35 },
      { city: "South Delhi", district: "South Delhi", lat: 28.5355, lng: 77.2066, weight: 0.25 },
      { city: "North Delhi", district: "North Delhi", lat: 28.7188, lng: 77.1648, weight: 0.15 },
      { city: "East Delhi", district: "East Delhi", lat: 28.6315, lng: 77.2917, weight: 0.15 },
      { city: "Dwarka", district: "South West Delhi", lat: 28.5921, lng: 77.046, weight: 0.1 }
    ],
    target_count: 2860
  },
  {
    state: "Karnataka",
    state_code: "KA",
    center: { lat: 15.3173, lng: 75.7139 },
    cities: [
      { city: "Bengaluru", district: "Bengaluru Urban", lat: 12.9716, lng: 77.5946, weight: 0.65 },
      { city: "Mysuru", district: "Mysuru", lat: 12.2958, lng: 76.6394, weight: 0.12 },
      { city: "Hubballi", district: "Dharwad", lat: 15.3647, lng: 75.124, weight: 0.09 },
      { city: "Mangaluru", district: "Dakshina Kannada", lat: 12.9141, lng: 74.856, weight: 0.08 },
      { city: "Belagavi", district: "Belagavi", lat: 15.8497, lng: 74.4977, weight: 0.06 }
    ],
    target_count: 2780
  },
  {
    state: "Tamil Nadu",
    state_code: "TN",
    center: { lat: 11.1271, lng: 78.6569 },
    cities: [
      { city: "Chennai", district: "Chennai", lat: 13.0827, lng: 80.2707, weight: 0.5 },
      { city: "Coimbatore", district: "Coimbatore", lat: 11.0168, lng: 76.9558, weight: 0.2 },
      { city: "Madurai", district: "Madurai", lat: 9.9252, lng: 78.1198, weight: 0.12 },
      { city: "Tiruchirappalli", district: "Tiruchirappalli", lat: 10.7905, lng: 78.7047, weight: 0.1 },
      { city: "Salem", district: "Salem", lat: 11.6643, lng: 78.146, weight: 0.08 }
    ],
    target_count: 2420
  },
  {
    state: "Gujarat",
    state_code: "GJ",
    center: { lat: 22.2587, lng: 71.1924 },
    cities: [
      { city: "Ahmedabad", district: "Ahmedabad", lat: 23.0225, lng: 72.5714, weight: 0.45 },
      { city: "Surat", district: "Surat", lat: 21.1702, lng: 72.8311, weight: 0.25 },
      { city: "Vadodara", district: "Vadodara", lat: 22.3072, lng: 73.1812, weight: 0.15 },
      { city: "Rajkot", district: "Rajkot", lat: 22.3039, lng: 70.8022, weight: 0.1 },
      { city: "Gandhinagar", district: "Gandhinagar", lat: 23.2156, lng: 72.6369, weight: 0.05 }
    ],
    target_count: 2150
  },
  {
    state: "Uttar Pradesh",
    state_code: "UP",
    center: { lat: 26.8467, lng: 80.9462 },
    cities: [
      { city: "Noida", district: "Gautam Buddha Nagar", lat: 28.5355, lng: 77.391, weight: 0.35 },
      { city: "Lucknow", district: "Lucknow", lat: 26.8467, lng: 80.9462, weight: 0.25 },
      { city: "Ghaziabad", district: "Ghaziabad", lat: 28.6692, lng: 77.4538, weight: 0.2 },
      { city: "Kanpur", district: "Kanpur Nagar", lat: 26.4499, lng: 80.3319, weight: 0.1 },
      { city: "Varanasi", district: "Varanasi", lat: 25.3176, lng: 82.9739, weight: 0.1 }
    ],
    target_count: 2010
  },
  {
    state: "Telangana",
    state_code: "TS",
    center: { lat: 18.1124, lng: 79.0193 },
    cities: [
      { city: "Hyderabad", district: "Hyderabad", lat: 17.385, lng: 78.4867, weight: 0.75 },
      { city: "Warangal", district: "Warangal", lat: 17.9689, lng: 79.5941, weight: 0.12 },
      { city: "Nizamabad", district: "Nizamabad", lat: 18.6725, lng: 78.0941, weight: 0.07 },
      { city: "Karimnagar", district: "Karimnagar", lat: 18.4386, lng: 79.1288, weight: 0.06 }
    ],
    target_count: 1480
  },
  {
    state: "Rajasthan",
    state_code: "RJ",
    center: { lat: 27.0238, lng: 74.2179 },
    cities: [
      { city: "Jaipur", district: "Jaipur", lat: 26.9124, lng: 75.7873, weight: 0.5 },
      { city: "Jodhpur", district: "Jodhpur", lat: 26.2389, lng: 73.0243, weight: 0.2 },
      { city: "Udaipur", district: "Udaipur", lat: 24.5854, lng: 73.7125, weight: 0.15 },
      { city: "Kota", district: "Kota", lat: 25.2138, lng: 75.8648, weight: 0.15 }
    ],
    target_count: 1390
  },
  {
    state: "Kerala",
    state_code: "KL",
    center: { lat: 10.8505, lng: 76.2711 },
    cities: [
      { city: "Kochi", district: "Ernakulam", lat: 9.9312, lng: 76.2673, weight: 0.4 },
      { city: "Thiruvananthapuram", district: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366, weight: 0.3 },
      { city: "Kozhikode", district: "Kozhikode", lat: 11.2588, lng: 75.7804, weight: 0.18 },
      { city: "Thrissur", district: "Thrissur", lat: 10.5276, lng: 76.2144, weight: 0.12 }
    ],
    target_count: 1240
  },
  {
    state: "Haryana",
    state_code: "HR",
    center: { lat: 29.0588, lng: 76.0856 },
    cities: [
      { city: "Gurugram", district: "Gurugram", lat: 28.4595, lng: 77.0266, weight: 0.6 },
      { city: "Faridabad", district: "Faridabad", lat: 28.4089, lng: 77.3178, weight: 0.25 },
      { city: "Panchkula", district: "Panchkula", lat: 30.6942, lng: 76.8606, weight: 0.15 }
    ],
    target_count: 1150
  },
  {
    state: "West Bengal",
    state_code: "WB",
    center: { lat: 22.9868, lng: 87.855 },
    cities: [
      { city: "Kolkata", district: "Kolkata", lat: 22.5726, lng: 88.3639, weight: 0.7 },
      { city: "Howrah", district: "Howrah", lat: 22.5958, lng: 88.2636, weight: 0.15 },
      { city: "Siliguri", district: "Darjeeling", lat: 26.7271, lng: 88.3953, weight: 0.15 }
    ],
    target_count: 980
  },
  {
    state: "Andhra Pradesh",
    state_code: "AP",
    center: { lat: 15.9129, lng: 79.74 },
    cities: [
      { city: "Visakhapatnam", district: "Visakhapatnam", lat: 17.6868, lng: 83.2185, weight: 0.45 },
      { city: "Vijayawada", district: "NTR", lat: 16.5062, lng: 80.648, weight: 0.35 },
      { city: "Tirupati", district: "Tirupati", lat: 13.6288, lng: 79.4192, weight: 0.2 }
    ],
    target_count: 920
  },
  {
    state: "Madhya Pradesh",
    state_code: "MP",
    center: { lat: 22.9734, lng: 78.6569 },
    cities: [
      { city: "Indore", district: "Indore", lat: 22.7196, lng: 75.8577, weight: 0.45 },
      { city: "Bhopal", district: "Bhopal", lat: 23.2599, lng: 77.4126, weight: 0.35 },
      { city: "Gwalior", district: "Gwalior", lat: 26.2183, lng: 78.1828, weight: 0.2 }
    ],
    target_count: 880
  },
  {
    state: "Punjab",
    state_code: "PB",
    center: { lat: 31.1471, lng: 75.3412 },
    cities: [
      { city: "Ludhiana", district: "Ludhiana", lat: 30.901, lng: 75.8573, weight: 0.4 },
      { city: "Amritsar", district: "Amritsar", lat: 31.634, lng: 74.8723, weight: 0.35 },
      { city: "Jalandhar", district: "Jalandhar", lat: 31.326, lng: 75.5762, weight: 0.25 }
    ],
    target_count: 810
  },
  {
    state: "Odisha",
    state_code: "OD",
    center: { lat: 20.9517, lng: 85.0985 },
    cities: [
      { city: "Bhubaneswar", district: "Khordha", lat: 20.2961, lng: 85.8245, weight: 0.65 },
      { city: "Cuttack", district: "Cuttack", lat: 20.4625, lng: 85.8828, weight: 0.35 }
    ],
    target_count: 640
  },
  {
    state: "Goa",
    state_code: "GA",
    center: { lat: 15.2993, lng: 74.124 },
    cities: [
      { city: "Panaji", district: "North Goa", lat: 15.4909, lng: 73.8278, weight: 0.55 },
      { city: "Margao", district: "South Goa", lat: 15.2832, lng: 73.9862, weight: 0.45 }
    ],
    target_count: 420
  },
  {
    state: "Chandigarh",
    state_code: "CH",
    center: { lat: 30.7333, lng: 76.7794 },
    cities: [
      { city: "Chandigarh", district: "Chandigarh", lat: 30.7333, lng: 76.7794, weight: 1.0 }
    ],
    target_count: 360
  },
  {
    state: "Assam",
    state_code: "AS",
    center: { lat: 26.2006, lng: 92.9376 },
    cities: [
      { city: "Guwahati", district: "Kamrup Metropolitan", lat: 26.1445, lng: 91.7362, weight: 0.8 },
      { city: "Dibrugarh", district: "Dibrugarh", lat: 27.4728, lng: 94.912, weight: 0.2 }
    ],
    target_count: 320
  },
  {
    state: "Bihar",
    state_code: "BR",
    center: { lat: 25.0961, lng: 85.3131 },
    cities: [
      { city: "Patna", district: "Patna", lat: 25.5941, lng: 85.1376, weight: 0.7 },
      { city: "Gaya", district: "Gaya", lat: 24.7914, lng: 85.0002, weight: 0.3 }
    ],
    target_count: 310
  },
  {
    state: "Uttarakhand",
    state_code: "UK",
    center: { lat: 30.0668, lng: 79.0193 },
    cities: [
      { city: "Dehradun", district: "Dehradun", lat: 30.3165, lng: 78.0322, weight: 0.65 },
      { city: "Haridwar", district: "Haridwar", lat: 29.9457, lng: 78.1642, weight: 0.35 }
    ],
    target_count: 290
  },
  {
    state: "Himachal Pradesh",
    state_code: "HP",
    center: { lat: 31.1048, lng: 77.1734 },
    cities: [
      { city: "Shimla", district: "Shimla", lat: 31.1048, lng: 77.1734, weight: 0.5 },
      { city: "Dharamshala", district: "Kangra", lat: 32.219, lng: 76.3234, weight: 0.5 }
    ],
    target_count: 210
  },
  {
    state: "Jharkhand",
    state_code: "JH",
    center: { lat: 23.6102, lng: 85.2799 },
    cities: [
      { city: "Ranchi", district: "Ranchi", lat: 23.3441, lng: 85.3096, weight: 0.55 },
      { city: "Jamshedpur", district: "East Singhbhum", lat: 22.8046, lng: 86.2029, weight: 0.45 }
    ],
    target_count: 208
  }
];

const OPERATORS = [
  { name: "Tata Power EZ Charge", weight: 0.30 },
  { name: "Jio-bp pulse", weight: 0.20 },
  { name: "Statiq", weight: 0.14 },
  { name: "Ather Grid", weight: 0.10 },
  { name: "ChargeZone", weight: 0.08 },
  { name: "Kazam", weight: 0.07 },
  { name: "Zeon Charging", weight: 0.05 },
  { name: "CESL Public Charging", weight: 0.04 },
  { name: "Discom Municipal Charging", weight: 0.02 }
];

const CONNECTOR_CONFIGS = [
  {
    type: "Fast Highway Hub",
    connectors: [
      { type: "CCS-2", power_kw: 60, count: 2 },
      { type: "Type-2 AC", power_kw: 22, count: 1 }
    ],
    total_capacity_kw: 142
  },
  {
    type: "Ultra Fast Hub",
    connectors: [
      { type: "CCS-2", power_kw: 120, count: 2 },
      { type: "Type-2 AC", power_kw: 22, count: 2 }
    ],
    total_capacity_kw: 284
  },
  {
    type: "Urban Passenger Hub",
    connectors: [
      { type: "CCS-2", power_kw: 30, count: 2 },
      { type: "Type-2 AC", power_kw: 7.4, count: 2 }
    ],
    total_capacity_kw: 74.8
  },
  {
    type: "Commercial 2W/3W Hub",
    connectors: [
      { type: "Bharat DC-001", power_kw: 15, count: 2 },
      { type: "Bharat AC-001", power_kw: 10, count: 1 }
    ],
    total_capacity_kw: 40
  },
  {
    type: "Destination Charger",
    connectors: [
      { type: "Type-2 AC", power_kw: 22, count: 2 }
    ],
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
  "Hotel & Resort Parking",
  "Airport Terminal Long-term Parking",
  "EV Fleet Depot Hub"
];

function selectByWeight(items) {
  const r = Math.random();
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r <= acc) return item;
  }
  return items[items.length - 1];
}

console.log("Generating Indian EV Charging Station Dataset...");

let stationId = 1;
const stations = [];

for (const stateObj of STATES_DATA) {
  const count = stateObj.target_count;
  for (let i = 0; i < count; i++) {
    const cityObj = selectByWeight(stateObj.cities);
    const operator = selectByWeight(OPERATORS);
    const config = CONNECTOR_CONFIGS[Math.floor(Math.random() * CONNECTOR_CONFIGS.length)];
    const locationTag = LOCATION_TAGS[Math.floor(Math.random() * LOCATION_TAGS.length)];

    // Add small jitter to latitude and longitude around city center (~5-15 km radius)
    const latJitter = (Math.random() - 0.5) * 0.18;
    const lngJitter = (Math.random() - 0.5) * 0.18;

    const lat = Number((cityObj.lat + latJitter).toFixed(6));
    const lng = Number((cityObj.lng + lngJitter).toFixed(6));

    const name = `${operator.name} - ${cityObj.city} ${locationTag} #${(i % 45) + 1}`;
    const address = `${locationTag}, Sector ${((i * 7) % 65) + 1}, ${cityObj.city}, ${cityObj.district}, ${stateObj.state} - India`;

    stations.push({
      id: stationId++,
      name,
      operator: operator.name,
      state: stateObj.state,
      state_code: stateObj.state_code,
      district: cityObj.district,
      city: cityObj.city,
      address,
      latitude: lat,
      longitude: lng,
      connectors: config.connectors,
      total_capacity_kw: config.total_capacity_kw,
      access_type: "Public",
      status: "Operational"
    });
  }
}

console.log(`Generated ${stations.length} stations across ${STATES_DATA.length} states.`);

// Generate State Aggregates
const stateAggregates = STATES_DATA.map((s) => {
  const stateStations = stations.filter((st) => st.state === s.state);
  const operatorCounts = {};
  for (const st of stateStations) {
    operatorCounts[st.operator] = (operatorCounts[st.operator] || 0) + 1;
  }
  const topOperators = Object.entries(operatorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ operator: name, count }));

  return {
    state: s.state,
    state_code: s.state_code,
    total_stations: stateStations.length,
    major_cities: s.cities.map((c) => c.city),
    top_operators: topOperators
  };
});

fs.writeFileSync(path.join(DATA_DIR, "stations.json"), JSON.stringify(stations, null, 2), "utf8");
fs.writeFileSync(path.join(DATA_DIR, "states.json"), JSON.stringify(stateAggregates, null, 2), "utf8");

console.log("Successfully wrote stations.json and states.json to backend/data/");
