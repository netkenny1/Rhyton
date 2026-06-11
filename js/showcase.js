/* ============================================================
   RHYTON — scroll-driven 3D concept tower
   A procedural twisting glass tower (a nod to Dubai Marina's
   Cayan Tower) that assembles floor by floor and rotates as
   you scroll through the pinned section.
   ============================================================ */
import * as THREE from "../assets/vendor/three.module.min.js";

const section = document.getElementById("concept");
const canvas = document.getElementById("towerCanvas");
const caps = Array.from(document.querySelectorAll(".tower__cap"));
const progressBar = document.getElementById("towerProgress");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ---------- Renderer / scene / camera ---------- */
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

/* Soft ivory-sky environment for glass reflections, generated
   procedurally so no texture files are needed. */
function makeEnvironment() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, "#f3ead9");
  grad.addColorStop(0.72, "#d9c8a6");
  grad.addColorStop(1, "#8d7a58");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  // a warm "sun" hotspot for a highlight streak on the glass
  const sun = ctx.createRadialGradient(390, 70, 4, 390, 70, 90);
  sun.addColorStop(0, "rgba(255, 244, 214, 0.95)");
  sun.addColorStop(1, "rgba(255, 244, 214, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 512, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}
scene.environment = makeEnvironment();

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0xfff6e8, 0.25));

const key = new THREE.DirectionalLight(0xfff2dc, 1.35);
key.position.set(6, 12, 8);
scene.add(key);

const rim = new THREE.DirectionalLight(0xd8b97a, 0.5);
rim.position.set(-8, 6, -6);
scene.add(rim);

/* ---------- Tower ---------- */
const tower = new THREE.Group();
scene.add(tower);

const FLOORS = 44;
const FLOOR_H = 0.24;
const GAP = 0.05;
const TWIST = Math.PI / 2; // 90° total, Cayan-style
const TOWER_H = FLOORS * (FLOOR_H + GAP);

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x8fa9ba,
  metalness: 0.3,
  roughness: 0.16,
  envMapIntensity: 1.0,
  clearcoat: 0.5,
  clearcoatRoughness: 0.25,
});

const goldMat = new THREE.MeshStandardMaterial({
  color: 0xa8854b,
  metalness: 1.0,
  roughness: 0.28,
  envMapIntensity: 1.1,
});

const stoneMat = new THREE.MeshStandardMaterial({
  color: 0xe8e1d2,
  metalness: 0.05,
  roughness: 0.85,
});

const floorGeo = new THREE.BoxGeometry(1, FLOOR_H, 1);
const slabGeo = new THREE.BoxGeometry(1, 0.045, 1);

const floors = [];
for (let i = 0; i < FLOORS; i++) {
  const t = i / (FLOORS - 1);
  const w = 3.1 * (1 - 0.28 * t);
  const d = 2.0 * (1 - 0.28 * t);
  const y = 0.4 + i * (FLOOR_H + GAP) + FLOOR_H / 2;
  const rot = TWIST * t;

  const f = new THREE.Mesh(floorGeo, glassMat);
  f.scale.set(w, 1, d);
  f.position.y = y;
  f.rotation.y = rot;
  f.userData = { y, i };
  tower.add(f);
  floors.push(f);

  // champagne-bronze slab between every floor
  const s = new THREE.Mesh(slabGeo, goldMat);
  s.scale.set(w * 1.035, 1, d * 1.035);
  s.position.y = y + FLOOR_H / 2 + GAP / 2;
  s.rotation.y = rot;
  s.userData = { y: s.position.y, i };
  tower.add(s);
  floors.push(s);
}

// crown spire
const crown = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.14, 1.7, 12),
  goldMat
);
crown.position.y = 0.4 + TOWER_H + 0.78;
crown.userData = { y: crown.position.y, i: FLOORS };
tower.add(crown);
floors.push(crown);

// podium + ground
const podium = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3.4), stoneMat);
podium.position.y = 0.2;
tower.add(podium);

function makeShadowDisc() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(27, 26, 23, 0.22)");
  g.addColorStop(1, "rgba(27, 26, 23, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 48),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  return disc;
}
scene.add(makeShadowDisc());

/* ---------- Scroll choreography ---------- */
let targetP = 0; // raw scroll progress 0..1 through the section
let p = 0;       // smoothed (Apple-style inertia)
let idle = 0;    // gentle perpetual rotation so it never feels frozen

const easeInOut = (x) => x * x * (3 - 2 * x);

function computeTarget() {
  const rect = section.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  targetP = Math.min(Math.max(-rect.top / span, 0), 1);
}

function capOpacity(x, a, b, last) {
  const fade = 0.08;
  if (x < a - fade) return 0;
  if (x < a) return (x - (a - fade)) / fade;
  if (x <= b) return 1;
  if (last) return 1;
  if (x < b + fade) return 1 - (x - b) / fade;
  return 0;
}

const capRanges = [
  [0.06, 0.3],
  [0.4, 0.62],
  [0.72, 1.01],
];

function layout() {
  const w = canvas.clientWidth || section.clientWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function update(dt) {
  p += (targetP - p) * 0.085;
  idle += dt * 0.05;

  // Phase A (0 → 0.3): floors assemble bottom-up with stagger
  const build = Math.min(p / 0.3, 1);
  const n = FLOORS + 2;
  for (const f of floors) {
    const local = Math.min(Math.max((build * (n + 10) - f.userData.i) / 10, 0), 1);
    const e = easeInOut(local);
    const sBase = f.geometry === floorGeo || f.geometry === slabGeo ? null : 1;
    if (sBase === null) {
      // keep the per-floor footprint, scale relative to it
      f.scale.y = Math.max(e, 0.0001);
    } else {
      f.scale.setScalar(Math.max(e, 0.0001));
    }
    f.position.y = f.userData.y - (1 - e) * 0.8;
  }

  // Rotation: scroll-scrubbed twist plus a slow idle drift
  tower.rotation.y = p * Math.PI * 2.2 + idle;

  // Camera: rise from street level to a full-silhouette crown view.
  // Portrait screens need extra distance so the tower fits the frame.
  const ep = easeInOut(p);
  const fit = Math.min(Math.max(0.78 / camera.aspect, 1), 1.8);
  camera.position.set(
    Math.sin(ep * 0.5) * 2.2,
    2.2 + ep * 9.4,
    (14.5 + ep * 9) * fit
  );
  camera.lookAt(0, 3.2 + ep * 3.6, 0);

  // Captions + progress hairline
  caps.forEach((cap, i) => {
    const [a, b] = capRanges[i];
    const o = capOpacity(p, a, b, i === caps.length - 1);
    cap.style.opacity = o.toFixed(3);
    cap.style.transform = `translateY(${(1 - o) * 26}px)`;
    cap.style.pointerEvents = o > 0.5 ? "auto" : "none";
  });
  if (progressBar) progressBar.style.transform = `scaleX(${p})`;
}

/* ---------- Frame loop (renders only when section is near) ---------- */
let last = performance.now();
let inView = true;

const visIO = new IntersectionObserver(
  (entries) => {
    inView = entries[0].isIntersecting;
  },
  { rootMargin: "20% 0px" }
);
visIO.observe(section);

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (inView) {
    computeTarget();
    update(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

layout();
window.addEventListener("resize", layout);

if (prefersReducedMotion) {
  // Static composition: fully built, elegant angle, captions stacked
  section.classList.add("tower--static");
  targetP = 1;
  p = 1;
  update(0);
  tower.rotation.y = 0.6;
  caps.forEach((cap) => {
    cap.style.opacity = "1";
    cap.style.transform = "none";
    cap.style.pointerEvents = "auto";
  });
  renderer.render(scene, camera);
} else {
  requestAnimationFrame(frame);
}
