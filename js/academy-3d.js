import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

const canvas = document.getElementById('academy3dCanvas');
const hero = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compactQuery = window.matchMedia('(max-width: 760px)');
const saveData = Boolean(navigator.connection?.saveData);
const lowCoreDevice = Boolean(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const startsInPerformanceMode = compactQuery.matches || saveData || lowCoreDevice;

if (canvas && hero) {
  const heroBg = hero.querySelector('.hero-bg');
  const hotspotLayer = document.createElement('div');
  hotspotLayer.className = 'academy-3d-hotspots';
  heroBg?.appendChild(hotspotLayer);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !startsInPerformanceMode,
    preserveDrawingBuffer: false,
    powerPreference: startsInPerformanceMode ? 'low-power' : 'high-performance'
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const root = new THREE.Group();
  const atlas = new THREE.Group();
  const pointer = new THREE.Vector2(0, 0);
  const targetPointer = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();
  const detail = startsInPerformanceMode
    ? { nodeSegments: 16, coreDetail: 1, globeWidth: 28, globeHeight: 12, shellWidth: 32, shellHeight: 16, torusSegments: 96, starCount: 76, panelCount: 4 }
    : { nodeSegments: 24, coreDetail: 2, globeWidth: 36, globeHeight: 18, shellWidth: 48, shellHeight: 24, torusSegments: 160, starCount: 180, panelCount: 5 };
  let isPerformanceMode = startsInPerformanceMode;
  let isSceneVisible = true;
  let isPageVisible = !document.hidden;
  let lastFrameTime = 0;
  let animationFrameId = 0;
  let orbitAngle = 0;
  let hoveredHref = '';

  scene.add(root);
  root.add(atlas);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
  const keyLight = new THREE.DirectionalLight(0xf4d77e, 2.2);
  const rimLight = new THREE.PointLight(0x4fd1c5, 24, 18);
  keyLight.position.set(-4, 5, 5);
  rimLight.position.set(4, -2, 3);
  scene.add(ambientLight, keyLight, rimLight);

  const palette = {
    navy: 0x0b2545,
    gold: 0xd8ad3a,
    paleGold: 0xffe39b,
    teal: 0x2ed0b5,
    blue: 0x78c7ff,
    coral: 0xff7a63,
    paper: 0xeaf0f7
  };

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: palette.gold,
    metalness: 0.42,
    roughness: 0.28,
    emissive: 0x3b2600,
    emissiveIntensity: 0.22
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: palette.paper,
    transparent: true,
    opacity: 0.16,
    roughness: 0.1,
    metalness: 0.08
  });

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: palette.paleGold,
    wireframe: true,
    transparent: true,
    opacity: 0.18
  });

  const nodeGeometry = new THREE.SphereGeometry(0.105, detail.nodeSegments, detail.nodeSegments);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, detail.coreDetail), coreMaterial);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.62, detail.globeWidth, detail.globeHeight), wireMaterial);
  const glassShell = new THREE.Mesh(new THREE.SphereGeometry(1.55, detail.shellWidth, detail.shellHeight), glassMaterial);
  const innerCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38, 1),
    new THREE.MeshStandardMaterial({
      color: palette.teal,
      transparent: true,
      opacity: 0.72,
      roughness: 0.18,
      metalness: 0.18,
      emissive: 0x073d35,
      emissiveIntensity: 0.28
    })
  );

  atlas.add(globe, glassShell, core, innerCrystal);

  const rings = [
    { radius: 1.95, tube: 0.007, rotation: [Math.PI / 2.55, 0.12, 0.38], color: palette.gold, opacity: 0.56 },
    { radius: 2.24, tube: 0.005, rotation: [0.15, Math.PI / 2.2, -0.3], color: palette.blue, opacity: 0.34 },
    { radius: 1.27, tube: 0.006, rotation: [Math.PI / 2, Math.PI / 6, 0], color: palette.teal, opacity: 0.4 }
  ];

  rings.forEach((ring) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ring.radius, ring.tube, 8, detail.torusSegments),
      new THREE.MeshBasicMaterial({
        color: ring.color,
        transparent: true,
        opacity: ring.opacity
      })
    );
    mesh.rotation.set(...ring.rotation);
    atlas.add(mesh);
  });

  const nodeData = [
    { key: 'ai', label: 'AI', href: 'programs.html#ai', color: palette.teal, position: [0.05, 1.75, 0.62] },
    { key: 'finance', label: 'Finance', href: 'programs.html#finance', color: palette.gold, position: [1.55, 0.58, 0.44] },
    { key: 'hr', label: 'HR / SHRM', href: 'programs.html#shrm', color: palette.coral, position: [-1.36, 0.78, 0.78] },
    { key: 'ielts', label: 'IELTS', href: 'programs.html#ielts', color: palette.blue, position: [-1.48, -0.56, 0.52] },
    { key: 'english', label: 'English', href: 'programs.html#english', color: palette.paper, position: [-1.72, 0.08, 0.5] },
    { key: 'acca', label: 'ACCA', href: 'programs.html#acca', color: palette.paleGold, position: [1.24, -1.07, 0.36] },
    { key: 'cips', label: 'CIPS', href: 'programs.html#cips', color: palette.teal, position: [-0.58, 1.04, 1.15] },
    { key: 'universities', label: 'Universities', href: 'universities.html', color: palette.blue, position: [0.88, 1.18, 0.92] }
  ];

  const lineMaterial = new THREE.LineBasicMaterial({
    color: palette.paleGold,
    transparent: true,
    opacity: 0.34
  });

  const nodes = [];

  nodeData.forEach((node, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: node.color,
      roughness: 0.22,
      metalness: 0.25,
      emissive: node.color,
      emissiveIntensity: 0.12
    });
    const mesh = new THREE.Mesh(nodeGeometry, material);
    mesh.position.set(...node.position);
    mesh.userData.phase = index * 0.47;
    mesh.userData.href = node.href;
    mesh.userData.label = node.label;

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...node.position)
      ]),
      lineMaterial
    );

    const label = createLabelSprite(node.label, node.color);
    label.position.set(node.position[0] * 1.12, node.position[1] * 1.12, node.position[2] + 0.2);
    label.userData.href = node.href;
    label.userData.label = node.label;

    const hotspot = createHotspot(node);

    atlas.add(line, mesh, label);
    nodes.push({ mesh, label, line, href: node.href, hotspot });
  });

  const gateway = new THREE.Group();
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.24,
    roughness: 0.18,
    metalness: 0.08
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: palette.gold, transparent: true, opacity: 0.54 });

  for (let i = 0; i < detail.panelCount; i += 1) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.018), panelMaterial);
    panel.position.set(-1.1 + i * 0.55, -2.08 + Math.sin(i) * 0.06, -0.42 - i * 0.045);
    panel.rotation.set(-0.32, 0.18, -0.12 + i * 0.045);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), edgeMaterial);
    panel.add(edges);
    gateway.add(panel);
  }

  gateway.rotation.set(0.14, -0.24, 0.05);
  atlas.add(gateway);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = detail.starCount;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const gold = new THREE.Color(palette.gold);
  const blue = new THREE.Color(palette.blue);
  const teal = new THREE.Color(palette.teal);

  for (let i = 0; i < starCount; i += 1) {
    const radius = 2.9 + Math.random() * 2.9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    starPositions[i * 3 + 1] = Math.cos(phi) * radius * 0.82;
    starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - 0.4;

    const color = i % 3 === 0 ? gold : i % 3 === 1 ? blue : teal;
    starColors[i * 3] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.72
    })
  );
  root.add(stars);

  window.addEventListener('pointermove', (event) => {
    if (isPerformanceMode && event.pointerType !== 'mouse') return;
    targetPointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    targetPointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver((entries) => {
      isSceneVisible = entries.some((entry) => entry.isIntersecting);
      if (isSceneVisible) scheduleAnimation();
    }, { threshold: 0.05 });
    visibilityObserver.observe(hero);
  }

  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible) scheduleAnimation();
  });

  window.addEventListener('scroll', renderOnce, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  resize();
  if (reduceMotion) {
    renderOnce();
  } else {
    scheduleAnimation();
  }

  function resize() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const isCompact = width < 760;
    isPerformanceMode = isCompact || saveData || lowCoreDevice;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPerformanceMode ? 1.15 : 1.65));
    const canvasWidth = canvas.clientWidth || width;
    const canvasHeight = canvas.clientHeight || height;
    renderer.setSize(canvasWidth, canvasHeight, false);

    camera.aspect = canvasWidth / canvasHeight;
    camera.position.set(0, 0, isCompact ? 7.4 : 6.3);
    camera.updateProjectionMatrix();

    root.position.set(isCompact ? 0.78 : 2.36, isCompact ? -0.08 : 0.02, 0);
    root.scale.setScalar(isCompact ? 0.72 : 0.86);
    positionHotspots();
    renderOnce();
  }

  function animate(frameTime = 0) {
    animationFrameId = 0;
    if (!isSceneVisible || !isPageVisible) return;

    scheduleAnimation();

    const minFrameTime = isPerformanceMode ? 1000 / 28 : 1000 / 60;
    if (frameTime - lastFrameTime < minFrameTime) return;
    lastFrameTime = frameTime;

    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    pointer.lerp(targetPointer, 0.045);

    const scrollProgress = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1.4);
    if (!hoveredHref) {
      orbitAngle += delta * (isPerformanceMode ? 0.09 : 0.14);
      const targetY = orbitAngle + pointer.x * (isPerformanceMode ? 0.08 : 0.18) + scrollProgress * 0.2;
      const targetX = -0.08 + pointer.y * (isPerformanceMode ? 0.04 : 0.08) + Math.sin(elapsed * 0.22) * 0.035;
      const targetZ = Math.sin(elapsed * 0.16) * 0.026;
      atlas.rotation.y += (targetY - atlas.rotation.y) * 0.055;
      atlas.rotation.x += (targetX - atlas.rotation.x) * 0.06;
      atlas.rotation.z += (targetZ - atlas.rotation.z) * 0.05;
    }

    globe.rotation.y -= delta * (isPerformanceMode ? 0.06 : 0.09);
    globe.rotation.x = Math.sin(elapsed * 0.2) * 0.025;
    glassShell.rotation.y += delta * (isPerformanceMode ? 0.035 : 0.055);
    glassShell.rotation.z = Math.sin(elapsed * 0.13) * 0.018;
    core.rotation.y += delta * 0.2;
    core.rotation.x += delta * 0.11;
    innerCrystal.rotation.y += delta * 0.22;
    innerCrystal.rotation.x = Math.sin(elapsed * 0.3) * 0.12;
    stars.rotation.y -= delta * (isPerformanceMode ? 0.008 : 0.015);

    nodes.forEach((node, index) => {
      const pulse = 1 + Math.sin(elapsed * 1.4 + node.mesh.userData.phase) * (isPerformanceMode ? 0.055 : 0.1);
      const hoverScale = hoveredHref === node.href ? 1.3 : 1;
      node.mesh.scale.setScalar(pulse * hoverScale);
      node.label.material.opacity = hoveredHref === node.href ? 1 : 0.74 + Math.sin(elapsed * 1.2 + index) * 0.12;
    });

    positionHotspots();
    renderer.render(scene, camera);

  }

  function scheduleAnimation() {
    if (reduceMotion || animationFrameId || !isSceneVisible || !isPageVisible) return;
    animationFrameId = requestAnimationFrame(animate);
  }

  function renderOnce() {
    positionHotspots();
    if (reduceMotion) {
      renderer.render(scene, camera);
    }
  }

  function createHotspot(node) {
    const hotspot = document.createElement('a');
    hotspot.className = 'academy-3d-hotspot';
    hotspot.href = node.href;
    hotspot.dataset.academyNode = node.key;
    hotspot.textContent = node.label;
    hotspot.setAttribute(
      'aria-label',
      node.label === 'Universities'
        ? 'Universitetlər səhifəsinə keç'
        : `${node.label} proqramına keç`
    );
    hotspot.addEventListener('pointerenter', () => {
      hoveredHref = node.href;
    });
    hotspot.addEventListener('focus', () => {
      hoveredHref = node.href;
    });
    hotspot.addEventListener('pointerleave', () => {
      if (hoveredHref === node.href) hoveredHref = '';
    });
    hotspot.addEventListener('blur', () => {
      if (hoveredHref === node.href) hoveredHref = '';
    });
    hotspotLayer.appendChild(hotspot);
    return hotspot;
  }

  function positionHotspots() {
    if (!hotspotLayer) return;

    const heroRect = hero.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const projected = new THREE.Vector3();

    nodes.forEach((node) => {
      node.label.getWorldPosition(projected);
      projected.project(camera);

      const x = canvasRect.left - heroRect.left + (projected.x * 0.5 + 0.5) * canvasRect.width;
      const y = canvasRect.top - heroRect.top + (-projected.y * 0.5 + 0.5) * canvasRect.height;
      const width = node.label.userData.label.length > 6 ? 138 : 96;
      const clearOfHeroCopy = heroRect.width < 760 || x > heroRect.width * 0.74 || y > heroRect.height * 0.72;
      const isVisible =
        projected.z > -1 &&
        projected.z < 1 &&
        clearOfHeroCopy &&
        x > -width &&
        x < heroRect.width + width &&
        y > 20 &&
        y < heroRect.height - 20;

      node.hotspot.style.width = `${width}px`;
      node.hotspot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      node.hotspot.hidden = !isVisible;
      node.label.visible = isVisible;
    });
  }
}

function createLabelSprite(text, color) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 160;

  const context = labelCanvas.getContext('2d');
  const colorStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = 'rgba(7, 26, 51, 0.74)';
  roundRect(context, 42, 44, 428, 72, 24);
  context.fill();
  context.strokeStyle = colorStyle;
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '700 42px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 81);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(text.length > 5 ? 1.35 : 0.82, 0.26, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
