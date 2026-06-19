const express = require("express");

const router = express.Router();

// Server-side geocode proxy to avoid browser CORS/network restrictions.
// Uses OpenStreetMap Nominatim.
router.get("/geocode", async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ message: "Missing or invalid query" });
    }

    const query = q
      .replace(/\bhttps?:\/\/\S+/gi, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\b\d{1,4}\b/g, " ")
      .replace(/\b₹\s*\d+[\d,]*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;

    // Node 18+ typically has global fetch. Fallback to node-fetch if needed.
    const fetchFn = global.fetch || (await import("node-fetch")).default;

    const response = await fetchFn(url, {
      headers: {
        // Some environments require user-agent; Node-fetch will send this.
        "Accept": "application/json",
        "User-Agent": "ai-travel-planner/1.0 (server)",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Geocoding provider error" });
    }

    const data = await response.json();

    const results = (Array.isArray(data) ? data : [])
      .map((d) => {
        const lat = Number(d.lat);
        const lng = Number(d.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          name: d.display_name || query,
          lat,
          lng,
        };
      })
      .filter(Boolean);

    return res.json({ query, results });
  } catch (err) {
    console.error("[mapRoutes] geocode error", err);
    return res.status(500).json({ message: err.message || "Geocoding failed" });
  }
});

// ============================
// Route + Distance estimation (Alternative provider: OpenRouteService)
// ============================
// NOTE: Requires ORS API key (maps route/distance on server side).
// Endpoint(s) are built so you can later swap ORS -> Google easily.

const getORSKey = () => {
  return process.env.ORS_API_KEY || process.env.OPENROUTESERVICE_API_KEY || "";
};

const getFetchFn = async () => {
  return global.fetch || (await import("node-fetch")).default;
};

const formatKm = (meters) => {
  if (!Number.isFinite(meters)) return null;
  return meters / 1000;
};

const formatDurationMin = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  return seconds / 60;
};

// Get route polyline as a sequence of [lat,lng] points.
// Uses ORS "driving-car" by default.
router.post("/route", async (req, res) => {
  try {
    const orsKey = getORSKey();
    if (!orsKey) {
      return res.status(400).json({ message: "Missing ORS_API_KEY" });
    }

    const { coordinates, profile = "driving-car" } = req.body || {};
    // coordinates: [{lat,lng}, ...] or [[lng,lat], ...]
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ message: "coordinates with at least 2 points are required" });
    }

    const coords = coordinates.map((c) => {
      if (Array.isArray(c) && c.length === 2) {
        // assume [lng,lat]
        const lng = Number(c[0]);
        const lat = Number(c[1]);
        return [lng, lat];
      }
      const lat = Number(c?.lat);
      const lng = Number(c?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lng, lat];
    });

    if (coords.some((x) => x == null)) {
      return res.status(400).json({ message: "Invalid coordinate values" });
    }

    const fetchFn = await getFetchFn();

    const url = `https://api.openrouteservice.org/v2/directions/${encodeURIComponent(profile)}/geojson`;

    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": orsKey,
      },
      body: JSON.stringify({
        coordinates: coords,
        // keep response light
        geometry_format: "encodedpolyline",
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(502).json({ message: "Route provider error", detail: text.slice(0, 300) });
    }

    const data = await response.json();

    // ORS returns geometry/segments differently based on settings; attempt common cases.
    // We will prefer GeoJSON geometry coordinates if present, else fall back to steps.
    // Expected: data.routes[0].geometry OR data.routes[0].segments[0].steps...
    const route = data?.features?.[0] || data?.routes?.[0] || data;

    let points = null;
    if (route?.geometry?.coordinates && Array.isArray(route.geometry.coordinates)) {
      // coordinates are [lng,lat]
      points = route.geometry.coordinates.map((p) => [p[1], p[0]]);
    } else if (route?.segments?.[0]?.steps?.length) {
      // best-effort: no guaranteed polyline decoding without extra lib.
      const steps = route.segments[0].steps;
      points = [];
      for (const s of steps) {
        if (s?.way_points?.length) {
          // s.way_points are typically [lng,lat] pairs
          for (const wp of s.way_points) {
            if (Array.isArray(wp) && wp.length === 2) points.push([wp[1], wp[0]]);
          }
        }
      }
    }

    // duration/distance totals if available
    const summary = route?.summary || data?.routes?.[0]?.summary || {};
    const totalDistanceM = Number(summary?.distance);
    const totalDurationS = Number(summary?.duration);

    res.json({
      distanceKm: formatKm(totalDistanceM),
      durationMin: formatDurationMin(totalDurationS),
      polyline: Array.isArray(points) ? points : [],
    });
  } catch (err) {
    console.error("[mapRoutes] route error", err);
    res.status(500).json({ message: err.message || "Route failed" });
  }
});

// Get distance + duration for consecutive stops.
router.post("/distance-matrix", async (req, res) => {
  try {
    const orsKey = getORSKey();
    if (!orsKey) {
      return res.status(400).json({ message: "Missing ORS_API_KEY" });
    }

    const { coordinates, profile = "driving-car" } = req.body || {};
    // coordinates: [{lat,lng}, ...]
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ message: "coordinates with at least 2 points are required" });
    }

    const coords = coordinates.map((c) => {
      const lat = Number(c?.lat);
      const lng = Number(c?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lng, lat];
    });

    if (coords.some((x) => x == null)) {
      return res.status(400).json({ message: "Invalid coordinate values" });
    }

    const fetchFn = await getFetchFn();

    const url = `https://api.openrouteservice.org/v2/matrix/${encodeURIComponent(profile)}`;

    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": orsKey,
      },
      body: JSON.stringify({
        locations: coords,
        metrics: ["distance", "duration"],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(502).json({ message: "Matrix provider error", detail: text.slice(0, 300) });
    }

    const data = await response.json();

    // ORS matrix response: data.distances / data.durations are 2D arrays [from][to]
    const distances = data?.distances;
    const durations = data?.durations;

    if (!Array.isArray(distances) || !Array.isArray(durations)) {
      return res.json({ segments: [] });
    }

    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const dM = distances?.[i]?.[i + 1];
      const tS = durations?.[i]?.[i + 1];
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        distanceKm: formatKm(Number(dM)),
        durationMin: formatDurationMin(Number(tS)),
      });
    }

    res.json({ segments });
  } catch (err) {
    console.error("[mapRoutes] distance-matrix error", err);
    res.status(500).json({ message: err.message || "Distance matrix failed" });
  }
});

module.exports = router;


