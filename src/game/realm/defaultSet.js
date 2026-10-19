// The Everyday House dressing. [key, type, x, z, rotationY, floor (0 ground/1/2/'p' porch), heightAboveFloor, colour]
const N = 0, S = Math.PI, E = Math.PI / 2, W = -Math.PI / 2;
const I = (key, type, x, z, ry = 0, f = 1, dy = 0, color) => ({ key, type, x, z, ry, f, dy, color });

export const DEFAULT_SET = [
  // Living room
  I('liv.sectional', 'sectional', -5.5, 3.6, S), I('liv.rug', 'rug_large', -5.5, 1.6, N, 1, 0, '#c9b79c'), I('liv.coffee', 'coffee_table', -5.5, 1.75),
  I('liv.vase', 'vase_flowers', -5.75, 1.75, N, 1, 0.41), I('liv.books', 'books_stack', -5.1, 1.85, 0.3, 1, 0.41),
  I('liv.tvconsole', 'tv_console', -5.5, -0.7), I('liv.tv', 'tv', -5.5, -0.75, N, 1, 0.54), I('liv.frame', 'photo_frame', -6.3, -0.65, N, 1, 0.54),
  I('liv.arm1', 'armchair', -8.0, 1.2, 1.45), I('liv.arm2', 'armchair', -3.0, 1.0, -1.4),
  I('liv.side1', 'side_table', -7.35, 3.85), I('liv.lamp1', 'table_lamp', -7.35, 3.85, N, 1, 0.56), I('liv.side2', 'side_table', -3.65, 3.85), I('liv.lamp2', 'table_lamp', -3.65, 3.85, N, 1, 0.56),
  I('liv.floorlamp', 'floor_lamp', -8.5, 5.4), I('liv.plant', 'plant_floor', -2.6, 5.4), I('liv.shelf', 'bookshelf', -8.72, 0.1, E),
  I('liv.art', 'wall_art', -7.8, -0.93, N, 1, 1.45, '#d97a5a'), I('liv.curt1', 'curtains', -7, 5.89, S), I('liv.curt2', 'curtains', -4.2, 5.89, S), I('liv.curt3', 'curtains', -8.89, 2.5, E),
  // Foyer
  I('foy.runner', 'rug_runner', -0.5, 2.6, N, 1, 0, '#a8665a'), I('foy.console', 'console_table', -1.76, 5.2, E), I('foy.mirror', 'mirror_wall', -1.93, 5.2, E, 1, 1.0), I('foy.vase', 'vase_flowers', -1.76, 4.9, N, 1, 0.8), I('foy.art', 'wall_art', 1.93, 3.0, W, 1, 2.0, '#5f8f8a'),
  // Dining
  I('din.rug', 'rug_large', 5.5, 3.5, N, 1, 0, '#a8b5a2'), I('din.table', 'dining_table', 5.5, 3.5),
  I('din.c1', 'dining_chair', 4.85, 2.72, N), I('din.c2', 'dining_chair', 6.15, 2.72, N), I('din.c3', 'dining_chair', 4.85, 4.28, S), I('din.c4', 'dining_chair', 6.15, 4.28, S), I('din.c5', 'dining_chair', 4.15, 3.5, E), I('din.c6', 'dining_chair', 6.85, 3.5, W),
  I('din.chand', 'chandelier', 5.5, 3.5, N, 1, 'ceil'), I('din.center', 'centerpiece', 5.5, 3.5, N, 1, 0.755), I('din.side', 'sideboard', 2.3, 3.5, E), I('din.art', 'wall_art', 2.07, 3.5, E, 1, 1.45, '#e0a458'),
  I('din.vase', 'vase_flowers', 2.3, 4.2, N, 1, 0.8), I('din.curt1', 'curtains', 4, 5.89, S), I('din.curt2', 'curtains', 7, 5.89, S), I('din.curt3', 'curtains', 8.89, 3.5, W), I('din.plant', 'plant_floor', 8.45, 1.5),
  // Kitchen
  I('kit.pantry', 'pantry', 2.55, -5.59), I('kit.fridge', 'fridge', 3.5, -5.5), I('kit.base1', 'counter_base', 4.55, -5.58), I('kit.sink', 'counter_sink', 5.75, -5.58), I('kit.dw', 'dishwasher', 6.65, -5.58), I('kit.range', 'range', 7.33, -5.58), I('kit.base2', 'counter_drawers', 8.32, -5.58),
  I('kit.upper1', 'wall_cabinet', 4.55, -5.89, N, 1, 1.45), I('kit.upper2', 'wall_cabinet', 8.32, -5.89, N, 1, 1.45), I('kit.hood', 'range_hood', 7.33, -5.89, N, 1, 1.55),
  I('kit.island', 'island', 5.6, -2.4), I('kit.s1', 'bar_stool', 4.95, -1.45, S), I('kit.s2', 'bar_stool', 5.6, -1.45, S), I('kit.s3', 'bar_stool', 6.25, -1.45, S),
  I('kit.p1', 'pendant_light', 5.0, -2.4, N, 1, 'ceil'), I('kit.p2', 'pendant_light', 6.2, -2.4, N, 1, 'ceil'), I('kit.fruit', 'fruit_bowl', 5.6, -2.6, N, 1, 0.92),
  I('kit.coffee', 'coffee_maker', 4.3, -5.65, N, 1, 0.92), I('kit.kettle', 'kettle', 8.1, -5.55, N, 1, 0.92), I('kit.plates', 'plates_stack', 8.6, -5.6, N, 1, 0.92), I('kit.pot', 'pot', 7.15, -5.5, N, 1, 0.95),
  I('kit.plant', 'plant_floor', 8.45, 0.45), I('kit.rug', 'rug_runner', 5.6, -4.3, E, 1, 0, '#7a8a9a'),
  // Back hall & powder room
  I('hall.bench', 'bench_end', 1.73, -4.4, W), I('hall.runner', 'rug_runner', 0.0, -3.5, N, 1, 0, '#8a5a4a'), I('hall.art', 'wall_art', -0.33, -4.9, E, 1, 1.4, '#7c6ab0'),
  I('hb.toilet', 'toilet', -0.75, -5.55), I('hb.vanity', 'vanity_small', -1.65, -5.0, E), I('hb.mirror', 'mirror_round', -1.93, -5.0, E, 1, 1.15), I('hb.towel', 'towel_rack', -1.2, -5.89, N, 1, 1.05), I('hb.plant', 'plant_small', -1.65, -4.75, N, 1, 0.84),
  // Music studio control room
  I('stu.desk', 'studio_desk', -5.0, -4.0, E), I('stu.mon1', 'studio_monitor', -5.3, -4.8, 0.94, 1, 0.985), I('stu.mon2', 'studio_monitor', -5.3, -3.2, 2.2, 1, 0.985), I('stu.screen', 'computer_monitor', -5.3, -4.0, E, 1, 0.985),
  I('stu.chair', 'desk_chair', -4.15, -4.0, W), I('stu.couch', 'sofa', -2.55, -4.5, W, 1, 0, '#4a3a33'), I('stu.rug', 'rug_large', -4.3, -4.0, E, 1, 0, '#5a4a6a'),
  I('stu.ap1', 'acoustic_panel', -5.6, -1.07, S, 1, 1.0), I('stu.ap2', 'acoustic_panel', -4.3, -1.07, S, 1, 1.0, '#6a4a5c'), I('stu.ap3', 'acoustic_panel', -3.0, -1.07, S, 1, 1.0), I('stu.ap4', 'acoustic_panel', -6.0, -5.89, N, 1, 1.0, '#6a4a5c'), I('stu.ap5', 'acoustic_panel', -2.9, -5.89, N, 1, 1.0),
  I('stu.diff', 'diffuser', -2.07, -4.5, W, 1, 1.45), I('stu.trap1', 'bass_trap', -6.35, -1.3), I('stu.trap2', 'bass_trap', -2.35, -5.65), I('stu.neon', 'neon_onair', -6.53, -2.9, E, 1, 2.1),
  I('stu.keys', 'music_keyboard', -3.3, -1.3, S), I('stu.guitar', 'guitar_stand', -2.4, -1.4, -2.3), I('stu.acc1', 'accent_light', -6.35, -5.65), I('stu.acc2', 'accent_light', -4.6, -1.3),
  // Vocal booth
  I('bth.mic', 'mic_booth', -7.4, -4.1, W), I('bth.stand', 'music_stand', -7.35, -3.35, W), I('bth.f1', 'booth_foam', -8.89, -4.6, E, 1, 0.9), I('bth.f2', 'booth_foam', -8.89, -2.4, E, 1, 0.9), I('bth.f3', 'booth_foam', -7.8, -5.89, N, 1, 0.9), I('bth.f4', 'booth_foam', -7.8, -1.07, S, 1, 0.9),
  I('bth.rug', 'rug_round', -7.8, -3.8, N, 1, 0, '#4a3a5a'), I('bth.stool', 'bar_stool', -8.45, -1.7), I('bth.acc', 'accent_light', -8.65, -5.65), I('bth.phones', 'headphone_stand', -8.55, -5.2),
  // Krush's bedroom
  I('kr.bed', 'bed_double', -6.0, 1.21, N, 2, 0, '#2f3e5c'), I('kr.ns1', 'nightstand', -7.3, 0.27, N, 2), I('kr.ns2', 'nightstand', -4.7, 0.27, N, 2), I('kr.lamp', 'table_lamp', -7.3, 0.27, N, 2, 0.56, '#a56bff'),
  I('kr.desk', 'desk', -4.0, 5.54, S, 2), I('kr.pc', 'computer_setup', -4.0, 5.6, S, 2, 0.755), I('kr.chair', 'gaming_chair', -4.0, 4.75, N, 2), I('kr.tower', 'gaming_pc', -3.0, 5.6, S, 2), I('kr.phones', 'headphone_stand', -3.45, 5.65, N, 2, 0.755),
  I('kr.keys', 'music_keyboard', -7.1, 5.55, S, 2), I('kr.guitar', 'guitar_stand', -8.55, 5.5, 2.6, 2), I('kr.sneakers', 'sneaker_rack', -8.7, 4.4, E, 2), I('kr.wardrobe', 'wardrobe', -2.37, 0.95, W, 2),
  I('kr.poster1', 'poster', -6.0, 0.07, N, 2, 1.35, '#7c3aed'), I('kr.poster2', 'poster', -2.07, 4.6, W, 2, 1.25, '#ff5c8a'), I('kr.poster3', 'poster', -8.89, 1.2, E, 2, 1.25, '#13806f'),
  I('kr.shelf', 'wall_shelf', -2.07, 5.4, W, 2, 1.6), I('kr.neon', 'neon_krush', -8.89, 4.4, E, 2, 1.6), I('kr.beanbag', 'beanbag', -3.1, 2.0, N, 2), I('kr.rug', 'rug_large', -5.6, 3.4, N, 2, 0, '#4a5a8a'), I('kr.acc', 'accent_light', -2.35, 5.65, N, 2),
  // Upstairs den
  I('den.sofa', 'sofa', -5.5, -5.4, N, 2, 0, '#c7a27c'), I('den.tvc', 'tv_console', -5.5, -0.3, S, 2), I('den.tv', 'tv', -5.5, -0.27, S, 2, 0.54), I('den.console', 'gaming_console', -4.8, -0.3, S, 2, 0.54),
  I('den.coffee', 'coffee_table', -5.5, -3.6, N, 2), I('den.rug', 'rug_large', -5.5, -3.4, N, 2, 0, '#b8a58a'), I('den.arm', 'armchair', -8.2, -2.6, E, 2, 0, '#5f8f8a'), I('den.shelf', 'bookshelf', -2.25, -4.0, W, 2),
  I('den.plant', 'plant_floor', -8.45, -0.5, N, 2), I('den.lamp', 'floor_lamp', -7.4, -5.5, N, 2), I('den.curt', 'curtains', -5.5, -5.89, N, 2), I('den.curt2', 'curtains', -8.89, -3, E, 2),
  // Upstairs hall
  I('h2.runner', 'rug_runner', -0.6, 2.5, N, 2, 0, '#a8665a'), I('h2.art1', 'wall_art', -1.93, 4.8, E, 2, 1.4, '#38bdf8'), I('h2.art2', 'wall_art', -1.93, -3.2, E, 2, 1.4, '#c46a4a'),
  I('h2.console', 'console_table', -1.76, 0.8, E, 2), I('h2.photo', 'photo_frame', -1.76, 0.6, E, 2, 0.8), I('h2.plant', 'plant_small', -1.76, 1.1, N, 2, 0.8),
  // Parents' bedroom
  I('par.rug', 'rug_large', 4.6, 1.2, N, 2, 0, '#d9cbb5'), I('par.bed', 'bed_king', 4.6, 0.25, N, 2, 0, '#e3dacb'), I('par.ns1', 'nightstand', 3.3, -0.71, N, 2), I('par.ns2', 'nightstand', 5.9, -0.71, N, 2),
  I('par.l1', 'table_lamp', 3.3, -0.71, N, 2, 0.56), I('par.l2', 'table_lamp', 5.9, -0.71, N, 2, 0.56), I('par.bench', 'bench_end', 4.6, 1.55, N, 2),
  I('par.dresser', 'dresser', 5.5, 5.64, S, 2), I('par.art', 'wall_art', 5.5, 5.89, S, 2, 1.35, '#a8b5a2'), I('par.vase', 'vase_flowers', 5.0, 5.64, N, 2, 0.85),
  I('par.arm', 'armchair', 8.1, 4.7, -2.2, 2, 0, '#c9b79c'), I('par.lamp', 'floor_lamp', 8.5, 5.55, N, 2), I('par.ward', 'wardrobe', 8.59, 0.2, W, 2), I('par.mirror', 'mirror_floor', 2.35, 5.0, E, 2), I('par.plant', 'plant_floor', 2.5, 3.2, N, 2),
  I('par.curt1', 'curtains', 4, 5.89, S, 2), I('par.curt2', 'curtains', 7, 5.89, S, 2), I('par.curt3', 'curtains', 8.89, 2.5, W, 2),
  // Bathrooms
  I('bt.tub', 'bathtub', 3.0, -5.49, N, 2), I('bt.toilet', 'toilet', 4.5, -5.55, N, 2), I('bt.vanity', 'vanity', 4.65, -2.2, W, 2), I('bt.mirror', 'mirror_wall', 4.93, -2.2, W, 2, 1.15),
  I('bt.towel', 'towel_rack', 3.3, -1.07, S, 2, 1.0), I('bt.mat', 'bath_mat', 3.0, -4.75, N, 2), I('bt.toil', 'toiletries', 4.65, -1.85, W, 2, 0.84),
  I('en.shower', 'shower', 8.4, -5.39, N, 2), I('en.tub', 'bathtub', 6.9, -5.49, N, 2), I('en.vanity', 'vanity_double', 5.35, -3.3, E, 2), I('en.mirror', 'mirror_wide', 5.07, -3.3, E, 2, 1.15),
  I('en.toilet', 'toilet', 8.55, -2.3, W, 2), I('en.towel', 'towel_rack', 5.07, -5.1, E, 2, 1.0), I('en.mat', 'bath_mat', 6.9, -4.6, N, 2), I('en.plant', 'plant_tall', 8.6, -1.4, N, 2),
  // Porch & front yard
  I('por.rock1', 'rocking_chair', -4.6, 7.2, N, 'p'), I('por.rock2', 'rocking_chair', -3.2, 7.2, N, 'p'), I('por.side', 'side_table_outdoor', -3.9, 7.5, N, 'p'),
  I('por.adi1', 'adirondack', 3.6, 7.2, N, 'p'), I('por.adi2', 'adirondack', 5.0, 7.2, N, 'p'), I('por.pl1', 'planter', -1.6, 8.15, N, 'p'), I('por.pl2', 'planter', 1.6, 8.15, N, 'p'),
  I('yard.hoop', 'basketball_hoop', 13.95, 1.0, W, 0), I('yard.ball', 'basketball', 12.4, 1.8, N, 0),
  // Patio
  I('pat.table', 'patio_table', -3.5, -10.2, N, 0), I('pat.umb', 'umbrella', -3.5, -10.2, N, 0),
  I('pat.c1', 'patio_chair', -4.1, -10.95, N, 0), I('pat.c2', 'patio_chair', -2.9, -10.95, N, 0), I('pat.c3', 'patio_chair', -4.1, -9.45, S, 0), I('pat.c4', 'patio_chair', -2.9, -9.45, S, 0), I('pat.c5', 'patio_chair', -4.75, -10.2, E, 0), I('pat.c6', 'patio_chair', -2.25, -10.2, W, 0),
  I('pat.grill', 'grill', 5.6, -7.95, S, 0), I('pat.sofa', 'outdoor_sofa', 3.8, -12.45, N, 0), I('pat.lounge', 'lounge_chair', 5.9, -10.4, W, 0), I('pat.side', 'side_table_outdoor', 2.35, -12.4, N, 0),
  I('pat.cooler', 'cooler', 6.5, -9.0, N, 0), I('pat.pl1', 'planter', -6.6, -7.75, N, 0), I('pat.pl2', 'planter', 6.6, -7.75, N, 0),
  I('pat.str1', 'string_lights', -3.5, -13.3, N, 0), I('pat.str2', 'string_lights', 3.5, -13.3, N, 0), I('pat.str3', 'string_lights', 0, -7.55, N, 0),
  // Fire pit lounge
  I('yard.fire', 'fire_pit', -10.0, -16.5, N, 0), I('yard.a1', 'adirondack', -10.0, -15.0, S, 0, 0, '#c46a4a'), I('yard.a2', 'adirondack', -11.5, -16.9, E, 0, 0, '#2f6f73'), I('yard.a3', 'adirondack', -8.5, -16.9, W, 0, 0, '#d4a24c'),
  // DJ & performance booth
  I('dj.riser', 'stage_riser', 0, -19.6, N, 0), I('dj.booth', 'dj_booth', 0, -19.75, N, 0, 0.4),
  I('dj.tt1', 'turntable', -0.62, -19.75, N, 0, 1.41), I('dj.mix', 'dj_mixer', 0, -19.75, N, 0, 1.41), I('dj.tt2', 'turntable', 0.62, -19.75, N, 0, 1.41),
  I('dj.pa1', 'pa_speaker', -2.4, -19.0, 0.3, 0), I('dj.pa2', 'pa_speaker', 2.4, -19.0, -0.3, 0), I('dj.sub1', 'subwoofer', -3.0, -20.3, N, 0), I('dj.sub2', 'subwoofer', 3.0, -20.3, N, 0),
  I('dj.truss', 'truss', 0, -20.45, N, 0), I('dj.par1', 'led_par', -1.3, -18.75, N, 0, 0.4), I('dj.par2', 'led_par', -0.75, -18.75, N, 0, 0.4), I('dj.par3', 'led_par', 0.75, -18.75, N, 0, 0.4), I('dj.par4', 'led_par', 1.3, -18.75, N, 0, 0.4),
  I('dj.mic', 'mic_stand', 1.2, -18.9, S, 0, 0.4), I('dj.wedge', 'monitor_wedge', 0, -18.95, S, 0, 0.4), I('dj.spot1', 'party_spot', -3.4, -21.0, N, 0), I('dj.spot2', 'party_spot', 3.4, -21.0, N, 0),
];