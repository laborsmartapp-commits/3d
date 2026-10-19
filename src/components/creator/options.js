// Structured Stage Creator choices (short, bounded inputs instead of one long prompt).
export const STYLES = [['stylized_hires', 'Stylized Hi-Res 3D'], ['photoreal', 'Photorealistic'], ['low_poly', 'Low Poly'], ['semi_stylized', 'Semi-Stylized'], ['cinematic', 'Cinematic Animated']];
export const STYLE_LABEL = Object.fromEntries(STYLES);
export const QUALITY = [['standard', 'Standard · Claude Sonnet 5'], ['maximum', 'Maximum · Claude Opus 5.5']];
export const MODEL_LABEL = { standard: 'Claude Sonnet 5', maximum: 'Claude Opus 5.5', 'claude-sonnet-5': 'Claude Sonnet 5', claude_opus_5_5: 'Claude Opus 5.5' };

export const STEPS = [
  { title: 'Basics', fields: [
    ['category', 'Stage type', ['Luxury Interior', 'Residential Interior', 'City Street', 'Plaza / Square', 'Fantasy Garden', 'Park', 'Music Venue', 'Shop / Café', 'Studio Set', 'Nature Clearing']],
    ['style', 'Texture / rendering style', STYLES],
  ] },
  { title: 'Space', fields: [
    ['scale', 'Scale', ['Single room', 'Small (house / yard)', 'Medium (block)', 'Large (district)']],
    ['environment', 'Environment', [['indoor', 'Indoor'], ['outdoor', 'Outdoor'], ['connected', 'Indoor + outdoor']]],
    ['levels', 'Levels', ['Single level', 'Two levels', 'Multi-level']],
    ['walkability', 'Walkability', ['Fully walkable', 'Main paths walkable', 'Mostly scenic']],
    ['complexity', 'Architectural complexity', ['Simple', 'Moderate', 'Detailed', 'Highly detailed']],
  ] },
  { title: 'Dressing', fields: [
    ['density', 'Decoration density', ['Sparse', 'Balanced', 'Dense', 'Maximal']],
    ['materials', 'Materials & surfaces', ['Polished stone', 'Wood', 'Brick', 'Concrete & asphalt', 'Glass & metal', 'Fabric & velvet', 'Natural ground', 'Crystal & glow'], true],
    ['props', 'Furnishings & props', ['Seating', 'Tables', 'Lighting fixtures', 'Decor & art', 'Plants', 'Street furniture', 'Music & DJ gear', 'Fantasy props'], true],
    ['vfx', 'VFX', ['Fire', 'Fireflies', 'Floating lanterns', 'Magic orbs', 'Falling petals', 'Fountain spray', 'Smoke / steam', 'Light beams'], true],
  ] },
  { title: 'Production', fields: [
    ['purpose', 'Production purpose', ['Music video', 'Dialogue scene', 'Dance number', 'Action / chase', 'Establishing shots']],
    ['target', 'Performance target', [['mobile', 'Mobile'], ['balanced', 'Balanced'], ['high', 'High-end desktop']]],
    ['quality', 'AI model', QUALITY],
  ] },
];

export const DEFAULTS = { name: '', category: 'Luxury Interior', style: 'stylized_hires', scale: 'Small (house / yard)', environment: 'indoor', levels: 'Single level', walkability: 'Fully walkable', complexity: 'Detailed', density: 'Balanced', materials: [], props: [], vfx: [], purpose: 'Music video', target: 'balanced', quality: 'standard', prompt: '' };

// Honest description of what each style really is in this engine.
export const STYLE_NOTE = {
  stylized_hires: 'Rounded, bevelled procedural geometry with saturated PBR materials and clearcoat. Furniture comes from the MationStudio catalog.',
  photoreal: 'Procedural PBR: physically based roughness/metalness, bump-mapped procedural textures and full trim detail. Geometry is built from primitives, not scanned assets, so surfaces read as clean CG rather than true photorealism.',
  low_poly: 'Faceted flat-shaded meshes, no textures, low segment counts: intentionally simple shapes.',
  semi_stylized: 'Light bevels and softened textures between stylized and realistic.',
  cinematic: 'Bevelled hero shapes with strong reflections and glow for dramatic lighting.',
};