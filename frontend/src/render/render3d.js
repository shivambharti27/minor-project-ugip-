import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { FURNITURE_COLORS, WALL_HEIGHT_FT } from '../config/constants.js';
import { roomFill as roomColor } from '../config/theme.js';
import { buildRoomWalls } from '../engine/doors.js';
import { computeFurniture } from './furniture.js';

// =========================================================
// 3D RENDERING (Three.js) — same layout + doors data as 2D
// =========================================================
let three = null; // { renderer, labelRenderer, scene, camera, controls, group }

export function resizeThree() { if (three) three.resizeToContainer(); }

export function initThreeIfNeeded() {
  if (three) return;
  const container = document.getElementById('three-container');
  const w = container.clientWidth || 600, h = container.clientHeight || 460;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setClearColor(0xF6ECE3);
  container.appendChild(renderer.domElement);

  const labelLayer = document.createElement('div');
  labelLayer.id = 'three-labels';
  container.appendChild(labelLayer);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelLayer.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  // Large far plane + modest near plane so nothing gets clipped even when fully zoomed out to see the whole plot.
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 5000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // Explicitly allow a full vertical sweep: straight top-down (0) to straight bottom-up (PI).
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.screenSpacePanning = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(60, 90, 40);
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dir2.position.set(-50, 60, -40);
  scene.add(dir2);

  const group = new THREE.Group();
  scene.add(group);

  three = { renderer, labelRenderer, scene, camera, controls, group, container };

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();

  function resizeToContainer() {
    const w2 = container.clientWidth, h2 = container.clientHeight;
    if (w2 === 0 || h2 === 0) return;
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
    labelRenderer.setSize(w2, h2);
  }
  window.addEventListener('resize', resizeToContainer);
  three.resizeToContainer = resizeToContainer;
}

export function makeRoomLabel(text) {
  const div = document.createElement('div');
  div.className = 'room-label-3d';
  div.textContent = text;
  return new CSS2DObject(div);
}

export function hexToInt(hex) { return parseInt(hex.replace('#', ''), 16); }

export function render3D(layout, doors, length, width) {
  initThreeIfNeeded();
  const { group, camera, controls } = three;
  while (group.children.length) group.remove(group.children[0]);

  const cx0 = width / 2, cz0 = length / 2; // center offset so model sits around origin
  const allLeaves = [...layout.pubLeaves, ...layout.privLeaves];
  const WALL_T = 0.5;

  // Ground plate (slightly larger than plot, neutral)
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(width + 6, 0.3, length + 6),
    new THREE.MeshStandardMaterial({ color: 0xD9CBAE })
  );
  ground.position.set(0, -0.2, 0);
  group.add(ground);

  // Room floors
  allLeaves.forEach(l => {
    const colorHex = hexToInt(roomColor(l.room));
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(l.rect.w, 0.3, l.rect.h),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    floor.position.set(l.rect.x + l.rect.w / 2 - cx0, 0, l.rect.y + l.rect.h / 2 - cz0);
    group.add(floor);
  });
  // Outer boundary walls (full perimeter, door-gapped at entrance only) — neutral
  // warm-white, matching how real architectural massing models are finished.
  const outerRect = { x: 0, y: 0, w: width, h: length };
  const outerWalls = buildRoomWalls(outerRect, doors.filter(d => d.isEntrance || d.isGate));
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xEDE6D8 });
  outerWalls.forEach(w => addWallMesh(w, wallMat, cx0, cz0, WALL_T, group));

  // Interior partition walls (door-gapped at all relevant openings)
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0xF5F1E8 });
  allLeaves.forEach(l => {
    if (l.room.kind === "parking" || l.room.kind === "garden") return; // open car porch / garden: no walls
    const walls = buildRoomWalls(l.rect, doors);
    walls.forEach(w => addWallMesh(w, interiorMat, cx0, cz0, WALL_T, group));
  });

  // Furniture — low extruded blocks using the same furniture data as the 2D plan.
  allLeaves.forEach(l => {
    const furniture = computeFurniture(l, doors);
    furniture.forEach(f => {
      const heightMap = { bed: 1.6, wardrobe: 6.0, sofa: 2.6, tv_unit: 4.5, counter: 2.9, toilet: 1.3, basin: 2.8, shelf: 5.5, car: 4.5, dining_table: 2.6, tree: 9 };
      const hgt = heightMap[f.type] || 1.5;
      const colorHex = hexToInt(FURNITURE_COLORS[f.type] || "#999999");
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(f.rect.w, hgt, f.rect.h),
        new THREE.MeshStandardMaterial({ color: colorHex })
      );
      mesh.position.set(f.rect.x + f.rect.w / 2 - cx0, hgt / 2 + 0.2, f.rect.y + f.rect.h / 2 - cz0);
      group.add(mesh);
    });
  });

  // Optional roof: a simple flat slab sitting on top of the walls.
  if (document.getElementById('showRoofInput').checked) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.5, 0.6, length + 1.5),
      new THREE.MeshStandardMaterial({ color: 0xB85042 })
    );
    roof.position.set(0, WALL_HEIGHT_FT + 0.3, 0);
    group.add(roof);
  }

  // Entrance marker: a small gold threshold strip just inside the doorway
  const entDoor = doors.find(d => d.isEntrance);
  if (entDoor) {
    const e = entDoor.edge;
    const midFt = (e.from + e.to) / 2;
    const matGold = new THREE.MeshStandardMaterial({ color: 0xFFC857 });
    let mesh;
    if (e.axis === "h") {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(entDoor.widthFt, 0.15, 1.2), matGold);
      mesh.position.set(midFt - cx0, 0.08, e.pos - cz0 + (e.pos < length / 2 ? 1 : -1));
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, entDoor.widthFt), matGold);
      mesh.position.set(e.pos - cx0 + (e.pos < width / 2 ? 1 : -1), 0.08, midFt - cz0);
    }
    group.add(mesh);
    const entLabel = makeRoomLabel("⬤ MAIN ENTRANCE");
    entLabel.element.style.background = "rgba(184,134,11,0.92)";
    entLabel.position.set(mesh.position.x, WALL_HEIGHT_FT * 0.4, mesh.position.z);
    group.add(entLabel);
  }

  // Floating room-name labels, positioned above each room at a height that
  // scales a little with wall height so they stay readable at any zoom.
  allLeaves.forEach(l => {
    const label = makeRoomLabel(l.room.name + (l.ensuiteOf ? " (ensuite)" : ""));
    label.position.set(l.rect.x + l.rect.w / 2 - cx0, WALL_HEIGHT_FT + 2.5, l.rect.y + l.rect.h / 2 - cz0);
    group.add(label);
  });
  // ---- Frame the camera with real clearance around the whole model ----
  const maxDim = Math.max(width, length);
  const modelRadius = Math.sqrt(width * width + length * length) / 2;
  // Distance needed so the model (plus labels floating above it) fits in view, with ~35% margin.
  const fitDistance = (modelRadius + WALL_HEIGHT_FT) / Math.sin((camera.fov * Math.PI / 180) / 2) * 1.35;

  controls.minDistance = Math.max(8, maxDim * 0.15);
  controls.maxDistance = fitDistance * 3;
  controls.target.set(0, WALL_HEIGHT_FT * 0.3, 0);

  camera.position.set(fitDistance * 0.55, fitDistance * 0.65, fitDistance * 0.55);
  camera.near = Math.max(0.5, fitDistance * 0.01);
  camera.far = fitDistance * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

export function addWallMesh(w, material, cx0, cz0, thickness, group) {
  const lenFt = w.to - w.from;
  let geo, pos;
  if (w.axis === "h") {
    geo = new THREE.BoxGeometry(lenFt, WALL_HEIGHT_FT, thickness);
    pos = [(w.from + w.to) / 2 - cx0, WALL_HEIGHT_FT / 2, w.pos - cz0];
  } else {
    geo = new THREE.BoxGeometry(thickness, WALL_HEIGHT_FT, lenFt);
    pos = [w.pos - cx0, WALL_HEIGHT_FT / 2, (w.from + w.to) / 2 - cz0];
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  group.add(mesh);
}

