// Tactical Arena World: Sector-7 Neon Relay
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWorld(scene) {
  const colliders = [];
  const shootables = [];

  // Ambient & Directional Cyberpunk Lighting
  const hemiLight = new THREE.HemisphereLight(0x223355, 0x050810, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xddeeff, 1.2);
  dirLight.position.set(24, 40, 16);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 120;
  const d = 36;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Floor grid
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.surface,
    roughness: 0.7,
    metalness: 0.3,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Outer boundary walls
  const wallMat = new THREE.MeshStandardMaterial({
    color: PALETTE.metalDark,
    roughness: 0.8,
    metalness: 0.4,
  });
  const wallThickness = 2;
  const wallHeight = 7;
  const arenaHalf = 38;

  function addWall(x, z, w, d) {
    const geo = new THREE.BoxGeometry(w, wallHeight, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    shootables.push(mesh);
    return mesh;
  }

  // Outer walls
  addWall(0, -arenaHalf, 80, wallThickness);
  addWall(0, arenaHalf, 80, wallThickness);
  addWall(-arenaHalf, 0, wallThickness, 80);
  addWall(arenaHalf, 0, wallThickness, 80);

  // Tactical Crates & Cover Barriers
  const crateMat = new THREE.MeshStandardMaterial({
    color: PALETTE.crate,
    roughness: 0.4,
    metalness: 0.6,
  });
  const neonMatCyan = new THREE.MeshBasicMaterial({ color: PALETTE.neonCyan });
  const neonMatMag = new THREE.MeshBasicMaterial({ color: PALETTE.neonMagenta });

  function addCoverCrate(x, z, w, h, d, neonColor = null) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, crateMat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Neon edge trim
    if (neonColor) {
      const trimGeo = new THREE.BoxGeometry(w + 0.05, 0.08, d + 0.05);
      const trim = new THREE.Mesh(trimGeo, neonColor === 'cyan' ? neonMatCyan : neonMatMag);
      trim.position.set(x, h - 0.04, z);
      scene.add(trim);
    }

    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    shootables.push(mesh);
    return mesh;
  }

  // Layout cover objects
  addCoverCrate(-10, -12, 3, 2.2, 3, 'cyan');
  addCoverCrate(-10, 12, 3, 2.2, 3, 'magenta');
  addCoverCrate(10, -12, 3, 2.2, 3, 'cyan');
  addCoverCrate(10, 12, 3, 2.2, 3, 'magenta');

  addCoverCrate(-18, 0, 2.5, 2.4, 5, 'cyan');
  addCoverCrate(18, 0, 2.5, 2.4, 5, 'magenta');

  addCoverCrate(-6, -4, 4, 1.4, 1.8);
  addCoverCrate(6, 4, 4, 1.4, 1.8);

  // Central Objective: The Data Core Terminal
  const terminalGroup = new THREE.Group();
  terminalGroup.position.set(0, 0, 0);

  const termBaseGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 16);
  const termBaseMat = new THREE.MeshStandardMaterial({ color: PALETTE.metalLight, metalness: 0.8, roughness: 0.2 });
  const termBase = new THREE.Mesh(termBaseGeo, termBaseMat);
  termBase.position.y = 0.6;
  termBase.castShadow = true;
  terminalGroup.add(termBase);

  // Hologram ring
  const holoGeo = new THREE.TorusGeometry(1.6, 0.06, 8, 32);
  const holoMat = new THREE.MeshBasicMaterial({ color: PALETTE.terminal });
  const holoMesh = new THREE.Mesh(holoGeo, holoMat);
  holoMesh.rotation.x = Math.PI / 2;
  holoMesh.position.y = 2.0;
  terminalGroup.add(holoMesh);

  // Glowing core beacon light
  const coreLight = new THREE.PointLight(PALETTE.terminal, 2.5, 14);
  coreLight.position.y = 2.2;
  terminalGroup.add(coreLight);

  scene.add(terminalGroup);
  colliders.push({ minX: -2.2, maxX: 2.2, minZ: -2.2, maxZ: 2.2 });
  shootables.push(termBase);

  // Overhead Neon Strip Conduits
  function addNeonConduit(x, z, len, isHoriz, color) {
    const geo = isHoriz ? new THREE.BoxGeometry(len, 0.08, 0.15) : new THREE.BoxGeometry(0.15, 0.08, len);
    const mesh = new THREE.Mesh(geo, color === 'cyan' ? neonMatCyan : neonMatMag);
    mesh.position.set(x, 0.04, z);
    scene.add(mesh);
  }

  addNeonConduit(0, -20, 36, true, 'cyan');
  addNeonConduit(0, 20, 36, true, 'magenta');
  addNeonConduit(-20, 0, 36, false, 'cyan');
  addNeonConduit(20, 0, 36, false, 'magenta');

  return {
    colliders,
    shootables,
    holoMesh,
    terminalGroup,
    step(dt, elapsed) {
      holoMesh.rotation.z = elapsed * 1.5;
      holoMesh.position.y = 2.0 + Math.sin(elapsed * 3) * 0.15;
    },
  };
}
