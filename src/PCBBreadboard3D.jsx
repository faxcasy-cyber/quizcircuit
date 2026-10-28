/**
 * PCBBreadboard3D.jsx
 * 3D breadboard build of "Glorious Jarv (3).brd"  (React Three Fiber + drei, no external assets)
 *
 *   npm i three @react-three/fiber @react-three/drei
 *   import PCBBreadboard3D from './PCBBreadboard3D';
 *   <PCBBreadboard3D />                      // uses the netlist embedded below
 *   <PCBBreadboard3D brdText={rawBrdText} /> // optional: cross-checks your file against the embedded netlist
 *
 * Layout units: 1 unit = 2.54 mm (one breadboard hole pitch).  Board top is y = 0.
 */
import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';

// ==== LOGIC START ==========================================================
/* ------------------------------ 1. DATA FROM THE .BRD ------------------------------ */

// <elements> block (ref, value, package, board position in mm, rotation)
const BRD_PARTS = [
  { ref: 'R1', type: 'R', value: '1k', pkg: 'RESAD1016W63L850D250B', x: 77.4535, y: 128.7804, rot: 'R360' },
  { ref: 'R2', type: 'R', value: '1k', pkg: 'RESAD1016W63L850D250B', x: 12.6688, y: 127.0018, rot: 'R360' },
  { ref: 'R3', type: 'R', value: '1k', pkg: 'RESAD1016W63L850D250B', x: 8.97, y: 29.4241, rot: 'R360' },
  { ref: 'R4', type: 'R', value: '10k', pkg: 'RESAD1016W63L850D250B', x: 31.2508, y: 24.9503, rot: 'R360' },
  { ref: 'R5', type: 'R', value: '47k', pkg: 'RESAD1016W63L850D250B', x: 32.8791, y: 6.33, rot: 'R180' },
  { ref: 'R6', type: 'R', value: '10k', pkg: 'RESAD1016W63L850D250B', x: 27.2878, y: 123.1269, rot: 'R360' },
  { ref: 'R7', type: 'R', value: '10k', pkg: 'RESAD1016W63L850D250B', x: 60.9293, y: 119.4281, rot: 'R360' },
  { ref: 'R8', type: 'R', value: '100k', pkg: 'RESAD1016W63L850D250B', x: 54.5885, y: 142.5015, rot: 'R360' },
  { ref: 'R9', type: 'R', value: '100k', pkg: 'RESAD1016W63L850D250B', x: 80.48, y: 29.0718, rot: 'R360' },
  { ref: 'R10', type: 'R', value: '4.7k', pkg: 'RESAD1016W63L850D250B', x: 30.4582, y: 42.4403, rot: 'R360' },
  { ref: 'R11', type: 'R', value: '4.7k', pkg: 'RESAD1016W63L850D250B', x: 32.2196, y: 111.1498, rot: 'R360' },
  { ref: 'R12', type: 'R', value: '47k', pkg: 'RESAD1016W63L850D250B', x: 32.1064, y: 145.5828, rot: 'R180' },
  { ref: 'D1', type: 'LED', value: 'RED', pkg: 'LEDRD254W60D565H860B', x: 8.8907, y: 85.3279, rot: 'R0' },
  { ref: 'D2', type: 'LED', value: 'GREEN', pkg: 'LEDRD254W60D565H860B_G', x: 8.8907, y: 72.6279, rot: 'R360' },
  { ref: 'T1', type: 'BJT', value: 'PNP', pkg: 'TO92', x: 15.2407, y: 87.8679, rot: 'R0' },
  { ref: 'T2', type: 'BJT', value: 'PNP', pkg: 'TO92', x: 15.2407, y: 70.0879, rot: 'R0' },
  { ref: 'T3', type: 'BJT', value: 'NPN', pkg: 'TO92', x: 27.9407, y: 87.8679, rot: 'R0' },
  { ref: 'T4', type: 'BJT', value: 'NPN', pkg: 'TO92', x: 27.9407, y: 70.0879, rot: 'R0' },
  { ref: 'S1', type: 'SW', value: 'SWITCH_MOMENTARY', pkg: 'SWITCH-MOMENTARY-PTH-6.5MM', x: 48.2607, y: 78.9779, rot: 'R270' },
  { ref: 'S2', type: 'SW', value: 'SWITCH_MOMENTARY', pkg: 'SWITCH-MOMENTARY-PTH-6.5MM', x: 63.5007, y: 78.9779, rot: 'R90' },
  { ref: 'S3', type: 'SW', value: 'SWITCH_MOMENTARY', pkg: 'SWITCH-MOMENTARY-PTH-6.5MM', x: 78.7407, y: 78.9779, rot: 'R90' },
  { ref: 'C1', type: 'CAP', value: '100n', pkg: 'CAP-THRU-2.54MM', x: 74.026, y: 141.1795, rot: 'R0' },
  { ref: 'BAT1', type: 'BAT', value: '9V', pkg: 'BATTERY-GENERIC', x: 96.3217, y: 131.1571, rot: 'R270' },
];

// <signals> block, exactly as listed in the file (element.pad)
const RAW_SIGNALS = {
  D2_A: ['D2.1', 'R3.1'],
  T2_E: ['R3.2', 'R5.1', 'T2.1'],
  'BAT1-': ['S3.4', 'S3.3', 'BAT1.-', 'D2.2', 'T4.3', 'D1.2', 'T3.3', 'R12.2', 'R5.2', 'C1.1'],
  D1_A: ['R2.1', 'D1.1'],
  T1_E: ['R2.2', 'R7.1', 'T1.1'],
  T3_B: ['R8.1', 'R7.2', 'T3.2', 'R12.1'],
  S2_3: ['S2.3', 'R6.2', 'S2.4', 'T3.1'],
  T1_B: ['R11.1', 'R6.1', 'T1.2'],
  S3_2: ['S3.2', 'R1.2', 'R11.2', 'R10.2', 'T1.3', 'T2.3', 'C1.2', 'S3.1'],
  S2_2: ['S2.2', 'R9.2', 'S2.1'],
  T4_B: ['R9.1', 'R5.2', 'T4.2', 'R5.1'],
  S1_3: ['R8.2', 'S1.3', 'S1.4'],
  S1_2: ['R4.2', 'S1.2', 'T4.1', 'S1.1'],
  T2_B: ['R10.1', 'R4.1', 'T2.2'],
  'BAT1+': ['R1.1', 'BAT1.+'],
};
const VCC_NET = 'S3_2'; // supply rail after R1
const GND_NET = 'BAT1-';

/**
 * The file lists R5 pad 1 in T2_E *and* T4_B, and R5 pad 2 in BAT1- *and* T4_B.
 * A resistor pad can only be on one net, so this is resolved here.  Nothing is guessed silently:
 * both readings are selectable in the UI and the disagreement is shown as a warning.
 *   A = the only wires in the file that end on R5's current pad coordinates (pad1->T4_B, pad2->GND)
 *   B = the other reading from the pin lists      (pad1->T2_E, pad2->T4_B)
 */
const INTERPRETATIONS = {
  A: { label: 'A · R5 = 47k pull-down on T4 base', detail: 'R5 pin 1 → T4_B (T4 base), pin 2 → GND', map: { 'R5.1': 'T4_B', 'R5.2': 'BAT1-' } },
  B: { label: 'B · R5 = 47k link T2 → T4 base', detail: 'R5 pin 1 → T2_E (T2 collector), pin 2 → T4_B (T4 base)', map: { 'R5.1': 'T2_E', 'R5.2': 'T4_B' } },
};

/* ------------------------------ 2. BREADBOARD GEOMETRY ------------------------------ */
// 63 columns x 2 halves x 5 rows = 630 holes  +  4 rails x 50 = 200  ->  830 tie points
const COLS = 63;
const colX = (c) => c - 32; // col 1..63 -> x -31..31
const ROW_Z = { A: -5.5, B: -4.5, C: -3.5, D: -2.5, E: -1.5, F: 1.5, G: 2.5, H: 3.5, I: 4.5, J: 5.5 };
const RAIL_Z = { VCC: -9.5, GND: -8.5, BOT_P: 8.5, BOT_N: 9.5 };
const railX = (i) => Math.floor(i / 5) * 6 + (i % 5) - 29; // 10 groups of 5

// Where each net lives on the board.  col = breadboard column, half = top (rows A-E) / bot (F-J).
// rail: this column is a "jumper column" that is tied to a power rail with a jump wire.
const SLOTS = {
  T1_E: { col: 3 }, T1_B: { col: 4 }, JC_T1: { col: 5, rail: 'VCC' },
  S2_3: { col: 9 }, T3_B: { col: 10 }, JC_T3: { col: 11, rail: 'GND' },
  S1_2: { col: 15 }, T4_B: { col: 16 }, JC_T4: { col: 17, rail: 'GND' },
  T2_E: { col: 21 }, T2_B: { col: 22 }, JC_T2: { col: 23, rail: 'VCC' },
  JC_S3V: { col: 40, rail: 'VCC' }, JC_S3G: { col: 42, rail: 'GND' },
  'BAT1+': { col: 60 },
  D1_A: { col: 3, half: 'bot' }, S2_2: { col: 12, half: 'bot' }, S1_3: { col: 14, half: 'bot' }, D2_A: { col: 21, half: 'bot' },
};
const SPECIAL_SLOT = {
  'T1.3': 'JC_T1', 'T2.3': 'JC_T2', 'T3.3': 'JC_T3', 'T4.3': 'JC_T4',
  'S3.1': 'JC_S3V', 'S3.2': 'JC_S3V', 'S3.3': 'JC_S3G', 'S3.4': 'JC_S3G',
};
const RAIL_TARGET_X = { 'C1.1': 18, 'C1.2': 19, 'BAT1.-': 27 };
const PIN_NAMES = { R: ['1', '2'], LED: ['1', '2'], BJT: ['1', '2', '3'], SW: ['1', '2', '3', '4'], CAP: ['1', '2'], BAT: ['+', '-'] };

function resolveNets(raw, pick) {
  const owners = {};
  for (const [n, pins] of Object.entries(raw)) for (const p of pins) { if (!owners[p]) owners[p] = []; owners[p].push(n); }
  const nets = {}; const conflicts = [];
  for (const n of Object.keys(raw)) nets[n] = [];
  for (const [p, ns] of Object.entries(owners)) {
    let chosen = ns[0];
    if (ns.length > 1) { chosen = pick[p] && ns.includes(pick[p]) ? pick[p] : ns[0]; conflicts.push({ pin: p, listedIn: ns, chosen }); }
    nets[chosen].push(p);
  }
  return { nets, conflicts };
}

function buildLayout(nets) {
  const pinNet = {};
  for (const [n, pins] of Object.entries(nets)) for (const p of pins) pinNet[p] = n;
  const order = (p) => (p[0] === 'T' ? 0 : p[0] === 'S' ? 1 : 2);
  const pins = Object.keys(pinNet).sort((a, b) => order(a) - order(b) || a.localeCompare(b, undefined, { numeric: true }));

  const nextRow = {}; const railUsed = { VCC: new Set(), GND: new Set() };
  const holes = {}; const jumpers = []; const railPins = [];

  const allocRow = (slotKey) => {
    const s = SLOTS[slotKey]; if (!s) throw new Error('No breadboard slot for ' + slotKey);
    const half = s.half || 'top';
    const rows = half === 'top' ? (s.rail ? ['E', 'D', 'C', 'B'] : ['E', 'D', 'C', 'B', 'A']) : ['F', 'G', 'H', 'I', 'J'];
    const i = nextRow[slotKey] || 0; if (i >= rows.length) throw new Error('Column ' + slotKey + ' is full');
    nextRow[slotKey] = i + 1;
    return { type: 'col', col: s.col, half, row: rows[i], x: colX(s.col), z: ROW_Z[rows[i]], slot: slotKey };
  };
  const takeRail = (rail, tx) => {
    let best = -1, bd = 1e9;
    for (let i = 0; i < 50; i++) { if (railUsed[rail].has(i)) continue; const d = Math.abs(railX(i) - tx); if (d < bd) { bd = d; best = i; } }
    railUsed[rail].add(best);
    return { type: 'rail', rail, idx: best, x: railX(best), z: RAIL_Z[rail] };
  };

  for (const p of pins) {
    const n = pinNet[p];
    if (SPECIAL_SLOT[p]) holes[p] = allocRow(SPECIAL_SLOT[p]);
    else if (n === VCC_NET) railPins.push([p, 'VCC']);
    else if (n === GND_NET) railPins.push([p, 'GND']);
    else holes[p] = allocRow(n);
  }
  for (const [p, rail] of railPins) {
    const ref = p.split('.')[0];
    const partner = pins.find((q) => q !== p && q.split('.')[0] === ref && holes[q] && holes[q].type === 'col');
    const tx = RAIL_TARGET_X[p] !== undefined ? RAIL_TARGET_X[p] : partner ? holes[partner].x : 0;
    holes[p] = takeRail(rail, tx);
  }
  // jump wires: jumper column (row A) -> power rail
  let jn = 1;
  for (const [key, s] of Object.entries(SLOTS)) {
    if (!s.rail) continue;
    const from = { type: 'col', col: s.col, half: 'top', row: 'A', x: colX(s.col), z: ROW_Z.A, slot: key };
    const to = takeRail(s.rail, from.x);
    jumpers.push({ id: 'J' + jn++, net: s.rail === 'VCC' ? VCC_NET : GND_NET, from, to, slot: key });
  }
  return { holes, jumpers, pinNet };
}

function verify(parts, jumpers, nets) {
  const errors = [];
  const parent = {};
  const find = (a) => { if (parent[a] === undefined) parent[a] = a; while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const node = (h) => (h.type === 'col' ? 'c' + h.col + h.half : 'r:' + h.rail);
  const key = (h) => (h.type === 'col' ? 'c' + h.col + h.row : 'r:' + h.rail + ':' + h.idx);

  for (const j of jumpers) union(node(j.from), node(j.to));

  const used = new Map();
  const claim = (h, who) => { const k = key(h); if (used.has(k)) errors.push(`Hole ${k} used by both ${used.get(k)} and ${who}`); used.set(k, who); };
  let pinCount = 0;
  for (const p of parts) for (const pin of p.pins) { pinCount++; if (!pin.hole) { errors.push('Unplaced pin ' + pin.id); continue; } claim(pin.hole, pin.id); }
  for (const j of jumpers) { claim(j.from, j.id + ':from'); claim(j.to, j.id + ':to'); }

  const pinOwn = {};
  for (const p of parts) for (const pin of p.pins) pinOwn[pin.id] = pin;
  const roots = {};
  for (const [n, ids] of Object.entries(nets)) {
    const rs = new Set(ids.map((id) => (pinOwn[id] && pinOwn[id].hole ? find(node(pinOwn[id].hole)) : 'missing:' + id)));
    if (rs.size !== 1) errors.push(`Net ${n} is split across ${rs.size} breadboard nodes`);
    roots[n] = [...rs][0];
  }
  const seen = {};
  for (const [n, r] of Object.entries(roots)) { if (seen[r]) errors.push(`SHORT: nets ${seen[r]} and ${n} share a breadboard node`); seen[r] = n; }
  const netPinTotal = Object.values(nets).reduce((s, a) => s + a.length, 0);
  if (netPinTotal !== pinCount) errors.push(`Pin count mismatch: nets list ${netPinTotal}, parts have ${pinCount}`);

  for (const p of parts) if (p.type === 'BJT') {
    const [a, b, c] = p.pins.map((q) => q.hole);
    const ok = [a, b, c].every((h) => h.type === 'col' && h.half === a.half && h.row === a.row) && b.col === a.col + 1 && c.col === b.col + 1;
    if (!ok) errors.push(`${p.ref}: TO-92 legs are not in 3 adjacent columns of one row`);
  }
  return { ok: errors.length === 0, errors, pins: pinCount, nets: Object.keys(nets).length, jumpers: jumpers.length };
}

function buildModel(interp) {
  const { nets, conflicts } = resolveNets(RAW_SIGNALS, INTERPRETATIONS[interp].map);
  const layout = buildLayout(nets);
  const parts = BRD_PARTS.map((p) => ({
    ...p,
    pins: PIN_NAMES[p.type].map((n) => { const id = `${p.ref}.${n}`; return { id, name: n, net: layout.pinNet[id], hole: layout.holes[id] }; }),
  }));
  const check = verify(parts, layout.jumpers, nets);
  // unique used holes (for coloured markers)
  const markers = new Map();
  const addM = (h, net) => { const k = h.type === 'col' ? 'c' + h.col + h.row : 'r' + h.rail + h.idx; if (!markers.has(k)) markers.set(k, { h, net }); };
  parts.forEach((p) => p.pins.forEach((q) => addM(q.hole, q.net)));
  layout.jumpers.forEach((j) => { addM(j.from, j.net); addM(j.to, j.net); });
  return { nets, conflicts, parts, jumpers: layout.jumpers, check, markers: [...markers.values()], partByRef: Object.fromEntries(parts.map((p) => [p.ref, p])) };
}

/* optional: parse a raw .brd and compare with the embedded netlist */
export function parseBrd(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const signals = {};
  for (const s of Array.from(doc.getElementsByTagName('signal'))) {
    signals[s.getAttribute('name')] = Array.from(s.getElementsByTagName('contactref')).map((c) => `${c.getAttribute('element')}.${c.getAttribute('pad')}`);
  }
  const elements = {};
  for (const e of Array.from(doc.getElementsByTagName('element'))) elements[e.getAttribute('name')] = { value: e.getAttribute('value'), pkg: e.getAttribute('package') };
  return { signals, elements };
}
function compareBrd(text) {
  try {
    const { signals, elements } = parseBrd(text);
    const diffs = [];
    for (const [n, pins] of Object.entries(RAW_SIGNALS)) {
      const got = (signals[n] || []).slice().sort().join(','); const want = pins.slice().sort().join(',');
      if (got !== want) diffs.push(`Signal ${n} differs`);
    }
    for (const n of Object.keys(signals)) if (!RAW_SIGNALS[n]) diffs.push(`Extra signal ${n}`);
    for (const p of BRD_PARTS) { const e = elements[p.ref]; if (!e) diffs.push(`Missing part ${p.ref}`); else if (e.value !== p.value) diffs.push(`${p.ref} value ${e.value} ≠ ${p.value}`); }
    return { ok: diffs.length === 0, diffs };
  } catch (err) { return { ok: false, diffs: ['Could not parse .brd: ' + err.message] }; }
}
// ==== LOGIC END ============================================================

/* ------------------------------ 3. PRESENTATION DATA ------------------------------ */
const NET_COLOR = {
  'BAT1-': '#111827', S3_2: '#dc2626', 'BAT1+': '#f97316', D1_A: '#ec4899', D2_A: '#10b981',
  T1_E: '#eab308', T2_E: '#facc15', T1_B: '#84cc16', T2_B: '#a3e635', T3_B: '#06b6d4', T4_B: '#0ea5e9',
  S2_3: '#8b5cf6', S1_2: '#6366f1', S2_2: '#a855f7', S1_3: '#d946ef',
};
const hot = (n) => (n === 'BAT1-' ? '#9aa4b8' : NET_COLOR[n] || '#ffffff');
const netLabel = (n) => (n === 'BAT1-' ? 'GND (BAT1−)' : n === VCC_NET ? 'VCC (S3_2, via R1)' : n === 'BAT1+' ? 'BAT1+ (battery +)' : n);
const STEEL = '#c7ccd4';
const BAND = ['#111111', '#8b4513', '#d32f2f', '#ff8f00', '#fdd835', '#2e7d32', '#1565c0', '#7b1fa2', '#757575', '#fafafa'];
const BAND_NAME = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];

function ohmBands(value) {
  const m = String(value).match(/^([\d.]+)\s*([kKmM]?)/); if (!m) return null;
  let v = parseFloat(m[1]); if (/k/i.test(m[2])) v *= 1e3; else if (m[2] === 'M') v *= 1e6;
  let exp = Math.floor(Math.log10(v)) - 1; let sig = Math.round(v / 10 ** exp);
  if (sig >= 100) { sig = Math.round(sig / 10); exp += 1; }
  return [Math.floor(sig / 10), sig % 10, exp];
}
const fmtOhm = (v) => String(v).replace(/k$/i, ' kΩ').replace(/M$/, ' MΩ');
const holeAddr = (h) => (h.type === 'col' ? `column ${h.col}, row ${h.row} (${h.half === 'top' ? 'upper' : 'lower'} half)` : `${h.rail === 'VCC' ? 'Top + rail' : 'Top − rail'}, hole ${h.idx + 1}`);

const PIN_FUNC = {
  R: ['Lead 1', 'Lead 2'],
  LED: ['1 · Anode (+)', '2 · Cathode (−)'],
  BJT: ['1 · Collector', '2 · Base', '3 · Emitter'],
  SW: ['Pad 1 · side A', 'Pad 2 · side A', 'Pad 3 · side B', 'Pad 4 · side B'],
  CAP: ['Lead 1', 'Lead 2'],
  BAT: ['+ terminal', '− terminal'],
};
const PKG_DESC = {
  R: 'Axial through-hole resistor — 10.16 mm lead pitch, 8.50 mm body length, 2.50 mm body diameter.',
  LED: 'Radial 5 mm LED — 2.54 mm lead pitch, 5.65 mm body diameter, 8.60 mm body height.',
  BJT: 'TO-92 bipolar transistor — leads 1-2-3 on a 1.27 mm spacing.',
  SW: '6.5 mm momentary push-button, 4 through-hole pads (pads 1+2 form one side, 3+4 the other, per the nets in the file).',
  CAP: 'Through-hole capacitor, 2.54 mm lead pitch.',
  BAT: 'Generic 9 V battery, + / − terminals.',
};

/* ------------------------------ 4. 3D PRIMITIVES ------------------------------ */
function Tube({ pts, r = 0.07, color = STEEL, emissive = '#000000', opacity = 1, metal = 0.7, rough = 0.35, ...rest }) {
  const key = JSON.stringify(pts) + r;
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    return new THREE.TubeGeometry(curve, Math.max(24, pts.length * 14), r, 8, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} {...rest}>
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissive === '#000000' ? 0 : 0.7} metalness={metal} roughness={rough} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}
// arched jump wire between two 3D points (midpoint lifted on Y)
function ArchWire({ a, b, lift, r = 0.14, color, opacity = 1, emissive = '#000000', onClick, onOver, onOut }) {
  const mid = [(a[0] + b[0]) / 2, lift, (a[2] + b[2]) / 2];
  const pts = [a, [a[0], a[1] + 0.9, a[2]], mid, [b[0], b[1] + 0.9, b[2]], b];
  return <Tube pts={pts} r={r} color={color} emissive={emissive} opacity={opacity} metal={0.05} rough={0.6} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />;
}
function legPath(h, a) {
  const dx = a[0] - h[0], dz = a[2] - h[2]; const d = Math.hypot(dx, dz);
  const k = d < 1e-6 ? 0 : Math.min(0.35, d * 0.4) / d;
  return [[h[0], 0.02, h[2]], [h[0], Math.max(a[1] - 0.45, 0.25), h[2]], [h[0] + dx * k, a[1], h[2] + dz * k], a];
}
function Leg({ pin, anchor, hl, r = 0.07 }) {
  const isHot = hl === pin.net; const dim = hl && !isHot;
  return <Tube pts={legPath([pin.hole.x, 0, pin.hole.z], anchor)} r={r} color={isHot ? hot(pin.net) : STEEL} emissive={isHot ? hot(pin.net) : '#000000'} opacity={dim ? 0.18 : 1} />;
}
const Mat = ({ color, glow = 0, ...p }) => <meshStandardMaterial color={color} emissive={glow ? '#4da3ff' : '#000000'} emissiveIntensity={glow} roughness={0.55} metalness={0.05} {...p} />;
const v3 = (h) => new THREE.Vector3(h.x, 0, h.z);

/* ------------------------------ 5. PARTS ------------------------------ */
function Resistor({ part, glow, hl }) {
  const [p1, p2] = part.pins; const a = v3(p1.hole), b = v3(p2.hole);
  const d = b.clone().sub(a); const dist = d.length(); const u = d.clone().normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const L = Math.min(3.35, Math.max(1.2, dist - 1.0)); const Y = 0.62; const ang = -Math.atan2(d.z, d.x);
  const A1 = [mid.x - u.x * L / 2, Y, mid.z - u.z * L / 2]; const A2 = [mid.x + u.x * L / 2, Y, mid.z + u.z * L / 2];
  const bd = ohmBands(part.value) || [0, 0, 0];
  const bandX = [-L / 2 + L * 0.16, -L / 2 + L * 0.29, -L / 2 + L * 0.42, L / 2 - L * 0.14];
  const bandC = [BAND[bd[0]], BAND[bd[1]], BAND[bd[2]] || BAND[0], '#c9a227'];
  return (
    <group>
      <Leg pin={p1} anchor={A1} hl={hl} /><Leg pin={p2} anchor={A2} hl={hl} />
      <group position={[mid.x, Y, mid.z]} rotation={[0, ang, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, L, 24]} /><Mat color="#d9b98a" glow={glow} /></mesh>
        {bandX.map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.47, 0.47, 0.15, 24]} /><Mat color={bandC[i]} glow={glow} /></mesh>
        ))}
      </group>
    </group>
  );
}

function Led({ part, glow, hl }) {
  const [an, ca] = part.pins; const a = v3(an.hole), k = v3(ca.hole);
  const mid = a.clone().add(k).multiplyScalar(0.5); const u = k.clone().sub(a).normalize(); const Y = 1.25;
  const aA = [mid.x - u.x * 0.55, Y, mid.z - u.z * 0.55]; const aK = [mid.x + u.x * 0.55, Y, mid.z + u.z * 0.55];
  const col = part.value === 'RED' ? '#ff3030' : '#22e06a';
  return (
    <group>
      <Leg pin={an} anchor={aA} hl={hl} /><Leg pin={ca} anchor={aK} hl={hl} />
      <mesh position={[aA[0], Y + 0.05, aA[2]]}><sphereGeometry args={[0.14, 12, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <group position={[mid.x, Y, mid.z]}>
        <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[1.2, 1.2, 0.18, 28]} /><Mat color={col} glow={glow} transparent opacity={0.9} /></mesh>
        <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[1.0, 1.0, 2.1, 28]} /><Mat color={col} glow={glow} emissive={col} emissiveIntensity={0.25 + glow} transparent opacity={0.82} /></mesh>
        <mesh position={[0, 2.2, 0]}><sphereGeometry args={[1.0, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={col} glow={glow} emissive={col} emissiveIntensity={0.25 + glow} transparent opacity={0.82} /></mesh>
      </group>
    </group>
  );
}

function Transistor({ part, glow, hl }) {
  const geo = useMemo(() => {
    const r = 0.95, f = 0.62, a = Math.asin(f / r); const s = new THREE.Shape();
    s.moveTo(r * Math.cos(a), -f); s.absarc(0, 0, r, -a, Math.PI + a, false); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); return g;
  }, []);
  const mid = part.pins[1].hole; const Y = 1.0;
  return (
    <group>
      {part.pins.map((p) => <Leg key={p.id} pin={p} anchor={[mid.x + (p.hole.x - mid.x) * 0.45, Y, mid.z]} hl={hl} />)}
      <mesh geometry={geo} position={[mid.x, Y, mid.z]}><Mat color={part.value === 'PNP' ? '#2b2b33' : '#1c1c1c'} glow={glow} /></mesh>
      <mesh position={[mid.x, Y + 0.95, mid.z + 0.64]}><boxGeometry args={[1.3, 1.5, 0.03]} /><Mat color={part.value === 'PNP' ? '#a78bfa' : '#555'} glow={glow} /></mesh>
    </group>
  );
}

function Switch({ part, glow, hl, cap }) {
  const [p1, p2, p3, p4] = part.pins;
  const mean = (g, k) => g.reduce((s, p) => s + p.hole[k], 0) / g.length;
  const A = [p1, p2], B = [p3, p4]; const lowIsA = mean(A, 'z') <= mean(B, 'z');
  const low = lowIsA ? A : B, high = lowIsA ? B : A;
  const sortX = (g) => g.slice().sort((p, q) => p.hole.x - q.hole.x || p.hole.z - q.hole.z);
  const cx = part.pins.reduce((s, p) => s + p.hole.x, 0) / 4, cz = part.pins.reduce((s, p) => s + p.hole.z, 0) / 4;
  const Y = 0.8; const anchors = [];
  sortX(low).forEach((p, i) => anchors.push([p, [cx + (i ? 1.1 : -1.1), Y, cz - 0.9]]));
  sortX(high).forEach((p, i) => anchors.push([p, [cx + (i ? 1.1 : -1.1), Y, cz + 0.9]]));
  return (
    <group>
      {anchors.map(([p, an]) => <Leg key={p.id} pin={p} anchor={an} hl={hl} />)}
      <mesh position={[cx, Y + 0.65, cz]}><boxGeometry args={[2.6, 1.3, 2.4]} /><Mat color="#2a2d33" glow={glow} /></mesh>
      <mesh position={[cx, Y + 1.33, cz]}><boxGeometry args={[2.3, 0.08, 2.1]} /><Mat color="#c3c8d0" glow={glow} metalness={0.8} /></mesh>
      <mesh position={[cx, Y + 1.6, cz]}><cylinderGeometry args={[0.72, 0.72, 0.5, 24]} /><Mat color={cap} glow={glow} /></mesh>
    </group>
  );
}

function Capacitor({ part, glow, hl }) {
  const [p1, p2] = part.pins; const a = v3(p1.hole), b = v3(p2.hole);
  const d = b.clone().sub(a); const u = d.clone().normalize(); const mid = a.clone().add(b).multiplyScalar(0.5); const Y = 1.1;
  const A1 = [mid.x - u.x * 0.5, Y, mid.z - u.z * 0.5], A2 = [mid.x + u.x * 0.5, Y, mid.z + u.z * 0.5];
  return (
    <group>
      <Leg pin={p1} anchor={A1} hl={hl} /><Leg pin={p2} anchor={A2} hl={hl} />
      <group position={[mid.x, Y, mid.z]} rotation={[0, -Math.atan2(d.z, d.x), 0]}>
        <mesh position={[0, 1.0, 0]}><boxGeometry args={[1.7, 2.0, 0.75]} /><Mat color="#e0a526" glow={glow} /></mesh>
        <mesh position={[0, 2.0, 0]}><sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color="#e0a526" glow={glow} /></mesh>
      </group>
    </group>
  );
}

const BAT_C = [46.5, 2.65, 0];
function Battery({ part, glow, hl }) {
  const plus = part.pins.find((p) => p.name === '+'), minus = part.pins.find((p) => p.name === '-');
  const top = BAT_C[1] + 3.45;
  const sP = [BAT_C[0] - 1.9, top + 0.3, -7.6], sM = [BAT_C[0] + 1.9, top + 0.3, -7.6];
  const wire = (pin, s, color) => {
    const isHot = hl === pin.net; const dim = hl && !isHot; const e = [pin.hole.x, 0.05, pin.hole.z];
    return <ArchWire a={s} b={e} lift={9} r={0.17} color={color} opacity={dim ? 0.2 : 1} emissive={isHot ? hot(pin.net) : '#000000'} />;
  };
  return (
    <group>
      <mesh position={BAT_C}><boxGeometry args={[10.4, 6.9, 19.1]} /><Mat color="#1f2937" glow={glow} /></mesh>
      <mesh position={[BAT_C[0], top + 0.02, 1.5]}><boxGeometry args={[10.4, 0.06, 14]} /><Mat color="#c2762a" glow={glow} /></mesh>
      <mesh position={[sP[0], top + 0.12, sP[2]]}><cylinderGeometry args={[0.8, 0.8, 0.4, 20]} /><Mat color="#c9ced6" metalness={0.8} /></mesh>
      <mesh position={[sM[0], top + 0.12, sM[2]]}><cylinderGeometry args={[0.8, 0.8, 0.4, 6]} /><Mat color="#c9ced6" metalness={0.8} /></mesh>
      {wire(plus, sP, '#d62828')}
      {wire(minus, sM, '#161616')}
    </group>
  );
}

/* ------------------------------ 6. BOARD ------------------------------ */
function Breadboard() {
  const ref = useRef();
  const pts = useMemo(() => {
    const a = [];
    for (let c = 1; c <= COLS; c++) for (const r of Object.keys(ROW_Z)) a.push([colX(c), ROW_Z[r]]);
    for (const z of Object.values(RAIL_Z)) for (let i = 0; i < 50; i++) a.push([railX(i), z]);
    return a; // 630 + 200 = 830
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pts.forEach(([x, z], i) => { m.setPosition(x, 0.015, z); ref.current.setMatrixAt(i, m); });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [pts]);
  const tex = useMemo(() => {
    const S = 32, W = 66 * S, H = 23 * S; const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.fillStyle = '#6b6455'; g.font = `bold ${0.62 * S}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const px = (x) => (x + 33) * S, py = (z) => (z + 11.5) * S;
    for (let c = 1; c <= COLS; c++) if (c === 1 || c % 5 === 0) { g.fillText(String(c), px(colX(c)), py(-6.9)); g.fillText(String(c), px(colX(c)), py(6.9)); }
    for (const r of Object.keys(ROW_Z)) { g.fillText(r, px(-32.2), py(ROW_Z[r])); g.fillText(r, px(32.2), py(ROW_Z[r])); }
    g.font = `bold ${0.9 * S}px sans-serif`;
    [['+', RAIL_Z.VCC], ['−', RAIL_Z.GND], ['+', RAIL_Z.BOT_P], ['−', RAIL_Z.BOT_N]].forEach(([t, z]) => g.fillText(t, px(-31.6), py(z)));
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
  }, []);
  return (
    <group>
      <mesh position={[0, -0.4, 0]}><boxGeometry args={[66, 0.8, 23]} /><meshStandardMaterial color="#ece6d6" roughness={0.8} /></mesh>
      <mesh position={[0, 0.006, 0]}><boxGeometry args={[64.5, 0.012, 1.6]} /><meshStandardMaterial color="#c9c1ac" /></mesh>
      {[[-10.35, '#e11d48'], [-7.65, '#2563eb'], [7.65, '#e11d48'], [10.35, '#2563eb']].map(([z, c], i) => (
        <mesh key={i} position={[0, 0.008, z]}><boxGeometry args={[60.5, 0.016, 0.1]} /><meshBasicMaterial color={c} /></mesh>
      ))}
      <instancedMesh ref={ref} args={[null, null, pts.length]}><boxGeometry args={[0.52, 0.05, 0.52]} /><meshStandardMaterial color="#2a2a2a" /></instancedMesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><planeGeometry args={[66, 23]} /><meshBasicMaterial map={tex} transparent depthWrite={false} /></mesh>
    </group>
  );
}

function PartWrap({ part, selected, hovered, onSelect, onHover, children }) {
  useEffect(() => { document.body.style.cursor = hovered ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hovered]);
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(part.ref); }} onPointerOver={(e) => { e.stopPropagation(); onHover(part.ref); }} onPointerOut={() => onHover(null)}>
      {children}
    </group>
  );
}
const LABEL_Y = { R: 1.7, LED: 4.8, BJT: 3.6, SW: 3.6, CAP: 3.5, BAT: 8.5 };
const SW_CAP = { S1: '#2563eb', S2: '#f59e0b', S3: '#ef4444' };

function CameraRig({ view }) {
  const { camera, controls, size } = useThree();
  useEffect(() => {
    const V = { iso: [[8, 38, 46], [8, 0, 0]], top: [[8, 84, 0.01], [8, 0, 0]], front: [[8, 12, 54], [8, 2, 0]] }[view.name];
    const aspect = size.width / size.height; const f = Math.max(1, 1.45 / aspect) * 0.9;
    const t = new THREE.Vector3(...V[1]); const p = new THREE.Vector3(...V[0]).sub(t).multiplyScalar(f).add(t);
    camera.position.copy(p); camera.lookAt(t);
    if (controls) { controls.target.copy(t); controls.update(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.name, view.tick, !!controls]);
  return null;
}

function Scene({ model, sel, hover, hl, setSel, setHover, setHl, showLabels, showConf, view }) {
  const selRef = sel && sel.kind === 'part' ? sel.id : null;
  const pick = (ref) => { setSel({ kind: 'part', id: ref }); setHl(null); };
  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <hemisphereLight args={['#ffffff', '#6b7280', 0.9]} />
      <directionalLight position={[25, 50, 30]} intensity={1.25} />
      <directionalLight position={[-30, 20, -20]} intensity={0.35} />
      <CameraRig view={view} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={8} maxDistance={320} maxPolarAngle={Math.PI * 0.495} />
      <Breadboard />

      {model.parts.map((p) => {
        const g = selRef === p.ref ? 0.6 : hover === p.ref ? 0.25 : 0;
        const common = { part: p, glow: g, hl };
        return (
          <PartWrap key={p.ref} part={p} selected={selRef === p.ref} hovered={hover === p.ref} onSelect={pick} onHover={setHover}>
            {p.type === 'R' && <Resistor {...common} />}
            {p.type === 'LED' && <Led {...common} />}
            {p.type === 'BJT' && <Transistor {...common} />}
            {p.type === 'SW' && <Switch {...common} cap={SW_CAP[p.ref]} />}
            {p.type === 'CAP' && <Capacitor {...common} />}
            {p.type === 'BAT' && <Battery {...common} />}
          </PartWrap>
        );
      })}

      {model.jumpers.map((j) => {
        const a = [j.from.x, 0.1, j.from.z], b = [j.to.x, 0.1, j.to.z];
        const d = Math.hypot(a[0] - b[0], a[2] - b[2]); const isHot = hl === j.net; const dim = hl && !isHot;
        const isSel = sel && sel.kind === 'wire' && sel.id === j.id;
        return (
          <group key={j.id}>
            <ArchWire a={a} b={b} lift={1.5 + Math.min(d * 0.2, 3.2)} r={0.15} color={j.net === VCC_NET ? '#dc2626' : '#1f1f1f'}
              opacity={dim ? 0.2 : 1} emissive={isSel || isHot ? hot(j.net) : '#000000'}
              onClick={(e) => { e.stopPropagation(); setSel({ kind: 'wire', id: j.id }); setHl(j.net); }} />
            {[a, b].map((e, i) => <mesh key={i} position={[e[0], 0.12, e[2]]}><cylinderGeometry args={[0.1, 0.1, 0.4, 8]} /><meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} /></mesh>)}
          </group>
        );
      })}

      {model.markers.map(({ h, net }, i) => {
        const dim = hl && hl !== net;
        return (
          <mesh key={i} position={[h.x, 0.045, h.z]} onClick={(e) => { e.stopPropagation(); setSel({ kind: 'net', id: net }); setHl(net); }}>
            <cylinderGeometry args={[hl === net ? 0.42 : 0.3, hl === net ? 0.42 : 0.3, 0.05, 18]} />
            <meshBasicMaterial color={NET_COLOR[net]} transparent opacity={dim ? 0.15 : 1} />
          </mesh>
        );
      })}

      {showLabels && model.parts.map((p) => {
        const hs = p.pins.map((q) => q.hole);
        const x = p.type === 'BAT' ? BAT_C[0] : hs.reduce((s, h) => s + h.x, 0) / hs.length;
        const z = p.type === 'BAT' ? 0 : hs.reduce((s, h) => s + h.z, 0) / hs.length;
        return (
          <Html key={p.ref} position={[x, LABEL_Y[p.type], z]} center distanceFactor={26} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="pcb3d-tag">{p.ref}</div>
          </Html>
        );
      })}

      {showConf && model.conflicts.map((c) => {
        const own = model.partByRef[c.pin.split('.')[0]].pins.find((q) => q.id === c.pin);
        return c.listedIn.filter((n) => n !== c.chosen).map((n) => {
          const other = model.nets[n].map((id) => model.parts.flatMap((p) => p.pins).find((q) => q.id === id)).find((q) => q && !q.id.startsWith(c.pin.split('.')[0] + '.'));
          if (!other) return null;
          return (
            <group key={c.pin + n}>
              <Line points={[[own.hole.x, 1.6, own.hole.z], [other.hole.x, 1.6, other.hole.z]]} color="#ff2d55" lineWidth={2.5} dashed dashSize={0.35} gapSize={0.25} />
              <Html position={[(own.hole.x + other.hole.x) / 2, 2.4, (own.hole.z + other.hole.z) / 2]} center distanceFactor={26} style={{ pointerEvents: 'none' }}>
                <div className="pcb3d-conf">{c.pin} also listed on {n} — NOT wired</div>
              </Html>
            </group>
          );
        });
      })}
    </>
  );
}

/* ------------------------------ 7. DETAILS PANEL ------------------------------ */
function partTitle(p) {
  switch (p.type) {
    case 'R': return `${p.ref} · ${fmtOhm(p.value)} resistor`;
    case 'LED': return `${p.ref} · ${p.value[0] + p.value.slice(1).toLowerCase()} LED`;
    case 'BJT': return `${p.ref} · ${p.value} transistor`;
    case 'SW': return `${p.ref} · Push button`;
    case 'CAP': return `${p.ref} · 100 nF capacitor`;
    default: return `${p.ref} · 9 V battery`;
  }
}
function partNotes(p, interp) {
  const n = [];
  if (p.type === 'BJT') {
    n.push('Pin roles are inferred from the wiring: pin 3 sits on the supply rail (emitter) and pin 1 on the load side (collector). View from the flat face with legs down: pin 1 is on the left.');
    n.push('Check your actual part’s datasheet before powering: 2N3904/2N3906 are E‑B‑C, BC547/BC557 are C‑B‑E. The wrong orientation will not match this build.');
  }
  if (p.type === 'LED') n.push('Long leg = anode (pin 1, white dot). Short leg / flat side = cathode (pin 2 → GND). Series resistor: ' + (p.ref === 'D1' ? 'R2 (1 kΩ).' : 'R3 (1 kΩ).'));
  if (p.type === 'SW') n.push('Pads 1+2 share one column and pads 3+4 the other. On a real 4-leg tact switch, confirm with a multimeter that the legs you plug into one column are the pair that are always connected, otherwise the switch will be shorted permanently.');
  if (p.ref === 'S3') n.push('Pressing S3 connects VCC to GND (through R1, 1 kΩ). That is how the file wires it.');
  if (p.type === 'CAP') n.push('Pin 1 → GND, pin 2 → VCC. If your 100 nF part is an electrolytic, the − leg must go to pin 1.');
  if (p.type === 'BAT') n.push('+ lead → BAT1+ column (R1 pin 1). − lead → GND rail. Connect the battery last.');
  if (p.ref === 'R5') n.push(`Uses reading ${interp}: ${INTERPRETATIONS[interp].detail}. The file’s pin lists disagree for this part — see the warning.`);
  return n;
}

function Panel({ model, sel, hl, setHl, setSel, interp, onClose }) {
  const allPins = useMemo(() => model.parts.flatMap((p) => p.pins), [model]);
  const chip = (n) => <span className="pcb3d-chip" style={{ borderColor: NET_COLOR[n] }}><i style={{ background: NET_COLOR[n] }} />{netLabel(n)}</span>;
  let body = null;

  if (sel.kind === 'part') {
    const p = model.partByRef[sel.id]; const bd = p.type === 'R' ? ohmBands(p.value) : null;
    body = (
      <>
        <h3>{partTitle(p)}</h3>
        <div className="pcb3d-meta">
          <span>Package: {p.pkg}</span><span>.brd pos: {p.x.toFixed(2)}, {p.y.toFixed(2)} mm · {p.rot}</span><span>Value: {p.value}</span>
        </div>
        <p>{PKG_DESC[p.type]}</p>
        {bd && <div className="pcb3d-bands">{[BAND[bd[0]], BAND[bd[1]], BAND[bd[2]]].map((c, i) => <b key={i} style={{ background: c }} />)}<b style={{ background: '#c9a227' }} /><small>{[bd[0], bd[1], bd[2]].map((d) => BAND_NAME[d]).join(' · ')} · gold</small></div>}
        <div className="pcb3d-pins">
          {p.pins.map((q, i) => {
            const others = model.nets[q.net].filter((id) => id !== q.id);
            return (
              <button key={q.id} className={'pcb3d-pin' + (hl === q.net ? ' on' : '')} onClick={() => setHl(hl === q.net ? null : q.net)}>
                <span className="f">{PIN_FUNC[p.type][i]}</span>
                {chip(q.net)}
                <span className="h">{holeAddr(q.hole)}</span>
                <span className="o">with {others.slice(0, 7).join(', ')}{others.length > 7 ? ` +${others.length - 7}` : ''}</span>
              </button>
            );
          })}
        </div>
        {partNotes(p, interp).map((t, i) => <p key={i} className="pcb3d-note">{t}</p>)}
      </>
    );
  } else if (sel.kind === 'wire') {
    const j = model.jumpers.find((w) => w.id === sel.id);
    const len = Math.hypot(j.from.x - j.to.x, j.from.z - j.to.z) * 2.54;
    body = (
      <>
        <h3>Jump wire {j.id}</h3>
        <div className="pcb3d-meta">{chip(j.net)}</div>
        <p>From <b>{holeAddr(j.from)}</b><br />to <b>{holeAddr(j.to)}</b></p>
        <p className="pcb3d-note">Straight-line distance ≈ {len.toFixed(0)} mm. Ties the {j.slot.startsWith('JC_T') ? 'transistor ' + j.slot.slice(4) + ' pin 3' : 'switch S3'} column to the {j.net === VCC_NET ? '+' : '−'} rail.</p>
      </>
    );
  } else {
    const ids = model.nets[sel.id];
    const js = model.jumpers.filter((w) => w.net === sel.id);
    body = (
      <>
        <h3>Net {netLabel(sel.id)}</h3>
        <div className="pcb3d-meta">{chip(sel.id)}<span>{ids.length} pins · {js.length} jump wire(s)</span></div>
        <div className="pcb3d-list">{ids.map((id) => { const q = allPins.find((x) => x.id === id); return <div key={id}><b>{id}</b> <span>{holeAddr(q.hole)}</span></div>; })}</div>
      </>
    );
  }
  return (
    <div className="pcb3d-panel">
      <button className="pcb3d-x" onClick={onClose} aria-label="Close">✕</button>
      {body}
      {hl && <button className="pcb3d-clear" onClick={() => setHl(null)}>Clear highlight ({netLabel(hl)})</button>}
    </div>
  );
}

/* ------------------------------ 8. MAIN COMPONENT ------------------------------ */
const CSS = `
.pcb3d-root{position:relative;width:100%;height:100dvh;min-height:420px;background:#0f172a;color:#e5e7eb;font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent}
.pcb3d-root canvas{touch-action:none;display:block}
.pcb3d-top{position:absolute;top:0;left:0;right:0;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;pointer-events:none}
.pcb3d-top>*{pointer-events:auto}
.pcb3d-title{font-weight:700;margin-right:auto;padding:6px 10px;background:#0b1220cc;border-radius:10px;backdrop-filter:blur(6px)}
.pcb3d-btn{min-height:38px;padding:0 12px;border:1px solid #334155;background:#0b1220cc;color:#e5e7eb;border-radius:10px;font:inherit;cursor:pointer;backdrop-filter:blur(6px)}
.pcb3d-btn.on{background:#2563eb;border-color:#3b82f6}
.pcb3d-ok{padding:6px 10px;border-radius:10px;background:#052e1acc;border:1px solid #16a34a;color:#86efac}
.pcb3d-bad{padding:6px 10px;border-radius:10px;background:#450a0acc;border:1px solid #ef4444;color:#fecaca}
.pcb3d-warn{position:absolute;top:56px;left:8px;right:8px;max-width:520px;padding:10px 12px;background:#3b2a05f2;border:1px solid #f59e0b;border-radius:12px;color:#fde68a;z-index:4}
.pcb3d-warn h4{margin:0 0 4px;font-size:14px}.pcb3d-warn p{margin:4px 0;font-size:13px}
.pcb3d-seg{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.pcb3d-seg button{flex:1 1 220px;text-align:left;padding:8px 10px;min-height:44px;border-radius:10px;border:1px solid #92400e;background:#1c1304;color:#fde68a;font:inherit;cursor:pointer}
.pcb3d-seg button.on{background:#b45309;color:#fff;border-color:#fbbf24}
.pcb3d-nets{position:absolute;top:56px;right:8px;width:min(300px,calc(100% - 16px));max-height:55%;overflow:auto;background:#0b1220f2;border:1px solid #334155;border-radius:12px;padding:6px;z-index:4}
.pcb3d-nets button{display:flex;width:100%;gap:8px;align-items:center;min-height:40px;padding:4px 8px;background:none;border:0;color:inherit;font:inherit;text-align:left;border-radius:8px;cursor:pointer}
.pcb3d-nets button.on{background:#1e293b}
.pcb3d-nets i,.pcb3d-chip i{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #fff5;flex:none}
.pcb3d-hint{position:absolute;left:0;right:0;bottom:10px;text-align:center;color:#94a3b8;font-size:12px;pointer-events:none}
.pcb3d-panel{position:absolute;z-index:5;left:8px;right:8px;bottom:8px;max-height:46%;overflow:auto;padding:12px 14px 14px;background:#0b1220f5;border:1px solid #334155;border-radius:16px;box-shadow:0 10px 30px #0008;-webkit-overflow-scrolling:touch}
.pcb3d-panel h3{margin:0 34px 6px 0;font-size:16px}
.pcb3d-panel p{margin:6px 0}
.pcb3d-x{position:absolute;top:6px;right:6px;width:40px;height:40px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#e5e7eb;font-size:16px;cursor:pointer}
.pcb3d-meta{display:flex;flex-wrap:wrap;gap:4px 12px;color:#94a3b8;font-size:12px;margin-bottom:6px}
.pcb3d-note{color:#fcd34d;font-size:12.5px;border-left:3px solid #f59e0b;padding-left:8px}
.pcb3d-pins{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.pcb3d-pin{display:grid;grid-template-columns:1fr;gap:2px;text-align:left;padding:8px 10px;border-radius:10px;border:1px solid #1e293b;background:#111a2e;color:inherit;font:inherit;cursor:pointer;min-height:44px}
.pcb3d-pin.on{border-color:#3b82f6;background:#13233f}
.pcb3d-pin .f{font-weight:600}.pcb3d-pin .h,.pcb3d-pin .o{font-size:12px;color:#94a3b8}
.pcb3d-chip{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:2px 8px;border:1px solid;border-radius:999px;font-size:12px;background:#0f172a}
.pcb3d-bands{display:flex;align-items:center;gap:4px;margin:6px 0}.pcb3d-bands b{width:12px;height:22px;border-radius:2px;border:1px solid #0006}.pcb3d-bands small{margin-left:8px;color:#94a3b8}
.pcb3d-list div{padding:6px 0;border-bottom:1px solid #1e293b;font-size:13px}.pcb3d-list span{color:#94a3b8;font-size:12px}
.pcb3d-clear{margin-top:10px;min-height:40px;padding:0 12px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:inherit;font:inherit;cursor:pointer}
.pcb3d-tag{font:700 11px system-ui;color:#0f172a;background:#fff;border-radius:4px;padding:1px 4px;box-shadow:0 1px 3px #0006;white-space:nowrap}
.pcb3d-conf{font:700 11px system-ui;color:#fff;background:#e11d48;border-radius:4px;padding:2px 5px;white-space:nowrap}
@media (min-width:900px){.pcb3d-panel{left:auto;top:64px;right:12px;bottom:12px;width:360px;max-height:none}.pcb3d-nets{right:384px}}
`;

export default function PCBBreadboard3D({ brdText }) {
  const [interp, setInterp] = useState('A');
  const model = useMemo(() => buildModel(interp), [interp]);
  const brdCheck = useMemo(() => (brdText ? compareBrd(brdText) : null), [brdText]);
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [hl, setHl] = useState(null);
  const [labels, setLabels] = useState(true);
  const [conf, setConf] = useState(false);
  const [netsOpen, setNetsOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(true);
  const [view, setView] = useState({ name: 'iso', tick: 0 });
  const setV = (name) => setView((v) => ({ name, tick: v.tick + 1 }));
  const close = () => { setSel(null); setHl(null); };

  return (
    <div className="pcb3d-root">
      <style>{CSS}</style>
      <Canvas dpr={[1, 2]} camera={{ fov: 45, near: 0.1, far: 800, position: [8, 38, 46] }} onPointerMissed={close} gl={{ antialias: true }}>
        <Scene model={model} sel={sel} hover={hover} hl={hl} setSel={setSel} setHover={setHover} setHl={setHl} showLabels={labels} showConf={conf} view={view} />
      </Canvas>

      <div className="pcb3d-top">
        <div className="pcb3d-title">Glorious Jarv · 830‑point breadboard</div>
        <div className={model.check.ok ? 'pcb3d-ok' : 'pcb3d-bad'} title={model.check.errors.join('\n')}>
          {model.check.ok ? `✔ ${model.check.pins} pins · ${model.check.nets} nets verified · 0 shorts` : `✖ ${model.check.errors.length} wiring error(s)`}
        </div>
        {brdCheck && <div className={brdCheck.ok ? 'pcb3d-ok' : 'pcb3d-bad'} title={brdCheck.diffs.join('\n')}>{brdCheck.ok ? '✔ matches your .brd' : `✖ .brd differs (${brdCheck.diffs.length})`}</div>}
        <button className={'pcb3d-btn' + (view.name === 'iso' ? ' on' : '')} onClick={() => setV('iso')}>3D</button>
        <button className={'pcb3d-btn' + (view.name === 'top' ? ' on' : '')} onClick={() => setV('top')}>Top</button>
        <button className={'pcb3d-btn' + (view.name === 'front' ? ' on' : '')} onClick={() => setV('front')}>Front</button>
        <button className={'pcb3d-btn' + (labels ? ' on' : '')} onClick={() => setLabels(!labels)}>Labels</button>
        <button className={'pcb3d-btn' + (netsOpen ? ' on' : '')} onClick={() => setNetsOpen(!netsOpen)}>Nets</button>
        {model.conflicts.length > 0 && <button className={'pcb3d-btn' + (conf ? ' on' : '')} onClick={() => setConf(!conf)}>⚠ Conflicts</button>}
      </div>

      {model.conflicts.length > 0 && warnOpen && (
        <div className="pcb3d-warn">
          <h4>⚠ The .brd lists R5 on two different nets</h4>
          <p>Pad 1 is listed under both T2_E and T4_B; pad 2 under both BAT1− and T4_B. Taken literally, that would short T2’s collector, T4’s base and GND together. Pick the reading that matches your simulated circuit — the layout rebuilds and re-verifies.</p>
          <div className="pcb3d-seg">
            {Object.entries(INTERPRETATIONS).map(([k, v]) => (
              <button key={k} className={interp === k ? 'on' : ''} onClick={() => { setInterp(k); setSel(null); setHl(null); }}><b>{v.label}</b><br /><small>{v.detail}</small></button>
            ))}
          </div>
          <button className="pcb3d-btn" style={{ marginTop: 8 }} onClick={() => setWarnOpen(false)}>Hide</button>
        </div>
      )}
      {model.conflicts.length > 0 && !warnOpen && <button className="pcb3d-btn" style={{ position: 'absolute', top: 56, left: 8, zIndex: 4 }} onClick={() => setWarnOpen(true)}>⚠ R5 reading {interp}</button>}

      {netsOpen && (
        <div className="pcb3d-nets">
          {Object.keys(model.nets).map((n) => (
            <button key={n} className={hl === n ? 'on' : ''} onClick={() => { setHl(hl === n ? null : n); setSel({ kind: 'net', id: n }); }}>
              <i style={{ background: NET_COLOR[n] }} /><span style={{ flex: 1 }}>{netLabel(n)}</span><small>{model.nets[n].length} pins</small>
            </button>
          ))}
        </div>
      )}

      {sel && <Panel model={model} sel={sel} hl={hl} setHl={setHl} setSel={setSel} interp={interp} onClose={close} />}
      {!sel && <div className="pcb3d-hint">Tap a part, wire or coloured hole · drag to orbit · pinch to zoom</div>}
    </div>
  );
}
