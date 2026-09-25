export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.pressed = new Set();
    this.drag = { x: 0, y: 0 };
    this.wheel = 0;
    this.clicks = [];
    this.mouse = { x: 0, y: 0, has: false };
    this.joy = { x: 0, y: 0 };
    this.virtual = { jump: false, interact: false, sprint: false };
    this.pointers = new Map();
    this.pinch = 0;
    this.lookAny = false;
    this.sens = 1;
    const onKey = (down) => (ev) => {
      const tag = ev.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (down) { if (!this.keys.has(ev.code)) this.pressed.add(ev.code); this.keys.add(ev.code); if (ev.code === 'Space') ev.preventDefault(); }
      else this.keys.delete(ev.code);
    };
    this.kd = onKey(true); this.ku = onKey(false);
    this.blur = () => this.keys.clear();
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', this.blur);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, type: e.pointerType, moved: 0 });
    });
    dom.addEventListener('pointermove', (e) => {
      const r = dom.getBoundingClientRect();
      if (e.pointerType === 'mouse') { this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; this.mouse.has = true; }
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 2 && p.type === 'touch') {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinch) this.wheel += (this.pinch - d) * 4;
        this.pinch = d;
        return;
      }
      if (p.type === 'touch' || p.button === 2 || p.button === 1 || (p.button === 0 && this.lookAny)) { this.drag.x += dx * this.sens; this.drag.y += dy * this.sens; }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && p.moved < 8 && p.button === 0) {
        const r = dom.getBoundingClientRect();
        this.clicks.push({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, touch: p.type === 'touch' });
      }
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = 0;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.up = up;
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += e.deltaY; }, { passive: false });
  }

  consume() {
    const k = this.keys;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (Math.abs(this.joy.x) + Math.abs(this.joy.y) > 0.05) { mx = this.joy.x; my = this.joy.y; }
    let sprint = k.has('ShiftLeft') || k.has('ShiftRight') || this.virtual.sprint;
    let jump = this.pressed.has('Space') || this.virtual.jump;
    let interact = this.pressed.has('KeyE') || this.virtual.interact;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find(Boolean);
    if (gp) {
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      if (dz(gp.axes[0]) || dz(gp.axes[1])) { mx = dz(gp.axes[0]); my = -dz(gp.axes[1]); }
      this.drag.x += dz(gp.axes[2] || 0) * 14; this.drag.y += dz(gp.axes[3] || 0) * 10;
      if (gp.buttons[0]?.pressed && !this.gpA) jump = true;
      if (gp.buttons[2]?.pressed && !this.gpX) interact = true;
      this.gpA = gp.buttons[0]?.pressed; this.gpX = gp.buttons[2]?.pressed;
      if (gp.buttons[7]?.pressed) sprint = true;
    }
    const out = {
      move: { x: mx, y: my }, sprint, jump, interact, walk: k.has('KeyC'),
      drag: this.drag.x || this.drag.y ? { ...this.drag } : null, wheel: this.wheel,
      clicks: this.clicks, keys: k, pressed: this.pressed,
    };
    this.drag = { x: 0, y: 0 };
    this.wheel = 0;
    this.clicks = [];
    this.pressed = new Set();
    this.virtual.jump = false;
    this.virtual.interact = false;
    return out;
  }

  dispose() {
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('pointerup', this.up);
    window.removeEventListener('pointercancel', this.up);
  }
}