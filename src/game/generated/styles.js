// How each rendering style changes real geometry and materials (not just colours or lighting).
// bevel: rounded-edge radius on detail pieces · seg: curve segments · trims: 0 none, 1 key trims, 2 full trim detail
// tex: procedural albedo maps · bump: maps reused as bump · flat: faceted flat shading · sat: colour saturation
// rough: roughness multiplier · clear: clearcoat on hard surfaces · env: reflection strength · emit: glow strength
export const STYLE = {
  stylized_hires: { label: 'Stylized Hi-Res 3D', bevel: 0.06, seg: 28, trims: 1, tex: true, bump: 0, flat: false, sat: 1.25, rough: 0.8, minRough: 0, clear: 0.35, env: 1.15, emit: 1.3, canopy: 'puffy', density: 1 },
  photoreal: { label: 'Photorealistic', bevel: 0.008, seg: 32, trims: 2, tex: true, bump: 0.9, flat: false, sat: 0.92, rough: 1, minRough: 0, clear: 0, env: 1, emit: 1, canopy: 'layered', density: 1.2 },
  low_poly: { label: 'Low Poly', bevel: 0, seg: 6, trims: 0, tex: false, bump: 0, flat: true, sat: 1.15, rough: 1, minRough: 0.75, clear: 0, env: 0.55, emit: 1, canopy: 'facet', density: 0.7 },
  semi_stylized: { label: 'Semi-Stylized', bevel: 0.03, seg: 18, trims: 1, tex: true, bump: 0.3, flat: false, sat: 1.1, rough: 0.9, minRough: 0, clear: 0.1, env: 1, emit: 1.1, canopy: 'puffy', density: 1 },
  cinematic: { label: 'Cinematic Animated Feature', bevel: 0.05, seg: 28, trims: 2, tex: true, bump: 0.3, flat: false, sat: 1.3, rough: 0.85, minRough: 0, clear: 0.3, env: 1.35, emit: 1.6, canopy: 'puffy', density: 1 },
};
export const styleOf = (k) => STYLE[k] || STYLE.stylized_hires;