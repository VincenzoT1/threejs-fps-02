// Tactical AI Bots System (Corporate Security Operatives)
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { sound } from './audio.js';

export function createBots(scene) {
  const bots = [];
  const hitMeshes = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.botArmor,
    roughness: 0.5,
    metalness: 0.7,
  });
  const visorMat = new THREE.MeshBasicMaterial({ color: PALETTE.botSecurity });

  // Tracer line pool
  const tracerMat = new THREE.LineBasicMaterial({ color: PALETTE.botSecurity });

  const spawnPoints = [
    { x: -14, z: 22 },
    { x: 0, z: 26 },
    { x: 14, z: 22 },
  ];

  for (let i = 0; i < spawnPoints.length; i++) {
    const group = new THREE.Group();
    const sp = spawnPoints[i];
    group.position.set(sp.x, 0, sp.z);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    torso.userData = { botIndex: i, part: 'body' };
    group.add(torso);
    hitMeshes.push(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.42, 0.38);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 2.05;
    head.castShadow = true;
    head.userData = { botIndex: i, part: 'head' };
    group.add(head);
    hitMeshes.push(head);

    // Glowing Visor
    const visorGeo = new THREE.BoxGeometry(0.32, 0.12, 0.1);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.08, -0.2);
    group.add(visor);

    // Weapon
    const gunGeo = new THREE.BoxGeometry(0.12, 0.14, 0.6);
    const gun = new THREE.Mesh(gunGeo, bodyMat);
    gun.position.set(0.35, 1.25, -0.35);
    group.add(gun);

    scene.add(group);

    bots.push({
      index: i,
      group,
      torso,
      head,
      visor,
      gun,
      spawn: { ...sp },
      health: 100,
      alive: true,
      patrolTimer: Math.random() * 2,
      targetX: sp.x,
      targetZ: sp.z - 10,
      fireCooldown: 0.8 + Math.random() * 0.5,
    });
  }

  function damage(mesh, amount) {
    const botIdx = mesh.userData.botIndex;
    if (botIdx === undefined) return false;
    const bot = bots[botIdx];
    if (!bot || !bot.alive) return false;

    bot.health -= amount;
    sound.playHit();

    if (bot.health <= 0) {
      bot.alive = false;
      bot.health = 0;
      // Death animation: collapse backwards
      bot.group.rotation.x = Math.PI / 2;
      bot.group.position.y = 0.2;
      return true; // killed
    }
    return false;
  }

  function remainingAlive() {
    return bots.filter((b) => b.alive).length;
  }

  function reset() {
    for (const b of bots) {
      b.alive = true;
      b.health = 100;
      b.group.position.set(b.spawn.x, 0, b.spawn.z);
      b.group.rotation.set(0, 0, 0);
      b.fireCooldown = 0.8 + Math.random() * 0.5;
    }
  }

  function step(dt, playerPos, onBotShoot) {
    for (const bot of bots) {
      if (!bot.alive) continue;

      // Look towards player
      const dx = playerPos.x - bot.group.position.x;
      const dz = playerPos.z - bot.group.position.z;
      const dist = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      bot.group.rotation.y = angle + Math.PI;

      // AI movement (advance or hold cover)
      bot.patrolTimer -= dt;
      if (bot.patrolTimer <= 0) {
        bot.patrolTimer = 2.0 + Math.random() * 2.0;
        bot.targetX = bot.spawn.x + (Math.random() * 6 - 3);
        bot.targetZ = Math.max(-5, bot.spawn.z - (Math.random() * 12 + 4));
      }

      // Step towards target
      const tdx = bot.targetX - bot.group.position.x;
      const tdz = bot.targetZ - bot.group.position.z;
      const tdist = Math.hypot(tdx, tdz);
      if (tdist > 0.2) {
        bot.group.position.x += (tdx / tdist) * dt * 2.2;
        bot.group.position.z += (tdz / tdist) * dt * 2.2;
      }

      // Firing logic
      bot.fireCooldown -= dt;
      if (bot.fireCooldown <= 0 && dist < 35) {
        bot.fireCooldown = 0.7 + Math.random() * 0.6;
        if (onBotShoot) {
          onBotShoot(bot);
        }
      }
    }
  }

  function aimPoint(index) {
    const bot = bots[index];
    if (!bot) return new THREE.Vector3();
    return new THREE.Vector3(bot.group.position.x, 2.05, bot.group.position.z);
  }

  return {
    bots,
    hitMeshes,
    damage,
    remainingAlive,
    reset,
    step,
    aimPoint,
  };
}
