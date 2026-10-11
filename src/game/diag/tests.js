import { testA, testB, testE, testF } from './testsRecording';
import { testC, testD } from './testsCamera';
import { testG, testH, testI } from './testsSystems';
import { testK } from './testsDirector';

export const STATUSES = ['NOT TESTED', 'RUNNING', 'PASS', 'FAIL', 'INCONCLUSIVE'];

// Test J is a manual checklist. All other tests are measured automatically in the QA Diagnostics scene.
export const REGRESSION = ['Normal movement', 'Running (Shift)', 'Jumping (Space)', 'Swimming', 'Sitting on a bench', 'World interactions (E)', 'Camera orbit / zoom', 'Realm animations (NPCs, water, foliage)', 'Weather changes', 'Time of day', 'Scene saving and loading'];

export const TESTS = [
  { id: 'A', title: 'Recording Duration', desc: '10 s recording; compares real time, timeline, last sample, saved and playback duration.', run: testA },
  { id: 'B', title: 'Movement at 15 FPS', desc: 'Same 4 s scripted walk at normal FPS and at simulated 15 FPS.', run: testB },
  { id: 'C', title: 'Stationary Walk-Up Camera', desc: 'Krush walks toward a fixed camera; camera must not move.', run: testC },
  { id: 'D', title: 'Follow-at-Distance Camera', desc: 'Follow camera behind Krush; checks distance, smoothing, start jump, replay.', run: testD },
  { id: 'E', title: 'Performance Playback', desc: 'Plays a take back and compares positions at matching times.', run: testE },
  { id: 'F', title: 'Discard Take', desc: 'Records then discards; nothing may remain.', run: testF },
  { id: 'G', title: 'Recover Interrupted Take', desc: 'Interrupts a recording before Stop, then recovers it. Also checks an empty take.', run: testG },
  { id: 'H', title: 'Recording Settings', desc: 'Two steps with a page refresh in between. Checks persistence and the render manifest.', run: testH },
  { id: 'I', title: 'Network Recovery', desc: 'Simulated in-app upload failure, Pending state, retry, no duplicates.', run: testI },
  { id: 'K', title: 'Multi-Actor Overlap (Director)', desc: 'Records Krush 10 s, rewinds, records Jay 10 s while Krush replays, plays both, reloads from the server.', run: testK },
  { id: 'J', title: 'Realm Regression', desc: 'Manual: confirm each item with diagnostics on and off.' },
];