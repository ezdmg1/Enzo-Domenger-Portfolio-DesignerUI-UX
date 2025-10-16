import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('🚀 main.js chargé - Version avec fix scroll modal');

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

// Visibility throttling (reduce work when tab is hidden)
let isDocHidden = document.hidden;
const HIDDEN_RENDER_INTERVAL_MS = 250; // ~4 FPS
let lastHiddenRender = 0;
document.addEventListener('visibilitychange', () => {
  isDocHidden = document.hidden;
});

// Touch gestures (swipe)
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touching = false;
const SWIPE_THRESHOLD = 40; // px

window.addEventListener('touchstart', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  touchStartX = touchEndX = t.clientX;
  touchStartY = touchEndY = t.clientY;
  touching = true;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!touching || !e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  touchEndX = t.clientX;
  touchEndY = t.clientY;
}, { passive: true });

window.addEventListener('touchend', () => {
  if (!touching) return;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  touching = false;
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
camera.position.set(0, 0, 25); // Start far away
camera.lookAt(0, 0, 0);

// Camera animation state
let cameraProgress = 0; // 0 = far, 1 = close
const cameraStartZ = 25;
const cameraEndZ = 10;
let hasScrolled = false;

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
const carouselRadius = 8;
const itemCount = 6;
const carouselItems = [];

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

// Apply subtle realism: rim light + ACES tonemapping to standard materials
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
  './BLENDER_Template.glb',
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
          
          // Optimize textures
          if (child.material.map) {
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            child.material.map.magFilter = THREE.LinearFilter;
            child.material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            child.material.map.generateMipmaps = true;
          }
          
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
  }
);

// Fallback function to create boxes if model loading fails
function createFallbackBoxes() {
  for (let i = 0; i < itemCount; i++) {
    const angle = (i / itemCount) * Math.PI * 2;
    
    const geometry = new THREE.BoxGeometry(2, 2.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: colors[i],
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 1
    });
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
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    backgroundMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    
    // Update video resolution if video is loaded
    if (video.videoWidth && video.videoHeight) {
      backgroundMaterial.uniforms.uVideoResolution.value.set(video.videoWidth, video.videoHeight);
    }
  }, 100);
});

// Custom cursor management
const customCursor = document.getElementById('custom-cursor');
const cursorText = document.getElementById('cursor-text');
let idleTimer = null;
let isIdle = false;

// Update cursor position with transform for better performance
window.addEventListener('mousemove', (e) => {
  if (customCursor) {
    customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }
  
  // User is moving, hide text
  if (cursorText && !cursorText.classList.contains('hidden')) {
    cursorText.classList.add('hidden');
    isIdle = false;
  }
  
  // Reset idle timer
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    // Show "scroll" text after 0.5 seconds of inactivity
    if (cursorText && cameraProgress < 1) {
      cursorText.classList.remove('hidden');
      isIdle = true;
    }
  }, 200);
}, { passive: true });

// Handle scroll to zoom camera
window.addEventListener('wheel', (event) => {
  console.log('Wheel event detected - controlsEnabled:', controlsEnabled, 'isMouseOverModal:', isMouseOverModal);
  
  // Désactiver le scroll de la caméra si la modal est ouverte ou si la souris est sur la modal
  if (!controlsEnabled || isMouseOverModal) {
    console.log('❌ Scroll bloqué');
    return;
  }
  
  console.log('✅ Scroll autorisé - deltaY:', event.deltaY);
  
  if (!hasScrolled) {
    hasScrolled = true;
  }
  
  // Hide cursor text when scrolling
  if (cursorText) {
    cursorText.classList.add('hidden');
  }
  
  // Decrease progress on scroll (zoom out)
  if (event.deltaY > 0) {
    cameraProgress = Math.max(cameraProgress - 0.05, 0);
  } else {
    // Allow scrolling back in
    cameraProgress = Math.min(cameraProgress + 0.05, 1);
  }
  
  console.log('New cameraProgress:', cameraProgress);
  
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

// Navigation controls
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

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// Track if mouse is over modal
let isMouseOverModal = false;

// YouTube video IDs for each project (replace with your own video IDs)
const projectVideos = [
  'T1v0eDGNcOg', // Projet 1
  'F3rhjsh-SmQ', // Projet 2
  'X-lIDver-5k', // Projet 3
  'Yx5Jlxr_iuA', // Projet 4
  'gallery', // Projet 5 - Gallery mode
  'dQw4w9WgXcQ'  // Projet 6
];

// Gallery images for project 5 (add your image/gif paths)
const projectGalleries = {
  4: [ // Index 4 = Projet 5
    './gallery/image1.webp',
    './gallery/image2.webp',
    './gallery/image3.webp',
    './gallery/image4.webp'
  ]
};

// Alt texts for gallery images
const galleryAltTexts = {
  4: [ // Index 4 = Projet 5
    'Projet motion design - Illustration graphique et typographie créative',
    'Animation motion design - Transition fluide et effets visuels dynamiques',
    'Création graphique animée - Composition visuelle et mouvement',
    'Motion design 3D - Rendu et animation de formes géométriques'
  ]
};

// Lazy load gallery images only when needed (not on page load)
const preloadedImages = [];
function preloadGalleryImages() {
  // Only preload when user opens the gallery, not on page load
  const timestamp = new Date().getTime();
  const gallery = projectGalleries[currentIndex];
  if (!gallery) return;
  
  gallery.forEach(imagePath => {
    const img = new Image();
    img.onload = () => console.log('✅ Loaded:', imagePath);
    img.onerror = () => console.error('❌ Failed to load:', imagePath);
    img.src = imagePath + '?t=' + timestamp;
    preloadedImages.push(img);
  });
}
// Don't preload on page load - wait for user action

// Project descriptions
const projectDescriptions = [
  {
    title: 'Club architecture',
    description: 'Cette vidéo illustre un projet de vulgarisation de la conception générative par l’IA en architecture. Durant mon stage de cinq mois, j’ai renforcé mes compétences en motion design, gestion de projet et narration visuelle, tout en apprenant à structurer et simplifier des concepts complexes.',
    technologies: 'After effect, Premiere Pro, Illustrator, Blender, 3ds max, Revit',
  },
  {
    title: 'But was it intelligent ? Garry Kasparov - Motion Design IA',
    description: 'Animation motion design avec bande sonore de la conférence TED de Garry Kasparov sur l\'intelligence artificielle. Création typographique et effets visuels explorant la relation homme-machine à travers l\'histoire de Deep Blue. Motion design narratif mêlant animation 2D et composition graphique.',
    technologies: 'After Effects, Premiere Pro, Illustrator, Photoshop',
  },
  {
    title: 'Angel Mugler - Parfum',
    description: 'Motion design sur le parfum Angel Mugler. J’ai exploré les effets visuels et les dynamiques de mouvement, en jouant avec les matériaux, la lumière et la transparance pour sublimer les reflets du verre et créer une ambiance immersive.',
    technologies: 'Cinema 4d, After effect, Premiere Pro'
  },
  {
    title: 'Comme tout le monde',
    description: 'J’ai eu l’opportunité de participer au FESTIVAL REGARDS CROISÉS en collaboration avec Margot Legrand et ESAT Les Ateliers De L\'Espoir. Notre film « Comme tout le monde » a été sélectionné en compétition dans la catégorie Milieu protégé et adapté.',
    technologies: 'Captation vidéo, Premiere Pro'
  },
  {
    title: 'Autres Projets - Motion Design & Design Graphique',
    description: 'Collection de projets variés en motion design, illustration graphique et animation. Explorations créatives mêlant typographie animée, compositions visuelles et effets de transition. Projets personnels et expérimentations en design graphique et animation 2D/3D.',
    technologies: 'After Effects, Illustrator, Photoshop, Animation 2D/3D'
  },
  {
    title: 'Projets en Développement',
    description: 'Nouveaux projets en cours de réalisation combinant motion design, architecture générative et technologies web interactives. Explorations en WebGL, Three.js et visualisation de données architecturales.',
    technologies: 'Three.js, WebGL, Blender, After Effects'
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
  
  // Check if this project has a gallery instead of video
  if (videoId === 'gallery' && projectGalleries[currentIndex]) {
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
      console.log('🖼️ Loading gallery image:', imgSrc); // Debug
      return `<img src="${imgSrc}" alt="${altText}" class="gallery-image" 
            loading="lazy"
            style="width: 100%; border-radius: 8px; object-fit: cover; opacity: 0; transition: opacity 0.3s; background: #f0f0f0;"
            onload="console.log('✅ Image loaded:', this.src); this.style.opacity='1';"
            onerror="console.error('❌ Failed to load:', this.src); this.style.border='3px solid red'; this.style.opacity='1'; this.alt='Erreur de chargement: ' + this.alt;">`;
    }).join('');
    
    // Replace loading with gallery after a short delay
    setTimeout(() => {
      modalBody.innerHTML = `
        <div class="gallery-container" style="max-height: 500px; overflow-y: auto; padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          ${galleryHTML}
        </div>
      `;
    }, 300);
  } else {
    // Standard video display
    modalBody.innerHTML = `
      <iframe 
        id="youtube-iframe"
        class="modal-video" 
        src="https://www.youtube.com/embed/${videoId}" 
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
});

// Close modal
modalClose.addEventListener('click', () => {
  modal.classList.remove('active');
  controlsEnabled = true; // Re-enable controls
  isMouseOverModal = false; // Reset mouse tracking
});

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
    controlsEnabled = true; // Re-enable controls
    isMouseOverModal = false; // Reset mouse tracking
  }
});

// Track mouse position over modal
modal.addEventListener('mouseenter', () => {
  isMouseOverModal = true;
});

modal.addEventListener('mouseleave', () => {
  isMouseOverModal = false;
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
    const lerpFactor = prefersReduced ? 0.15 : 0.05;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;
  }
  
  // Smooth rotation interpolation for keyboard navigation (optimized)
  const rotationDiff = targetRotation - currentRotation;
  if (Math.abs(rotationDiff) > 0.001) {
    const lerpSpeed = prefersReduced ? 0.15 : 0.08;
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