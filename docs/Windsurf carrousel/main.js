import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Debug mode - set to false in production
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};

log('🚀 main.js chargé - Version avec fix scroll modal');

// If this page was reloaded (F5/Ctrl+R), go back to the portfolio root
try {
  const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
  const nav = navEntries && navEntries[0];
  if (nav && nav.type === 'reload') {
    window.location.replace('../index.html');
  }
} catch (_) {
  // no-op
}

// Startup white overlay element (fades OUT to reveal the scene)
const startupOverlay = document.getElementById('fade-overlay');
let startupOverlayOpacity = 1;
let overlayDismissed = false;

// Loading overlay spinner control
const loadingOverlay = document.getElementById('loading-overlay');
let modelReady = false;
let videoReady = false;
function maybeHideLoadingOverlay() {
  if (loadingOverlay && modelReady && videoReady) {
    loadingOverlay.remove();
  }
}

// Reduced motion support
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Visibility throttling (reduce work when tab is hidden to save resources)
let isDocHidden = document.hidden;
const HIDDEN_RENDER_INTERVAL_MS = 250; // Render at ~4 FPS when tab is hidden
let lastHiddenRender = 0;
document.addEventListener('visibilitychange', () => {
  isDocHidden = document.hidden;
});

// Touch gestures (swipe navigation and pinch-to-zoom on mobile)
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touching = false;
let initialPinchDistance = 0;
const SWIPE_THRESHOLD = 40; // Minimum distance in pixels to trigger a swipe
const PINCH_SENSITIVITY = 0.002; // Sensitivity for pinch-to-zoom

window.addEventListener('touchstart', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  
  // Single touch: swipe navigation
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchStartX = touchEndX = t.clientX;
    touchStartY = touchEndY = t.clientY;
    touching = true;
  }
  
  // Two fingers: pinch-to-zoom
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
  }
}, { passive: true });

// Touch zoom buttons (mobile/tablet): press-and-hold to adjust cameraProgress
const zoomTouchInBtn = document.getElementById('zoom-touch-in');
const zoomTouchOutBtn = document.getElementById('zoom-touch-out');
let holdZoomIn = false;
let holdZoomOut = false;

function bindZoomHold(el, dir) {
  if (!el) return;
  const onDown = () => { if (dir > 0) holdZoomIn = true; else holdZoomOut = true; };
  const onUp = () => { if (dir > 0) holdZoomIn = false; else holdZoomOut = false; };
  el.addEventListener('touchstart', onDown, { passive: true });
  el.addEventListener('touchend', onUp, { passive: true });
  el.addEventListener('touchcancel', onUp, { passive: true });
  el.addEventListener('pointerdown', onDown, { passive: true });
  el.addEventListener('pointerup', onUp, { passive: true });
  el.addEventListener('pointercancel', onUp, { passive: true });
  el.addEventListener('mousedown', onDown, { passive: true });
  el.addEventListener('mouseup', onUp, { passive: true });
  el.addEventListener('mouseleave', onUp, { passive: true });
}

bindZoomHold(zoomTouchInBtn, +1);
bindZoomHold(zoomTouchOutBtn, -1);

window.addEventListener('touchmove', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  
  // Single touch: track swipe
  if (e.touches.length === 1 && touching) {
    const t = e.touches[0];
    touchEndX = t.clientX;
    touchEndY = t.clientY;
  }
  
  // Two fingers: pinch-to-zoom
  if (e.touches.length === 2 && initialPinchDistance > 0) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const delta = distance - initialPinchDistance;
    
    // Update camera zoom based on pinch gesture
    cameraProgress += delta * PINCH_SENSITIVITY;
    cameraProgress = Math.max(0, Math.min(1, cameraProgress));
    
    initialPinchDistance = distance;
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  if (!touching) return;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  touching = false;
  initialPinchDistance = 0;
  
  // Horizontal swipe to navigate items
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    if (dx < 0) {
      // swipe left -> next
      const nextIndex = (currentIndex + 1) % itemCount;
      rotateToIndex(nextIndex);
    } else {
      // swipe right -> prev
      const prevIndex = (currentIndex - 1 + itemCount) % itemCount;
      rotateToIndex(prevIndex);
    }
  }
}, { passive: true });

// Logo refresh button
const logoBtn = document.getElementById('logo-btn');
if (logoBtn) {
  logoBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    window.location.reload();
  });
}

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a1a2e, 8, 15);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 25); // Start far away from the carousel
camera.lookAt(0, 0, 0);

// Camera animation state
let cameraProgress = 0;    // Progress of zoom animation: 0 = far away, 1 = fully zoomed in
const cameraStartZ = 25;   // Initial camera distance (far)
const cameraEndZ = 10;     // Final camera distance (close to carousel)
let hasScrolled = false;   // Track if user has started scrolling

// Renderer
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xD7D7D7);
document.body.appendChild(renderer.domElement);

// Background video
const video = document.createElement('video');
video.src = './COMP VIDEO.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.autoplay = true;
video.crossOrigin = 'anonymous';
video.preload = 'auto';

// Video event listeners
video.addEventListener('loadeddata', () => {
  // Video loaded successfully
});

video.addEventListener('error', (e) => {
  console.error('Video loading error:', e);
  // Fallback: use solid color background
  scene.background = new THREE.Color(0x1a1a2e);
  videoReady = true;
  maybeHideLoadingOverlay();
});

video.addEventListener('canplay', () => {
  video.play().catch(err => {
    console.error('Play error:', err);
  });
});

// Force reload video
video.load();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;
videoTexture.format = THREE.RGBAFormat;
videoTexture.colorSpace = THREE.SRGBColorSpace;

const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
const backgroundMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: videoTexture },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uVideoResolution: { value: new THREE.Vector2(1920, 1080) } // Ajustez selon la résolution de votre vidéo
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform vec2 uVideoResolution;
    varying vec2 vUv;
    
    void main() {
      // Calculate aspect ratios
      float screenAspect = uResolution.x / uResolution.y;
      float videoAspect = uVideoResolution.x / uVideoResolution.y;
      
      // Cover mode - make video cover entire screen
      vec2 uv = vUv;
      if (screenAspect > videoAspect) {
        // Screen is wider than video
        float scale = screenAspect / videoAspect;
        uv.y = (uv.y - 0.5) / scale + 0.5;
      } else {
        // Screen is taller than video
        float scale = videoAspect / screenAspect;
        uv.x = (uv.x - 0.5) / scale + 0.5;
      }
      
      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = color;
    }
  `,
  depthWrite: false,
  depthTest: false
});

const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundMesh.frustumCulled = false;

// Créer une scène séparée pour le fond
const backgroundScene = new THREE.Scene();
backgroundScene.add(backgroundMesh);

// Caméra orthographique pour le fond
const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Lights (optimized)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = false;
scene.add(directionalLight);

// Lumière blanche au-dessus de la caméra pour éclairer les éléments 3D
const topLight = new THREE.SpotLight(0xffffff, 25);
topLight.position.set(0, 15, 10);
topLight.target.position.set(0, 0, 0);
topLight.angle = Math.PI / 3;
topLight.penumbra = 0.3;
topLight.decay = 1;
topLight.distance = 50;
topLight.castShadow = false;
scene.add(topLight);
scene.add(topLight.target);

// Carousel configuration
const carouselRadius = 8;  // Radius of the circular carousel (in Three.js units)
const itemCount = 6;       // Number of projects to display in the carousel
const carouselItems = [];  // Array to store all carousel item meshes

// Initial rotations per item in degrees (x, y, z)
const initialRotationsDeg = [
  { x: 90, y: 5,  z: -3 },   // item 1
  { x: 90, y: 5,  z: -65 },  // item 2
  { x: 93, y: 5,  z: -120 }, // item 3
  { x: 90, y: -3, z: -174 }, // item 4
  { x: 90, y: -6, z: 120 },  // item 5
  { x: 90, y: -6, z: 68 }    // item 6
];

// Create a group for all carousel items
const carouselGroup = new THREE.Group();
scene.add(carouselGroup);

// Colors for the carousel items
const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];

// Optional: per-item textures for the model materials (one texture per carousel slot)
// Provide your own list; defaults use existing files in ./Textures/
let itemTexturePaths = [
  // Noms réels trouvés dans le dossier Textures/
  './Textures/Polaroid_Frame_Template_UV_1.jpg',
  './Textures/Polaroid_Frame_Template_UV_2.jpg',
  './Textures/Polaroid_Frame_Template_UV_3.jpg',
  './Textures/Polaroid_Frame_Template_UV_4.jpg',
  './Textures/Polaroid_Frame_Template_UV_5.jpg',
  './Textures/Polaroid_Frame_Template_UV_6.jpg',
];

// Trie par numéro de slot indiqué en fin de nom de fichier (avant l'extension)
function extractTrailingNumber(path) {
  const base = path.split('/').pop() || path;
  // capture les chiffres avant extension optionnelle (supporte aussi un nom se terminant par chiffres sans point)
  // exemples: name_12.webp -> 12, name-6webp -> 6, name 3 -> 3
  const m = base.match(/(?:_|-|\s)(\d+)(?:\.[a-zA-Z0-9]+)?$/);
  return m ? parseInt(m[1], 10) : NaN;
}

itemTexturePaths = itemTexturePaths.slice().sort((a, b) => {
  const na = extractTrailingNumber(a);
  const nb = extractTrailingNumber(b);
  if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
  if (Number.isNaN(na)) return 1;
  if (Number.isNaN(nb)) return -1;
  return na - nb;
});

const textureLoader = new THREE.TextureLoader();
const TEX_BUSTER = DEBUG ? `?t=${Date.now()}` : '';
const itemTextures = itemTexturePaths.map((path) => {
  const tex = textureLoader.load(path + TEX_BUSTER);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  // glTF-compatible orientation
  tex.flipY = false;
  return tex;
});

// Shared normal map applied to all items
const sharedNormalMap = textureLoader.load('./Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png' + TEX_BUSTER);
// normal maps should not be in sRGB; keep default color space
sharedNormalMap.flipY = false;

/**
 * Applies realistic lighting effects to a Three.js material
 * Adds rim lighting and ACES filmic tone mapping for better visuals
 * @param {THREE.Material} mat - The material to enhance
 * @returns {void}
 */
function applyRealismToMaterial(mat) {
  if (!mat || !mat.onBeforeCompile) return;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n\n// ACES approx (Krzysztof Narkowicz)\nvec3 ACESFilmicToneMapping(vec3 x){\n  float a=2.51; float b=0.03; float c=2.43; float d=0.59; float e=0.14;\n  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);\n}\n`)
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `\n  // View-space rim light using geometryNormal and vViewPosition\n  float rim = pow(1.0 - saturate(dot(normalize(geometryNormal), normalize(-vViewPosition))), 2.0);\n  vec3 colorOut = outgoingLight + 0.25*rim;\n  colorOut = ACESFilmicToneMapping(colorOut);\n  gl_FragColor = vec4(colorOut, diffuseColor.a);\n`);
  };
  // Ensure recompilation
  mat.needsUpdate = true;
}

// GLTF Loader
const loader = new GLTFLoader();
let modelTemplate = null;
let modelsLoaded = 0;

// Load the GLTF model
loader.load(
  './BLENDER_Template_1.glb',
  (gltf) => {
    modelTemplate = gltf.scene;
    
    // Create carousel items with the loaded model
    for (let i = 0; i < itemCount; i++) {
      const angle = (i / itemCount) * Math.PI * 2;
      
      // Clone the model for each carousel item
      const model = modelTemplate.clone();
      
      // Clone materials to make them independent for each instance
      const meshes = [];
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 1;
          child.castShadow = false;
          child.receiveShadow = false;
          
          // Assign per-item texture regardless of existing map and optimize
          const perItemTex = itemTextures[(i % itemTextures.length)];
          if (perItemTex) {
            child.material.map = perItemTex;
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            child.material.map.magFilter = THREE.LinearFilter;
            child.material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            child.material.map.generateMipmaps = true;
          }
          // Apply shared normal map to enhance shading
          if (sharedNormalMap) {
            child.material.normalMap = sharedNormalMap;
            // typical default strength; adjust if needed
            if (!child.material.normalScale) {
              child.material.normalScale = new THREE.Vector2(1, 1);
            }
          }
          child.material.needsUpdate = true;
          
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
          }
          
          applyRealismToMaterial(child.material);
          meshes.push(child);
        }
      });
      
      // Position items in a horizontal circle
      model.position.x = Math.sin(angle) * carouselRadius;
      model.position.z = Math.cos(angle) * carouselRadius;
      model.position.y = 0;
      
      // Apply initial rotation per item (degrees -> radians)
      const rot = initialRotationsDeg[i % initialRotationsDeg.length];
      model.rotation.set(
        THREE.MathUtils.degToRad(rot.x),
        THREE.MathUtils.degToRad(rot.y),
        THREE.MathUtils.degToRad(rot.z),
        'XYZ'
      );
      
      // Scale up by 2
      model.scale.set(2, 2, 2);
      
      model.userData.originalIndex = i;
      model.userData.baseAngle = angle;
      model.userData.baseScale = 2; // Store base scale
      model.userData.meshes = meshes;
      
      carouselGroup.add(model);
      carouselItems.push(model);
      
      modelsLoaded++;
    }
    modelReady = true;
    maybeHideLoadingOverlay();
  },
  (progress) => {
    modelsLoaded++;
  },
  undefined,
  (error) => {
    console.error('Error loading GLTF:', error);
    // Fallback: create simple boxes if model fails to load
    createFallbackBoxes();
    modelReady = true;
    maybeHideLoadingOverlay();
  }
);

/**
 * Creates simple colored boxes as fallback if 3D model fails to load
 * Ensures the carousel still works even if the GLB file is unavailable
 * @returns {void}
 */
function createFallbackBoxes() {
  for (let i = 0; i < itemCount; i++) {
    const angle = (i / itemCount) * Math.PI * 2;
    
    const geometry = new THREE.BoxGeometry(2, 2.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 1
    });
    // Apply per-item texture if available
    const perItemTex = itemTextures[(i % itemTextures.length)];
    if (perItemTex) {
      material.map = perItemTex;
    }
    if (sharedNormalMap) {
      material.normalMap = sharedNormalMap;
      if (!material.normalScale) {
        material.normalScale = new THREE.Vector2(1, 1);
      }
    }
    material.needsUpdate = true;
    applyRealismToMaterial(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    
    mesh.position.x = Math.sin(angle) * carouselRadius;
    mesh.position.z = Math.cos(angle) * carouselRadius;
    mesh.position.y = 0;
    
    // Apply initial rotation per item (degrees -> radians)
    const rot = initialRotationsDeg[i % initialRotationsDeg.length];
    mesh.rotation.set(
      THREE.MathUtils.degToRad(rot.x),
      THREE.MathUtils.degToRad(rot.y),
      THREE.MathUtils.degToRad(rot.z),
      'XYZ'
    );
    
    // Scale up by 2
    mesh.scale.set(2, 2, 2);
    
    mesh.userData.originalIndex = i;
    mesh.userData.baseAngle = angle;
    mesh.userData.baseScale = 2; // Store base scale
    mesh.userData.meshes = [mesh];
    
    carouselGroup.add(mesh);
    carouselItems.push(mesh);
  }
}

// Carousel state
let currentIndex = 0;
let targetRotation = 0;
let currentRotation = 0;

// Mouse drag controls for rotating items
let isDragging = false;
let isDraggingItem = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationVelocity = 0;
let manualRotation = 0;
let selectedItem = null;
let controlsEnabled = true; // Flag to enable/disable controls

// Handle window resize with debouncing
const RESIZE_DEBOUNCE_MS = 100; // Delay before applying resize to avoid performance issues
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const MAX_PIXEL_RATIO = 2; // Cap pixel ratio to avoid performance issues on high-DPI screens
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    backgroundMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    
    // Update video resolution if video is loaded
    if (video.videoWidth && video.videoHeight) {
      backgroundMaterial.uniforms.uVideoResolution.value.set(video.videoWidth, video.videoHeight);
    }
  }, RESIZE_DEBOUNCE_MS);
});

// Custom cursor management
const customCursor = document.getElementById('custom-cursor');
const cursorText = document.getElementById('cursor-text');
const CURSOR_IDLE_DELAY_MS = 200; // Show "scroll" text after 200ms of inactivity
let idleTimer = null;
let isIdle = false;
// Track cursor scale and last position to compose translate + scale without conflicts
let cursorScale = 1;
let lastMouseX = 0;
let lastMouseY = 0;

function applyCursorTransform() {
  if (customCursor) {
    const inv = cursorScale || 1;
    customCursor.style.transform = `translate(${lastMouseX / inv}px, ${lastMouseY / inv}px) scale(${cursorScale})`;
    customCursor.style.transformOrigin = 'center center';
  }
}

// Update cursor position with transform for better performance
window.addEventListener('mousemove', (e) => {
  if (customCursor) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    applyCursorTransform();
  }
  
  // User is moving, hide text
  if (cursorText && !cursorText.classList.contains('hidden')) {
    cursorText.classList.add('hidden');
    isIdle = false;
  }
  
  // Reset idle timer
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    // Show "scroll" text after inactivity
    if (cursorText && cameraProgress < 1) {
      cursorText.classList.remove('hidden');
      isIdle = true;
    }
  }, CURSOR_IDLE_DELAY_MS);
}, { passive: true });

// Shrink cursor while mouse button is pressed
window.addEventListener('mousedown', () => {
  cursorScale = 0.5;
  applyCursorTransform();
});

window.addEventListener('mouseup', () => {
  cursorScale = 1;
  applyCursorTransform();
});

// Handle scroll to zoom camera
let lastWheelTime = 0;
const WHEEL_THROTTLE_MS = 50;
window.addEventListener('wheel', (event) => {
  log('Wheel event detected - controlsEnabled:', controlsEnabled, 'isMouseOverModal:', isMouseOverModal);
  
  // Désactiver le scroll de la caméra si la modal est ouverte ou si la souris est sur la modal
  if (!controlsEnabled || isMouseOverModal) {
    log('❌ Scroll bloqué');
    return;
  }
  
  const now = performance.now();
  if (now - lastWheelTime < WHEEL_THROTTLE_MS) {
    return;
  }
  lastWheelTime = now;
  
  log('✅ Scroll autorisé - deltaY:', event.deltaY);
  
  if (!hasScrolled) {
    hasScrolled = true;
  }
  
  // Hide cursor text when scrolling
  if (cursorText) {
    cursorText.classList.add('hidden');
  }
  
  // Decrease progress on scroll (zoom out)
  if (event.deltaY > 0) {
    cameraProgress = Math.max(cameraProgress - 0.12, 0);
  } else {
    // Allow scrolling back in
    cameraProgress = Math.min(cameraProgress + 0.12, 1);
  }
  
  log('New cameraProgress:', cameraProgress);
  
  // Permanently hide text once fully zoomed in
  if (cameraProgress >= 1 && cursorText) {
    cursorText.style.display = 'none';
  }
}, { passive: true });

// Fade out the startup overlay on scroll interaction
window.addEventListener('wheel', (event) => {
  if (!startupOverlay || overlayDismissed) return;
  const amount = Math.min(0.3, Math.abs(event.deltaY) / 2000); // require more scroll to clear
  startupOverlayOpacity = Math.max(0, startupOverlayOpacity - amount);
  startupOverlay.style.opacity = String(startupOverlayOpacity);
  if (startupOverlayOpacity === 0) {
    overlayDismissed = true;
    startupOverlay.remove();
  }
}, { passive: true });

// Update video resolution when video metadata is loaded
video.addEventListener('loadedmetadata', () => {
  backgroundMaterial.uniforms.uVideoResolution.value.set(video.videoWidth, video.videoHeight);
});

// Consider video ready once it can play
video.addEventListener('canplay', () => {
  videoReady = true;
  maybeHideLoadingOverlay();
});

/**
 * Rotates the carousel to display the project at the specified index
 * Calculates the shortest rotation path for smooth animation
 * @param {number} index - Index of the project to display (0-5)
 * @returns {void}
 * @example
 * rotateToIndex(2); // Displays project 3
 */
function rotateToIndex(index) {
  const oldIndex = currentIndex;
  currentIndex = index;
  
  // Calculate the shortest rotation direction
  let indexDiff = index - oldIndex;
  
  // Normalize the difference to be between -itemCount/2 and itemCount/2
  if (indexDiff > itemCount / 2) {
    indexDiff -= itemCount;
  } else if (indexDiff < -itemCount / 2) {
    indexDiff += itemCount;
  }
  
  // Add the rotation difference instead of setting absolute rotation
  targetRotation += -(indexDiff / itemCount) * Math.PI * 2;
}

// Keyboard navigation + Enter/Space action
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') {
    const nextIndex = (currentIndex + 1) % itemCount;
    rotateToIndex(nextIndex);
  } else if (event.key === 'ArrowLeft') {
    const prevIndex = (currentIndex - 1 + itemCount) % itemCount;
    rotateToIndex(prevIndex);
  } else if (event.key === 'Enter' || event.key === ' ') {
    if (actionButton) actionButton.click();
  }
});

// Navigation arrows click handlers
document.getElementById('nav-left').addEventListener('click', () => {
  const prevIndex = (currentIndex - 1 + itemCount) % itemCount;
  rotateToIndex(prevIndex);
});

document.getElementById('nav-right').addEventListener('click', () => {
  const nextIndex = (currentIndex + 1) % itemCount;
  rotateToIndex(nextIndex);
});

// Touch prev/next buttons (mobile/tablet)
const touchPrev = document.getElementById('touch-prev');
const touchNext = document.getElementById('touch-next');
if (touchPrev) {
  const goPrev = () => {
    const prevIndex = (currentIndex - 1 + itemCount) % itemCount;
    rotateToIndex(prevIndex);
  };
  touchPrev.addEventListener('click', goPrev, { passive: true });
  touchPrev.addEventListener('touchend', goPrev, { passive: true });
}
if (touchNext) {
  const goNext = () => {
    const nextIndex = (currentIndex + 1) % itemCount;
    rotateToIndex(nextIndex);
  };
  touchNext.addEventListener('click', goNext, { passive: true });
  touchNext.addEventListener('touchend', goNext, { passive: true });
}

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// Track if mouse is over modal
let isMouseOverModal = false;

// YouTube video IDs for each project (replace with your own video IDs)
const projectVideos = [
  'cv',  // Projet 1 - CV mode (ancien Projet 6)
  'T1v0eDGNcOg', // Projet 2 (ancien Projet 1)
  'F3rhjsh-SmQ', // Projet 3 (ancien Projet 2)
  'X-lIDver-5k', // Projet 4 (ancien Projet 3)
  'Yx5Jlxr_iuA', // Projet 5 (ancien Projet 4)
  'gallery', // Projet 6 - Gallery mode (ancien Projet 5)
];

// Gallery images for project 6 (add your image/gif paths)
const projectGalleries = {
  5: [ // Index 5 = Projet 6 (ancien Projet 5)
    './gallery/image1.webp',
    './gallery/image2.webp',
    './gallery/image3.webp',
    './gallery/image5.webp',
    './gallery/image4.webp'
  ]
};

// Alt texts for gallery images
const galleryAltTexts = {
  5: [ // Index 5 = Projet 6 (ancien Projet 5)
    'Projet motion design - Illustration graphique et typographie créative',
    'Animation motion design - Transition fluide et effets visuels dynamiques',
    'Création graphique animée - Composition visuelle et mouvement',
    'Motion design 3D - Rendu et animation de formes géométriques',
    'Projet design graphique - Composition visuelle et création artistique'
  ]
};

// Lazy load gallery images only when needed (not on page load)
const preloadedImages = [];

/**
 * Preloads gallery images for the current project
 * Only called when user opens the gallery modal
 * @returns {void}
 */
function preloadGalleryImages() {
  // Only preload when user opens the gallery, not on page load
  const timestamp = new Date().getTime();
  const gallery = projectGalleries[currentIndex];
  if (!gallery) return;
  
  gallery.forEach(imagePath => {
    const img = new Image();
    img.onload = () => log('✅ Loaded:', imagePath);
    img.onerror = () => log('❌ Failed to load:', imagePath);
    img.src = imagePath + '?t=' + timestamp;
    preloadedImages.push(img);
  });
}
// Don't preload on page load - wait for user action

// Project descriptions
const projectDescriptions = [
  {
    title: 'CV - Enzo Domenger',
    description: 'Designer UI/UX & Motion Designer passionné par la création d\'expériences visuelles immersives et interactives. Spécialisé en design d\'interface, prototypage et animation.',
    technologies: 'UI/UX Design, Motion Design, Three.js, WebGL'
  },
  {
    title: 'Club architecture',
    description: 'Cette vidéo illustre un projet de vulgarisation de la conception générative par l\'IA en architecture. Durant mon stage de cinq mois, j\'ai renforcé mes compétences en motion design, gestion de projet et narration visuelle, tout en apprenant à structurer et simplifier des concepts complexes.',
    technologies: 'After effect, Premiere Pro, Illustrator, Blender, 3ds max, Revit',
  },
  {
    title: 'But was it intelligent ? Garry Kasparov - Motion Design',
    description: 'Animation motion design avec bande sonore de la conférence TED de Garry Kasparov sur l\'intelligence artificielle. Création typographique et effets visuels explorant la relation homme-machine à travers l\'histoire de Deep Blue. Motion design narratif mêlant animation 2D et composition graphique.',
    technologies: 'After Effects, Premiere Pro, Illustrator, Photoshop',
  },
  {
    title: 'Angel Mugler - Parfum',
    description: 'Motion design sur le parfum Angel Mugler. J\'ai exploré les effets visuels et les dynamiques de mouvement, en jouant avec les matériaux, la lumière et la transparance pour sublimer les reflets du verre et créer une ambiance immersive.',
    technologies: 'Cinema 4d, After effect, Premiere Pro'
  },
  {
    title: 'Comme tout le monde',
    description: 'J\'ai eu l\'opportunité de participer au FESTIVAL REGARDS CROISÉS en collaboration avec Margot Legrand et ESAT Les Ateliers De L\'Espoir. Notre film « Comme tout le monde » a été sélectionné en compétition dans la catégorie Milieu protégé et adapté.',
    technologies: 'Captation vidéo, Premiere Pro'
  },
  {
    title: 'Autres Projets - Motion Design & Design Graphique',
    description: 'Collection de projets variés en motion design, illustration graphique et animation. Explorations créatives mêlant typographie animée, compositions visuelles et effets de transition. Projets personnels et expérimentations en design graphique et animation 2D/3D.',
    technologies: 'After Effects, Illustrator, Photoshop, Animation 2D/3D'
  }
];

// Action button
const actionButton = document.getElementById('action-button');
actionButton.addEventListener('click', () => {
  const project = projectDescriptions[currentIndex];
  const videoId = projectVideos[currentIndex];
  
  // Debug: log video ID
  console.log('Opening project:', currentIndex, 'Video ID:', videoId);
  
  // Update modal content
  modalTitle.textContent = project.title;
  
  // Check if this project has a CV mode
  if (videoId === 'cv') {
    // Display CV content
    modalBody.innerHTML = `
      <div class="cv-container" style="color: white; line-height: 1.8;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h3 style="font-size: 24px; margin-bottom: 10px; color: #fff;">Enzo Domenger</h3>
          <p style="font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 15px;">Designer UI/UX</p>
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; font-size: 14px;">
            <a href="mailto:enzo.domenger@gmail.com" style="color: #a8d3ee; text-decoration: none;">📧 Contact</a>
            <a href="https://linkedin.com/in/enzo-domenger" target="_blank" style="color: #a8d3ee; text-decoration: none;">💼 LinkedIn</a>
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <h4 style="color: #a8d3ee; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid rgba(168,211,238,0.3); padding-bottom: 5px;">🎯 Profil</h4>
          <p style="font-size: 14px; color: rgba(255,255,255,0.9);">
            Designer créatif spécialisé en UI/UX avec une forte expertise en motion design et en 3D. 
            Passionné par la création d'expériences utilisateur immersives et l'innovation en design interactif.
          </p>
        </div>

        <div style="margin-bottom: 25px;">
          <h4 style="color: #a8d3ee; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid rgba(168,211,238,0.3); padding-bottom: 5px;">💼 Expérience</h4>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Designer UI/UX</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Chez Léonard | Septembre 2025 - Mai 2026</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Conception de sites internet, la création d'affiches sur mesure ainsi que la refonte de logos et d’identités visuelles.</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Webdesigner - Stage</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Agence Mekaa | Février 2026 - Avril 2026</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Stage en webdesign au sein de l'agence Mekaa. Conception d'interfaces web, design graphique et expérience utilisateur.</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Motion Designer - Stage</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Club Architecture | 5 mois</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Vulgarisation de la conception générative par IA en architecture. Renforcement des compétences en motion design, gestion de projet et narration visuelle.</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Motion Designer, Designer UI/UX & Infographiste 3D - Freelance</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Projets variés | 2021-2025</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Projets diversifiés incluant jeux vidéos, captation vidéo (concerts), montage vidéo, conception d'interfaces utilisateur et création de design systems pour applications web et mobile.</p>
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <h4 style="color: #a8d3ee; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid rgba(168,211,238,0.3); padding-bottom: 5px;">🎓 Formation</h4>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Licence - Concepteur Designer UI</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">Greta CFA Est Bretagne | 2025 - 2026</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Formation en conception et design d'interfaces utilisateur.</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; font-size: 15px; margin-bottom: 5px;">Licence - Animation, Technologie Interactive, Vidéographie et Effets Spéciaux</p>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">3axes Institut | 2021 - 2024</p>
            <p style="font-size: 14px; color: rgba(255,255,255,0.85);">Formation spécialisée en animation, technologies interactives, vidéographie et effets spéciaux.</p>
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <h4 style="color: #a8d3ee; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid rgba(168,211,238,0.3); padding-bottom: 5px;">🛠️ Compétences</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
            <div>
              <p style="font-weight: 600; margin-bottom: 8px; color: rgba(255,255,255,0.95);">Design</p>
              <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.85);">
                <li>UI/UX Design</li>
                <li>Motion Design</li>
                <li>Design Graphique</li>
                <li>Infographie 3D</li>
              </ul>
            </div>
            <div>
              <p style="font-weight: 600; margin-bottom: 8px; color: rgba(255,255,255,0.95);">Outils</p>
              <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.85);">
                <li>Figma, Wordpress</li>
                <li>After Effects, Premiere Pro</li>
                <li>Illustrator, Photoshop</li>
                <li>Blender, Cinema 4D</li>
              </ul>
            </div>
            <div>
              <p style="font-weight: 600; margin-bottom: 8px; color: rgba(255,255,255,0.95);">Développement</p>
              <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.85);">
                <li>Three.js, WebGL</li>
                <li>HTML/CSS/JavaScript</li>
              </ul>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: #a8d3ee; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid rgba(168,211,238,0.3); padding-bottom: 5px;">🏆 Réalisations</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: rgba(255,255,255,0.85);">
            <li style="margin-bottom: 8px;">Sélection au Festival Regards Croisés - Film "Comme tout le monde"</li>
            <li style="margin-bottom: 8px;">Portfolio 3D interactif avec Three.js et WebGL</li>
            <li style="margin-bottom: 8px;">Projets de motion design et création de jeux vidéos avec une équipe de 15 personnes</li>
          </ul>
        </div>

        <!-- Téléchargement CV désactivé temporairement
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
          <a href="./CV_Enzo_Domenger.pdf" download="CV_Enzo_Domenger.pdf" style="display: inline-block; padding: 12px 30px; background: rgba(168,211,238,0.2); border: 2px solid #a8d3ee; border-radius: 25px; color: #a8d3ee; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(168,211,238,0.3)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.background='rgba(168,211,238,0.2)'; this.style.transform='translateY(0)';">
            💾 Télécharger le CV complet (PDF)
          </a>
        </div>
        -->
      </div>
    `;
  } else if (videoId === 'gallery' && projectGalleries[currentIndex]) {
    // Show loading indicator
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <div style="width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.3); 
                    border-top-color: white; border-radius: 50%; 
                    animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p style="color: white; font-size: 16px;">Chargement de la galerie...</p>
      </div>
    `;
    
    // Preload images when opening gallery
    preloadGalleryImages();
    
    const images = projectGalleries[currentIndex];
    const altTexts = galleryAltTexts[currentIndex] || [];
    const timestamp = new Date().getTime(); // Force reload
    
    // Load images with progress tracking
    let loadedCount = 0;
    const totalImages = images.length;
    
    const galleryHTML = images.map((img, idx) => {
      const imgSrc = img + '?t=' + timestamp;
      const altText = altTexts[idx] || `Projet ${currentIndex + 1} - Image ${idx + 1}`;
      log('🖼️ Loading gallery image:', imgSrc);
      
      // Special styling for images 4 and 5 (indices 3 and 4)
      let gridStyle = '';
      if (idx === 2) {
        // Image 3 spans 2 rows
        gridStyle = 'grid-row: span 2;';
      }
      
      return `<img src="${imgSrc}" alt="${altText}" class="gallery-image gallery-image-${idx + 1}" 
            loading="lazy"
            style="width: 100%; border-radius: 8px; object-fit: cover; opacity: 0; transition: opacity 0.3s; background: #f0f0f0; ${gridStyle}"
            onload="this.style.opacity='1';"
            onerror="this.style.border='3px solid red'; this.style.opacity='1'; this.alt='Erreur de chargement: ' + this.alt;">`;
    }).join('');
    
    // Replace loading with gallery after a short delay
    setTimeout(() => {
      modalBody.innerHTML = `
        <div class="gallery-container" style="max-height: 500px; overflow-y: auto; padding: 10px; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(150px, auto); gap: 15px;">
          ${galleryHTML}
        </div>
      `;
    }, 300);
  } else {
    // Standard video display with lazy loading and thumbnail preview
    modalBody.innerHTML = `
      <iframe 
        id="youtube-iframe"
        class="modal-video" 
        src="https://www.youtube.com/embed/${videoId}"
        loading="lazy"
        srcdoc="<style>
          * { padding: 0; margin: 0; overflow: hidden; }
          html, body { height: 100%; background: #000; }
          img { position: absolute; width: 100%; height: 100%; object-fit: cover; }
          .play-button { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%);
            width: 68px; 
            height: 48px; 
            background: rgba(255, 0, 0, 0.8);
            border-radius: 14px;
            transition: background 0.3s;
          }
          .play-button:hover { background: rgba(255, 0, 0, 1); }
          .play-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-40%, -50%);
            width: 0;
            height: 0;
            border-left: 20px solid white;
            border-top: 12px solid transparent;
            border-bottom: 12px solid transparent;
          }
        </style>
        <a href='https://www.youtube.com/embed/${videoId}?autoplay=1'>
          <img src='https://img.youtube.com/vi/${videoId}/maxresdefault.jpg' alt='${project.title}'>
          <div class='play-button'></div>
        </a>"
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
      </iframe>
      <p><strong>Description du projet:</strong></p>
      <p>${project.description}</p>
      <p><strong>Technologies utilisées:</strong> ${project.technologies}</p>
    `;
  }
  
  // Add error handler for iframe
  setTimeout(() => {
    const iframe = document.getElementById('youtube-iframe');
    if (iframe) {
      iframe.onerror = () => {
        console.error('Iframe failed to load for video:', videoId);
      };
    }
  }, 100);
  
  // Show modal and disable controls
  modal.classList.add('active');
  controlsEnabled = false;
  isMouseOverModal = true; // Considérer que la souris est sur la modal dès l'ouverture
  
  // Lock body scroll while modal is open
  document.body.style.overflow = 'hidden';
  
  // Focus on first interactive element for accessibility
  setTimeout(() => {
    const firstFocusable = modal.querySelector('button, a, iframe');
    if (firstFocusable) firstFocusable.focus();
  }, 100);
});

/**
 * Closes the modal and resets all related states
 * Stops YouTube video if present to save bandwidth
 */
function closeModal() {
  modal.classList.remove('active');
  controlsEnabled = true;
  isMouseOverModal = false;
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Stop YouTube video by reloading iframe src
  const iframe = document.getElementById('youtube-iframe');
  if (iframe && iframe.src) {
    iframe.src = iframe.src; // Force reload to stop video
  }
}

// Close modal on button click
modalClose.addEventListener('click', closeModal);

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// Track mouse position over modal
modal.addEventListener('mouseenter', () => {
  isMouseOverModal = true;
});

modal.addEventListener('mouseleave', () => {
  isMouseOverModal = false;
});

// Close modal with Escape key and handle Tab focus trap
window.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('active')) return;
  
  // Close on Escape
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  
  // Focus trap: keep Tab navigation within modal
  if (e.key === 'Tab') {
    const focusableElements = modal.querySelectorAll(
      'button, a, iframe, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements);
    const firstFocusable = focusableArray[0];
    const lastFocusable = focusableArray[focusableArray.length - 1];
    
    // Shift + Tab on first element -> go to last
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
    // Tab on last element -> go to first
    else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
});

// Helper function to get color name
function getColorName(colorHex) {
  const colorNames = {
    0xff6b6b: 'Rouge corail',
    0x4ecdc4: 'Turquoise',
    0xffe66d: 'Jaune doré',
    0x95e1d3: 'Vert menthe',
    0xf38181: 'Rose saumon',
    0xaa96da: 'Violet lavande'
  };
  return colorNames[colorHex] || 'Couleur personnalisée';
}

// Mouse controls for rotating the carousel and items
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.1;
const mouse = new THREE.Vector2();

// Cache for raycasting to avoid recalculating on every frame
let lastRaycastTime = 0;
const raycastThrottle = 16; // ~60fps
let needsRaycast = false;

window.addEventListener('mousedown', (event) => {
  if (!controlsEnabled) return;
  
  // Check if clicking on an item
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(carouselItems, true);
  
  if (intersects.length > 0) {
    isDraggingItem = true;
    let clickedItem = intersects[0].object;
    while (clickedItem.parent && !carouselItems.includes(clickedItem)) {
      clickedItem = clickedItem.parent;
    }
    selectedItem = clickedItem;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
}, { passive: false });

window.addEventListener('mousemove', (event) => {
  if (!controlsEnabled) return; // Ignore if controls are disabled
  
  if (isDraggingItem && selectedItem) {
    // Rotate individual item
    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;
    
    // Create rotation based on mouse movement
    // Horizontal movement rotates around Y axis
    // Vertical movement rotates around X axis
    // Combined movement creates free rotation
    const rotationSpeed = 0.01;
    
    // Apply rotation using quaternions for smooth 3D rotation
    const euler = new THREE.Euler(
      deltaY * rotationSpeed,
      deltaX * rotationSpeed,
      0,
      'XYZ'
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    selectedItem.quaternion.multiplyQuaternions(quaternion, selectedItem.quaternion);
    
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  }
});

window.addEventListener('mouseup', () => {
  isDraggingItem = false;
  selectedItem = null;
});

window.addEventListener('mouseleave', () => {
  isDraggingItem = false;
  selectedItem = null;
});

// Click on items to select
window.addEventListener('click', (event) => {
  if (!controlsEnabled) return;
  
  if (Math.abs(rotationVelocity) < 0.01) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(carouselItems, true);
    
    if (intersects.length > 0) {
      let clickedItem = intersects[0].object;
      while (clickedItem.parent && !carouselItems.includes(clickedItem)) {
        clickedItem = clickedItem.parent;
      }
      const index = carouselItems.indexOf(clickedItem);
      if (index !== -1) {
        rotateToIndex(index);
      }
    }
  }
  rotationVelocity = 0;
}, { passive: true });

// Animation loop with optimizations
const tempVec3 = new THREE.Vector3(); // Reuse vector to avoid garbage collection
const targetScaleVec = new THREE.Vector3(); // Reuse for scale calculations
let lastFrameTime = performance.now();
let lastRenderTime = 0;
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function animate() {
  requestAnimationFrame(animate);
  
  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  
  // Limit FPS to 60 when active
  if (now - lastRenderTime < FRAME_INTERVAL && !isDocHidden) {
    return;
  }
  
  lastFrameTime = now;
  lastRenderTime = now;
  
  // If hidden, throttle rendering frequency and skip heavy updates
  if (isDocHidden) {
    if (now - lastHiddenRender < HIDDEN_RENDER_INTERVAL_MS) {
      return;
    }
    lastHiddenRender = now;
  }
  // Render background first
  renderer.autoClear = true;
  renderer.render(backgroundScene, backgroundCamera);
  
  // Render main scene on top
  renderer.autoClear = false;
  
  // Animate camera zoom based on scroll progress (seulement si les contrôles sont activés)
  if (controlsEnabled) {
    const targetZ = cameraStartZ + (cameraEndZ - cameraStartZ) * cameraProgress;
    const lerpFactor = prefersReduced ? 0.25 : 0.12;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;
  }
  
  // Smooth rotation interpolation for keyboard navigation (optimized)
  const rotationDiff = targetRotation - currentRotation;
  if (Math.abs(rotationDiff) > 0.001) {
    const lerpSpeed = prefersReduced ? 0.2 : 0.12;
    currentRotation += rotationDiff * lerpSpeed;
    carouselGroup.rotation.y = currentRotation;
  }
  
  // Track if any item is focused
  let hasItemInFocus = false;
  
  // Update carousel items effects based on their world position (optimized)
  const itemsLength = carouselItems.length;
  for (let i = 0; i < itemsLength; i++) {
    const item = carouselItems[i];
    
    // Get world position to calculate which item is in front
    item.getWorldPosition(tempVec3);
    
    // Calculate distance from front (camera facing position)
    const distanceFromFront = Math.abs(Math.atan2(tempVec3.x, tempVec3.z));
    
    // Apply blur effect using opacity and scale
    const isFocused = distanceFromFront < 0.3;
    const blurAmount = Math.min(distanceFromFront / Math.PI, 1);
    
    // Scale effect - focused item is bigger (multiply by base scale)
    const baseScale = item.userData.baseScale || 1;
    const focusMultiplier = isFocused ? 1.3 : Math.max(0.7, 1 - blurAmount * 0.3);
    const targetScale = baseScale * focusMultiplier;
    targetScaleVec.set(targetScale, targetScale, targetScale);
    item.scale.lerp(targetScaleVec, 0.1);
    
    // Apply effects to all meshes in the model (only if opacity changed significantly)
    const targetOpacity = isFocused ? 1.0 : Math.max(0.3, 1 - blurAmount * 0.7);
    const meshesList = item.userData.meshes;
    if (meshesList && meshesList.length > 0) {
      const currentOpacity = meshesList[0].material.opacity;
      if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
        for (let m = 0; m < meshesList.length; m++) {
          const mat = meshesList[m].material;
          if (mat) {
            mat.opacity = targetOpacity;
          }
        }
      }
    }
    
    // Track focus for button visibility
    if (isFocused) {
      hasItemInFocus = true;
    }
  }
  
  // Show/hide action button based on focus
  if (hasItemInFocus) {
    actionButton.classList.add('visible');
  } else {
    actionButton.classList.remove('visible');
  }
  
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);