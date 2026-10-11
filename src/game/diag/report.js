import { TESTS } from './tests';
import { CLOUD_CONNECTED } from '../studio/CloudRenderService';
import { previewFormat } from '../studio/PreviewEncoder';

export const BUILD = 'scene-manager / diagnostics v1 (2026-10-11)';

export const LIMITATIONS = [
  CLOUD_CONNECTED ? 'RunPod connected.' : 'RunPod is not connected. No cloud-render test can pass until a real remote video is produced and verified.',
  'Ambient world motion (NPCs, wildlife, water) advances at most 50 ms per frame, so below 20 FPS it runs slower than real time. Krush, cameras, and recording use real elapsed time.',
  'A single frame longer than 1 s is capped. The excess shows as "Dropped time" and is not simulated.',
  'On this branch only the diagnostic history is admin-locked on the server. Scene, take, and chunk permissions are unchanged and must be tightened on main.',
];

function gpu(r) {
  const gl = r?.getContext(), ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
}

// Structured report. Contains no tokens, keys, or passwords.
export function buildReport(e) {
  const S = e.studio, D = e.diag, me = e.adminEmail;
  return {
    generated_at: new Date().toISOString(), build: BUILD, admin: me,
    device: { userAgent: navigator.userAgent, platform: navigator.platform, cores: navigator.hardwareConcurrency, memory_gb: navigator.deviceMemory ?? null, screen: `${screen.width}×${screen.height} @${devicePixelRatio}x`, viewport: `${innerWidth}×${innerHeight}`, gpu: gpu(e.renderer) },
    stage: { id: e.stage.id, name: e.stage.name, version: e.stage.version },
    stage_compatibility: { scene: !!e.scene, renderer: !!e.renderer, camera: !!e.camera, player: !!e.player, camera_rig: !!e.rig, actors: e.stage.actors, environment: e.stage.env.kind, world_snapshot: !!e.stage.snapshot(), scripted_input: !!e.diag, preview_encoding: previewFormat()?.mime || 'unsupported' },
    scene: S.scene ? { id: S.scene.id, name: S.scene.name } : null,
    config: { simulate_fps: D.throttle ? D.target : null, live_quality: e.qName, local_quality: S.localQuality, cloud: S.cloud },
    metrics: D.metrics(),
    tests: Object.fromEntries(TESTS.map((t) => [t.id, { title: t.title, ...(D.results[t.id] || { status: 'NOT TESTED' }) }])),
    errors: [S.error].filter(Boolean),
    limitations: LIMITATIONS,
  };
}

const flat = (o) => Object.entries(o || {}).map(([k, v]) => `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

export function reportText(r) {
  const m = r.metrics, sec = (n) => `### ${n}\n${flat(m[n])}`;
  return [
    `# Krush Studio Diagnostic Report`, `Generated: ${r.generated_at}`, `Build: ${r.build}`, `Admin: ${r.admin || 'n/a'}`, `Stage: ${r.stage ? `${r.stage.name} (${r.stage.id}, ${r.stage.version})` : 'n/a'}`, `## Stage compatibility\n${flat(r.stage_compatibility)}`, `Scene: ${r.scene ? `${r.scene.name} (${r.scene.id})` : 'none'}`,
    `## Device\n${flat(r.device)}`, `## Configuration\n${flat(r.config)}`,
    `## Test results`, ...Object.entries(r.tests).map(([id, t]) => `- ${id}. ${t.title}: **${t.status}**${t.at ? ` (${t.at})` : ''}${t.note ? `\n  ${t.note}` : ''}${t.m ? `\n${flat(t.m)}` : ''}`),
    `## Live measurements`, m.warnings.length ? `Warnings:\n${m.warnings.map((w) => `  - ${w}`).join('\n')}` : 'Warnings: none',
    sec('Performance'), sec('Recording'), sec('Camera'), sec('Sync'), sec('Playback'),
    `## Errors\n${r.errors.length ? r.errors.map((x) => `- ${x}`).join('\n') : 'none'}`,
    `## Known limitations\n${r.limitations.map((x) => `- ${x}`).join('\n')}`,
  ].join('\n\n');
}