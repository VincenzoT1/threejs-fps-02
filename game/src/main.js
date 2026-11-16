// NEON PROTOCOL: TACTICAL STRIKE - Core Game Loop & Simulation Engine
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { sound } from './audio.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapons, WEAPON_TYPES } from './weapons.js';
import { createBots } from './bots.js';
import { createHud } from './hud.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(seed);

// Setup WebGL2 Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const gameContainer = document.getElementById('game');
if (gameContainer) gameContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(PALETTE.canvas, 20, 55);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 120);
scene.add(camera);

// World, Player, Weapons, Bots & HUD
const world = createWorld(scene);
const bots = createBots(scene);
const weapons = createWeapons(camera);
const player = createPlayer(world.colliders);
const hud = createHud();

let buyMenuOpen = false;
const input = createInput(renderer.domElement, onLockChange, toggleBuyMenu);

// Raycasting for bullet hit detection
const raycaster = new THREE.Raycaster();
raycaster.far = 100;
const shootables = world.shootables.concat(bots.hitMeshes);
const bulletDir = new THREE.Vector3();

// Round State & Economy
let roundTimer = 105; // 1:45
let syndicateScore = 0;
let securityScore = 0;
let roundEnded = false;
let elapsed = 0;
let frozen = false;
let gameStarted = false;
let accumulator = 0;
let lastTime = performance.now();

// Tracers
const tracerGeos = [];

function toggleBuyMenu() {
  if (roundEnded || shot) return;
  buyMenuOpen = !buyMenuOpen;
  if (buyMenuOpen) {
    if (document.pointerLockElement) document.exitPointerLock();
    hud.toggleBuyMenu(true, onBuyWeapon);
  } else {
    hud.toggleBuyMenu(false);
    input.requestLock();
  }
}

function onBuyWeapon(weaponKey) {
  const wep = WEAPON_TYPES[weaponKey.toUpperCase()];
  if (wep && player.state.money >= wep.price) {
    player.state.money -= wep.price;
    weapons.setWeapon(weaponKey.toUpperCase());
    hud.setMoney(player.state.money);
    hud.setAmmo(weapons.state.mag, weapons.state.reserve);
    toggleBuyMenu();
  }
}

function syncCamera() {
  camera.position.set(player.state.position.x, player.state.position.y + player.state.eye, player.state.position.z);
  camera.rotation.set(player.state.pitch, player.state.yaw, 0, 'YXZ');
}

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    gameStarted = true;
    buyMenuOpen = false;
    hud.toggleBuyMenu(false);
    hud.hideOverlay();
    sound.init();
  } else if (!roundEnded && !buyMenuOpen) {
    hud.showOverlay(gameStarted ? 'paused' : 'start');
  }
}

function fireTracer(from, to, colorHex) {
  const points = [from.clone(), to.clone()];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  tracerGeos.push({ line, life: 0.08 });
}

function shoot() {
  if (!weapons.triggerFire()) return false;

  camera.getWorldDirection(bulletDir);
  const spread = weapons.calcSpread(player.groundSpeed());
  bulletDir.x += (rng() * 2 - 1) * spread;
  bulletDir.y += (rng() * 2 - 1) * spread;
  bulletDir.z += (rng() * 2 - 1) * spread;
  bulletDir.normalize();

  raycaster.set(camera.position, bulletDir);
  const hits = raycaster.intersectObjects(shootables, false);
  const endPoint = hits.length > 0 ? hits[0].point : camera.position.clone().add(bulletDir.clone().multiplyScalar(60));

  fireTracer(camera.position, endPoint, weapons.state.type.color);

  if (hits.length > 0) {
    const hitObj = hits[0].object;
    if (hitObj.userData.botIndex !== undefined) {
      const isHead = hitObj.userData.part === 'head';
      const dmg = weapons.state.type.damage * (isHead ? weapons.state.type.headshotMult : 1.0);
      const killed = bots.damage(hitObj, dmg);

      hud.hitMarker(killed, shot ? 2000 : 90);
      if (killed) {
        player.state.money += 300;
        hud.setMoney(player.state.money);
        hud.addKillfeed('Operative (You)', `Security Unit #${hitObj.userData.botIndex + 1}`, weapons.state.type.name);

        if (bots.remainingAlive() === 0 && !roundEnded) {
          endRound(true, 'Security forces wiped out!');
        }
      }
    }
  }

  player.recoil(weapons.state.type.recoilPitch, (rng() * 2 - 1) * weapons.state.type.recoilYaw);
  hud.setAmmo(weapons.state.mag, weapons.state.reserve);
  return true;
}

function botShoot(bot) {
  const botGunPos = bot.group.position.clone().add(new THREE.Vector3(0.35, 1.25, -0.35));
  const aimTarget = player.state.position.clone().add(new THREE.Vector3(0, player.state.eye, 0));
  aimTarget.x += (rng() * 2 - 1) * 0.8;
  aimTarget.y += (rng() * 2 - 1) * 0.8;

  fireTracer(botGunPos, aimTarget, PALETTE.botSecurity);
  sound.playShot(0.85, true);

  // Check hit probability based on player movement
  const dist = botGunPos.distanceTo(aimTarget);
  if (dist < 28 && rng() < 0.35) {
    const dead = player.takeDamage(16);
    hud.setHealth(player.state.health, player.state.armor);
    if (dead && !roundEnded) {
      endRound(false, 'Eliminated by Corporate Security!');
    }
  }
}

function endRound(syndicateWon, reason) {
  roundEnded = true;
  if (syndicateWon) {
    syndicateScore += 1;
    player.state.money += 3250;
    hud.showOverlay('victory', { score: `${syndicateScore} - ${securityScore}` });
  } else {
    securityScore += 1;
    player.state.money += 1400;
    hud.showOverlay('defeat', { score: `${syndicateScore} - ${securityScore}` });
  }
  hud.setScore(syndicateScore, securityScore);
  hud.setMoney(player.state.money);
  if (document.pointerLockElement) document.exitPointerLock();
}

function nextRound() {
  roundEnded = false;
  roundTimer = 105;
  player.reset();
  bots.reset();
  weapons.state.mag = weapons.state.type.magSize;
  weapons.state.reserve = weapons.state.type.reserveMax;
  hud.setHealth(100, 100);
  hud.setAmmo(weapons.state.mag, weapons.state.reserve);
  hud.setTimer(roundTimer);
  syncCamera();
  input.requestLock();
}

function step(dt) {
  elapsed += dt;
  if (!roundEnded) {
    roundTimer = Math.max(0, roundTimer - dt);
    hud.setTimer(roundTimer);
    if (roundTimer <= 0 && !roundEnded) {
      endRound(false, 'Round timer expired!');
    }

    // Check Data Core terminal capture
    const distToCore = Math.hypot(player.state.position.x, player.state.position.z);
    if (distToCore < 2.5 && !roundEnded) {
      endRound(true, 'Data Core Terminal Breached!');
    }
  }

  player.step(dt, input.state.keys);
  weapons.step(dt);
  world.step(dt, elapsed);
  bots.step(dt, player.state.position, botShoot);

  // Update tracers
  for (let i = tracerGeos.length - 1; i >= 0; i--) {
    tracerGeos[i].life -= dt;
    if (tracerGeos[i].life <= 0) {
      scene.remove(tracerGeos[i].line);
      tracerGeos[i].line.geometry.dispose();
      tracerGeos.splice(i, 1);
    }
  }
}

// Tactical recoil damping & accuracy compensation
const RECOIL_DAMPING = 8.5;
const ACCURACY_RECOVERY = 12.0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);

    if (input.state.firing && weapons.readyToFire() && !buyMenuOpen) {
      shoot();
    }
    if (input.state.keys.has('KeyR') && !buyMenuOpen) {
      weapons.reload();
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }

  renderer.render(scene, camera);
}

// Initial HUD values
hud.setHealth(100, 100);
hud.setAmmo(weapons.state.mag, weapons.state.reserve);
hud.setMoney(player.state.money);
hud.setScore(0, 0);
hud.setTimer(roundTimer);

hud.onPlay(() => {
  if (shot) return;
  if (roundEnded) nextRound();
  else input.requestLock();
});

// Deterministic Screenshot Scene Setup
function runShotSetup(name) {
  hud.hideOverlay();
  hud.toggleBuyMenu(false);
  player.state.position.set(0, 0, -14);
  player.state.pitch = 0.05;
  player.state.yaw = 0;
  syncCamera();

  if (name === 'start') {
    // Show start state with tactical buy menu and weapons shop
    hud.setMoney(800);
    hud.toggleBuyMenu(true);
    for (let i = 0; i < 15; i++) step(FIXED_STEP);
  } else if (name === 'play') {
    // Active firefight: player has AR, muzzle flash, bot targeted, hitmarker visible
    weapons.setWeapon('RIFLE');
    player.state.position.set(-4, 0, 2);
    player.state.yaw = -0.4;
    player.state.pitch = -0.04;
    syncCamera();
    shoot();
    hud.hitMarker(true, 5000);
    hud.addKillfeed('Operative (You)', 'Security Unit #2', 'Viper-AR Tactical Rifle');
    for (let i = 0; i < 20; i++) step(FIXED_STEP);
  } else if (name === 'end') {
    // Round won: objective secured, scoreboard victory
    syndicateScore = 1;
    securityScore = 0;
    hud.setScore(1, 0);
    player.state.money = 4050;
    hud.setMoney(player.state.money);
    hud.showOverlay('victory', { score: '1 - 0' });
    for (let i = 0; i < 25; i++) step(FIXED_STEP);
  }

  syncCamera();
  renderer.render(scene, camera);
  window.__shotReady = true;
}

if (shot) {
  runShotSetup(shot);
} else {
  requestAnimationFrame(frame);
}
