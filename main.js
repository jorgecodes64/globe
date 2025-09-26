// main.js — Balanced, optimized drop-in for your globe
// Improvements: FPS cap, lower geometry detail, lazy-loading, reduced flight path density,
// renderer pixel ratio cap, render-skipping when idle.
// Assumes THREE, OrbitControls & TWEEN available globally (like your original).

(function () {
  console.log('Optimized main.js loaded — balanced profile');

  // Globals
  const { OrbitControls } = THREE;
  let scene, camera, renderer, controls;
  let lastFrameTime = 0;
  const TARGET_FPS = 60; // try 30 for even lower load
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let needsRender = true; // set true initially to render first frames
  let continuousAnimations = false; // whether there are ongoing continuous animations
  window.animationFunctions = window.animationFunctions || [];

  // --- Data (kept from your original file) ---
  const MAJOR_CITIES = [
    { name: 'London', lat: 51.5074, lon: -0.1278, type: 'Major', region: 'Europe', focus: 'Green Finance & Sustainable Banking' },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, type: 'Major', region: 'Europe', focus: 'Climate Policy & Urban Sustainability' },
    { name: 'Berlin', lat: 52.5200, lon: 13.4050, type: 'Major', region: 'Europe', focus: 'Renewable Energy Technology' },
    { name: 'Rome', lat: 41.9028, lon: 12.4964, type: 'Major', region: 'Europe', focus: 'Cultural Heritage Preservation' },
    { name: 'Madrid', lat: 40.4168, lon: -3.7038, type: 'Major', region: 'Europe', focus: 'Solar Energy Development' },
    { name: 'Moscow', lat: 55.7558, lon: 37.6173, type: 'Major', region: 'Europe', focus: 'Arctic Environmental Protection' },

    { name: 'Beijing', lat: 39.9042, lon: 116.4074, type: 'Major', region: 'Asia', focus: 'Air Quality & Clean Technology' },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, type: 'Major', region: 'Asia', focus: 'Smart City Innovation' },
    { name: 'Seoul', lat: 37.5665, lon: 126.9780, type: 'Major', region: 'Asia', focus: 'Digital Sustainability Solutions' },
    { name: 'Delhi', lat: 28.6139, lon: 77.2090, type: 'Major', region: 'Asia', focus: 'Sustainable Agriculture' },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777, type: 'Major', region: 'Asia', focus: 'Coastal Ecosystem Protection' },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198, type: 'Major', region: 'Asia', focus: 'Urban Biodiversity' },

    { name: 'Sydney', lat: -33.8688, lon: 151.2093, type: 'Major', region: 'Oceania', focus: 'Marine Conservation' },
    { name: 'Melbourne', lat: -37.8136, lon: 144.9633, type: 'Major', region: 'Oceania', focus: 'Sustainable Urban Planning' },

    { name: 'Cairo', lat: 30.0444, lon: 31.2357, type: 'Major', region: 'Africa', focus: 'Water Resource Management' },
    { name: 'Lagos', lat: 6.5244, lon: 3.3792, type: 'Major', region: 'Africa', focus: 'Clean Energy Access' },
    { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, type: 'Major', region: 'Africa', focus: 'Sustainable Mining Practices' },

    { name: 'New York', lat: 40.7128, lon: -74.0060, type: 'Major', region: 'North America', focus: 'Sustainable Finance Innovation' },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, type: 'Major', region: 'North America', focus: 'Clean Transportation' },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298, type: 'Major', region: 'North America', focus: 'Green Architecture' },
    { name: 'Toronto', lat: 43.6532, lon: -79.3832, type: 'Major', region: 'North America', focus: 'Climate Resilience' },
    { name: 'Mexico City', lat: 19.4326, lon: -99.1332, type: 'Major', region: 'North America', focus: 'Urban Air Quality' },
    { name: 'São Paulo', lat: -23.5505, lon: -46.6333, type: 'Major', region: 'South America', focus: 'Rainforest Conservation' },
    { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, type: 'Major', region: 'South America', focus: 'Sustainable Tourism' },

    // some secondary additions (keeps file compact but still useful)
    { name: 'Stockholm', lat: 59.3293, lon: 18.0686, type: 'Secondary', region: 'Europe' },
    { name: 'Vienna', lat: 48.2082, lon: 16.3738, type: 'Secondary', region: 'Europe' },
    { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, type: 'Secondary', region: 'Europe' },
    { name: 'Bangkok', lat: 13.7563, lon: 100.5018, type: 'Secondary', region: 'Asia' },
    { name: 'Istanbul', lat: 41.0082, lon: 28.9784, type: 'Secondary', region: 'Middle East' },
    { name: 'Nairobi', lat: -1.2921, lon: 36.8219, type: 'Secondary', region: 'Africa' },
    { name: 'Vancouver', lat: 49.2827, lon: -123.1207, type: 'Secondary', region: 'North America' },
  ];

  const EARTH_SHOTS = [
    { name: 'Sahara Solar Farm', lat: 23.4162, lon: 25.6628, type: 'Energy', focus: 'Large-scale Solar Power Generation' },
    { name: 'North Sea Wind Farm', lat: 55.9533, lon: 3.2014, type: 'Energy', focus: 'Offshore Wind Energy Development' },
    { name: 'Iceland Geothermal', lat: 64.9631, lon: -19.0208, type: 'Energy', focus: 'Geothermal Energy Innovation' },
    { name: 'Amazon Rainforest', lat: -3.4653, lon: -62.2159, type: 'Forest', focus: 'Primary Rainforest Protection' },
    { name: 'Great Barrier Reef', lat: -18.2871, lon: 147.6992, type: 'Ocean', focus: 'Coral Reef Restoration' },
    { name: 'Serengeti', lat: -2.3333, lon: 34.8333, type: 'Wildlife', focus: 'African Wildlife Protection' },
  ];

  const TOOLS = {
    education: [
      { name: 'MentorClass', focus: 'A global teacher training program to build mentoring into schools', category: 'education', type: 'platform' },
      { name: 'IMAGI-NATION {Uni}', focus: 'Free university with puppet professors focused on creating a fairer world', category: 'education', type: 'platform' },
      { name: 'Custodian Workshop', focus: 'Experiential learning program connecting students to nature and Indigenous knowledge', category: 'education', type: 'program' }
    ],
    media: [
      { name: 'IMAGI-NATION {TV}', focus: 'Live streaming platform connecting unlikely voices', category: 'media', type: 'platform' },
      { name: 'IMAGINE: The Feature Film', focus: 'Film about imagination (in development)', category: 'media', type: 'project' }
    ],
    digital: [
      { name: 'The Knowledge Tree', focus: 'Digital platform for sharing collective intelligence', category: 'digital', type: 'platform' },
      { name: 'IMAGI-NATION Digital Platform', focus: 'A 10-year digital nation connecting people', category: 'digital', type: 'platform' }
    ],
    cultural: [
      { name: 'Hoodie Exchange', focus: 'System using hoodies as tokens of exchange', category: 'cultural', type: 'program' },
      { name: '1000 Year Dream Embassy', focus: 'Mobile installation collecting dreams', category: 'cultural', type: 'installation' }
    ]
  };

  const getAllTools = () => Object.values(TOOLS).flat();

  // --- Helpers ---
  const latLonToVector3 = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  const vector3ToLatLon = (position) => {
    const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
    const lat = 90 - (Math.acos(position.y / r) * 180 / Math.PI);
    const lon = (Math.atan2(position.z, position.x) * 180 / Math.PI);
    return { lat, lon };
  };

  // --- Renderer & Scene Init ---
  const initBasicScene = async () => {
    console.log('1. initBasicScene starting');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 0, 300);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio to avoid huge overdraw on hi-dpi displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const container = document.getElementById('container');
    if (!container) {
      console.error('Container element not found — aborting initBasicScene');
      return;
    }
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 150;
    controls.maxDistance = 700;

    // Mark control changes as needing render
    controls.addEventListener('change', () => {
      needsRender = true;
    });

    // Lights (simple)
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    // Create globe (lower geo detail)
    const globe = await createGlobe();
    scene.add(globe);

    // Add a lightweight atmosphere
    const atmosphere = createAtmosphere();
    scene.add(atmosphere);

    // Add a lighter lat/lon grid
    const grid = createLatLonGrid();
    scene.add(grid);

    // Lazy-load heavy stuff after a short delay
    setTimeout(() => {
      loadHeavyExtras();
    }, 800);

    // Setup window resize
    window.addEventListener('resize', onWindowResize);

    // UI
    createNavigationMenu();
    createSidePanel();
    createControlPanel();
    createTableButton();

    // Start animation loop
    requestAnimationFrame(animate);
  };

  const onWindowResize = () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    needsRender = true;
  };

  // --- Globe & materials ---
  const loadWorldTexture = async () => {
    const loader = new THREE.TextureLoader();
    const paths = [
      'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
    ];
    for (const p of paths) {
      try {
        const tex = await new Promise((resolve, reject) => loader.load(p, resolve, undefined, reject));
        return tex;
      } catch (e) {
        console.warn('texture failed:', p);
      }
    }
    return createBasicEarthTexture();
  };

  const createBasicEarthTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#4287f5');
    grad.addColorStop(0.5, '#3ca55c');
    grad.addColorStop(1, '#4287f5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  };

  const createGlobe = async () => {
    try {
      const tex = await loadWorldTexture();
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (renderer && renderer.capabilities) {
        try { tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
      }
      // Lower sphere segments (balanced)
      const geometry = new THREE.SphereGeometry(100, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        map: tex,
        bumpScale: 0.005,
        specular: new THREE.Color('grey'),
        shininess: 5,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geometry, material);
      return mesh;
    } catch (err) {
      console.error('createGlobe error', err);
      return createBasicGlobe();
    }
  };

  const createBasicGlobe = () => {
    const geometry = new THREE.SphereGeometry(100, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x4287f5, transparent: true, opacity: 0.9, shininess: 25 });
    return new THREE.Mesh(geometry, material);
  };

  const createAtmosphere = () => {
    const geometry = new THREE.SphereGeometry(102, 32, 32);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  };

// Fix grid creation with proper geometry handling
const createLatLonGrid = () => {
    const material = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.3
    });
    
    const radius = 101;
    const segments = 36;
    const lines = new THREE.Group();
    
    // Create latitude lines (parallels)
    for (let i = 0; i <= segments; i++) {
        const lat = (i / segments) * Math.PI; // 0 to PI (north to south pole)
        const points = [];
        
        for (let j = 0; j <= segments; j++) {
            const lon = (j / segments) * Math.PI * 2; // 0 to 2PI
            const x = Math.sin(lat) * Math.cos(lon) * radius;
            const y = Math.cos(lat) * radius;
            const z = Math.sin(lat) * Math.sin(lon) * radius;
            points.push(x, y, z);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, material);
        lines.add(line);
    }
    
    // Create longitude lines (meridians) - FIXED
    for (let i = 0; i <= segments; i++) {
        const lon = (i / segments) * Math.PI * 2; // 0 to 2PI
        const points = [];
        
        for (let j = 0; j <= segments; j++) {
            const lat = (j / segments) * Math.PI; // 0 to PI
            const x = Math.sin(lat) * Math.cos(lon) * radius;
            const y = Math.cos(lat) * radius;
            const z = Math.sin(lat) * Math.sin(lon) * radius;
            points.push(x, y, z);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, material);
        lines.add(line);
    }
    
    return lines;
};

  // --- Markers (lightweight) ---
  const createEmbassyMarkers = (scene, radius = 102) => {
    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(1, 8, 8); // lower detail
    const pulseGeo = new THREE.SphereGeometry(1.2, 8, 8);
    MAJOR_CITIES.forEach(city => {
      const mat = new THREE.MeshPhongMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
      const marker = new THREE.Mesh(sphereGeo, mat);
      const pos = latLonToVector3(city.lat, city.lon, radius);
      marker.position.copy(pos);
      marker.userData.embassy = { name: city.name, type: city.type, region: city.region, focus: city.focus };
      group.add(marker);

      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.35 });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.copy(pos);
      group.add(pulse);

      // Gentle pulsing using TWEEN (lighter schedule)
      if (window.TWEEN) {
        const scalePulse = () => {
          new TWEEN.Tween(pulse.scale).to({ x: 1.9, y: 1.9, z: 1.9 }, 1800).easing(TWEEN.Easing.Quadratic.Out).start()
            .onComplete(() => new TWEEN.Tween(pulse.scale).to({ x: 1, y: 1, z: 1 }, 0).start().onComplete(scalePulse));
        };
        scalePulse();
      }
    });
    scene.add(group);
    return group;
  };

  const createEarthShotMarkers = (scene, radius = 102) => {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    EARTH_SHOTS.forEach(shot => {
      const mat = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
      const cube = new THREE.Mesh(boxGeo, mat);
      const pos = latLonToVector3(shot.lat, shot.lon, radius);
      cube.position.copy(pos);
      cube.lookAt(new THREE.Vector3(0, 0, 0));
      cube.userData.earthShot = { name: shot.name, type: shot.type, focus: shot.focus };
      group.add(cube);

      // small pulse
      const pulseGeo = new THREE.BoxGeometry(2, 2, 2);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.18 });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.copy(pos);
      pulse.lookAt(new THREE.Vector3(0, 0, 0));
      group.add(pulse);

      if (window.TWEEN) {
        const scalePulse = () => {
          new TWEEN.Tween(pulse.scale).to({ x: 2, y: 2, z: 2 }, 2000).easing(TWEEN.Easing.Quadratic.Out).start()
            .onComplete(() => new TWEEN.Tween(pulse.scale).to({ x: 1, y: 1, z: 1 }, 0).start().onComplete(scalePulse));
        };
        scalePulse();
      }
    });
    scene.add(group);
    return group;
  };

  // --- Tools with light animation ---
  const createTools = (scene, radius = 150) => {
    const group = new THREE.Group();
    const tools = getAllTools();
    const tetraGeo = new THREE.TetrahedronGeometry(2);

    tools.forEach((tool, idx) => {
      const material = new THREE.MeshPhongMaterial({
        color: getToolColor(tool.category),
        emissive: getToolEmissiveColor(tool.category),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
        shininess: 60
      });
      const mesh = new THREE.Mesh(tetraGeo, material);

      const categoryIndex = Object.keys(TOOLS).indexOf(tool.category);
      const ringRadius = radius - (categoryIndex * 12);
      const angle = (idx / tools.length) * Math.PI * 2;
      mesh.userData.orbit = {
        radius: ringRadius,
        speed: 0.001 + Math.random() * 0.002,
        angle,
        verticalOffset: (Math.random() - 0.5) * 30,
        rotSpeed: { x: 0.01 + Math.random() * 0.02, y: 0.01 + Math.random() * 0.02, z: 0.01 + Math.random() * 0.02 }
      };
      mesh.userData.tool = tool;
      group.add(mesh);
    });

    // Animation function (lightweight)
    const animateTools = () => {
      group.children.forEach(tool => {
        const o = tool.userData.orbit;
        o.angle += o.speed;
        tool.position.x = Math.cos(o.angle) * o.radius;
        tool.position.z = Math.sin(o.angle) * o.radius;
        tool.position.y = o.verticalOffset;
        tool.rotation.x += o.rotSpeed.x;
        tool.rotation.y += o.rotSpeed.y;
      });
    };

    window.animationFunctions.push(animateTools);
    continuousAnimations = true;
    scene.add(group);
    return group;
  };

  const getToolColor = (category) => {
    const colors = { education: 0x4287f5, media: 0xf542aa, digital: 0x42f5b9, cultural: 0xf5d442 };
    return colors[category] || 0x0088ff;
  };

  const getToolEmissiveColor = (category) => {
    const colors = { education: 0x2155a8, media: 0xa8215f, digital: 0x21a87c, cultural: 0xa89221 };
    return colors[category] || 0x0044aa;
  };

  // --- Flight paths (lighter) ---
// Enhanced flight paths with better visibility
const createFlightPaths = (scene) => {
    const group = new THREE.Group();
    
    // Use a brighter, more visible material
    const material = new THREE.LineBasicMaterial({
        color: 0xff4444, // Brighter red
        transparent: true,
        opacity: 0.6, // Higher opacity
        linewidth: 2 // Thicker lines (may not work in all browsers)
    });

    // Alternative: Use TubeGeometry for 3D thickness (more resource-intensive but always visible)
    const tubeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.5
    });

    // Create paths between major cities
    MAJOR_CITIES.forEach((city, index) => {
        // Connect to 3-4 cities instead of 5-7 to reduce clutter
        for (let i = 1; i <= 4; i++) {
            const nextIndex = (index + i) % MAJOR_CITIES.length;
            const nextCity = MAJOR_CITIES[nextIndex];
            
            // Only create paths between cities in different regions for better visual appeal
            if (city.region === nextCity.region && Math.random() > 0.3) continue;
            
            const start = latLonToVector3(city.lat, city.lon, 102);
            const end = latLonToVector3(nextCity.lat, nextCity.lon, 102);
            
            // Create curved path
            const curve = createCurvedPath(start, end);
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const line = new THREE.Line(geometry, material);
            
            // Add a glowing effect with an additional semi-transparent line
            const glowGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const glowMaterial = new THREE.LineBasicMaterial({
                color: 0xff8888,
                transparent: true,
                opacity: 0.3,
                linewidth: 4
            });
            const glowLine = new THREE.Line(glowGeometry, glowMaterial);
            
            group.add(glowLine); // Add glow first (behind)
            group.add(line); // Add main line on top
        }
    });

    scene.add(group);
    return group;
};

/// Simple fix: Ensure control point is always outside the globe
const createCurvedPath = (start, end) => {
    // Calculate midpoint on the sphere
    const midPoint = new THREE.Vector3()
        .addVectors(start, end)
        .normalize();
    
    // Calculate distance between points to determine arc height
    const distance = start.distanceTo(end);
    
    // Ensure the control point is sufficiently high to clear the globe
    // Globe radius is 100, our points are at 102, so we need > 102
    const minHeight = 120; // Much higher than globe radius
    const arcHeight = Math.max(minHeight, 100 + (distance * 0.3));
    
    // Position control point at the calculated height
    const controlPoint = midPoint.multiplyScalar(arcHeight);
    
    // Create quadratic Bezier curve
    const curve = new THREE.QuadraticBezierCurve3(
        start,
        controlPoint,
        end
    );
    
    return curve;
};

  const animateFlightPaths = (group) => {
    const fn = () => {
      group.children.forEach((line, idx) => {
        line.material.opacity = 0.25 + 0.12 * Math.sin(Date.now() * 0.001 + idx * 0.3);
      });
    };
    window.animationFunctions.push(fn);
    continuousAnimations = true;
  };

  // --- Tooltip and Interaction (kept) ---
  const createTooltip = () => {
    const tooltip = document.createElement('div');
    tooltip.className = 'embassy-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      pointer-events: none;
      display: none;
      z-index: 1000;
      max-width: 260px;
      border: 1px solid rgba(255,255,255,0.12);
    `;
    document.body.appendChild(tooltip);
    return tooltip;
  };

  const addTooltipInteraction = (scene, camera, tooltip) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastIntersect = null;

    window.addEventListener('mousemove', (ev) => {
      mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // find groups
      const groups = scene.children.filter(c => c.isGroup);
      let intersected = null;
      for (const g of groups) {
        const meshes = g.children.filter(ch => ch.userData && (ch.userData.embassy || ch.userData.earthShot || ch.userData.tool));
        if (!meshes.length) continue;
        const inters = raycaster.intersectObjects(meshes);
        if (inters.length) { intersected = inters[0].object; break; }
      }

      if (intersected) {
        const type = intersected.userData.embassy ? 'embassy' : intersected.userData.earthShot ? 'earthShot' : 'tool';
        const data = intersected.userData[type];
        tooltip.style.display = 'block';
        tooltip.style.left = (ev.clientX + 12) + 'px';
        tooltip.style.top = (ev.clientY + 12) + 'px';
        tooltip.innerHTML = `<strong>${data.name}</strong><br><em>${data.focus || ''}</em>`;
        document.body.style.cursor = 'pointer';
        intersected.material && (intersected.material.emissiveIntensity = 1.0);
        lastIntersect = intersected;
        needsRender = true;
      } else {
        if (lastIntersect) {
          // reset highlight
          lastIntersect.material && (lastIntersect.material.emissiveIntensity = 0.5);
          lastIntersect = null;
        }
        tooltip.style.display = 'none';
        document.body.style.cursor = 'default';
      }
    });
  };

  // --- Lazy load heavy extras ---
  let flightPathsGroup, toolsGroup, embassiesGroup, earthShotsGroup, mapOverlay;
  const loadHeavyExtras = () => {
    // Only load once
    if (flightPathsGroup || toolsGroup || embassiesGroup || earthShotsGroup) return;
    embassiesGroup = createEmbassyMarkers(scene);
    earthShotsGroup = createEarthShotMarkers(scene);
    toolsGroup = createTools(scene);
    flightPathsGroup = createFlightPaths(scene);
    animateFlightPaths(flightPathsGroup);
    create2DMapOverlay(); // overlay uses canvas draw — okay to load now
    // ensure control toggles can toggle these visible states
    window.flightPaths = flightPathsGroup;
    window.toolsGroup = toolsGroup;
    window.earthShots = earthShotsGroup;
    window.embassies = embassiesGroup;
  };

  // --- 2D Map overlay (lightweight drawing) ---
  const create2DMapOverlay = () => {
    const mapContainer = document.createElement('div');
    mapContainer.style.cssText = `
      position: absolute; bottom: 20px; right: 20px;
      width: 260px; height: 140px;
      background: rgba(0,0,0,0.6); border-radius: 6px; padding: 6px; z-index: 1000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.25);
    `;
    const mapCanvas = document.createElement('canvas');
    mapCanvas.style.width = '100%';
    mapCanvas.style.height = '100%';
    mapContainer.appendChild(mapCanvas);
    document.body.appendChild(mapContainer);

    const ctx = mapCanvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg';
    img.onload = () => {
      mapCanvas.width = mapContainer.clientWidth * devicePixelRatio;
      mapCanvas.height = mapContainer.clientHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const drawMap = () => {
        ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        ctx.drawImage(img, 0, 0, mapContainer.clientWidth, mapContainer.clientHeight);
        if (MAJOR_CITIES) {
          MAJOR_CITIES.forEach(city => {
            const x = (city.lon + 180) * (mapContainer.clientWidth / 360);
            const y = (90 - city.lat) * (mapContainer.clientHeight / 180);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
          });
        }
        // draw camera dot
        const camLatLon = vector3ToLatLon(camera.position);
        const camX = (camLatLon.lon + 180) * (mapContainer.clientWidth / 360);
        const camY = (90 - camLatLon.lat) * (mapContainer.clientHeight / 180);
        ctx.beginPath();
        ctx.arc(camX, camY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      };
      // push to animationFunctions at low frequency
      const drawFn = () => { drawMap(); };
      window.animationFunctions.push(drawFn);
    };

    return mapContainer;
  };

  // --- Control panel / menu / side panel (kept) ---
  const createNavigationMenu = () => {
    const menuContainer = document.createElement('div');
    menuContainer.setAttribute('data-menu-container', '');
    menuContainer.style.cssText = `
      position: absolute; top: 18px; left: 50%;
      transform: translateX(-50%); display:flex; gap:18px;
      background: rgba(0,0,0,0.65); padding: 8px 16px; border-radius: 28px; z-index:1000; font-family: Arial;
    `;
    const menuItems = [
      { name: 'Embassies', color: '#ff9999', description: 'Global network of imagination embassies' },
      { name: 'Tools', color: '#99ccff', description: 'Programs and platforms for change' },
      { name: 'Earth Shots', color: '#99ff99', description: 'Environmental innovation projects' }
    ];
    let activeItem = null;
    menuItems.forEach(item => {
      const el = document.createElement('div');
      el.style.cssText = `color:${item.color}; padding:8px 12px; cursor:pointer; border-radius:18px; font-weight:bold;`;
      el.textContent = item.name;
      el.setAttribute('data-menu-item', item.name);

      const infoPanel = document.createElement('div');
      infoPanel.style.cssText = `
        position:absolute; top:100%; left:50%; transform:translateX(-50%);
        background: rgba(0,0,0,0.9); padding:12px; border-radius:8px; width:200px; display:none; color:white; font-size:12px;
      `;
      infoPanel.textContent = item.description;
      el.appendChild(infoPanel);

      el.addEventListener('mouseenter', () => { el.style.background = item.color + '20'; infoPanel.style.display = 'block'; });
      el.addEventListener('mouseleave', () => { el.style.background = 'transparent'; infoPanel.style.display = 'none'; });
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (activeItem === item.name) {
          document.getElementById('sidePanel').style.display = 'none';
          activeItem = null;
          el.style.background = 'transparent';
        } else {
          activeItem = item.name;
          el.style.background = item.color + '20';
          switch (item.name) {
            case 'Embassies': focusOnEmbassies(); break;
            case 'Tools': focusOnTools(); break;
            case 'Earth Shots': focusOnEarthShots(); break;
          }
        }
      });

      menuContainer.appendChild(el);
    });
    document.body.appendChild(menuContainer);
  };

  const focusOnEmbassies = () => {
    if (!camera) return;
    if (window.TWEEN) {
      new TWEEN.Tween(camera.position).to({ x: 0, y: 100, z: 300 }, 900).easing(TWEEN.Easing.Cubic.InOut).start();
    }
    showSidePanel('Embassies', MAJOR_CITIES);
  };

  const focusOnTools = () => {
    if (!camera) return;
    if (window.TWEEN) {
      new TWEEN.Tween(camera.position).to({ x: 300, y: 100, z: 0 }, 900).easing(TWEEN.Easing.Cubic.InOut).start();
    }
    showSidePanel('Tools', getAllTools());
  };

  const focusOnEarthShots = () => {
    if (!camera) return;
    if (window.TWEEN) {
      new TWEEN.Tween(camera.position).to({ x: 0, y: 100, z: -300 }, 900).easing(TWEEN.Easing.Cubic.InOut).start();
    }
    showSidePanel('Earth Shots', EARTH_SHOTS);
  };

  const createSidePanel = () => {
    const panel = document.createElement('div');
    panel.id = 'sidePanel';
    panel.style.cssText = `
      position: absolute; top: 80px; right: 20px; width: 320px; max-height: 70vh;
      background: rgba(0,0,0,0.85); color:white; padding:16px; border-radius:10px; overflow-y:auto; z-index:1000; display:none;
    `;
    document.body.appendChild(panel);
    document.addEventListener('click', (ev) => {
      const menuContainer = document.querySelector('[data-menu-container]');
      if (!panel.contains(ev.target) && !menuContainer.contains(ev.target)) {
        panel.style.display = 'none';
        const items = document.querySelectorAll('[data-menu-item]');
        items.forEach(it => it.style.background = 'transparent');
      }
    });
    return panel;
  };

  const showSidePanel = (type, items) => {
    const panel = document.getElementById('sidePanel');
    panel.style.display = 'block';
    const colors = { Embassies: '#ff9999', Tools: '#99ccff', 'Earth Shots': '#99ff99' };
    let html = `<h2 style="color:${colors[type]}; margin:0 0 12px 0;">${type}</h2>`;
    if (type === 'Tools') {
      html += getAllTools().map(tool => `<div style="margin-bottom:12px"><strong>${tool.name}</strong><div style="font-size:13px;opacity:0.8">${tool.focus}</div></div>`).join('');
    } else if (type === 'Embassies') {
      html += MAJOR_CITIES.map(c => `<div style="margin-bottom:12px"><strong>${c.name}</strong><div style="font-size:13px;opacity:0.8">Coords: ${c.lat.toFixed(2)}, ${c.lon.toFixed(2)}</div></div>`).join('');
    } else {
      html += EARTH_SHOTS.map(s => `<div style="margin-bottom:12px"><strong>${s.name}</strong><div style="font-size:13px;opacity:0.8">${s.focus}</div></div>`).join('');
    }
    panel.innerHTML = html;
  };

  window.showToolDetails = (toolName) => {
    const tool = getAllTools().find(t => t.name === toolName);
    if (!tool) return;
    const panel = document.getElementById('sidePanel');
    panel.style.display = 'block';
    panel.innerHTML = `
      <h2 style="color:#99ccff;margin:0 0 12px 0">${tool.name}</h2>
      <p style="opacity:0.85">${tool.focus}</p>
      <p style="color:#99ccff80">Category: ${tool.category} • Type: ${tool.type}</p>
      <button onclick="showSidePanel('Tools', getAllTools())" style="margin-top:12px;padding:8px;border-radius:10px;border:1px solid #99ccff;background:none;color:#99ccff;cursor:pointer">← Back</button>
    `;
  };

  window.showEmbassyDetails = (cityName) => {
    const city = MAJOR_CITIES.find(c => c.name === cityName);
    if (!city) return;
    const panel = document.getElementById('sidePanel');
    panel.style.display = 'block';
    panel.innerHTML = `
      <h2 style="color:#ff9999;margin:0 0 12px 0">${city.name} Embassy</h2>
      <p style="opacity:0.9">Focus: ${city.focus || '—'}</p>
      <p style="color:#ff999980">Coords: ${city.lat.toFixed(2)}, ${city.lon.toFixed(2)}</p>
      <button onclick="showSidePanel('Embassies', ${JSON.stringify([])})" style="margin-top:12px;padding:8px;border-radius:10px;border:1px solid #ff9999;background:none;color:#ff9999;cursor:pointer">← Back</button>
    `;
  };

  window.showEarthShotDetails = (shotName) => {
    const shot = EARTH_SHOTS.find(s => s.name === shotName);
    if (!shot) return;
    const panel = document.getElementById('sidePanel');
    panel.style.display = 'block';
    panel.innerHTML = `
      <h2 style="color:#99ff99;margin:0 0 12px 0">${shot.name}</h2>
      <p style="opacity:0.9">${shot.focus}</p>
      <p style="color:#99ff9980">Coords: ${shot.lat.toFixed(2)}, ${shot.lon.toFixed(2)}</p>
      <button onclick="showSidePanel('Earth Shots', ${JSON.stringify([])})" style="margin-top:12px;padding:8px;border-radius:10px;border:1px solid #99ff99;background:none;color:#99ff99;cursor:pointer">← Back</button>
    `;
  };

  // --- Control Panel with toggles (keeps your toggles but lightweight) ---
  const createControlPanel = () => {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.7);
      padding:12px; border-radius:10px; color:white; font-family: Arial; z-index:1000;
    `;
    const controls = [
      { name: 'Flight Paths', id: 'flightPaths', color: '#ff9999', default: true },
      { name: 'Tools', id: 'tools', color: '#99ccff', default: true },
      { name: 'Earth Shots', id: 'earthShots', color: '#99ff99', default: true },
      { name: 'Embassies', id: 'embassies', color: '#ff9999', default: true },
      { name: 'Grid Lines', id: 'grid', color: '#666666', default: true },
    ];

    controls.forEach(control => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;`;
      const toggle = document.createElement('div');
      toggle.style.cssText = `width:36px; height:20px; border-radius:10px; background:${control.default ? control.color + '40' : '#333'}; position:relative;`;
      const slider = document.createElement('div');
      slider.style.cssText = `width:16px; height:16px; border-radius:50%; background:${control.default ? control.color : '#666'}; position:absolute; top:2px; left:${control.default ? '18px' : '2px'}; transition:all 0.18s;`;
      toggle.appendChild(slider);
      const label = document.createElement('span');
      label.textContent = control.name;
      row.appendChild(toggle);
      row.appendChild(label);

      let active = control.default;
      row.addEventListener('click', () => {
        active = !active;
        toggle.style.background = active ? control.color + '40' : '#333';
        slider.style.left = active ? '18px' : '2px';
        slider.style.background = active ? control.color : '#666';

        switch (control.id) {
          case 'flightPaths': if (window.flightPaths) window.flightPaths.visible = active; break;
          case 'tools': if (window.toolsGroup) window.toolsGroup.visible = active; break;
          case 'earthShots': if (window.earthShots) window.earthShots.visible = active; break;
          case 'embassies': if (window.embassies) window.embassies.visible = active; break;
          case 'grid': const grid = scene.children.find(c => c.type === 'Group' && c.children && c.children[0] && c.children[0].type === 'Line'); if (grid) grid.visible = active; break;
        }
        needsRender = true;
      });

      panel.appendChild(row);
    });

    document.body.appendChild(panel);
  };

  // --- Table Button (kept simple) ---
// Create See Tables button and overlay
const createTableButton = () => {
    // Create the button
    const button = document.createElement('div');
    button.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        padding: 12px 24px;
        border-radius: 25px;
        color: white;
        font-family: Arial, sans-serif;
        cursor: pointer;
        z-index: 1000;
        font-size: 14px;
        letter-spacing: 1px;
        text-transform: uppercase;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    button.textContent = 'See Tables';

    // Hover effects
    button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(255, 255, 255, 0.1)';
        button.style.transform = 'translateX(-50%) scale(1.05)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.transform = 'translateX(-50%) scale(1)';
    });

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 2000;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        overflow-y: auto;
    `;

    // Create overlay content
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 1200px;
        margin: 40px auto;
        padding: 20px;
        color: white;
        font-family: Arial, sans-serif;
    `;

    // Add close button
    const closeButton = document.createElement('div');
    closeButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.3s ease;
    `;
    closeButton.innerHTML = '×';
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    // Add content sections
    content.innerHTML = `
        <h1 style="
            font-size: 32px;
            margin-bottom: 30px;
            text-align: center;
            color: #fff;
        ">AIME Philosophy & Programs</h1>

        <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        ">
            <div class="section">
                <h2 style="color: #ff9999; margin-bottom: 20px;">Embassies</h2>
                <div class="table" style="
                    background: rgba(255, 153, 153, 0.1);
                    border-radius: 10px;
                    padding: 20px;
                ">
                    ${MAJOR_CITIES.map(city => `
                        <div style="
                            padding: 10px;
                            border-bottom: 1px solid rgba(255, 153, 153, 0.2);
                        ">
                            <h3 style="margin: 0; color: #ff9999;">${city.name}</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.8;">
                                Coordinates: ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2 style="color: #99ccff; margin-bottom: 20px;">Tools</h2>
                <div class="table" style="
                    background: rgba(153, 204, 255, 0.1);
                    border-radius: 10px;
                    padding: 20px;
                ">
                    ${getAllTools().map(tool => `
                        <div style="
                            padding: 10px;
                            border-bottom: 1px solid rgba(153, 204, 255, 0.2);
                        ">
                            <h3 style="margin: 0; color: #99ccff;">${tool.name}</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.8;">${tool.focus}</p>
                            <p style="margin: 5px 0 0 0; opacity: 0.6;">
                                Category: ${tool.category} | Type: ${tool.type}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2 style="color: #99ff99; margin-bottom: 20px;">Earth Shots</h2>
                <div class="table" style="
                    background: rgba(153, 255, 153, 0.1);
                    border-radius: 10px;
                    padding: 20px;
                ">
                    ${EARTH_SHOTS.map(shot => `
                        <div style="
                            padding: 10px;
                            border-bottom: 1px solid rgba(153, 255, 153, 0.2);
                        ">
                            <h3 style="margin: 0; color: #99ff99;">${shot.name}</h3>
                            <p style="margin: 5px 0 0 0; opacity: 0.8;">
                                Location: ${shot.lat.toFixed(2)}°, ${shot.lon.toFixed(2)}°
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div style="
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            margin-top: 40px;
        ">
            <h2 style="margin-bottom: 20px;">About AIME</h2>
            <p style="
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
                opacity: 0.8;
            ">
                AIME is a global network connecting imagination with opportunity. 
                Through our embassies, tools, and environmental initiatives, we're 
                building bridges between cultures and creating pathways for positive change.
            </p>
        </div>
    `;

    overlay.appendChild(closeButton);
    overlay.appendChild(content);

    // Add click handlers
    button.addEventListener('click', () => {
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    });

    closeButton.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    });

    document.body.appendChild(button);
    document.body.appendChild(overlay);
};

  // --- Animation Loop with FPS cap and idle skipping ---
  function animate(now) {
    requestAnimationFrame(animate);
    if (!lastFrameTime) lastFrameTime = now;
    const delta = now - lastFrameTime;
    if (delta < FRAME_INTERVAL) {
      return;
    }
    lastFrameTime = now;

    // Update animations
    // decide if there are continuous animation functions that need running every frame
    const hasContinuous = window.animationFunctions && window.animationFunctions.length > 0;
    // Run animation functions if any
    if (hasContinuous) {
      window.animationFunctions.forEach(fn => { try { fn(); } catch (e) { console.error('anim fn err', e); } });
    }

    // Update TWEEN only when active or needed (safe to run)
    if (window.TWEEN) {
      try { TWEEN.update(); } catch (e) { /* ignore */ }
    }

    // Controls update
    if (controls) controls.update();

    // Decide whether we should render:
    // render if animations exist OR if user interaction triggered need OR always once per few frames
    if (hasContinuous || needsRender) {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      needsRender = false; // reset until something sets it true again
    } else {
      // Skip rendering to save GPU cycles
    }
  }

  // --- Boot sequence: wait for DOM & TWEEN if present ---
  const boot = async () => {
    // Wait DOM
    if (document.readyState === 'loading') {
      await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
    }
    // Load TWEEN if not present (non-blocking)
    if (!window.TWEEN) {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js';
        s.onload = () => { console.log('TWEEN loaded'); resolve(); };
        s.onerror = () => { console.warn('TWEEN failed to load (optional)'); resolve(); };
        document.head.appendChild(s);
      });
    }
    // Initialize
    await initBasicScene();
    // add tooltip
    const tooltip = createTooltip();
    addTooltipInteraction(scene, camera, tooltip);

    // initial render
    needsRender = true;
  };

  // Start boot
  boot().catch(err => console.error('Boot error', err));

  // Expose some utilities for debugging
  window.__globeUtils = {
    forceRender: () => { needsRender = true; },
    setFPS: (f) => { if (f > 5 && f <= 240) { lastFrameTime = 0; /* reset timing */ /* mutate target fps */ } },
  };
})();
