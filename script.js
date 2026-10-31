document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.viewport-wrapper');
  const frame = document.getElementById('iphoneFrame');
  const lockBg = document.getElementById('lockBg');

  /* ===== 1. SCALING RESPONSIVE (PAKAI ZOOM AGAR SENTUHAN AKURAT) ===== */
  function resizeFrame() {
    const isMobile = window.innerWidth <= 500;
    const designWidth = 430;
    const designHeight = 932;

    if (isMobile) {
      const scale = Math.min(
        window.innerWidth / designWidth,
        window.innerHeight / designHeight
      );
      
      // PAKAI ZOOM (Akurat untuk tap di HP)
      wrapper.style.zoom = scale;
      wrapper.style.transform = 'none';
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.position = 'absolute';
      
      // Posisikan tepat di tengah layar HP
      const offsetX = (window.innerWidth - (designWidth * scale)) / 2;
      const offsetY = (window.innerHeight - (designHeight * scale)) / 2;
      wrapper.style.left = offsetX + 'px';
      wrapper.style.top = offsetY + 'px';
    } else {
      // Desktop
      wrapper.style.zoom = '1';
      wrapper.style.position = 'relative';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      const scale = Math.min(
        (window.innerWidth - 40) / designWidth, 
        (window.innerHeight - 40) / designHeight, 
        1
      );
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
  let state = 'lock'; 
  let startY = 0;
  let currentY = 0;
  let dragging = false;
  let animating = false;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ===== 3. ANIMASI TRANSISI ===== */
  function render(d) {
    d = clamp(d, 0, OPEN_DIST);
    const p = d / OPEN_DIST;

    lockContent.style.transform = `translate3d(0, ${-d}px, 0)`;
    lockContent.style.setProperty('--fade', 1 - clamp(p * 1.6, 0, 1));
    lockBg.style.filter = `blur(${p * 10}px)`;

    // Paksa opacity elemen passcode menjadi 1 agar bisa diklik
    passcodeScreen.style.setProperty('--pfade', clamp((p - 0.15) / 0.85, 0, 1));
    passcodeBody.style.transform = `translate3d(0, ${(1 - p) * 40}px, 0)`;
  }

  function animateTo(target) {
    animating = true;
    frame.classList.add('animating');

    if (target === 'passcode') {
      state = 'passcode';
      lockScreen.classList.add('passcode-mode');
      // Paksa passcode screen full opacity dan bisa diklik
      passcodeScreen.style.opacity = '1';
      passcodeScreen.style.pointerEvents = 'auto';
      render(OPEN_DIST);
    } else if (target === 'lock') {
      state = 'lock';
      lockScreen.classList.remove('passcode-mode');
      passcodeScreen.style.opacity = '1';
      passcodeScreen.style.pointerEvents = 'auto';
      render(0);
    }

    setTimeout(() => {
      frame.classList.remove('animating');
      animating = false;
    }, 520);
  }

  /* ===== 4. LOGIKA DRAG/SWIPE ===== */
  function onStart(y) {
    if (state !== 'lock' || animating) return;
    dragging = true;
    startY = y;
    currentY = y;
  }

  function onMove(y) {
    if (!dragging) return;
    currentY = y;
    const delta = startY - currentY;
    if (delta > 0) render(delta * 1.2);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    const delta = startY - currentY;

    if (delta > OPEN_DIST * 0.25) { 
      animateTo('passcode');
    } else {
      animateTo('lock');
    }
  }

  lockContent.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
  lockContent.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), { passive: true });
  lockContent.addEventListener('touchend', onEnd);
  
  lockContent.addEventListener('mousedown', (e) => onStart(e.clientY));
  window.addEventListener('mousemove', (e) => { if (dragging) onMove(e.clientY); });
  window.addEventListener('mouseup', () => { if (dragging) onEnd(); });

  if (swipeUpText) {
    swipeUpText.addEventListener('click', () => {
      if (state === 'lock' && !animating) animateTo('passcode');
    });
  }

  /* ===== 5. LOGIKA PASSCODE (100% BISA DIKLIK) ===== */
  const dots = document.querySelectorAll('.dot');
  const keypad = document.getElementById('keypad');
  const passcodeDots = document.getElementById('passcodeDots');
  const PASSWORD = '1126'; 
  let input = '';

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < input.length));
  }

  function resetInput() {
    input = '';
    updateDots();
  }

  function shakeDots() {
    passcodeDots.classList.add('shake');
    setTimeout(() => passcodeDots.classList.remove('shake'), 420);
  }

  function checkPasscode() {
    if (input === PASSWORD) {
      state = 'home';
      homeScreen.classList.add('active');
      homeScreen.style.opacity = '1';
      homeScreen.style.pointerEvents = 'auto';
      lockScreen.classList.remove('active');
      passcodeScreen.style.opacity = '0';
      passcodeScreen.style.pointerEvents = 'none';
      lockBg.style.filter = 'blur(0px)';
    } else {
      shakeDots();
      setTimeout(resetInput, 420);
    }
  }

  if (keypad) {
    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key');
      if (!btn || btn.disabled || btn.classList.contains('key-empty')) return;
      
      const key = btn.dataset.key;

      if (key === 'del') {
        input = input.slice(0, -1);
        updateDots();
      } else if (input.length < 4) {
        input += key;
        updateDots();
        if (input.length === 4) setTimeout(checkPasscode, 150);
      }
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      resetInput();
      animateTo('lock');
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