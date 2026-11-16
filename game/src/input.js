// Input Handler: Pointer Lock, Keyboard State & Mouse Look
export function createInput(domElement, onLockChange, onBuyToggle) {
  const keys = new Set();
  const lookDelta = { x: 0, y: 0 };
  const state = {
    firing: false,
    keys,
  };

  function requestLock() {
    domElement.requestPointerLock();
  }

  function onMouseMove(e) {
    if (document.pointerLockElement === domElement) {
      lookDelta.x += e.movementX;
      lookDelta.y += e.movementY;
    }
  }

  function onMouseDown(e) {
    if (e.button === 0) state.firing = true;
  }

  function onMouseUp(e) {
    if (e.button === 0) state.firing = false;
  }

  function onKeyDown(e) {
    keys.add(e.code);
    if (e.code === 'KeyB' && onBuyToggle) {
      onBuyToggle();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onPointerLock() {
    const locked = document.pointerLockElement === domElement;
    if (onLockChange) onLockChange(locked);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onPointerLock);

  function takeLook() {
    const x = lookDelta.x;
    const y = lookDelta.y;
    lookDelta.x = 0;
    lookDelta.y = 0;
    return { x, y };
  }

  return {
    state,
    takeLook,
    requestLock,
  };
}
