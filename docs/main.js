import * as THREE from 'three';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Mobile/tablets: lower pixel ratio to improve performance
const isCoarsePointer = (function() {
  try {
    return (window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches));
  } catch (_) { return false; }
})();
if (isCoarsePointer) {
  renderer.setPixelRatio(1);
}
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);
renderer.shadowMap.enabled = false;

// Page loader overlay (fade out after first render)
const pageLoader = document.getElementById('page-loader');
let pageLoaderHidden = false;

// Aggressive preloader for the carousel assets
const CAROUSEL_ASSETS = [
  './Windsurf carrousel/index.html',
  './Windsurf carrousel/BLENDER_Template.glb',
  './Windsurf carrousel/COMP VIDEO.mp4'
];
function preloadCarouselAssets() {
  try {
    if (window.caches && window.location.protocol.startsWith('http')) {
      return caches.open('carousel-preload-v1').then(cache => cache.addAll(CAROUSEL_ASSETS)).catch(() => {
        return Promise.all(CAROUSEL_ASSETS.map(u => fetch(u, { cache: 'force-cache' }).catch(() => {})));
      });
    }
    return Promise.all(CAROUSEL_ASSETS.map(u => fetch(u, { cache: 'force-cache' }).catch(() => {})));
  } catch (_) {
    return Promise.resolve();
  }
}
const carouselPreloadPromise = preloadCarouselAssets();

function navigateToCarouselAfterPreload() {
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  Promise.race([carouselPreloadPromise, timeout]).finally(() => {
    transitionNavigated = true;
    window.location.href = CAROUSEL_URL;
  });
}

// Visibility throttling (reduce work when tab is hidden)
let isDocHidden = document.hidden;
const HIDDEN_RENDER_INTERVAL_MS = 250; // ~4 FPS
let lastHiddenRender = 0;
document.addEventListener('visibilitychange', () => {
  isDocHidden = document.hidden;
});

// On-screen touch navigation buttons (mobile/tablet) - discrete tap impulses
const navTouchForward = document.getElementById('nav-touch-forward');
const navTouchBack = document.getElementById('nav-touch-back');
const navTouchGroup = document.querySelector('.nav-touch-group');

function addImpulse(dir) {
  // Tap adds a fixed velocity impulse similar to a short wheel flick
  const IMPULSE = 220; // tune step size
  const magnitude = IMPULSE;
  forwardVel += dir * magnitude * SCROLL_ACCEL;
  forwardVel = THREE.MathUtils.clamp(forwardVel, -MAX_VEL, MAX_VEL);
  lastScrollTime = performance.now();
}

function bindTap(el, dir) {
  if (!el) return;
  const fire = () => addImpulse(dir);
  el.addEventListener('click', fire, { passive: true });
  el.addEventListener('touchend', fire, { passive: true });
}

// Forward = move towards target (negative Z) => dir = -1
bindTap(navTouchForward, -1);
// Back = move away (positive Z) => dir = +1
bindTap(navTouchBack, +1);

// Fade-to-white overlay (DOM-based)
const fadeOverlay = document.createElement('div');
fadeOverlay.style.position = 'fixed';
fadeOverlay.style.inset = '0';
fadeOverlay.style.background = '#d6d6d6';
fadeOverlay.style.opacity = '0';
fadeOverlay.style.pointerEvents = 'none';
fadeOverlay.style.transition = 'opacity 0s linear'; // we animate manually in JS
app.appendChild(fadeOverlay);

let fadeActive = false;
let fadeProgress = 0; // 0..1
let transitionStarted = false;
let transitionNavigated = false;
const CAROUSEL_URL = './Windsurf%20carrousel/index.html';
let lockZPos = null; // freeze camera Z once inside the cube

// Custom cursor elements
const customCursor = document.getElementById('custom-cursor');
const cursorText = document.getElementById('cursor-text');
let idleTimer = null;
let isIdle = false;
let mmScheduled = false;
let lastMouseEvent = null;

// Logo refresh button
const logoBtn = document.getElementById('logo-btn');
if (logoBtn) {
  logoBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    window.location.reload();
  });
}

const scene = new THREE.Scene();
const sceneInitTime = performance.now?.() || Date.now();
scene.background = new THREE.Color(0x000000); // neutral background

// Read FOV from URL if present
function getNumberParam(name, def) {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    if (v === null) return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  } catch (_) { return def; }
}
const initialFov = getNumberParam('fov', 55);
const camera = new THREE.PerspectiveCamera(initialFov, window.innerWidth / window.innerHeight, 0.1, 2000);
const CAMERA_Y = 2; // fixed camera height
camera.position.set(0, CAMERA_Y, 15.5);
camera.rotation.order = 'YXZ';

const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 5);
scene.add(dir);

// === Grass demo integration (no bundler) ===
// Shaders (cleaned numeric literals to GLSL ES 1.00)
const GRASS_VERT = `
varying vec2 vUv;
varying vec2 vCloudUv;
varying vec3 vColor;
varying vec3 vNormal_ws;
varying vec3 vPos_ws;
uniform float iTime;

void main() {
  vUv = uv;
  vCloudUv = uv;
  vColor = color;
  vec3 cpos = position;

  float waveSize = 10.0;
  float tipDistance = 0.3;
  float centerDistance = 0.1;

  if (color.x > 0.6) {
    cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * tipDistance;
  } else if (color.x > 0.0) {
    cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * centerDistance;
  }

  vCloudUv.x += iTime / 20000.0;
  vCloudUv.y += iTime / 10000.0;

  // World-space normal and position for lighting/fog
  vec3 n = normalize(normalMatrix * normal);
  vNormal_ws = n;
  vec4 worldPos = modelMatrix * vec4(cpos, 1.0);
  vPos_ws = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const GRASS_FRAG = `
precision mediump float;
uniform sampler2D textures[4];
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec2 vUv;
varying vec2 vCloudUv;
varying vec3 vColor;
varying vec3 vNormal_ws;
varying vec3 vPos_ws;

vec3 ACESFilmicToneMapping(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main() {
  float contrast = 1.35;
  float brightness = 0.05;
  vec3 albedo = texture2D(textures[0], vUv).rgb * contrast + vec3(brightness);
  vec3 clouds = texture2D(textures[1], vCloudUv).rgb;
  albedo = mix(albedo, clouds, 0.10);

  vec3 N = normalize(vNormal_ws);
  vec3 V = normalize(uCameraPos - vPos_ws);
  vec3 L = normalize(uLightDir);
  float ndl = max(dot(N, L), 0.0);
  float wrap = max((ndl + 0.5) / 1.5, 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  float ambient = 0.25;
  float ao = mix(0.85, 1.0, clamp(vColor.x, 0.0, 1.0));

  vec3 lit = albedo * (ambient + 0.9*wrap) + 0.25*rim;
  lit *= ao;

  float dist = length(uCameraPos - vPos_ws);
  float fog = 1.0 - exp(-uFogDensity * dist);
  vec3 color = mix(lit, uFogColor, clamp(fog, 0.0, 1.0));

  color = ACESFilmicToneMapping(color);
  gl_FragColor = vec4(color, 1.0);
}
`;

// Parameters
const PLANE_SIZE = 30;
function getQualityFromURL() {
  try {
    const q = new URLSearchParams(window.location.search).get('quality');
    if (!q) return null;
    return q.toLowerCase();
  } catch (_) { return null; }
}
function bladeCountForQuality(q) {
  if (q === 'low') return 40000;
  if (q === 'high') return 80000;
  return 60000;
}
const urlQ = getQualityFromURL();
const defaultQ = (window.devicePixelRatio > 2) ? 'low' : 'medium';
const QUALITY = urlQ || defaultQ;
const BLADE_COUNT = bladeCountForQuality(QUALITY);
const BLADE_WIDTH = 0.1;
const BLADE_HEIGHT = 0.8;
const BLADE_HEIGHT_VARIATION = 0.6;

// Textures
const grassTex = new THREE.TextureLoader().load('./assets/grass.jpg');
const cloudTex = new THREE.TextureLoader().load('./assets/cloud.jpg');
cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(8, 8);
grassTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

// Uniforms and material
const grassTimeStart = Date.now();
const grassUniforms = {
  textures: { value: [grassTex, cloudTex] },
  iTime: { value: 0.0 },
  uCameraPos: { value: new THREE.Vector3() },
  uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.2).normalize() },
  uFogColor: { value: new THREE.Color(0x000000) },
  uFogDensity: { value: 0.08 }
};

const grassMaterial = new THREE.ShaderMaterial({
  uniforms: grassUniforms,
  vertexShader: GRASS_VERT,
  fragmentShader: GRASS_FRAG,
  vertexColors: true,
  side: THREE.DoubleSide
});

function convertRange(val, oldMin, oldMax, newMin, newMax) {
  return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}

function generateBlade(center, vArrOffset, uv) {
  const MID_WIDTH = BLADE_WIDTH * 0.5;
  const TIP_OFFSET = 0.1;
  const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);

  const yaw = Math.random() * Math.PI * 2;
  const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  const tipBend = Math.random() * Math.PI * 2;
  const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

  const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
  const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
  const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
  const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
  const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

  tl.y += height / 2;
  tr.y += height / 2;
  tc.y += height;

  const black = [0, 0, 0];
  const gray = [0.5, 0.5, 0.5];
  const white = [1.0, 1.0, 1.0];

  const verts = [
    { pos: bl.toArray(), uv: uv, color: black },
    { pos: br.toArray(), uv: uv, color: black },
    { pos: tr.toArray(), uv: uv, color: gray },
    { pos: tl.toArray(), uv: uv, color: gray },
    { pos: tc.toArray(), uv: uv, color: white }
  ];

  const indices = [
    vArrOffset,
    vArrOffset + 1,
    vArrOffset + 2,
    vArrOffset + 2,
    vArrOffset + 4,
    vArrOffset + 3,
    vArrOffset + 3,
    vArrOffset,
    vArrOffset + 2
  ];

  return { verts, indices };
}

function generateField() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const colors = [];

  for (let i = 0; i < BLADE_COUNT; i++) {
    const VERTEX_COUNT = 5;
    const surfaceMin = PLANE_SIZE / 2 * -1;
    const surfaceMax = PLANE_SIZE / 2;
    const radius = PLANE_SIZE / 2;

    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    const pos = new THREE.Vector3(x, 0, y);
    const uv = [convertRange(pos.x, surfaceMin, surfaceMax, 0, 1), convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];

    const blade = generateBlade(pos, i * VERTEX_COUNT, uv);
    blade.verts.forEach(vert => {
      positions.push(...vert.pos);
      uvs.push(...vert.uv);
      colors.push(...vert.color);
    });
    blade.indices.forEach(indice => indices.push(indice));
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();

  const grassMesh = new THREE.Mesh(geom, grassMaterial);
  scene.add(grassMesh);
}

generateField();

// Grass-textured ground plane
const groundGeom = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({ 
  map: grassTex,
  roughness: 0.8,
  metalness: 0.0
});
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2; // lay flat on XZ
ground.position.y = 0;
scene.add(ground);

// Single cube marker (height 2), no reflections
const markerGeom = new THREE.BoxGeometry(2, 2.5, 1);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xD7D7D7 });
const marker = new THREE.Mesh(markerGeom, markerMat);
marker.position.set(0, 2, -6.8046650777026265);
scene.add(marker);

// Diffuse glow using a soft sprite (radial gradient) for a more spread-out effect
// Keep the previous mesh glow disabled to avoid hard edges
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
const markerGlow = new THREE.Mesh(markerGeom.clone(), glowMat);
markerGlow.visible = false;

function createGlowSprite(sizePx = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  const r = sizePx / 2;
  const grd = ctx.createRadialGradient(r, r, 0, r, r, r);
  // White center fading to transparent edge for additive bloom-like effect
  grd.addColorStop(0.0, 'rgba(255,255,255,0.45)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });
  const spr = new THREE.Sprite(mat);
  return spr;
}

const markerGlowSprite = createGlowSprite();
markerGlowSprite.position.copy(marker.position);
// Scale sprite so it diffuses beyond the box; tweak as desired
markerGlowSprite.scale.set(4.0, 4.0, 1.0);
scene.add(markerGlowSprite);

let mouseX = 0;
let mouseY = 0;
let yaw = 0;
let pitch = 0;
let mouseUpdateScheduled = false;
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_ANGLE = prefersReduced ? 0 : Math.PI * 0.07; // disable sway if reduced motion
const ROT_DAMP = 0.12;
let forwardVel = 0; // units per second along camera forward
const SCROLL_ACCEL = 0.003; // acceleration per wheel delta (boosted)
const MAX_VEL = 50; // clamp velocity (higher top speed)
const VEL_DAMP = 1; // per-frame damping base (will be made frame-rate independent)
let lastScrollTime = 0; // ms timestamp of last wheel input
const INACTIVITY_DELAY_MS = 300; // delay before braking starts
const BRAKE_DAMP = .95; // stronger damping used after inactivity delay
const MIN_Z = marker.position.z - 5; // allow passing well beyond the cube
const MAX_Z = 14.993426305035111; // camera must not go beyond this (more positive)
const TARGET_Z = -5.508294579027191; // exact stop Z requested

window.addEventListener('mousemove', (e) => {
  lastMouseEvent = e;
  if (mmScheduled) return;
  mmScheduled = true;
  requestAnimationFrame(() => {
    mmScheduled = false;
    const ev = lastMouseEvent;
    if (!ev) return;
    mouseX = (ev.clientX / window.innerWidth) * 2 - 1;
    mouseY = (ev.clientY / window.innerHeight) * 2 - 1;

    if (customCursor) {
      customCursor.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
    }
    if (cursorText && !cursorText.classList.contains('hidden')) {
      cursorText.classList.add('hidden');
      isIdle = false;
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (cursorText && !transitionStarted) {
        cursorText.classList.remove('hidden');
        isIdle = true;
      }
    }, 200);
  });
}, { passive: true });

// Touch controls for mobile/tablets: emulate scroll movement
let touchY = null;
let lastTouchTime = 0;
window.addEventListener('touchstart', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  touchY = e.touches[0].clientY;
  lastTouchTime = performance.now();
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!e.touches || e.touches.length === 0 || touchY === null) return;
  const y = e.touches[0].clientY;
  const deltaY = touchY - y; // swipe up => positive (move forward)
  // Map touch delta to wheel-like behavior
  const magnitude = Math.abs(deltaY);
  const dir = deltaY < 0 ? -1 : (deltaY > 0 ? 1 : 0);
  forwardVel += dir * magnitude * SCROLL_ACCEL * 0.6; // slightly softer than wheel
  forwardVel = THREE.MathUtils.clamp(forwardVel, -MAX_VEL, MAX_VEL);
  lastScrollTime = performance.now();
  lastTouchTime = lastScrollTime;
  touchY = y;
}, { passive: true });

window.addEventListener('touchend', () => {
  touchY = null;
}, { passive: true });

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 100);
});

// Settings panel wiring
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const qualitySelect = document.getElementById('quality-select');
const fovRange = document.getElementById('fov-range');
const fovValue = document.getElementById('fov-value');

function setURLParams(updates, reload=false) {
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([k,v]) => {
    if (v === null || v === undefined) url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  if (reload) {
    window.location.href = url.toString();
  } else {
    window.history.replaceState({}, '', url.toString());
  }
}

if (settingsToggle && settingsPanel) {
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });
}
if (qualitySelect) {
  qualitySelect.value = QUALITY; // from quality toggle block above
  qualitySelect.addEventListener('change', () => {
    setURLParams({ quality: qualitySelect.value }, true);
  });
}
if (fovRange && fovValue) {
  fovRange.value = String(initialFov);
  fovValue.textContent = String(initialFov);
  fovRange.addEventListener('input', () => {
    const f = Number(fovRange.value);
    fovValue.textContent = String(f);
    camera.fov = f;
    camera.updateProjectionMatrix();
    setURLParams({ fov: f }, false);
  });
}

window.addEventListener('wheel', (e) => {
  // Hide hint on scroll
  if (cursorText) {
    cursorText.classList.add('hidden');
  }
  if (transitionStarted) return; // ignore input during transition
  const dir = e.deltaY < 0 ? -1 : (e.deltaY > 0 ? 1 : 0); // up => -Z, down => +Z (inverted)
  const magnitude = Math.abs(e.deltaY);
  forwardVel += dir * magnitude * SCROLL_ACCEL;
  forwardVel = THREE.MathUtils.clamp(forwardVel, -MAX_VEL, MAX_VEL);
  lastScrollTime = performance.now();
}, { passive: true });

const clock = new THREE.Clock();

function animate() {
  // If hidden, throttle rendering frequency and skip heavy updates
  if (isDocHidden) {
    const now = performance.now();
    if (now - lastHiddenRender < HIDDEN_RENDER_INTERVAL_MS) {
      requestAnimationFrame(animate);
      return;
    }
    lastHiddenRender = now;
  }

  const dt = Math.min(clock.getDelta(), 0.05);
  // update grass time uniform (ms since integration start)
  if (!isDocHidden) {
    grassUniforms.iTime.value = Date.now() - grassTimeStart;
    grassUniforms.uCameraPos.value.copy(camera.position);
  }
  // No hold-to-move; movement occurs via discrete tap impulses or wheel/swipe
  // pulse diffuse sprite glow subtly and keep it centered on marker
  if (markerGlowSprite && markerGlowSprite.visible) {
    const t = (Date.now() - grassTimeStart) * 0.002; // seconds * 2
    const base = 0.35;
    const amp = 0.12;
    const opacity = base + amp * Math.sin(t);
    markerGlowSprite.material.opacity = opacity;
    markerGlowSprite.position.copy(marker.position);
  }

  // If transition already started, enforce hard stop immediately at frame start
  if (transitionStarted) {
    if (lockZPos === null) lockZPos = TARGET_Z;
    camera.position.z = lockZPos;
    forwardVel = 0;
  }

  const targetYaw = -mouseX * MAX_ANGLE; // inverser gauche/droite
  const targetPitch = -mouseY * MAX_ANGLE;

  if (!transitionStarted) {
    yaw += (targetYaw - yaw) * ROT_DAMP;
    pitch += (targetPitch - pitch) * ROT_DAMP;

    yaw = THREE.MathUtils.clamp(yaw, -MAX_ANGLE, MAX_ANGLE);
    pitch = THREE.MathUtils.clamp(pitch, -MAX_ANGLE, MAX_ANGLE);

    camera.rotation.set(pitch, yaw, 0);
  }

  // Predict reaching the exact target Z before moving; trigger fade and lock at TARGET_Z
  if (!transitionStarted) {
    const predictedZ = camera.position.z + forwardVel * dt * 3;
    if (forwardVel < 0 && predictedZ <= TARGET_Z) {
      transitionStarted = true;
      forwardVel = 0;
      lockZPos = TARGET_Z;
      camera.position.z = TARGET_Z;
      marker.visible = false;
      if (markerGlow) markerGlow.visible = false;
      if (markerGlowSprite) markerGlowSprite.visible = false;
      // Show white immediately, then navigate to carousel
      try { sessionStorage.setItem('fromIndex', '1'); } catch (_) {}
      fadeOverlay.style.opacity = '1';
      navigateToCarouselAfterPreload();
    }
  }

  // Move only along Z axis (keep X fixed to 0 and Y fixed to CAMERA_Y)
  if (transitionStarted && lockZPos !== null) {
    camera.position.z = lockZPos;
  } else {
    camera.position.z += forwardVel * dt * 3;
    // Clamp Z so we do not go past MIN_Z
    if (camera.position.z < MIN_Z) {
      camera.position.z = MIN_Z;
      if (forwardVel < 0) forwardVel = 0; // stop pushing into the boundary
    }
    // Clamp Z so we do not go past MAX_Z
    if (camera.position.z > MAX_Z) {
      camera.position.z = MAX_Z;
      if (forwardVel > 0) forwardVel = 0; // stop pushing into the boundary
    }
  }
  camera.position.x = 0;
  camera.position.y = CAMERA_Y;

  // Safety: if we have reached/passed TARGET_Z (regardless of velocity), trigger now
  if (!transitionStarted) {
    if (camera.position.z <= TARGET_Z) {
      transitionStarted = true;
      forwardVel = 0;
      lockZPos = TARGET_Z;
      camera.position.z = TARGET_Z;
      marker.visible = false;
      if (markerGlow) markerGlow.visible = false;
      // Show white immediately, then navigate to carousel
      try { sessionStorage.setItem('fromIndex', '1'); } catch (_) {}
      fadeOverlay.style.opacity = '1';
      navigateToCarouselAfterPreload();
    }
  }

  // No progressive fade here; we navigate immediately after forcing white

  // frame-rate independent damping
  const now = performance.now();
  const inactive = (now - lastScrollTime) > INACTIVITY_DELAY_MS;
  const base = inactive ? BRAKE_DAMP : VEL_DAMP;
  const damping = Math.pow(base, dt * 60);
  forwardVel *= damping;
  if (Math.abs(forwardVel) < 0.001) forwardVel = 0;

  renderer.render(scene, camera);

  // Hide page loader after first render
  if (!pageLoaderHidden && pageLoader) {
    pageLoader.classList.add('hide');
    setTimeout(() => {
      if (pageLoader && pageLoader.parentElement) pageLoader.remove();
    }, 350);
    pageLoaderHidden = true;
  }

  requestAnimationFrame(animate);
}

animate();
