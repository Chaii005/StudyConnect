// src/utils/geocoding.js
// ── ENGINE: Photon (OSM search by Komoot) — Free, extremely fast, correct Vietnam hierarchy ──
// Docs: https://photon.komoot.io/
// Tốc độ phản hồi cực nhanh, chịu tải tốt, không bị lỗi gộp địa phận thành phố như Nominatim

const PHOTON_BASE = 'https://photon.komoot.io';

// ── Google (legacy — only if valid API key is set) ────────────────────────
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogle = GOOGLE_KEY && GOOGLE_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

// Helper to construct a beautiful, clean Vietnamese display name from Photon properties
function getPhotonDisplayName(p) {
  const parts = [];
  
  // 1. Tên địa danh (POI)
  if (p.name) parts.push(p.name);
  
  // 2. Số nhà & Đường
  let streetPart = '';
  if (p.housenumber) streetPart += p.housenumber + ' ';
  if (p.street) streetPart += p.street;
  if (streetPart.trim()) parts.push(streetPart.trim());
  
  // 3. Phường / Xã / Khu vực nhỏ
  if (p.locality) {
    parts.push(p.locality);
  } else if (p.district && p.district.toLowerCase().includes('phường')) {
    parts.push(p.district);
  }
  
  // 4. Quận / Huyện
  // Nếu district không trùng với locality và không trùng với name
  if (p.district && p.district !== p.locality && p.district !== p.name) {
    // Chỉ thêm nếu không phải là phường (đã lấy ở bước trước)
    if (!p.district.toLowerCase().includes('phường') && !p.district.toLowerCase().includes('xã')) {
      parts.push(p.district);
    }
  }
  
  // 5. Tỉnh / Thành phố
  if (p.city) {
    parts.push(p.city);
  } else if (p.state) {
    parts.push(p.state);
  }
  
  // 6. Quốc gia
  if (p.country) parts.push(p.country);
  
  return parts.filter(Boolean).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Geocode text address → { lat, lng, formattedAddress }
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(address) {
  if (!address?.trim()) return null;

  // --- Photon (Primary) ---
  try {
    let query = address.trim();
    if (!query.toLowerCase().includes('việt nam') && !query.toLowerCase().includes('vietnam')) {
      query += ', Việt Nam';
    }
    const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json?.features?.length > 0) {
        const feature = json.features[0];
        return {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
          formattedAddress: getPhotonDisplayName(feature.properties),
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
// ─────────────────────────────────────────────────────────────────────────────
export async function autocompletePlaces(input) {
  if (!input?.trim() || input.trim().length < 2) return [];

  // --- Photon (Primary) ---
  try {
    let query = input.trim();
    // Bổ sung Việt Nam để tăng độ chính xác tìm kiếm tại VN
    if (!query.toLowerCase().includes('việt nam') && !query.toLowerCase().includes('vietnam')) {
      query += ', Việt Nam';
    }
    const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&limit=6`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json?.features) {
        return json.features.map((f) => ({
          placeId: f.properties.osm_id?.toString() || Math.random().toString(),
          text: getPhotonDisplayName(f.properties),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        }));
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('autocompletePlaces (Photon) error:', err);
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
