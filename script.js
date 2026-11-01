document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.viewport-wrapper');
  const frame = document.getElementById('iphoneFrame');
  const lockBg = document.getElementById('lockBg');
  const root = document.documentElement;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ===== 1. SCALING RESPONSIVE ===== */
  let frameScale = 1; // dipakai buat koreksi jarak drag (px layar -> px desain)

  function resizeFrame() {
    const isMobile = window.innerWidth <= 500;
    const designWidth = 430;
    const designHeight = 932;

    if (isMobile) {
      // HP: lebar layar diisi PENUH (nggak ada pinggiran kosong).
      // Tinggi desain menyesuaikan layar; kalau pendek, layout dipadatkan sedikit (--vshift).
      const MIN_H = 891; // tinggi desain minimum setelah dipadatkan (932 - 41)
      const scale = Math.min(window.innerWidth / designWidth, window.innerHeight / MIN_H);
      const H = window.innerHeight / scale;
      frameScale = scale;

      root.style.setProperty('--vshift', String(clamp(designHeight - H, 0, 41)));

      wrapper.style.zoom = '1';
      wrapper.style.height = H + 'px';
      wrapper.style.position = 'absolute';
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.left = ((window.innerWidth - designWidth * scale) / 2) + 'px';
      wrapper.style.top = '0px';
    } else {
      root.style.setProperty('--vshift', '0');
      wrapper.style.zoom = '1';
      wrapper.style.height = '';
      wrapper.style.position = 'relative';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      const scale = Math.min(
        (window.innerWidth - 40) / designWidth,
        (window.innerHeight - 40) / designHeight,
        1
      );
      frameScale = scale;
      wrapper.style.transformOrigin = 'center center';
      wrapper.style.transform = `scale(${scale})`;
    }
  }

  window.addEventListener('resize', resizeFrame);
  resizeFrame();
  setTimeout(resizeFrame, 100);

  /* ===== 2. ELEMENTS & STATE ===== */
  const lockScreen = document.getElementById('screen-lock');
  const passcodeScreen = document.getElementById('screen-passcode');
  const passcodeBody = document.getElementById('passcodeBody');
  const homeScreen = document.getElementById('screen-home');
  const lockContent = document.getElementById('lockContent');
  const btnCancel = document.getElementById('btnCancel');
  const swipeUpText = document.getElementById('swipeUpText');

  const OPEN_DIST = 380;
  let state = 'lock'; // 'lock' | 'passcode' | 'home'

  /* ===== 3. ANIMASI TRANSISI LOCK <-> PASSCODE =====
     Satu nilai d (0 = lock, OPEN_DIST = passcode) mengatur semuanya:
     dipakai saat drag (ikut jari) dan saat animasi (tap / lepas jari). */
  function render(d) {
    d = clamp(d, 0, OPEN_DIST);
    const p = d / OPEN_DIST;

    // Lock screen: naik ngikutin jari, memudar lebih cepat
    lockContent.style.transform = `translate3d(0, ${-d}px, 0)`;
    lockContent.style.setProperty('--fade', 1 - clamp(p * 1.6, 0, 1));

    // Wallpaper: blur bertahap (desktop = .lock-bg, HP = background body)
    const blur = p * 10;
    lockBg.style.filter = `blur(${blur}px)`;
    root.style.setProperty('--bg-blur', `${blur}px`);

    // Passcode: fade in sambil naik pelan dari bawah
    passcodeScreen.style.setProperty('--pfade', clamp((p - 0.15) / 0.85, 0, 1));
    passcodeBody.style.transform = `translate3d(0, ${(1 - p) * 60}px, 0)`;
  }

  // class 'animating' dipasang di frame + <html> (html buat transisi blur wallpaper di HP)
  function setAnimating(on) {
    frame.classList.toggle('animating', on);
    root.classList.toggle('animating', on);
  }

  let animTimer = null;
  function animateTo(d) {
    setAnimating(true);
    render(d);
    clearTimeout(animTimer);
    animTimer = setTimeout(() => setAnimating(false), 600);
  }

  function openPasscode() {
    if (state !== 'lock') return;
    state = 'passcode';
    resetPasscode();
    frame.classList.add('passcode-mode');
    passcodeScreen.classList.add('active');
    animateTo(OPEN_DIST);
  }

  function closePasscode() {
    state = 'lock';
    frame.classList.remove('passcode-mode');
    passcodeScreen.classList.remove('active');
    animateTo(0);
  }

  /* ===== 4. GESTURE SWIPE UP ===== */
  let isDragging = false;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0; // px/ms, positif = ke atas
  let lastDragDist = 0;

  lockScreen.addEventListener('pointerdown', (e) => {
    if (state !== 'lock') return;
    isDragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    clearTimeout(animTimer);
    setAnimating(false); // matiin transisi biar 1:1 sama jari
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (lastY - e.clientY) / dt;
    lastY = e.clientY;
    lastT = now;

    render((startY - e.clientY) / frameScale);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;

    const d = (startY - e.clientY) / frameScale;
    lastDragDist = Math.abs(d);

    // Tap tanpa geser: biarin handler click yang kerja
    if (lastDragDist < 8) {
      render(0);
      return;
    }

    if (d > 120 || velocity > 0.5) openPasscode(); // jarak cukup atau flick cepat
    else animateTo(0);
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Tap notifikasi / teks "Swipe up" -> buka passcode (diabaikan kalau barusan di-drag)
  document.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      if (lastDragDist < 8) openPasscode();
    });
  });
  if (swipeUpText) {
    swipeUpText.addEventListener('click', () => {
      if (lastDragDist < 8) openPasscode();
    });
  }

  /* ===== 5. LOGIKA PASSCODE ===== */
  const dots = document.querySelectorAll('.dot');
  const keypad = document.getElementById('keypad');
  const passcodeDots = document.getElementById('passcodeDots');
  const PASSWORD = '1879';
  let input = '';

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < input.length));
  }

  function resetPasscode() {
    input = '';
    updateDots();
    passcodeDots.classList.remove('shake');
    dots.forEach(d => d.style.background = '');
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
    if (input.length === 4) setTimeout(checkPasscode, 200);
  }

  function checkPasscode() {
    if (input === PASSWORD) {
      state = 'home';
      dots.forEach(d => d.style.background = '#34C759');
      setTimeout(() => {
        homeScreen.classList.add('active'); // home fade in di atas passcode
        setTimeout(() => {
          passcodeScreen.classList.remove('active');
          passcodeScreen.style.setProperty('--pfade', 0);
          frame.classList.remove('passcode-mode');
          resetPasscode();
        }, 450);
      }, 300);
    } else {
      passcodeDots.classList.add('shake');
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(resetPasscode, 500);
    }
  }

  if (keypad) {
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key');
      if (!btn || btn.disabled || btn.classList.contains('key-empty')) return;
      const key = btn.dataset.key;
      if (key) handleKey(key);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (state !== 'passcode') return;
    if (/^[0-9]$/.test(e.key)) handleKey(e.key);
    else if (e.key === 'Backspace') handleKey('del');
  });

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      closePasscode();
    });
  }

  /* ===== 6. CLEAR ALL ===== */
  const closeBtn = document.querySelector('.close-btn');
  const notifHeader = document.querySelector('.notif-header');
  const notifItems = document.querySelectorAll('.notif-item');

  if (closeBtn) {
    let expandedTimer = null;
    closeBtn.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) {
        closeBtn.classList.add('expanded');
        clearTimeout(expandedTimer);
      }
    });
    closeBtn.addEventListener('mouseleave', () => {
      if (window.matchMedia('(hover: hover)').matches) {
        expandedTimer = setTimeout(() => closeBtn.classList.remove('expanded'), 500);
      }
    });
    closeBtn.addEventListener('click', () => {
      if (!closeBtn.classList.contains('expanded')) {
        closeBtn.classList.add('expanded');
        return;
      }
      notifItems.forEach((item, i) => {
        setTimeout(() => item.classList.add('clearing'), i * 40);
      });
      setTimeout(() => notifHeader.classList.add('hidden'), notifItems.length * 40 + 200);
    });
  }

  render(0);
});