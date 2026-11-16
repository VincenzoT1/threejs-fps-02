// Tactical Cyberpunk HUD & Buy Menu UI Controller
export function createHud() {
  const hpEl = document.getElementById('hp-val');
  const armorEl = document.getElementById('armor-val');
  const ammoMagEl = document.getElementById('ammo-mag');
  const ammoResEl = document.getElementById('ammo-reserve');
  const moneyEl = document.getElementById('money-val');
  const timerEl = document.getElementById('round-timer');
  const scoreEl = document.getElementById('team-score');
  const hitmarkerEl = document.getElementById('hitmarker');
  const killfeedEl = document.getElementById('killfeed');
  const overlayEl = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');
  const playBtn = document.getElementById('play');
  const buyOverlayEl = document.getElementById('buy-overlay');

  let hitTimer = null;

  function setHealth(hp, armor) {
    if (hpEl) hpEl.textContent = Math.round(hp);
    if (armorEl) armorEl.textContent = Math.round(armor);
  }

  function setAmmo(mag, reserve) {
    if (ammoMagEl) ammoMagEl.textContent = mag;
    if (ammoResEl) ammoResEl.textContent = `/ ${reserve}`;
  }

  function setMoney(amount) {
    if (moneyEl) moneyEl.textContent = `$${amount}`;
  }

  function setTimer(seconds) {
    if (!timerEl) return;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function setScore(syndicate, security) {
    if (scoreEl) scoreEl.textContent = `${syndicate} : ${security}`;
  }

  function hitMarker(isKill, holdMs = 90) {
    if (!hitmarkerEl) return;
    hitmarkerEl.classList.add('on');
    if (isKill) hitmarkerEl.classList.add('kill');
    else hitmarkerEl.classList.remove('kill');

    clearTimeout(hitTimer);
    hitTimer = setTimeout(() => {
      hitmarkerEl.classList.remove('on');
    }, holdMs);
  }

  function addKillfeed(killer, victim, weaponName) {
    if (!killfeedEl) return;
    const item = document.createElement('div');
    item.className = 'kill-item';
    item.innerHTML = `<span class="k-killer">${killer}</span> <span class="k-wep">[${weaponName}]</span> <span class="k-victim">${victim}</span>`;
    killfeedEl.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 4500);
  }

  function showOverlay(type, details = {}) {
    if (!overlayEl) return;
    overlayEl.hidden = false;
    if (type === 'start') {
      overlayTitle.textContent = 'NEON PROTOCOL';
      overlayCopy.textContent = 'Tactical Strike in Sector-7. Eliminate the security detail or capture the Data Core.';
      playBtn.textContent = 'DEPLOY OPERATIVE';
    } else if (type === 'victory') {
      overlayTitle.textContent = 'MISSION ACCOMPLISHED';
      overlayCopy.textContent = `All security targets neutralized! Round won. (${details.score || ''})`;
      playBtn.textContent = 'NEXT ROUND';
    } else if (type === 'defeat') {
      overlayTitle.textContent = 'OPERATIVE COMPROMISED';
      overlayCopy.textContent = 'Tactical signals lost. Security forces hold the sector.';
      playBtn.textContent = 'REDEPLOY';
    } else if (type === 'paused') {
      overlayTitle.textContent = 'TACTICAL PAUSE';
      overlayCopy.textContent = 'Click to resume pointer lock.';
      playBtn.textContent = 'RESUME';
    }
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.hidden = true;
  }

  function toggleBuyMenu(visible, onSelect) {
    if (!buyOverlayEl) return;
    buyOverlayEl.hidden = !visible;
    if (visible && onSelect) {
      const btns = buyOverlayEl.querySelectorAll('.buy-btn');
      btns.forEach((btn) => {
        btn.onclick = () => {
          onSelect(btn.dataset.weapon);
        };
      });
    }
  }

  function onPlay(cb) {
    if (playBtn) playBtn.onclick = cb;
  }

  return {
    setHealth,
    setAmmo,
    setMoney,
    setTimer,
    setScore,
    hitMarker,
    addKillfeed,
    showOverlay,
    hideOverlay,
    toggleBuyMenu,
    onPlay,
  };
}
