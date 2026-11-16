// Tactical Weapon Arsenal & Ballistics System
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { sound } from './audio.js';

export const WEAPON_TYPES = {
  PISTOL: {
    id: 'pistol',
    name: 'Pulse-9 Sidearm',
    price: 0,
    magSize: 15,
    reserveMax: 60,
    fireRate: 0.16,
    damage: 32,
    headshotMult: 2.5,
    recoilPitch: 0.015,
    recoilYaw: 0.006,
    baseSpread: 0.008,
    moveSpreadMult: 2.2,
    reloadTime: 1.4,
    color: 0x00f3ff,
  },
  SMG: {
    id: 'smg',
    name: 'Vector-Neon SMG',
    price: 1200,
    magSize: 30,
    reserveMax: 120,
    fireRate: 0.08,
    damage: 24,
    headshotMult: 2.0,
    recoilPitch: 0.012,
    recoilYaw: 0.009,
    baseSpread: 0.014,
    moveSpreadMult: 1.8,
    reloadTime: 1.8,
    color: 0xff0055,
  },
  RIFLE: {
    id: 'rifle',
    name: 'Viper-AR Tactical Rifle',
    price: 2700,
    magSize: 30,
    reserveMax: 90,
    fireRate: 0.11,
    damage: 38,
    headshotMult: 3.2,
    recoilPitch: 0.022,
    recoilYaw: 0.010,
    baseSpread: 0.005,
    moveSpreadMult: 3.5,
    reloadTime: 2.2,
    color: 0xffb700,
  },
  SNIPER: {
    id: 'sniper',
    name: 'Apex-Rail Sniper',
    price: 4500,
    magSize: 5,
    reserveMax: 20,
    fireRate: 0.95,
    damage: 110,
    headshotMult: 4.0,
    recoilPitch: 0.055,
    recoilYaw: 0.015,
    baseSpread: 0.002,
    moveSpreadMult: 8.0,
    reloadTime: 2.8,
    color: 0x00ff88,
  },
};

export function createWeapons(camera) {
  const group = new THREE.Group();
  camera.add(group);

  // Mesh construction for tactical gun viewmodel
  const gunMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.metalDark,
    roughness: 0.35,
    metalness: 0.85,
  });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.neonCyan });

  // Receiver
  const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.42);
  const bodyMesh = new THREE.Mesh(bodyGeo, gunMaterial);
  bodyMesh.position.set(0.18, -0.16, -0.42);
  group.add(bodyMesh);

  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.28, 12);
  barrelGeo.rotateX(Math.PI / 2);
  const barrelMesh = new THREE.Mesh(barrelGeo, gunMaterial);
  barrelMesh.position.set(0.18, -0.13, -0.62);
  group.add(barrelMesh);

  // Glowing neon sight
  const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.08);
  const sightMesh = new THREE.Mesh(sightGeo, accentMaterial);
  sightMesh.position.set(0.18, -0.09, -0.5);
  group.add(sightMesh);

  // Muzzle flash light
  const flashLight = new THREE.PointLight(PALETTE.neonCyan, 0, 8);
  flashLight.position.set(0.18, -0.13, -0.78);
  group.add(flashLight);

  let currentType = WEAPON_TYPES.RIFLE;
  const state = {
    type: currentType,
    mag: currentType.magSize,
    reserve: currentType.reserveMax,
    cooling: 0,
    reloading: false,
    reloadTimer: 0,
    flashTimer: 0,
    kickZ: 0,
    kickRot: 0,
  };

  function setWeapon(typeKey) {
    const type = WEAPON_TYPES[typeKey] || WEAPON_TYPES.RIFLE;
    currentType = type;
    state.type = type;
    state.mag = type.magSize;
    state.reserve = type.reserveMax;
    state.cooling = 0;
    state.reloading = false;
    accentMaterial.color.setHex(type.color);
    flashLight.color.setHex(type.color);
    sound.playBuy();
  }

  function readyToFire() {
    return state.cooling <= 0 && !state.reloading && state.mag > 0;
  }

  function triggerFire() {
    if (!readyToFire()) return false;
    state.mag -= 1;
    state.cooling = state.type.fireRate;
    state.flashTimer = 0.05;
    flashLight.intensity = 4.0;
    state.kickZ = 0.08;
    state.kickRot = 0.12;

    sound.playShot(1.0, state.type === WEAPON_TYPES.RIFLE || state.type === WEAPON_TYPES.SNIPER);
    return true;
  }

  function reload() {
    if (state.reloading || state.mag >= state.type.magSize || state.reserve <= 0) return;
    state.reloading = true;
    state.reloadTimer = state.type.reloadTime;
    sound.playReload();
  }

  function step(dt) {
    if (state.cooling > 0) state.cooling -= dt;
    if (state.flashTimer > 0) {
      state.flashTimer -= dt;
      if (state.flashTimer <= 0) flashLight.intensity = 0;
    }

    // Recoil recovery
    state.kickZ = THREE.MathUtils.lerp(state.kickZ, 0, dt * 14);
    state.kickRot = THREE.MathUtils.lerp(state.kickRot, 0, dt * 12);
    bodyMesh.position.z = -0.42 + state.kickZ;
    bodyMesh.rotation.x = state.kickRot;

    // Reload timer
    if (state.reloading) {
      state.reloadTimer -= dt;
      bodyMesh.rotation.z = Math.sin((state.reloadTimer / state.type.reloadTime) * Math.PI) * 0.4;
      if (state.reloadTimer <= 0) {
        state.reloading = false;
        bodyMesh.rotation.z = 0;
        const needed = state.type.magSize - state.mag;
        const taking = Math.min(needed, state.reserve);
        state.mag += taking;
        state.reserve -= taking;
      }
    }
  }

  function calcSpread(speed) {
    let spread = state.type.baseSpread;
    if (speed > 1.5) spread += state.type.baseSpread * state.type.moveSpreadMult;
    return spread;
  }

  return {
    state,
    setWeapon,
    readyToFire,
    triggerFire,
    reload,
    step,
    calcSpread,
  };
}
