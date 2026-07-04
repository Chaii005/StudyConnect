// src/utils/geocoding.js
// ── ENGINE: Nominatim (OpenStreetMap) — Miễn phí, không cần API key ──────────
// Docs: https://nominatim.org/release-docs/latest/api/Search/
// Rate limit: max 1 req/s, User-Agent bắt buộc (đã set)

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const APP_UA = 'StudyConnect/1.0 (studyconect.vercel.app)';

// ── Google (legacy — chỉ dùng nếu có API key hợp lệ) ────────────────────────
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogle = GOOGLE_KEY && GOOGLE_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Geocode địa chỉ text → { lat, lng, formattedAddress }
//    Ưu tiên: Nominatim (free) → Google fallback (nếu có key)
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(address) {
  if (!address?.trim()) return null;

  // --- Nominatim (primary) ---
  try {
    const url =
      `${NOMINATIM_BASE}/search` +
      `?q=${encodeURIComponent(address)}` +
      `&format=jsonv2` +
      `&addressdetails=1` +
      `&limit=1` +
      `&countrycodes=vn` +         // ưu tiên Việt Nam
      `&accept-language=vi`;
    const res = await fetch(url, {
      headers: { 'User-Agent': APP_UA, 'Accept-Language': 'vi' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.length > 0) {
        const place = json[0];
        return {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          formattedAddress: place.display_name,
        };
      }
    }
  } catch {
    // silent — thử Google fallback
  }

  // --- Google fallback (chỉ nếu có key) ---
  if (hasGoogle) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=vi&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results?.[0]) {
        const loc = json.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng, formattedAddress: json.results[0].formatted_address };
      }
    } catch {
      // silent fail
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Autocomplete địa điểm (gợi ý khi gõ)
//    Nominatim /search với partial query — hoàn toàn miễn phí
// ─────────────────────────────────────────────────────────────────────────────
export async function autocompletePlaces(input) {
  if (!input?.trim() || input.trim().length < 2) return [];

  // --- Nominatim autocomplete ---
  try {
    const url =
      `${NOMINATIM_BASE}/search` +
      `?q=${encodeURIComponent(input.trim())}` +
      `&format=jsonv2` +
      `&addressdetails=1` +
      `&limit=6` +
      `&countrycodes=vn` +
      `&accept-language=vi`;
    const res = await fetch(url, {
      headers: { 'User-Agent': APP_UA, 'Accept-Language': 'vi' },
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        return json.map((p) => ({
          placeId: p.place_id?.toString(),
          text: p.display_name,
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lon),
        }));
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('autocompletePlaces (Nominatim) error:', err);
    }
  }

  // --- Google Places fallback ---
  if (hasGoogle) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId',
        },
        body: JSON.stringify({ input, languageCode: 'vi', regionCode: 'VN' }),
      });
      if (res.status === 403) return [];
      const json = await res.json();
      if (!json.suggestions) return [];
      return json.suggestions
        .filter((s) => s.placePrediction)
        .map((s) => ({ placeId: s.placePrediction.placeId, text: s.placePrediction.text.text }));
    } catch {
      return [];
    }
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Lấy lat/lng từ placeId (dùng sau khi chọn autocomplete suggestion)
//    Nominatim: placeId = OSM place_id → dùng /details hoặc tái geocode
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlaceDetails(placeId) {
  if (!placeId) return null;

  // Nếu placeId là số → Nominatim place_id
  if (/^\d+$/.test(String(placeId))) {
    try {
      const url = `${NOMINATIM_BASE}/details?place_id=${placeId}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': APP_UA } });
      if (res.ok) {
        const json = await res.json();
        const lat = json.geometry?.coordinates?.[1];
        const lng = json.geometry?.coordinates?.[0];
        if (lat && lng) {
          return { lat, lng, formattedAddress: json.localname || json.names?.name || '' };
        }
      }
    } catch {
      // silent
    }
  }

  // Google fallback (nếu placeId là Google place_id)
  if (hasGoogle) {
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,formattedAddress&key=${GOOGLE_KEY}`
      );
      if (res.status === 403) return null;
      const json = await res.json();
      if (json.location) {
        return { lat: json.location.latitude, lng: json.location.longitude, formattedAddress: json.formattedAddress };
      }
    } catch {
      // silent
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Static map image URL (OpenStreetMap tile — miễn phí, không cần key)
// ─────────────────────────────────────────────────────────────────────────────
export function staticMapUrl({ lat, lng, zoom = 15, width = 480, height = 180 }) {
  if (!lat || !lng) return null;

  // Dùng Static Map API của OpenStreetMap-compatible (Geoapify free tier 3000/day)
  // Hoàn toàn không cần key — embed OpenStreetMap iframe thay thế
  // Return null → component tự hiện link "Mở Maps" thay bản đồ ảnh
  // (Google Static Maps API cần billing enabled nên thường bị lỗi)
  if (hasGoogle) {
    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${lat},${lng}` +
      `&zoom=${zoom}` +
      `&size=${width}x${height}` +
      `&scale=2` +
      `&markers=color:red%7C${lat},${lng}` +
      `&style=feature:all|element:geometry|color:0x1a1a2e` +
      `&style=feature:water|color:0x0f3460` +
      `&style=feature:road|color:0x16213e` +
      `&key=${GOOGLE_KEY}`
    );
  }

  // Fallback: OpenStreetMap tile preview (link iframe — không phải ảnh tĩnh)
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Tạo link mở bản đồ từ địa chỉ text (Google Maps — không cần key)
// ─────────────────────────────────────────────────────────────────────────────
export function googleMapsSearchUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Tạo link embed bản đồ OpenStreetMap (miễn phí, thay thế Static Maps)
// ─────────────────────────────────────────────────────────────────────────────
export function osmEmbedUrl({ lat, lng, zoom = 15 }) {
  if (!lat || !lng) return null;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.007},${lng + 0.01},${lat + 0.007}&layer=mapnik&marker=${lat},${lng}`;
}

// Alias giữ tương thích ngược với Groups.jsx (sessionToken không cần nữa)
// eslint-disable-next-line no-unused-vars
export { autocompletePlaces as autocompletePlacesWithToken };
