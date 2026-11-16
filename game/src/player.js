// First-Person Player Controller with Tactical Movement & Collisions
import * as THREE from 'three';

const PLAYER_RADIUS = 0.45;
const STAND_EYE = 1.65;
const CROUCH_EYE = 1.05;
const MOVE_SPEED = 6.5;
const CROUCH_SPEED = 3.2;
const JUMP_FORCE = 6.2;
const GRAVITY = 18.0;

export function createPlayer(colliders) {
  const state = {
    position: new THREE.Vector3(0, 0, -22),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    eye: STAND_EYE,
    onGround: true,
    isCrouching: false,
    health: 100,
    armor: 100,
    money: 800,
  };

  function look(dx, dy) {
    const sens = 0.0022;
    state.yaw -= dx * sens;
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - dy * sens));
  }

  function recoil(pitchKick, yawKick) {
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch + pitchKick));
    state.yaw += yawKick;
  }

  function groundSpeed() {
    return Math.hypot(state.velocity.x, state.velocity.z);
  }

  function resolveCollisions(pos) {
    for (const c of colliders) {
      if (
        pos.x + PLAYER_RADIUS > c.minX &&
        pos.x - PLAYER_RADIUS < c.maxX &&
        pos.z + PLAYER_RADIUS > c.minZ &&
        pos.z - PLAYER_RADIUS < c.maxZ
      ) {
        // Push out along minimum overlap axis
        const overlapLeft = pos.x + PLAYER_RADIUS - c.minX;
        const overlapRight = c.maxX - (pos.x - PLAYER_RADIUS);
        const overlapTop = pos.z + PLAYER_RADIUS - c.minZ;
        const overlapBottom = c.maxZ - (pos.z - PLAYER_RADIUS);

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapLeft) pos.x = c.minX - PLAYER_RADIUS;
        else if (minOverlap === overlapRight) pos.x = c.maxX + PLAYER_RADIUS;
        else if (minOverlap === overlapTop) pos.z = c.minZ - PLAYER_RADIUS;
        else if (minOverlap === overlapBottom) pos.z = c.maxZ + PLAYER_RADIUS;
      }
    }
  }

  function step(dt, keys) {
    state.isCrouching = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    const targetEye = state.isCrouching ? CROUCH_EYE : STAND_EYE;
    state.eye = THREE.MathUtils.lerp(state.eye, targetEye, dt * 10);

    const speed = state.isCrouching ? CROUCH_SPEED : MOVE_SPEED;
    const moveX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const moveZ = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);

    const wishDir = new THREE.Vector3(moveX, 0, moveZ);
    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
      wishDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    }

    // Accelerate & friction
    const friction = state.onGround ? 8.0 : 1.2;
    state.velocity.x -= state.velocity.x * friction * dt;
    state.velocity.z -= state.velocity.z * friction * dt;

    if (wishDir.lengthSq() > 0) {
      state.velocity.x += wishDir.x * speed * 8.0 * dt;
      state.velocity.z += wishDir.z * speed * 8.0 * dt;
    }

    // Jump
    if (keys.has('Space') && state.onGround && !state.isCrouching) {
      state.velocity.y = JUMP_FORCE;
      state.onGround = false;
    }

    // Gravity
    if (!state.onGround) {
      state.velocity.y -= GRAVITY * dt;
    }

    // Apply movement & collisions
    state.position.x += state.velocity.x * dt;
    state.position.z += state.velocity.z * dt;
    resolveCollisions(state.position);

    state.position.y += state.velocity.y * dt;
    if (state.position.y <= 0) {
      state.position.y = 0;
      state.velocity.y = 0;
      state.onGround = true;
    }
  }

  function takeDamage(amount) {
    if (state.armor > 0) {
      const armorDmg = amount * 0.5;
      const hpDmg = amount * 0.5;
      state.armor = Math.max(0, state.armor - armorDmg);
      state.health = Math.max(0, state.health - hpDmg);
    } else {
      state.health = Math.max(0, state.health - amount);
    }
    return state.health <= 0;
  }

  function reset() {
    state.position.set(0, 0, -22);
    state.velocity.set(0, 0, 0);
    state.yaw = 0;
    state.pitch = 0;
    state.health = 100;
    state.armor = 100;
  }

  return {
    state,
    look,
    recoil,
    groundSpeed,
    step,
    takeDamage,
    reset,
  };
}
