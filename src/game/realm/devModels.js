// Development-only test fixtures: public sample models, so model swaps can be tested on a branch
// without writing Asset records. Never shown in production builds.
const K = (m) => `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${m}/glTF-Binary/${m}.glb`;
export const DEV_MODELS = [
  { id: 'dev-glam-sofa', name: 'Glam Velvet Sofa (test)', file_uri: K('GlamVelvetSofa') },
  { id: 'dev-sheen-chair', name: 'Sheen Chair (test)', file_uri: K('SheenChair') },
  { id: 'dev-damask-chair', name: 'Damask Chair (test)', file_uri: K('ChairDamaskPurplegold') },
  { id: 'dev-box', name: 'Textured Box (simple test)', file_uri: K('BoxTextured') },
];