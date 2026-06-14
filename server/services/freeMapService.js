const axios = require("axios");

class FreeMapService {
  constructor() {
    this.nominatimBase = "https://nominatim.openstreetmap.org";
    this.overpassUrl =
      "https://overpass-api.de/api/interpreter";

    this.osrmBase =
      "https://router.project-osrm.org";

    this.userAgent =
      process.env.MAPS_USER_AGENT ||
      "AI-TripPlanner/1.0";
  }

  // Geocode Address
  async geocode(address) {
    try {
      const response = await axios.get(
        `${this.nominatimBase}/search`,
        {
          params: {
            q: address,
            format: "json",
            limit: 1,
          },
          headers: {
            "User-Agent": this.userAgent,
          },
        }
      );

      if (!response.data.length) {
        throw new Error("Location not found");
      }

      const place = response.data[0];

      return {
        formatted_address: place.display_name,
        location: {
          lat: Number(place.lat),
          lng: Number(place.lon),
        },
      };
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  // Reverse Geocode
  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(
        `${this.nominatimBase}/reverse`,
        {
          params: {
            lat,
            lon: lng,
            format: "json",
          },
          headers: {
            "User-Agent": this.userAgent,
          },
        }
      );

      return {
        formatted_address:
          response.data.display_name,
        location: { lat, lng },
      };
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  // Overpass Filter
  buildOverpassFilter(type) {
    switch (type) {
      case "restaurant":
        return "[amenity=restaurant]";

      case "cafe":
        return "[amenity=cafe]";

      case "hotel":
        return "[tourism=hotel]";

      case "hospital":
        return "[amenity=hospital]";

      case "tourist_attraction":
        return "[tourism=attraction]";

      default:
        return "[amenity]";
    }
  }

  // Nearby Places Search
  async nearbySearch(
    location,
    radius = 5000,
    type = null
  ) {
    try {
      const [lat, lng] = location
        .split(",")
        .map(Number);

      const filter = type
        ? this.buildOverpassFilter(type)
        : "[amenity]";

      const query = `
        [out:json];
        (
          node(around:${radius},${lat},${lng})${filter};
        );
        out;
      `;

      const response = await axios.post(
        this.overpassUrl,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      const results = response.data.elements.map(
        (place) => ({
          id: place.id,
          name: place.tags?.name || "Unknown",
          location: {
            lat: place.lat,
            lng: place.lon,
          },
        })
      );

      return results;
    } catch (error) {
      console.log(error.message);
      return [];
    }
  }

  // Search Places
  async searchPlaces(query) {
    try {
      const response = await axios.get(
        `${this.nominatimBase}/search`,
        {
          params: {
            q: query,
            format: "json",
            limit: 10,
          },
          headers: {
            "User-Agent": this.userAgent,
          },
        }
      );

      return response.data.map((place) => ({
        id: place.place_id,
        name: place.display_name,
        location: {
          lat: Number(place.lat),
          lng: Number(place.lon),
        },
      }));
    } catch (error) {
      console.log(error.message);
      return [];
    }
  }

  // Directions
  async getDirections(
    origin,
    destination
  ) {
    try {
      const [oLat, oLng] = origin
        .split(",")
        .map(Number);

      const [dLat, dLng] = destination
        .split(",")
        .map(Number);

      const url = `${this.osrmBase}/route/v1/driving/${oLng},${oLat};${dLng},${dLat}`;

      const response = await axios.get(url, {
        params: {
          overview: "false",
        },
      });

      const route =
        response.data.routes[0];

      return {
        distance: `${(
          route.distance / 1000
        ).toFixed(2)} km`,

        duration: `${Math.round(
          route.duration / 60
        )} mins`,
      };
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }
}

module.exports = new FreeMapService();