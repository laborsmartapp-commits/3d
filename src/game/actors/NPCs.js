import * as THREE from 'three';
import { createHumanoid, animateHumanoid, setShadows } from './Humanoid';
import { lerpAngle } from '../core/noise';
import { VILLAGE, VILLAGE_BUILDINGS, doorPoint, DOCK, BENCHES } from '../world/layout';
import { WEATHERS, stageOf } from '../systems/Environment';

const INDOOR = new Set(['sleep', 'eat', 'socialize', 'shelter']);

function buildSpots() {
  const S = {};
  for (const b of VILLAGE_BUILDINGS) { const d = doorPoint(b, 1.2); S[b.id] = { x: d.x, z: d.z, rot: b.rot + Math.PI, building: b.id }; }
  BENCHES.forEach((b) => { S[b.id] = { x: b.x, z: b.z, rot: b.rot, seat: true }; });
  S.plaza = { x: VILLAGE.x + 4, z: VILLAGE.z - 2, rot: 0 };
  S.tavern = S.v_tavern; S.market = { ...S.v_market, building: null }; S.bakery = { ...S.v_bakery, building: null }; S.store = { ...S.v_store, building: null };
  S.forge = { ...S.v_forge, x: S.v_forge.x + 0.5, building: null };
  S.garden = { ...S.v_garden, x: S.v_garden.x - 1, building: null };
  S.dock = { x: DOCK.x - 6.5, z: DOCK.z, rot: -Math.PI / 2, via: [[74, 86], [66, 84]] };
  S.firepit = { x: 99, z: 80, rot: 0 };
  S.lookout = { x: 86, z: 165, rot: 3.6, via: [[96, 99], [101, 128], [93, 150]] };
  S.overlook = { x: 132, z: -57, rot: -Math.PI / 2, via: [[93, 77], [104, 50], [119, 14], [129, -26]] };
  S.lagoon = { x: -62, z: 124, rot: BENCHES[5].rot, seat: true, via: [[82, 90], [73, 93], [41, 97], [10, 108], [-30, 118]] };
  S.camp = { x: 38, z: -106, rot: 0.8, via: [[93, 77], [104, 50], [119, 14], [129, -26], [120, -72], [95, -92], [55, -112]] };
  return S;
}

export const NPC_DATA = [
  { id: 'bram', name: 'Bram Emberforge', age: 'Adult', job: 'Blacksmith', personality: 'gruff', home: 'v_h1', look: { shirt: '#5a2d1e', pants: '#2b2320', skin: '#b98a6a', hair: '#1a120e' }, schedule: [[0, 'home', 'sleep'], [6.5, 'plaza', 'idle'], [8, 'forge', 'work'], [12, 'tavern', 'eat'], [13, 'forge', 'work'], [18, 'firepit', 'warm'], [21, 'home', 'sleep']] },
  { id: 'lysa', name: 'Lysa Moonpetal', age: 'Adult', job: 'Florist', personality: 'cheerful', home: 'v_h2', look: { shirt: '#7d3c98', pants: '#35244a', skin: '#e0b99a', hair: '#e7c26a', robe: true }, schedule: [[0, 'home', 'sleep'], [6.5, 'garden', 'garden'], [11, 'market', 'talk'], [12, 'bench0', 'eat'], [13, 'garden', 'garden'], [17, 'lookout', 'watch'], [20, 'tavern', 'socialize'], [22, 'home', 'sleep']] },
  { id: 'orin', name: 'Orin Tidewhisper', age: 'Elder', job: 'Fisherman', personality: 'calm', home: 'v_h3', look: { shirt: '#23527a', pants: '#2a2f3a', skin: '#c49a7c', hair: '#d8d8d8' }, schedule: [[0, 'home', 'sleep'], [5.5, 'dock', 'fish'], [11, 'bench1', 'sit'], [14, 'dock', 'fish'], [18, 'lagoon', 'sit'], [21.5, 'home', 'sleep']] },
  { id: 'mira', name: 'Mira Starquill', age: 'Young adult', job: 'Scholar', personality: 'curious', home: 'v_h2', look: { shirt: '#1d6f6a', pants: '#20263a', skin: '#8d5f45', hair: '#101010', robe: true }, schedule: [[0, 'home', 'sleep'], [7, 'bench2', 'read'], [10, 'overlook', 'watch'], [14, 'bench2', 'read'], [18, 'tavern', 'socialize'], [23, 'home', 'sleep']] },
  { id: 'tomas', name: 'Tomas Crate', age: 'Adult', job: 'Porter', personality: 'energetic', home: 'v_h1', look: { shirt: '#9a6a2a', pants: '#2c2a24', skin: '#d2a07c', hair: '#4a2a14' }, schedule: [[0, 'home', 'sleep'], [7, 'market', 'carry'], [12, 'tavern', 'eat'], [13, 'market', 'carry'], [18, 'plaza', 'talk'], [21, 'home', 'sleep']] },
  { id: 'wren', name: 'Wren', age: 'Child', job: 'Explorer-in-training', personality: 'playful', home: 'v_h3', look: { shirt: '#c2410c', pants: '#1f2937', skin: '#e2b08e', hair: '#7a3b12', scale: 0.72 }, schedule: [[0, 'home', 'sleep'], [8, 'plaza', 'play'], [12, 'bakery', 'idle'], [13, 'plaza', 'play'], [16, 'dock', 'watch'], [19, 'home', 'sleep']] },
  { id: 'sable', name: 'Sable Nightbloom', age: 'Adult', job: 'Mystic', personality: 'mysterious', home: 'v_h2', look: { shirt: '#2b1845', pants: '#1a1426', skin: '#caa7d6', hair: '#c9c9ff', robe: true, accent: '#a855f7' }, schedule: [[0, 'firepit', 'warm'], [3, 'home', 'sleep'], [11, 'store', 'idle'], [16, 'bench3', 'read'], [19, 'firepit', 'warm']] },
  { id: 'hester', name: 'Hester Loaf', age: 'Adult', job: 'Baker', personality: 'warm', home: 'v_h1', look: { shirt: '#e8dcc8', pants: '#6b4a32', skin: '#e6b89a', hair: '#8a4a2a', robe: true }, schedule: [[0, 'home', 'sleep'], [5, 'bakery', 'work'], [12, 'market', 'talk'], [13, 'bakery', 'work'], [19, 'tavern', 'socialize'], [22, 'home', 'sleep']] },
  { id: 'kael', name: 'Kael Ironvine', age: 'Adult', job: 'Ranger', personality: 'stoic', home: 'v_h3', look: { shirt: '#2f4a2a', pants: '#2a2a22', skin: '#a8785a', hair: '#1a1a1a', cloak: '#1f3a2a' }, schedule: [[0, 'home', 'sleep'], [6, 'overlook', 'watch'], [9, 'camp', 'warm'], [12, 'plaza', 'talk'], [14, 'lookout', 'watch'], [17, 'overlook', 'watch'], [21, 'tavern', 'socialize'], [23, 'home', 'sleep']] },
  { id: 'nell', name: 'Nell Sweep', age: 'Elder', job: 'Caretaker', personality: 'chatty', home: 'v_h2', look: { shirt: '#4b5563', pants: '#2a2f3a', skin: '#d6a98a', hair: '#9ca3af', robe: true }, schedule: [[0, 'home', 'sleep'], [7, 'plaza', 'sweep'], [12, 'bench1', 'sit'], [13, 'plaza', 'sweep'], [19, 'home', 'sleep']] },
];

const LINES = {
  gruff: ['Mind the sparks, traveler.', 'Good steel needs patience. So does good land.', 'Hmph. {weather} today. The forge stays hot either way.'],
  cheerful: ['The moonpetals are blooming like mad today!', 'Have you smelled the garden after rain? Pure magic.', 'Oh, {time} is my favorite part of the day.'],
  calm: ['The lagoon fish rise when the moon is full.', 'Sit a while. The water has stories.', '{weather} out here. The tide does not mind.'],
  curious: ['Those ruins to the west predate the island rising. Imagine!', 'Did you know the grotto crystals hum at night?', "I'm mapping every star over Scorpion's Crown."],
  energetic: ["Crates don't carry themselves! Well, not usually.", 'Market to dock, dock to market. Keeps me young!', 'Need anything hauled? I know every path.'],
  playful: ['Race you to the fountain!', 'I saw a fox made of crystal! Honest!', "Kael says there's a secret hollow somewhere west. Have you found it?"],
  mysterious: ['The stars whispered of your arrival.', 'Visit the grotto after dark. You will understand.', 'Some islands dream. This one is awake.'],
  warm: ['Fresh starbread, still warm! Well, almost.', 'You look hungry. Everyone always looks hungry to me.', 'The oven glow keeps the {time} chill away.'],
  stoic: ['Stay off the western cliffs in a storm.', 'The sky whale passed low last night. A good omen.', 'Watch the trails. Foxes cross without warning.'],
  chatty: ['Oh, have you heard? {other} was up before dawn again.', 'I keep this plaza swept for every traveler.', 'Duskmere has been here longer than anyone remembers.'],
};

export function makeDialogue(npc, ctx) {
  const d = npc.data;
  const fill = (s) => s.replace('{weather}', ctx.weather).replace('{time}', ctx.stage.toLowerCase()).replace('{other}', ctx.other);
  const pool = [...LINES[d.personality]];
  const lines = [`${ctx.greet}. I'm ${d.name.split(' ')[0]}, the ${d.job.toLowerCase()}.`, fill(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])];
  if (ctx.buildings > 0) lines.push(`Word is you've raised ${ctx.buildings} structure${ctx.buildings > 1 ? 's' : ''} out on your land. The island is changing.`);
  else lines.push('You should claim some land. Veilfall Clearing near the falls is free to settle.');
  if (ctx.weatherKey === 'thunderstorm' || ctx.weatherKey === 'heavyRain') lines.push('Best find shelter soon. The tavern is warm.');
  return lines;
}

export class NPCManager {
  constructor(e) {
    this.e = e;
    this.spots = buildSpots();
    this.crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: '#7a5436' }));
    this.shadowT = 0;
    this.maxVisible = 10;
    this.list = NPC_DATA.map((d, i) => {
      const h = createHumanoid(d.look);
      e.scene.add(h.root);
      const home = this.spots[d.home];
      const npc = {
        data: d, h, i, pos: new THREE.Vector3(home.x + (i % 3) * 0.5, 0, home.z), yaw: 0, path: [], spotKey: null, act: 'idle', indoor: false,
        anim: { mode: 'idle', phase: 0, t: Math.random() * 10, speed: 0 }, speed: d.look.scale ? 2 : 1.35 + Math.random() * 0.3,
        mood: 'Content', relationship: 0, carryLeg: 0, waitT: 0, lastVia: null, talking: false, shadowOn: true,
      };
      e.interact.add({ verb: 'Talk', label: d.name, radius: 2.4, getPos: () => npc.pos, enabled: () => npc.h.root.visible && !npc.indoor, action: () => e.startDialogue(npc) });
      return npc;
    });
  }

  occupants(id) { let n = 0; for (const p of this.list) if (p.indoor && p.indoorAt === id) n++; return n; }

  route(npc, key) {
    const t = this.spots[key];
    const pts = [];
    if (npc.lastVia) for (const p of [...npc.lastVia].reverse()) pts.push(p);
    const cur = pts.length ? { x: pts[pts.length - 1][0], z: pts[pts.length - 1][1] } : { x: npc.pos.x, z: npc.pos.z };
    const entry = t.via ? { x: t.via[0][0], z: t.via[0][1] } : t;
    const a0 = Math.atan2(cur.z - VILLAGE.z, cur.x - VILLAGE.x), a1 = Math.atan2(entry.z - VILLAGE.z, entry.x - VILLAGE.x);
    let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    const steps = Math.ceil(Math.abs(da) / 0.6);
    for (let s = 0; s <= steps; s++) { const a = a0 + (da * s) / Math.max(1, steps); pts.push([VILLAGE.x + Math.cos(a) * 5.6, VILLAGE.z + Math.sin(a) * 5.6]); }
    if (t.via) for (const p of t.via) pts.push(p);
    const off = t.seat || t.building ? [0, 0] : [Math.cos(npc.i * 2.4) * 1.2, Math.sin(npc.i * 2.4) * 1.2];
    pts.push([t.x + off[0], t.z + off[1]]);
    npc.path = pts;
    npc.lastVia = t.via || null;
    npc.target = t;
  }

  update(dt) {
    const e = this.e, env = e.env, hour = env.hour, cam = e.camera.position;
    this.shadowT -= dt;
    const doShadow = this.shadowT < 0;
    if (doShadow) this.shadowT = 1;
    for (const npc of this.list) {
      const d = npc.data;
      if (npc.i >= this.maxVisible) { npc.h.root.visible = false; continue; }
      let entry = d.schedule[d.schedule.length - 1];
      for (const s of d.schedule) if (s[0] <= hour) entry = s;
      let key = entry[1] === 'home' ? d.home : entry[1], act = entry[2];
      if (env.p.rain > 0.55 && !INDOOR.has(act)) { key = 'tavern'; act = 'shelter'; }
      if (act === 'carry') key = npc.carryLeg ? 'dock' : 'market';
      if (key !== npc.spotKey) {
        npc.spotKey = key; npc.act = act;
        if (npc.indoor) { npc.indoor = false; e.openDoor(npc.indoorAt); }
        this.route(npc, key);
        npc.mood = act === 'shelter' ? 'Seeking shelter' : act === 'sleep' ? 'Sleepy' : act === 'work' ? 'Busy' : 'Content';
      }
      npc.anim.t += dt;
      if (npc.indoor) { npc.h.root.visible = false; continue; }
      npc.h.root.visible = true;
      let mode = 'idle', moving = false;
      if (npc.talking) {
        const p = e.player.pos;
        npc.yaw = lerpAngle(npc.yaw, Math.atan2(p.x - npc.pos.x, p.z - npc.pos.z), 1 - Math.exp(-dt * 6));
        mode = 'talk';
      } else if (npc.path.length) {
        const [tx, tz] = npc.path[0];
        const dx = tx - npc.pos.x, dz = tz - npc.pos.z, dist = Math.hypot(dx, dz);
        if (dist < 0.5) npc.path.shift();
        else {
          const step = Math.min(dist, npc.speed * dt);
          let sx = (dx / dist) * step, sz = (dz / dist) * step;
          for (const o of this.list) {
            if (o === npc || o.indoor) continue;
            const ox = npc.pos.x - o.pos.x, oz = npc.pos.z - o.pos.z, od = Math.hypot(ox, oz);
            if (od < 0.9 && od > 0.01) { sx += (ox / od) * 0.6 * dt; sz += (oz / od) * 0.6 * dt; }
          }
          const pl = e.player.pos, px = npc.pos.x - pl.x, pz = npc.pos.z - pl.z, pd = Math.hypot(px, pz);
          if (pd < 1 && pd > 0.01) { sx += (px / pd) * dt; sz += (pz / pd) * dt; }
          npc.pos.x += sx; npc.pos.z += sz;
          e.colliders.resolve(npc.pos, 0.3, npc.pos.y + 0.5);
          npc.yaw = lerpAngle(npc.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8));
          npc.anim.phase += ((npc.speed * dt) / 1.3) * Math.PI * 2;
          mode = 'walk'; moving = true;
        }
      } else {
        const t = npc.target;
        if (INDOOR.has(npc.act) && t?.building) { npc.indoor = true; npc.indoorAt = t.building; e.openDoor(t.building); continue; }
        if (npc.act === 'carry') { npc.waitT += dt; if (npc.waitT > 3) { npc.carryLeg = 1 - npc.carryLeg; npc.waitT = 0; } }
        npc.yaw = lerpAngle(npc.yaw, t?.rot ?? npc.yaw, 1 - Math.exp(-dt * 4));
        const seated = t?.seat;
        mode = { work: 'work', sweep: 'sweep', fish: 'fish', talk: 'talk', warm: 'warm', garden: 'garden', play: 'play', watch: 'watch', read: seated ? 'read' : 'watch', eat: seated ? 'eat' : 'idle', sit: seated ? 'sit' : 'idle' }[npc.act] || 'idle';
        if (npc.act === 'sweep' || npc.act === 'play') { npc.pos.x += Math.sin(npc.anim.t * 0.4 + npc.i) * dt * 0.6; npc.pos.z += Math.cos(npc.anim.t * 0.3 + npc.i) * dt * 0.6; }
        if (seated) npc.pos.set(t.x, 0, t.z);
      }
      npc.pos.y = e.groundAt(npc.pos.x, npc.pos.z) - (!moving && npc.target?.seat && !npc.path.length ? 0.03 : 0);
      const carrying = npc.act === 'carry' && moving && npc.carryLeg === 0;
      if (carrying && this.crate.parent !== npc.h.torso) { npc.h.torso.add(this.crate); this.crate.position.set(0, 0.35, 0.38); }
      else if (!carrying && this.crate.parent === npc.h.torso) npc.h.torso.remove(this.crate);
      npc.anim.mode = mode; npc.anim.speed = moving ? npc.speed : 0; npc.anim.carry = carrying;
      npc.h.root.position.copy(npc.pos);
      npc.h.root.rotation.y = npc.yaw;
      if (cam.distanceToSquared(npc.pos) < 150 * 150) animateHumanoid(npc.h, npc.anim, dt);
      if (doShadow) { const on = cam.distanceToSquared(npc.pos) < 45 * 45; if (on !== npc.shadowOn) { setShadows(npc.h, on); npc.shadowOn = on; } }
    }
  }

  dialogueContext(npc) {
    const env = this.e.env;
    const others = this.list.filter((n) => n !== npc);
    return {
      greet: env.hour < 12 ? 'Good morning' : env.hour < 18 ? 'Good afternoon' : 'Good evening',
      weather: WEATHERS[env.weather].label, weatherKey: env.weather, stage: stageOf(env.hour),
      other: others[Math.floor(Math.random() * others.length)].data.name.split(' ')[0],
      buildings: this.e.build.playerCount(),
    };
  }

  activeCount() { return this.list.filter((n) => n.h.root.visible).length; }
}