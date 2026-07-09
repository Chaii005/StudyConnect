// src/utils/geocoding.js
// ── ENGINE: Nominatim (OSM official) — Free, accurate Vietnamese addresses ──
// Docs: https://nominatim.org/release-docs/develop/api/Search/
// Policy: max 1 req/sec, User-Agent required. countrycodes=vn ensures VN-only results.
// Photon was replaced because it concatenates ", Việt Nam" to queries causing mismatches.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'Accept-Language': 'vi',
  'User-Agent': 'StudyConect/1.0 (studyconect.vercel.app)',
};

// ── Google (legacy — only if valid API key is set) ────────────────────────
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogle = GOOGLE_KEY && GOOGLE_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Build clean Vietnamese display name from Nominatim address object
// Chỉ hiện: Tên địa điểm + Đường + Phường/Quận — KHÔNG hiện Thành phố
// Lý do: Thành phố thường quá dài (varchar 255) và OSM hay nhầm ranh giới
// (vd: Quận 10 bị gán thành "Thành phố Thủ Đức" do dữ liệu OSM sai)
// ─────────────────────────────────────────────────────────────────────────────
function getNominatimDisplayName(item) {
  const a = item.address || {};
  const parts = [];

  // Tên địa điểm chính (POI, café, trường, v.v.)
  const poiName = item.name || a.amenity || a.shop || a.tourism || a.leisure || '';
  if (poiName) parts.push(poiName);

  // Số nhà + đường
  let streetPart = '';
  if (a.house_number) streetPart += a.house_number + ' ';
  if (a.road || a.pedestrian || a.footway) streetPart += (a.road || a.pedestrian || a.footway);
  if (streetPart.trim()) parts.push(streetPart.trim());

  // Phường / Xã (chỉ lấy 1 cấp)
  const ward = a.quarter || a.suburb || a.village || a.hamlet || '';
  if (ward) parts.push(ward);

  // Quận / Huyện — chỉ thêm nếu chưa có phường trùng tên
  const district = a.city_district || a.district || a.town || a.county || '';
  if (district && district !== ward) parts.push(district);

  // ⚠️ KHÔNG thêm city/state — tránh sai thành phố (OSM hay nhầm) và tránh quá dài

  let result;
  if (parts.length === 0) {
    // Fallback: lấy display_name, bỏ quốc gia, giữ tối đa 3 thành phần đầu
    const dn = (item.display_name || '')
      .replace(/,\s*(Việt Nam|Vietnam)\s*$/i, '')
      .split(',')
      .slice(0, 4)
      .join(',')
      .trim();
    result = dn;
  } else {
    result = parts.filter(Boolean).join(', ');
  }

  // Truncate an toàn — DB field là varchar(255), giữ 200 để có đệm
  return result.length > 200 ? result.substring(0, 197) + '...' : result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Geocode text address → { lat, lng, formattedAddress }
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(address) {
  if (!address?.trim()) return null;

  // --- Nominatim (Primary) ---
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address.trim())}&countrycodes=vn&limit=1&format=jsonv2&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (res.ok) {
      const json = await res.json();
      if (json?.length > 0) {
        const item = json[0];
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          formattedAddress: getNominatimDisplayName(item),
        };
      }
    }
  } catch {
    // silent fallback
  }

  // --- Google Fallback ---
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
      // silent
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Autocomplete Suggestions (suggestions list)
// Nominatim rate limit: 1 req/sec — caller must debounce ≥ 400ms
// ─────────────────────────────────────────────────────────────────────────────
export async function autocompletePlaces(input) {
  if (!input?.trim() || input.trim().length < 2) return [];

  // --- Nominatim (Primary) ---
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(input.trim())}&countrycodes=vn&limit=6&format=jsonv2&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        return json.map((item) => ({
          placeId: item.place_id?.toString() || Math.random().toString(),
          text: getNominatimDisplayName(item),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('autocompletePlaces (Nominatim) error:', err);
    }
  }

  // --- Google Fallback ---
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
// 3. Get Details from suggestion selection (chỉ cần khi dùng Google Fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlaceDetails(placeId) {
  if (!placeId) return null;

  if (hasGoogle && !/^\d+$/.test(String(placeId))) {
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
// 4. Static Map API (Legacy)
// ─────────────────────────────────────────────────────────────────────────────
export function staticMapUrl({ lat, lng, zoom = 15, width = 480, height = 180 }) {
  if (!lat || !lng) return null;
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
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Open Google Maps search link
// ─────────────────────────────────────────────────────────────────────────────
export function googleMapsSearchUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OSM Embed Url
// ─────────────────────────────────────────────────────────────────────────────
export function osmEmbedUrl({ lat, lng, zoom = 15 }) {
  if (!lat || !lng) return null;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.007},${lng + 0.01},${lat + 0.007}&layer=mapnik&marker=${lat},${lng}`;
}

export { autocompletePlaces as autocompletePlacesWithToken };
