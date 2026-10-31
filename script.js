document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.viewport-wrapper');
  const frame = document.getElementById('iphoneFrame');

  /* ===== SCALE FRAME ===== */
  let frameScale = 1;
  function resizeFrame() {
    // 430x932 layar + 20px rangka di tiap sisi
    const designWidth = 470;
    const designHeight = 972;
    const scaleX = (window.innerWidth - 20) / designWidth;
    const scaleY = (window.innerHeight - 20) / designHeight;
    frameScale = Math.min(scaleX, scaleY, 1);
    wrapper.style.transform = `scale(${frameScale})`;
  }
  window.addEventListener('resize', resizeFrame);
  resizeFrame();

  /* ===== ELEMENTS ===== */
  const lockScreen = document.getElementById('screen-lock');
  const passcodeScreen = document.getElementById('screen-passcode');
  const passcodeBody = document.getElementById('passcodeBody');
  const homeScreen = document.getElementById('screen-home');
  const lockContent = document.getElementById('lockContent');
  const lockBg = document.getElementById('lockBg');
  const btnCancel = document.getElementById('btnCancel');

  /* ===== TRANSISI LOCK <-> PASSCODE =====
     Semua visual dikendalikan satu nilai: d (0 = lock screen, OPEN_DIST = passcode).
     Dipakai saat drag (ikut jari) maupun saat animasi (tap / lepas jari). */
  const OPEN_DIST = 380;
  let state = 'lock'; // 'lock' | 'passcode' | 'home'

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function render(d) {
    d = clamp(d, 0, OPEN_DIST);
    const p = d / OPEN_DIST;

    // Lock screen: naik ngikutin jari, memudar lebih cepat
    lockContent.style.transform = `translate3d(0, ${-d}px, 0)`;
    lockContent.style.setProperty('--fade', 1 - clamp(p * 1.6, 0, 1));

    // Wallpaper: blur bertahap
    lockBg.style.filter = `blur(${p * 10}px)`;

    // Passcode: fade in sambil naik pelan dari bawah
    passcodeScreen.style.setProperty('--pfade', clamp((p - 0.15) / 0.85, 0, 1));
    passcodeBody.style.transform = `translate3d(0, ${(1 - p) * 60}px, 0)`;
  }

  function animateTo(d) {
    frame.classList.add('animating');
    render(d);
  }

  function openPasscode() {
    state = 'passcode';
    resetPasscode();
    frame.classList.add('passcode-mode');
    passcodeScreen.classList.add('open');
    animateTo(OPEN_DIST);
  }

  function closePasscode() {
    state = 'lock';
    frame.classList.remove('passcode-mode');
    passcodeScreen.classList.remove('open');
    animateTo(0);
  }

  btnCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    closePasscode();
  });

  /* ===== TOMBOL X -> CLEAR ALL ===== */
  const closeBtn = document.querySelector('.close-btn');
  const notifHeader = document.querySelector('.notif-header');
  let collapseTimer = null;
  let cleared = false;

  function expandClear() {
    closeBtn.classList.add('expanded');
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(collapseClear, 4000); // balik jadi X kalau didiemin
  }

  function collapseClear() {
    clearTimeout(collapseTimer);
    closeBtn.classList.remove('expanded');
  }

  function clearAll() {
    if (cleared) return;
    cleared = true;
    collapseClear();

    const items = [...document.querySelectorAll('.notif-item')];
    const STAGGER = 55;
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * STAGGER}ms`;
      el.classList.add('clearing');
    });

    const total = items.length * STAGGER + 450;
    setTimeout(() => notifHeader.classList.add('hidden'), total - 150);
    setTimeout(() => items.forEach(el => el.remove()), total + 300);
  }

  function onCloseBtnTap() {
    if (cleared) return;
    if (closeBtn.classList.contains('expanded')) clearAll();
    else expandClear();
  }

  /* ===== GESTURE SWIPE UP / TAP ===== */
  let isDragging = false;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0; // px/ms (positif = ke atas)
  let startTarget = null;

  lockScreen.addEventListener('pointerdown', (e) => {
    if (state !== 'lock') return;
    isDragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    startTarget = e.target;
    if (!e.target.closest('.close-btn')) collapseClear();
    frame.classList.remove('animating'); // matiin transisi biar 1:1 sama jari
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (lastY - e.clientY) / dt;
    lastY = e.clientY;
    lastT = now;

    const d = (startY - e.clientY) / frameScale; // koreksi skala frame
    render(d);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;

    const d = (startY - e.clientY) / frameScale;
    const moved = Math.abs(d);

    // Tap tanpa geser: kalau kena notifikasi -> buka passcode
    if (moved < 8) {
      if (startTarget && startTarget.closest('.close-btn')) {
        onCloseBtnTap();
        animateTo(0);
      } else if (startTarget && startTarget.closest('.notif-item')) {
        openPasscode();
      } else {
        animateTo(0);
      }
      return;
    }

    const flick = velocity > 0.5; // swipe cepat
    if (d > 120 || flick) openPasscode();
    else animateTo(0);
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* ===== PASSCODE ===== */
  const CORRECT_PASSCODE = "1879";
  const keypad = document.getElementById('keypad');
  const dots = document.querySelectorAll('.dot');
  const dotsContainer = document.getElementById('passcodeDots');
  let input = "";

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < input.length);
    });
  }

  function resetPasscode() {
    input = "";
    updateDots();
    dotsContainer.classList.remove('shake');
    dots.forEach(d => d.style.background = "");
  }

  function handleKey(key) {
    if (state !== 'passcode') return;
    if (key === 'del') {
      input = input.slice(0, -1);
      updateDots();
      return;
    }
    if (input.length >= 4) return;
    input += key;
    updateDots();

    if (input.length === 4) {
      setTimeout(checkPasscode, 200);
    }
  }

  function checkPasscode() {
    if (input === CORRECT_PASSCODE) {
      state = 'home';
      dots.forEach(d => d.style.background = "#34C759");
      setTimeout(() => {
        // Home fade in di atas passcode
        homeScreen.classList.add('active');
        setTimeout(() => {
          passcodeScreen.classList.remove('open');
          passcodeScreen.style.setProperty('--pfade', 0);
          frame.classList.remove('passcode-mode');
          resetPasscode();
        }, 450);
      }, 300);
    } else {
      dotsContainer.classList.add('shake');
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(resetPasscode, 500);
    }
  }

  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn || btn.disabled) return;
    e.stopPropagation();
    const key = btn.dataset.key;
    if (key) handleKey(key);
  });

  document.addEventListener('keydown', (e) => {
    if (state !== 'passcode') return;
    if (/^[0-9]$/.test(e.key)) handleKey(e.key);
    else if (e.key === "Backspace") handleKey('del');
  });

  render(0);
});