// Universal manual weather state. Nothing here ever advances by itself: the state only changes
// when the director changes it (or a take is replayed exactly as it was recorded).

export const NEUTRAL = {
  hour: 14, conditions: ['clear'], custom: false,
  cloud: 0.12, cloudMove: 0.15, fog: 0.08, haze: 0.15, rain: 0, snow: 0, wind: 0.2, windDir: 45, lightning: 0,
  skyBright: 1, sun: 1, sunAz: 35, moon: 0.7, stars: 0.8, ambient: 1, shadowSoft: 0.35, exposure: 1,
  vegetation: 0.5, leaves: 0, dust: 0, fireflies: 0, water: 0.5, waves: 0.3, wetness: 0, snowCover: 0,
};

export const TIME_PRESETS = [['Dawn', 5.9], ['Morning', 8], ['Midday', 12.5], ['Afternoon', 15], ['Golden Hour', 17.6], ['Sunset', 18.6], ['Dusk', 19.6], ['Night', 22], ['Midnight', 0]];

// Each condition raises the values it needs; combined conditions take the strongest of each.
export const CONDITIONS = {
  clear: { label: 'Clear', set: {} },
  partlyCloudy: { label: 'Partly Cloudy', set: { cloud: 0.45, cloudMove: 0.25 } },
  overcast: { label: 'Overcast', set: { cloud: 0.9, haze: 0.45, shadowSoft: 0.85 } },
  lightRain: { label: 'Light Rain', set: { cloud: 0.75, rain: 0.35, haze: 0.35, wetness: 0.6, shadowSoft: 0.7 } },
  heavyRain: { label: 'Heavy Rain', set: { cloud: 0.95, rain: 0.9, fog: 0.35, haze: 0.5, wetness: 1, wind: 0.55, shadowSoft: 0.9 } },
  thunderstorm: { label: 'Thunderstorm', set: { cloud: 1, rain: 1, fog: 0.3, haze: 0.5, wetness: 1, wind: 0.85, lightning: 1, shadowSoft: 0.95, cloudMove: 0.7 } },
  lightSnow: { label: 'Light Snow', set: { cloud: 0.7, snow: 0.35, haze: 0.3, snowCover: 0.35, shadowSoft: 0.7 } },
  heavySnow: { label: 'Heavy Snow', set: { cloud: 0.9, snow: 0.9, fog: 0.4, haze: 0.55, snowCover: 0.85, wind: 0.45, shadowSoft: 0.9 } },
  fog: { label: 'Fog', set: { fog: 0.9, haze: 0.7, shadowSoft: 0.8 } },
  mist: { label: 'Mist', set: { fog: 0.45, haze: 0.55 } },
  windy: { label: 'Windy', set: { wind: 0.95, cloudMove: 0.8, leaves: 0.45, dust: 0.35, vegetation: 1 } },
};
const EXCLUSIVE = [['lightRain', 'heavyRain', 'thunderstorm'], ['lightSnow', 'heavySnow'], ['fog', 'mist'], ['partlyCloudy', 'overcast']];
export const WX_KEYS = ['cloud', 'cloudMove', 'fog', 'haze', 'rain', 'snow', 'wind', 'lightning', 'shadowSoft', 'wetness', 'snowCover', 'leaves', 'dust', 'vegetation'];

const RANGE = { hour: [0, 24], windDir: [0, 360], sunAz: [-180, 180], skyBright: [0.2, 2], sun: [0, 2], ambient: [0, 2], exposure: [0.4, 2] };
const clampNum = (k, v) => { const [a, b] = RANGE[k] || [0, 1], n = Number.isFinite(+v) ? +v : NEUTRAL[k]; return Math.min(b, Math.max(a, n)); };

export function clampState(s) {
  const out = { ...NEUTRAL };
  for (const k of Object.keys(NEUTRAL)) if (typeof NEUTRAL[k] === 'number' && s?.[k] != null) out[k] = clampNum(k, s[k]);
  out.conditions = (Array.isArray(s?.conditions) ? s.conditions : ['clear']).filter((c) => CONDITIONS[c]);
  if (!out.conditions.length) out.conditions = ['clear'];
  out.custom = !!s?.custom;
  if (out.hour === 24) out.hour = 0;
  return out;
}

export function combine(list) {
  const v = Object.fromEntries(WX_KEYS.map((k) => [k, NEUTRAL[k]]));
  for (const c of list) for (const [k, x] of Object.entries(CONDITIONS[c]?.set || {})) v[k] = Math.max(v[k], x);
  return v;
}

export function toggleCondition(list, k) {
  if (k === 'clear') return ['clear'];
  let next = list.filter((c) => c !== 'clear');
  if (next.includes(k)) next = next.filter((c) => c !== k);
  else { const grp = EXCLUSIVE.find((g) => g.includes(k)) || []; next = [...next.filter((c) => !grp.includes(c)), k]; }
  return next.length ? next : ['clear'];
}

// Old takes and stages stored a single weather name.
const LEGACY = { clear: ['clear'], overcast: ['overcast'], fog: ['fog'], cloudy: ['partlyCloudy'], lightRain: ['lightRain'], heavyRain: ['heavyRain'], thunderstorm: ['thunderstorm'], mist: ['mist'], windy: ['windy'], celestialStorm: ['thunderstorm'], magicRain: ['lightRain'] };
export const isLegacyWeather = (w) => typeof w === 'string' && !!LEGACY[w];
export function fromLegacy(hour, w, base = NEUTRAL) {
  const conditions = LEGACY[w] || ['clear'];
  return clampState({ ...base, ...(hour != null ? { hour } : {}), conditions, custom: false, ...combine(conditions) });
}

export function fromInitial(init) {
  if (!init) return {};
  const conditions = (init.conditions || []).filter((c) => CONDITIONS[c]);
  return { ...(init.hour != null ? { hour: init.hour } : {}), ...(conditions.length ? { conditions, ...combine(conditions) } : {}), ...(init.state || {}) };
}

export function sigOf(s) {
  const str = JSON.stringify(Object.keys(NEUTRAL).map((k) => (typeof s[k] === 'number' ? Math.round(s[k] * 1000) : s[k])));
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return `wx_${h.toString(36)}`;
}

export const fmtHour = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60 + 1e-6)).padStart(2, '0')}`;
export function describe(s) {
  const c = s.custom ? 'Custom' : s.conditions.map((k) => CONDITIONS[k].label).join(' + ');
  return `${c} · ${fmtHour(s.hour)}`;
}