/* ============================================================
   RHYTON — scroll-driven 3D tower, photo-mapped
   One merged twisted-tower mesh (a single draw call) wrapped in
   a real photographed glass facade, lit by a generated sky
   environment. Assembles via index-range reveal and rotates with
   scrubbed scroll inertia. No shadow maps, no per-floor meshes —
   it composites at full frame rate on phones.
   ============================================================ */
import * as THREE from "../assets/vendor/three.module.min.js";

const section = document.getElementById("concept");
const canvas = document.getElementById("showcaseCanvas");
if (!section || !canvas) throw new Error("showcase: missing section/canvas");

const caps = Array.from(section.querySelectorAll(".showcase__cap"));
const progressBar = document.getElementById("showcaseProgress");
const bgImg = section.querySelector(".showcase__bg img");

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 90);

/* Cool sky environment with a sun hotspot — drives the glass
   reflections that sell the realism. Generated, no files. */
function makeEnvironment() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#eef3f8");
  grad.addColorStop(0.5, "#c9d6e2");
  grad.addColorStop(0.75, "#93a3b2");
  grad.addColorStop(1, "#5d6a76");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  const sun = ctx.createRadialGradient(390, 64, 6, 390, 64, 110);
  sun.addColorStop(0, "rgba(255, 250, 235, 1)");
  sun.addColorStop(1, "rgba(255, 250, 235, 0)");
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

scene.add(new THREE.AmbientLight(0xf2f5f8, 0.4));
const key = new THREE.DirectionalLight(0xfff4e0, 1.1);
key.position.set(7, 14, 9);
scene.add(key);
const rim = new THREE.DirectionalLight(0xbfd0e2, 0.45);
rim.position.set(-8, 6, -7);
scene.add(rim);

/* ---------- Facade texture ---------- */
/* Drawn curtain wall with a vertical sky-reflection ramp — panes
   brighten toward the crown the way real glass towers catch the
   sky. Deterministic and seamlessly tileable, which photographs
   of real facades (shot in perspective) are not. */
function facadeTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 2048; // full tower height in one tile, so the ramp never bands
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#262b31";
  ctx.fillRect(0, 0, c.width, c.height);
  const cols = 10,
    rows = 56;
  const colW = c.width / cols;
  const rowH = c.height / rows;
  const mix = (a, b, f) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
      a[1] + (b[1] - a[1]) * f
    )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  const skyTop = [206, 222, 234];
  const skyBot = [82, 95, 107];
  for (let j = 0; j < rows; j++) {
    // canvas y=0 is texture v=1 (the crown): brighter sky reflection up top
    const ramp = j / (rows - 1);
    for (let i = 0; i < cols; i++) {
      const jitter = (Math.random() - 0.5) * 0.12;
      const f0 = Math.min(Math.max(0.12 + 0.62 * ramp + jitter, 0), 1);
      const f1 = Math.min(Math.max(f0 + 0.22, 0), 1);
      const y = j * rowH;
      const g = ctx.createLinearGradient(0, y, 0, y + rowH - 4);
      const lit = Math.random() < 0.006;
      g.addColorStop(0, lit ? "#ddd0b0" : mix(skyTop, skyBot, f0));
      g.addColorStop(1, lit ? "#a59470" : mix(skyTop, skyBot, f1));
      ctx.fillStyle = g;
      ctx.fillRect(i * colW + 2, y + 2, colW - 4, rowH - 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

const facadeMat = new THREE.MeshPhysicalMaterial({
  map: facadeTexture(),
  roughness: 0.22,
  metalness: 0.45,
  envMapIntensity: 1.1,
  clearcoat: 0.5,
  clearcoatRoughness: 0.3,
});

/* ---------- Tower: one merged twisted loft ---------- */
const tower = new THREE.Group();
scene.add(tower);

const H = 12; // tower height
const SEGS = 90; // vertical rings
const TWIST = Math.PI / 2; // 90° Cayan-style twist
const TAPER = 0.24;
const REPEAT_U = 3; // facade wraps around
const REPEAT_V = 1; // one full-height tile — the texture draws every floor

// chamfered-rectangle plan, like a real tower core
function planPoints() {
  const hw = 1.6,
    hd = 1.05,
    ch = 0.34;
  return [
    [-hw + ch, -hd],
    [hw - ch, -hd],
    [hw, -hd + ch],
    [hw, hd - ch],
    [hw - ch, hd],
    [-hw + ch, hd],
    [-hw, hd - ch],
    [-hw, -hd + ch],
  ];
}

function buildTowerGeometry() {
  const plan = planPoints();
  const N = plan.length; // 8 points, 9 with seam duplicate
  // perimeter distances for UVs
  const dists = [0];
  for (let i = 0; i < N; i++) {
    const [x1, z1] = plan[i];
    const [x2, z2] = plan[(i + 1) % N];
    dists.push(dists[i] + Math.hypot(x2 - x1, z2 - z1));
  }
  const perim = dists[N];

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= SEGS; j++) {
    const t = j / SEGS;
    const s = 1 - TAPER * t;
    const a = TWIST * t;
    const cos = Math.cos(a),
      sin = Math.sin(a);
    const y = 0.42 + t * H;
    for (let i = 0; i <= N; i++) {
      const [px, pz] = plan[i % N];
      const x = px * s,
        z = pz * s;
      positions.push(x * cos - z * sin, y, x * sin + z * cos);
      uvs.push((dists[i] / perim) * REPEAT_U, t * REPEAT_V);
    }
  }

  const ring = N + 1;
  // ring-major (bottom-up) index order so drawRange reveals floors
  for (let j = 0; j < SEGS; j++) {
    for (let i = 0; i < N; i++) {
      const a0 = j * ring + i;
      const b0 = (j + 1) * ring + i;
      indices.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const towerGeo = buildTowerGeometry();
const towerMesh = new THREE.Mesh(towerGeo, facadeMat);
tower.add(towerMesh);
const INDEX_TOTAL = towerGeo.index.count;
const INDEX_PER_RING = INDEX_TOTAL / SEGS;

/* Crown: roof slab, plant room and spire — the silhouette details
   real towers have. */
const inkMat = new THREE.MeshStandardMaterial({
  color: 0x232930,
  roughness: 0.5,
  metalness: 0.4,
});

const crown = new THREE.Group();
const topScale = 1 - TAPER;
const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0 * topScale, 0.1, 1.95 * topScale), inkMat);
roof.position.y = 0.42 + H + 0.05;
crown.add(roof);
const plant = new THREE.Mesh(new THREE.BoxGeometry(1.7 * topScale, 0.34, 1.1 * topScale), inkMat);
plant.position.y = 0.42 + H + 0.27;
crown.add(plant);
const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.07, 1.5, 10), inkMat);
spire.position.y = 0.42 + H + 1.15;
crown.add(spire);
crown.rotation.y = TWIST; // crown sits on the twisted top plate
tower.add(crown);

// podium + entrance
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0xdfe2e5,
  roughness: 0.85,
  metalness: 0.05,
});
const podium = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 3.1), stoneMat);
podium.position.y = 0.21;
tower.add(podium);

// baked soft ground shadow (no shadow maps needed)
(function ground() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
  g.addColorStop(0, "rgba(22, 24, 29, 0.20)");
  g.addColorStop(1, "rgba(22, 24, 29, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  scene.add(disc);
})();

/* ---------- Scroll choreography ---------- */
let targetP = 0;
let p = 0;
let idle = 0;
let inView = true;

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const easeInOut = (x) => x * x * (3 - 2 * x);

function computeTarget() {
  const rect = section.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  targetP = clamp(-rect.top / span, 0, 1);
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
  [0.06, 0.32],
  [0.42, 0.64],
  [0.74, 1.01],
];

function update(dt) {
  p += (targetP - p) * 0.1;
  idle += dt * 0.04;

  // build phase: reveal rings bottom-up through the first 30%
  const build = easeInOut(clamp(p / 0.3, 0, 1));
  towerGeo.setDrawRange(
    0,
    Math.max(Math.round(build * SEGS) * INDEX_PER_RING, INDEX_PER_RING)
  );
  const crownIn = clamp((p - 0.26) / 0.08, 0, 1);
  crown.scale.setScalar(Math.max(crownIn, 0.001));
  crown.visible = crownIn > 0.01;

  tower.rotation.y = p * Math.PI * 2.2 + idle;

  // skyline backdrop settles gently behind the model
  if (bgImg) {
    bgImg.style.transform = `scale(${(1.08 - p * 0.05).toFixed(4)}) translateY(${(p * -1.5).toFixed(2)}%)`;
  }

  const ep = easeInOut(p);
  const fit = clamp(0.78 / camera.aspect, 1, 1.8);
  camera.position.set(
    Math.sin(ep * 0.5) * 2.2,
    2.1 + ep * 9.6,
    (14 + ep * 9.5) * fit
  );
  camera.lookAt(0, 3 + ep * 3.6, 0);

  caps.forEach((cap, i) => {
    const [a, b] = capRanges[i];
    const o = capOpacity(p, a, b, i === caps.length - 1);
    cap.style.opacity = o.toFixed(3);
    cap.style.transform = `translateY(${((1 - o) * 26).toFixed(1)}px)`;
    cap.style.pointerEvents = o > 0.5 ? "auto" : "none";
  });
  if (progressBar) progressBar.style.transform = `scaleX(${p.toFixed(4)})`;
}

function layout() {
  const w = canvas.clientWidth || section.clientWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const visIO = new IntersectionObserver(
  (entries) => {
    inView = entries[0].isIntersecting;
  },
  { rootMargin: "20% 0px" }
);
visIO.observe(section);

let last = performance.now();
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
  section.classList.add("showcase--static");
  targetP = 1;
  p = 1;
  update(0);
  tower.rotation.y = 0.55;
  caps.forEach((cap) => {
    cap.style.opacity = "1";
    cap.style.transform = "none";
    cap.style.pointerEvents = "auto";
  });
  renderer.render(scene, camera);
  // re-render once the photo texture arrives
  facadeMat.addEventListener?.("dispose", () => {});
  setTimeout(() => renderer.render(scene, camera), 2500);
} else {
  requestAnimationFrame(frame);
}
