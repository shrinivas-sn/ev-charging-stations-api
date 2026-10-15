"use strict";

const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

let cachedStations = null;
let cachedStates = null;
let cachedConnectors = null;
let cachedMeta = null;

function loadData() {
  if (!cachedStations) {
    cachedStations = require(path.join(DATA_DIR, "stations.json"));
  }
  if (!cachedStates) {
    cachedStates = require(path.join(DATA_DIR, "states.json"));
  }
  if (!cachedConnectors) {
    cachedConnectors = require(path.join(DATA_DIR, "connectors.json"));
  }
  if (!cachedMeta) {
    cachedMeta = require(path.join(DATA_DIR, "meta.json"));
  }
}

/**
 * Calculates great-circle distance between two coordinates in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function getStations(filters = {}) {
  loadData();

  let results = cachedStations;

  if (filters.state) {
    const sLower = filters.state.toLowerCase();
    results = results.filter(
      (s) => s.state.toLowerCase() === sLower || s.state_code.toLowerCase() === sLower
    );
  }

  if (filters.city) {
    const cLower = filters.city.toLowerCase();
    results = results.filter((s) => s.city.toLowerCase() === cLower);
  }

  if (filters.operator) {
    const opLower = filters.operator.toLowerCase();
    results = results.filter((s) => s.operator.toLowerCase().includes(opLower));
  }

  if (filters.connector) {
    const conLower = filters.connector.toLowerCase();
    results = results.filter((s) =>
      s.connectors.some((c) => c.type.toLowerCase().includes(conLower))
    );
  }

  if (filters.min_power_kw) {
    const minKw = Number(filters.min_power_kw);
    if (!Number.isNaN(minKw)) {
      results = results.filter((s) => s.total_capacity_kw >= minKw);
    }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 25));
  const total = results.length;
  const startIndex = (page - 1) * limit;
  const paginated = results.slice(startIndex, startIndex + limit);

  return {
    data: paginated,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      count: paginated.length,
      filters_applied: {
        state: filters.state || null,
        city: filters.city || null,
        operator: filters.operator || null,
        connector: filters.connector || null,
        min_power_kw: filters.min_power_kw || null
      }
    }
  };
}

function getNearbyStations(lat, lng, radiusKm = 10, limit = 25) {
  loadData();

  const userLat = Number(lat);
  const userLng = Number(lng);
  const radius = Math.min(100, Math.max(1, Number(radiusKm) || 10));
  const maxResults = Math.min(100, Math.max(1, Number(limit) || 25));

  // Rough bounding box pre-filter (~1 degree latitude is approx 111km)
  const latDelta = radius / 111.0;
  const lngDelta = radius / (111.0 * Math.cos(userLat * (Math.PI / 180)));

  const nearby = [];

  for (const station of cachedStations) {
    if (
      station.latitude >= userLat - latDelta &&
      station.latitude <= userLat + latDelta &&
      station.longitude >= userLng - lngDelta &&
      station.longitude <= userLng + lngDelta
    ) {
      const dist = calculateDistance(userLat, userLng, station.latitude, station.longitude);
      if (dist <= radius) {
        nearby.push({
          ...station,
          distance_km: dist
        });
      }
    }
  }

  nearby.sort((a, b) => a.distance_km - b.distance_km);
  const sliced = nearby.slice(0, maxResults);

  return {
    data: sliced,
    meta: {
      center: { lat: userLat, lng: userLng },
      radius_km: radius,
      count: sliced.length,
      total_found: nearby.length
    }
  };
}

function getStationById(id) {
  loadData();
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return null;
  return cachedStations.find((s) => s.id === numId) || null;
}

function getStatesSummary() {
  loadData();
  return {
    data: cachedStates,
    meta: {
      count: cachedStates.length,
      total_stations: cachedStations.length
    }
  };
}

function getConnectors() {
  loadData();
  return {
    data: cachedConnectors,
    meta: {
      count: cachedConnectors.length
    }
  };
}

function getDatasetMeta() {
  loadData();
  return cachedMeta;
}

module.exports = {
  getStations,
  getNearbyStations,
  getStationById,
  getStatesSummary,
  getConnectors,
  getDatasetMeta
};
