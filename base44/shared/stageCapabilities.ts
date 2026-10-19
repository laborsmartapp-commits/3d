// Machine-readable registry of what MationStudio's stage builder can REALLY construct.
// The AI only receives (and the validator only accepts) what is listed here. Keep in sync with
// src/game/generated/* (builders) and src/game/realm/catalog/* (editable furnishings).

export const STYLES = {
  stylized_hires: { label: 'Stylized Hi-Res 3D', geometry: 'bevelled/rounded edges on detail pieces (columns, trims, frames, cornices), smooth high-segment curves, puffy clustered tree canopies', materials: 'procedural albedo textures with boosted saturation, lower roughness, clearcoat on hard polished surfaces, fabric sheen' },
  photoreal: { label: 'Photorealistic', geometry: 'sharp real-world proportions, full trim detail (baseboards, crown, mullions, curbs, lane markings), tapered trunks with layered canopies', materials: 'PBR: procedural albedo maps reused as bump maps, physically plausible roughness/metalness, environment reflections, natural colour variation per instance' },
  low_poly: { label: 'Low Poly', geometry: 'intentionally faceted: 5-6 sided cylinders, icosahedron canopies/rocks, no bevels, no fine trims, chunky proportions', materials: 'flat-shaded solid colours, no textures, matte roughness, limited metalness' },
  semi_stylized: { label: 'Semi-Stylized', geometry: 'light bevels, medium segment counts, simplified trims', materials: 'textures softened toward flat colour, moderate roughness' },
  cinematic: { label: 'Cinematic Animated Feature', geometry: 'bevelled hero shapes, smooth curves, rich trims', materials: 'saturated textures, clearcoat sheen, stronger emissive glow and environment reflections for dramatic lighting' },
};

// name: what it is good for. Every builder takes a material name from this list (+ optional hex color tint).
export const MATERIALS = {
  polished_stone: 'mirror-like polished stone floor/counter: marble texture, roughness 0.08, clearcoat 0.8, strong reflections',
  marble: 'white veined marble, roughness 0.18, light clearcoat',
  rough_stone: 'rough irregular stone blocks, roughness 0.95',
  sandstone: 'warm sandstone blocks', brick: 'red brick with mortar', concrete: 'grey cast concrete',
  polished_concrete: 'smooth sealed concrete, light sheen', asphalt: 'road asphalt', pavers: 'square stone pavers',
  cobblestone: 'rounded cobbles', oak_wood: 'light oak floor planks, roughness 0.4', walnut_wood: 'dark walnut planks',
  painted_wood: 'painted wood (tint with color)', weathered_wood: 'grey weathered fence/board wood',
  plaster: 'matte plaster wall (tint with color)', painted_wall: 'satin painted wall (tint with color)',
  siding: 'horizontal house siding (tint)', roof_shingle: 'dark asphalt roof shingles', tile: 'large ceramic floor tiles',
  mosaic: 'small mosaic tiles (bathrooms, pools)', carpet: 'soft carpet (tint)', grass: 'lawn grass', dirt: 'packed earth path',
  sand: 'sand', gravel: 'loose gravel', moss: 'mossy ground', water: 'transparent reflective water surface',
  glass: 'clear window glass', frosted_glass: 'frosted translucent glass', brushed_metal: 'brushed steel',
  chrome: 'mirror chrome', brass: 'polished brass', gold: 'gold', iron: 'dark wrought iron', copper: 'copper',
  fabric: 'woven fabric (tint)', leather: 'leather (tint)', velvet: 'velvet with sheen (tint)',
  crystal: 'translucent glowing crystal (tint)', emissive: 'self-lit glowing surface (tint) e.g. light panels, signs',
  neon: 'bright unlit neon glow (tint)',
};

// Procedural architecture builders (static, collision-aware).
export const BUILDERS = {
  floors: 'Walkable slab. {id,x,z,w,d,y,material,color?}. y = top surface height in metres (0 = ground level, upper storeys e.g. 3.6). Players stand on it; colliders not needed. Interior rooms MUST have a floor.',
  walls: 'Straight wall segment from (x1,z1) to (x2,z2). {id,x1,z1,x2,z2,y?,h,t?,material,color?,openings:[{at,w,kind,sill?,h?}]}. y = base height (floor it stands on), h = height (2.6-4 for rooms), t = thickness (0.15-0.3). openings: at = 0..1 position along the wall, w = width in m, kind door (w 0.9-1.6, walk-through) | opening (walk-through archway, w 1-4) | window (sill 0.9, h 1.4) | glass (floor-to-ceiling window, not walkable). Solid parts get collision; doors/openings are walkable gaps. Rooms connect ONLY through door/opening gaps.',
  roofs: 'Roof or ceiling over an area. {id,x,z,w,d,y,kind,material,color?}. kind flat (also an interior ceiling) | gable | glass (skylight) | canopy (open-sided on 4 posts). y = height of the underside. Keeps rain/snow out of the area beneath. Hidden automatically when the camera looks down from above.',
  stairs: 'Walkable staircase. {id,x,z,w,run,from_y,to_y,dir,material}. (x,z) = centre of the flight footprint, run = horizontal length (>= rise), dir = compass direction of ascent in radians (0 = +z, PI/2 = +x).',
  buildings: 'Solid exterior building massing (NOT enterable). {id,x,z,w,d,h,ry,storeys,facade,color?,trim_color?,roof:flat|parapet|gable,windows:grid|storefront|none,awning?:hex,sign?:text}. Use for street frontages and backdrops. For an enterable interior build it from floors+walls+roofs instead.',
  elements: 'Procedural architectural/landscape elements, see ELEMENTS. {id,type,x,z,...params}.',
  nature: 'Instanced vegetation and rocks, see NATURE. {id,type,x,z,scale?,count?,radius?,color?}. count>1 scatters copies within radius.',
  terrain: 'Gentle walkable hills: terrain.hills [{x,z,r,h}] (r 4-40, h 0.3-6). Outdoor only.',
};

export const ELEMENTS = {
  road: 'asphalt roadway {x,z,w,d,ry,lanes?} with lane markings and curbs (walkable)',
  sidewalk: 'raised concrete sidewalk {x,z,w,d,ry,material?} with curb edge (walkable, top 0.15)',
  crosswalk: 'zebra stripes on a road {x,z,w,d,ry}',
  path: 'flat garden/park path strip {x,z,w,d,ry,material?} (walkable)',
  plaza: 'paved open square {x,z,w,d,material?} (walkable)',
  platform: 'raised walkable stage/deck {x,z,w,d,h,material?,color?} with edge trim (h = top height 0.2-2)',
  pool: 'water pool/pond {x,z,w,d,material?(rim)} sunken surface with rim (not walkable water)',
  fountain: 'tiered stone fountain {x,z,r?} with water and jets',
  column: 'round column {x,z,h,r?,material?}',
  arch: 'free-standing arch / gate {x,z,w,h,ry,material?} walk-through',
  fence: 'fence line {x1,z1,x2,z2,h?,material?} with posts and rails (blocks movement)',
  railing: 'metal/wood handrail line {x1,z1,x2,z2,y?,material?} (blocks movement)',
  hedge: 'trimmed hedge line {x1,z1,x2,z2,h?} (blocks movement)',
  planter_bed: 'raised planter bed with soil and flowers {x,z,w,d,material?,color?}',
  gazebo: 'open pavilion on posts with roof {x,z,r,material?,color?} (covered, walkable)',
  pergola: 'open timber pergola {x,z,w,d,ry,material?}',
  bridge: 'walkable footbridge deck with rails {x1,z1,x2,z2,w?,y?,material?}',
  plinth: 'stone pedestal/plinth {x,z,w,h,material?} (solid)',
};

export const NATURE = {
  tree_broadleaf: 'deciduous tree (~6m at scale 1)', tree_pine: 'conifer (~8m)', tree_palm: 'palm (~7m)', tree_blossom: 'flowering tree, pink/white (tint)',
  bush: 'round shrub (~1m)', rock: 'boulder (~1m)', flowers: 'flower patch (tint)', grass_tuft: 'tall grass clump', mushroom: 'fantasy mushroom (tint, ~1.2m)',
};

// Animated / glowing effects (real-time, camera-safe). Weather (rain, snow, fog, lightning, clouds) is NOT here:
// it is controlled live from the Weather bubble on every stage and must never be baked into a stage.
export const VFX = {
  fire: 'flickering flames with embers and a warm practical light {x,y,z,scale?}',
  smoke: 'rising smoke column {x,y,z,scale?}', steam: 'soft white steam {x,y,z}',
  sparkles: 'twinkling sparkle particles {x,y,z,color?,scale?}', fireflies: 'drifting glowing fireflies {x,y,z,count?,scale?(radius)}',
  floating_lanterns: 'glowing paper lanterns bobbing in the air {x,y,z,count?,scale?(radius),color?} = lantern geometry + emissive material + pooled practical lights + bob animation',
  magic_orbs: 'glowing orbs orbiting a point {x,y,z,count?,color?}', falling_petals: 'petals drifting down in an area {x,z,scale?(radius),color?}',
  water_jet: 'fountain water spray {x,y,z,scale?}', light_beams: 'volumetric-look stage light cones {x,y,z,color?}',
};

// Practical lights are pooled (nearest 12 shown at once, 6 on mobile).
export const LIGHTS = {
  interior: 'room/practical light {x,y,z,color?,intensity?(2-30),range?(3-14)}; follows the Set Lights "Interior lights" slider',
  exterior: 'outdoor fixture light {x,y,z,color?,intensity?,range?}; switches on at dusk/night via Set Lights',
  always: 'always-on accent light {x,y,z,color?,intensity?,range?} (neon, crystals, stage wash)',
};

const CATALOG_KEYS: Record<string, string[]> = {
  'Living Room': ['sofa', 'loveseat', 'armchair', 'sectional', 'ottoman', 'coffee_table', 'side_table', 'console_table', 'tv_console', 'tv', 'bookshelf', 'rug_large', 'rug_round', 'rug_runner', 'curtains', 'fireplace', 'grand_piano'],
  Decor: ['wall_art', 'poster', 'photo_frame', 'books_stack', 'vase_flowers', 'mirror_wall', 'mirror_wide', 'mirror_round', 'clock_wall', 'candle_set', 'centerpiece', 'sculpture'],
  Kitchen: ['counter_base', 'counter_drawers', 'counter_sink', 'dishwasher', 'range', 'range_hood', 'fridge', 'wall_cabinet', 'pantry', 'island', 'bar_stool', 'fruit_bowl', 'coffee_maker', 'kettle', 'plates_stack', 'pot'],
  Dining: ['dining_table', 'dining_chair', 'sideboard'],
  Lighting: ['floor_lamp', 'table_lamp', 'pendant_light', 'chandelier', 'accent_light', 'wall_sconce'],
  Bedroom: ['bed_double', 'bed_king', 'nightstand', 'dresser', 'desk', 'gaming_chair', 'desk_chair', 'wardrobe', 'beanbag', 'mirror_floor', 'bench_end', 'wall_shelf', 'sneaker_rack'],
  Electronics: ['computer_setup', 'gaming_pc', 'gaming_console', 'computer_monitor', 'laptop', 'headphone_stand'],
  Bathroom: ['bathtub', 'shower', 'toilet', 'vanity', 'vanity_double', 'vanity_small', 'towel_rack', 'bath_mat', 'toiletries'],
  'Music Studio': ['studio_desk', 'mixing_console', 'studio_monitor', 'speaker_stand', 'acoustic_panel', 'diffuser', 'bass_trap', 'booth_foam', 'mic_booth', 'music_stand', 'music_keyboard', 'guitar_stand', 'neon_onair'],
  'DJ & Stage': ['dj_booth', 'dj_controller', 'turntable', 'dj_mixer', 'pa_speaker', 'subwoofer', 'led_par', 'truss', 'stage_riser', 'mic_stand', 'monitor_wedge', 'party_spot'],
  Outdoor: ['patio_table', 'patio_chair', 'adirondack', 'rocking_chair', 'umbrella', 'grill', 'lounge_chair', 'outdoor_sofa', 'fire_pit', 'planter', 'string_lights', 'cooler', 'side_table_outdoor', 'basketball_hoop'],
  Plants: ['plant_floor', 'plant_tall', 'plant_small'],
  Street: ['street_lamp', 'park_bench', 'trash_bin', 'bollard', 'fire_hydrant', 'mailbox', 'traffic_cone', 'bus_stop', 'market_stall', 'cafe_table', 'crate', 'barrel'],
  Fantasy: ['stone_lantern', 'floating_lantern', 'crystal_cluster', 'giant_mushroom', 'torch_post', 'statue', 'rune_stone'],
  Props: ['apple_box', 'basketball', 'coffee_cup', 'phone', 'backpack', 'pizza_box', 'soda_can', 'skateboard', 'clipboard', 'balloons', 'gift_box', 'gift_stack', 'pumpkin'],
};
export const FURNISHINGS = CATALOG_KEYS;
export const CATALOG_SET = new Set(Object.values(CATALOG_KEYS).flat());

// Surface items (place on tables/counters) need an explicit y; wall items need y and must face out of the wall (ry).
export const PLACEMENT = {
  surface: ['books_stack', 'vase_flowers', 'candle_set', 'centerpiece', 'fruit_bowl', 'coffee_maker', 'kettle', 'plates_stack', 'pot', 'table_lamp', 'computer_monitor', 'laptop', 'headphone_stand', 'gaming_console', 'toiletries', 'mixing_console', 'studio_monitor', 'dj_controller', 'dj_mixer', 'coffee_cup', 'phone', 'pizza_box', 'soda_can', 'clipboard', 'photo_frame', 'sculpture'],
  wall: ['wall_art', 'poster', 'mirror_wall', 'mirror_wide', 'mirror_round', 'clock_wall', 'wall_cabinet', 'range_hood', 'wall_shelf', 'towel_rack', 'acoustic_panel', 'diffuser', 'booth_foam', 'neon_onair', 'wall_sconce', 'curtains'],
};

export const BUDGETS = {
  mobile: { buildings: 12, walls: 60, floors: 40, elements: 60, nature: 160, furnishings: 70, vfx: 6, lights: 16 },
  balanced: { buildings: 24, walls: 120, floors: 70, elements: 120, nature: 400, furnishings: 140, vfx: 12, lights: 28 },
  high: { buildings: 40, walls: 200, floors: 110, elements: 200, nature: 900, furnishings: 240, vfx: 20, lights: 40 },
};

export const LIMITS = { boundsMin: 16, boundsMax: 240, wallH: [0.4, 12], buildingH: [3, 90], floorY: [0, 24], cameras: 8, marks: 12, zones: 24 };

export const NOT_SUPPORTED = [
  'Arbitrary sculpted/organic meshes (no external 3D-asset generator is connected): characters, vehicles, detailed statues and unique hero props are limited to the listed catalog pieces and procedural builders.',
  'Curved walls (approximate with several straight segments).',
  'Imported texture images or normal maps from the internet (textures are procedural).',
  'Weather, time of day, sky, fog, rain, snow or lightning (always controlled by the Weather bubble).',
  'Enterable interiors inside "buildings" massing (build interiors from floors, walls and roofs).',
];

export function capabilityDoc() {
  return {
    engine: 'MationStudio street-level stage engine (Three.js, metres, y up, ground y=0, stage centred on 0,0). Player walks with collision; third-person + first-person cameras; production cameras; actors; timeline recording.',
    coordinate_rules: 'x = east/west, z = north/south, all positions within +-bounds.w/2 and +-bounds.d/2. Rotation ry in radians around y. A furnishing with ry=0 faces +z.',
    scene_graph: 'Blueprint sections are built into: static merged architecture (floors, walls, roofs, stairs, buildings, elements), instanced nature, an editable Set (furnishings: each one selectable/movable/rotatable/recolourable in Set Edit), VFX, pooled practical lights, production cameras and floor marks.',
    styles: STYLES, materials: MATERIALS, builders: BUILDERS, elements: ELEMENTS, nature: NATURE, vfx: VFX, lights: LIGHTS,
    furnishings: FURNISHINGS, placement: PLACEMENT, budgets: BUDGETS, limits: LIMITS, not_supported: NOT_SUPPORTED,
    collision_and_navigation: 'Players stand on terrain, floors, stairs, platforms, bridges, sidewalks, paths and plazas. Walls, buildings, fences, hedges, columns, plinths and solid furnishings block movement. Leave 1.2 m+ clear walking lanes. Every room must be reachable from the spawn through door/opening gaps; upper storeys need stairs.',
  };
}