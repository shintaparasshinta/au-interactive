document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.viewport-wrapper');
  const frame = document.getElementById('iphoneFrame');
  const lockBg = document.getElementById('lockBg');
  const root = document.documentElement;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ===== 1. SCALING RESPONSIVE ===== */
  let frameScale = 1;

  function resizeFrame() {
    const isMobile = window.innerWidth <= 500;
    const designWidth = 430;
    const designHeight = 932;

    if (isMobile) {
      const MIN_H = 891;
      const scale = Math.min(window.innerWidth / designWidth, window.innerHeight / MIN_H);
      const H = window.innerHeight / scale;
      frameScale = scale;

      root.style.setProperty('--vshift', String(clamp(designHeight - H, 0, 41)));

      wrapper.style.zoom = '1';
      wrapper.style.width = (window.innerWidth / scale) + 'px';
      wrapper.style.height = H + 'px';
      wrapper.style.position = 'absolute';
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.left = '0px';
      wrapper.style.top = '0px';
    } else {
      root.style.setProperty('--vshift', '0');
      wrapper.style.zoom = '1';
      wrapper.style.width = '';
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
  let state = 'lock';

  /* ===== 3. ANIMASI TRANSISI LOCK <-> PASSCODE ===== */
  function render(d) {
    d = clamp(d, 0, OPEN_DIST);
    const p = d / OPEN_DIST;

    lockContent.style.transform = `translate3d(0, ${-d}px, 0)`;
    lockContent.style.setProperty('--fade', 1 - clamp(p * 1.6, 0, 1));

    const blur = p * 10;
    lockBg.style.filter = `blur(${blur}px)`;
    root.style.setProperty('--bg-blur', `${blur}px`);

    passcodeScreen.style.setProperty('--pfade', clamp((p - 0.15) / 0.85, 0, 1));
    passcodeBody.style.transform = `translate3d(0, ${(1 - p) * 60}px, 0)`;
  }

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
  let velocity = 0;
  let lastDragDist = 0;

  lockScreen.addEventListener('pointerdown', (e) => {
    if (state !== 'lock') return;
    isDragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    clearTimeout(animTimer);
    setAnimating(false);
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

    if (lastDragDist < 8) {
      render(0);
      return;
    }

    if (d > 120 || velocity > 0.5) openPasscode();
    else animateTo(0);
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

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
    if (input.length === 4) setTimeout(checkPasscode, 120);
  }

  function checkPasscode() {
    if (input === PASSWORD) {
      state = 'home';
      dots.forEach(d => d.style.background = '#34C759');
      setTimeout(() => {
        homeScreen.classList.add('active');
        root.classList.add('home-mode');
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
    keypad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.key');
      if (!btn || btn.disabled || btn.classList.contains('key-empty')) return;
      e.preventDefault();
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

  /* ===== 7. APP OVERLAY: buka dari ikon, keluar swipe up ===== */
  const homeGesture = document.getElementById('homeGesture');

  const APPS = [
    { icon: 'img[alt="Photos"]', overlay: 'app-photos' },
  ];

  let activeApp = null;

  function iconOrigin(iconEl) {
    const fr = frame.getBoundingClientRect();
    const ir = iconEl.getBoundingClientRect();
    return {
      dx: ((ir.left + ir.width / 2) - (fr.left + fr.width / 2)) / frameScale,
      dy: ((ir.top + ir.height / 2) - (fr.top + fr.height / 2)) / frameScale,
      s: ir.width / fr.width
    };
  }
  const iconTransform = (o) => `translate3d(${o.dx}px, ${o.dy}px, 0) scale(${o.s})`;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function openApp(app, iconEl) {
    if (activeApp) return;
    const ov = document.getElementById(app.overlay);
    if (!ov) return;

    const o = iconOrigin(iconEl);
    activeApp = { ov, iconEl, mode: app.overlay + '-mode' };

    ov.style.transition = 'none';
    ov.style.transform = iconTransform(o);
    ov.style.opacity = '0';
    ov.style.borderRadius = (15 / o.s) + 'px';
    ov.classList.add('open');
    void ov.offsetWidth;

    ov.style.transition = `transform 0.5s ${EASE}, opacity 0.25s ease, border-radius 0.5s ${EASE}`;
    ov.style.transform = 'translate3d(0, 0, 0) scale(1)';
    ov.style.opacity = '1';
    ov.style.borderRadius = '0px';

    root.classList.add(activeApp.mode);
    frame.classList.add('app-open');
  }

  function closeApp() {
    if (!activeApp) return;
    const { ov, iconEl, mode } = activeApp;
    activeApp = null;

    const o = iconOrigin(iconEl);
    ov.style.transition = `transform 0.45s ${EASE}, opacity 0.3s ease 0.1s, border-radius 0.45s ease, box-shadow 0.3s ease`;
    ov.style.transform = iconTransform(o);
    ov.style.opacity = '0';
    ov.style.borderRadius = (15 / o.s) + 'px';
    ov.style.boxShadow = 'none';

    root.classList.remove(mode);
    frame.classList.remove('app-open');

    setTimeout(() => {
      ov.classList.remove('open');
      ov.style.cssText = '';
    }, 480);
  }

  APPS.forEach(app => {
    const icon = document.querySelector(app.icon);
    if (icon) icon.addEventListener('click', () => openApp(app, icon));
  });

  let appDrag = null;

  homeGesture.addEventListener('pointerdown', (e) => {
    if (!activeApp) return;
    homeGesture.setPointerCapture(e.pointerId);
    appDrag = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, d: 0 };
    activeApp.ov.style.transition = 'none';
  });

  homeGesture.addEventListener('pointermove', (e) => {
    if (!appDrag || !activeApp) return;
    const now = performance.now();
    const dt = now - appDrag.lastT;
    if (dt > 0) appDrag.v = (appDrag.lastY - e.clientY) / dt;
    appDrag.lastY = e.clientY;
    appDrag.lastT = now;

    const d = Math.max(0, (appDrag.startY - e.clientY) / frameScale);
    appDrag.d = d;
    const p = clamp(d / 320, 0, 1);

    const ov = activeApp.ov;
    ov.style.transform = `translate3d(0, ${-d * 0.35}px, 0) scale(${1 - p * 0.5})`;
    ov.style.borderRadius = (54 + p * 50) + 'px';
    ov.style.boxShadow = `0 12px 40px rgba(0, 0, 0, ${0.35 * p})`;
  });

  function endAppDrag() {
    if (!appDrag) return;
    const ad = appDrag;
    appDrag = null;
    if (!activeApp) return;

    if (ad.d > 110 || ad.v > 0.5) {
      closeApp();
    } else {
      const ov = activeApp.ov;
      ov.style.transition = `transform 0.4s ${EASE}, border-radius 0.4s ease, box-shadow 0.4s ease`;
      ov.style.transform = 'translate3d(0, 0, 0) scale(1)';
      ov.style.borderRadius = '0px';
      ov.style.boxShadow = 'none';
    }
  }
  homeGesture.addEventListener('pointerup', endAppDrag);
  homeGesture.addEventListener('pointercancel', endAppDrag);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeApp) closeApp();
  });

  /* ===== 8. GLOBAL FAVORITE LOGIC ===== */
  // Daftar ID foto yang udah di-love
  let favoritePhotos = ['2', '4', '7', '9', '13', '16', '20'];

  // Cek apakah src foto itu ada di daftar favorit
  function isFavorite(src) {
    if (!src) return false;
    const fileName = src.split('/').pop().replace('.png', '').replace('.jpg', '');
    return favoritePhotos.includes(fileName);
  }

  // Refresh semua tanda love di layar (thumbnail grid, album, dan fullscreen)
  function refreshAllFavoriteUI() {
    // 1. Update semua thumbnail di grid & album
    document.querySelectorAll('.photo-item').forEach(img => {
      if (isFavorite(img.src)) {
        img.classList.add('is-favorite');
      } else {
        img.classList.remove('is-favorite');
      }
    });

    // 2. Update ikon hati di layar fullscreen (kalau lagi kebuka)
    const heartBtn = document.getElementById('pvHeart');
    const pvCur = document.getElementById('pvCur');
    if (heartBtn && pvCur && pvCur.src) {
      if (isFavorite(pvCur.src)) {
        heartBtn.classList.add('favorited');
      } else {
        heartBtn.classList.remove('favorited');
      }
    }
  }

  /* ===== 9. INTERAKSI ALBUM PHOTOS ===== */
  const albumOverlay = document.getElementById('app-photos-album');
  const albumTitle = document.getElementById('albumTitle');
  const albumGrid = document.getElementById('albumGrid');

  const albumData = {
    'Recents': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'],
    'Favorites': ['2', '3', '5', '8', '9', '10', '11', '13', '15', '17'],
    '4boiz': ['13', '14', '16', '19', '20', '21', '22', '23', '24', '25'],
    'Videos': ['1', '4', '7', '10', '13'],
    'Selfies': ['2', '5', '10', '13', '15', '18', '20', '22', '24'],
    'Screenshots': ['3', '6', '9', '12', '15'],
    'Today': ['1', '2', '3', '4', '5', '6'],
    'Yesterday': ['7', '8', '9', '10']
  };

  window.openAlbum = function(albumName) {
    albumTitle.textContent = albumName;
    albumGrid.innerHTML = '';
    
    const photos = albumData[albumName] || [];
    photos.forEach(photoId => {
      const img = document.createElement('img');
      img.src = `photos/${photoId}.png`;
      img.className = 'photo-item';
      albumGrid.appendChild(img);
    });

    // Refresh status love biar muncul di album
    refreshAllFavoriteUI();
    
    albumOverlay.classList.add('open');
  };

  window.closeAlbum = function() {
    albumOverlay.classList.remove('open');
  };

  document.querySelectorAll('.ph-sec-item').forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('.ph-sec-label').textContent.split('\n')[0].trim();
      if (label.includes('Recents')) openAlbum('Recents');
      else if (label.includes('Favorites')) openAlbum('Favorites');
      else if (label.includes('4boiz')) openAlbum('4boiz');
    });
  });

  /* ===== 10. FULLSCREEN PHOTO & SWIPE ===== */
  const photoView = document.getElementById('app-photo-view');
  const pvStage = photoView.querySelector('.photo-view-content');
  const pvPrev = document.getElementById('pvPrev');
  const pvCur = document.getElementById('pvCur');
  const pvNext = document.getElementById('pvNext');
  const pvTransition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';

  const PV_GAP = 20;
  let currentPhotoList = [];
  let currentPhotoIndex = 0;
  let pvAnimating = false;
  let pvTimer = null;

  const pvWidth = () => pvStage.offsetWidth || 430;

  function pvSetSlides() {
    const set = (el, i) => {
      const src = currentPhotoList[i];
      if (src) { el.src = src; el.style.visibility = 'visible'; }
      else { el.removeAttribute('src'); el.style.visibility = 'hidden'; }
    };
    set(pvPrev, currentPhotoIndex - 1);
    set(pvCur, currentPhotoIndex);
    set(pvNext, currentPhotoIndex + 1);
  }

  function pvLayout(dx, animate) {
    const step = pvWidth() + PV_GAP;
    [pvPrev, pvCur, pvNext].forEach(el => { el.style.transition = animate ? pvTransition : 'none'; });
    pvPrev.style.transform = `translate3d(${dx - step}px, 0, 0)`;
    pvCur.style.transform  = `translate3d(${dx}px, 0, 0)`;
    pvNext.style.transform = `translate3d(${dx + step}px, 0, 0)`;
  }

  window.openPhotoView = function(src, list = [], index = 0) {
    clearTimeout(pvTimer);
    pvAnimating = false;
    currentPhotoList = list.length ? list : [src];
    currentPhotoIndex = list.length ? index : 0;
    
    pvSetSlides();
    pvLayout(0, false);
    
    // Sync status love pas buka
    refreshAllFavoriteUI();

    photoView.classList.add('open');
    root.classList.add('app-photos-mode');
  };

  window.closePhotoView = function() {
    photoView.classList.remove('open');
    if (!document.getElementById('app-photos').classList.contains('open') &&
        !document.getElementById('app-photos-album').classList.contains('open')) {
      root.classList.remove('app-photos-mode');
    }
  };

  document.addEventListener('click', (e) => {
    const photoImg = e.target.closest('.photo-item');
    if (photoImg) {
      e.stopPropagation();
      const container = photoImg.parentElement;
      const allPhotos = Array.from(container.querySelectorAll('.photo-item'));
      const allSrcs = allPhotos.map(img => img.src);
      openPhotoView(photoImg.src, allSrcs, allPhotos.indexOf(photoImg));
    }
  });

  // Toggle Love pas ikon hati di-klik
  const heartBtn = document.getElementById('pvHeart');
  if (heartBtn) {
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentSrc = pvCur.src;
      if (!currentSrc) return;

      const fileName = currentSrc.split('/').pop().replace('.png', '').replace('.jpg', '');
      
      if (favoritePhotos.includes(fileName)) {
        favoritePhotos = favoritePhotos.filter(id => id !== fileName);
      } else {
        favoritePhotos.push(fileName);
      }
      
      // Update UI di seluruh aplikasi
      refreshAllFavoriteUI();
    });
  }

  // ===== SWIPE LOGIC (HP & Desktop) =====
  let pvDrag = null;
  let pvTouchId = null;

  function pvStartDrag(clientX, clientY) {
    if (!photoView.classList.contains('open') || pvAnimating) return false;
    
    pvDrag = { 
      startX: clientX, 
      startY: clientY, 
      lastX: clientX, 
      lastT: performance.now(), 
      v: 0, 
      dx: 0, 
      dir: null 
    };
    pvLayout(0, false);
    return true;
  }

  function pvMoveDrag(clientX, clientY, e) {
    if (!pvDrag) return;
    
    const rawX = (clientX - pvDrag.startX) / frameScale;
    const rawY = (clientY - pvDrag.startY) / frameScale;

    if (!pvDrag.dir) {
      if (Math.abs(rawX) > 8 || Math.abs(rawY) > 8) {
        pvDrag.dir = Math.abs(rawX) >= Math.abs(rawY) ? 'h' : 'v';
      } else {
        return;
      }
    }
    
    if (pvDrag.dir !== 'h') return;

    if (e && e.cancelable) e.preventDefault();

    const now = performance.now();
    const dt = now - pvDrag.lastT;
    if (dt > 0) pvDrag.v = (clientX - pvDrag.lastX) / frameScale / dt;
    pvDrag.lastX = clientX;
    pvDrag.lastT = now;

    const atStart = currentPhotoIndex === 0 && rawX > 0;
    const atEnd = currentPhotoIndex === currentPhotoList.length - 1 && rawX < 0;
    pvDrag.dx = (atStart || atEnd) ? rawX * 0.3 : rawX;
    
    pvLayout(pvDrag.dx, false);
  }

  function pvEndDrag() {
    if (!pvDrag) return;
    const d = pvDrag;
    pvDrag = null;

    if (d.dir !== 'h') { 
      pvLayout(0, false); 
      return; 
    }

    const W = pvWidth();
    const step = W + PV_GAP;
    const hasNext = currentPhotoIndex < currentPhotoList.length - 1;
    const hasPrev = currentPhotoIndex > 0;
    let dir = 0;

    if ((d.dx < -W * 0.25 || d.v < -0.45) && hasNext) dir = 1;
    else if ((d.dx > W * 0.25 || d.v > 0.45) && hasPrev) dir = -1;

    pvAnimating = true;
    pvLayout(-dir * step, true);

    clearTimeout(pvTimer);
    pvTimer = setTimeout(() => {
      if (dir !== 0) {
        currentPhotoIndex += dir;
        pvSetSlides();
        refreshAllFavoriteUI(); // <--- Update status love setelah ganti foto
      }
      pvLayout(0, false);
      pvAnimating = false;
    }, 400);
  }

  // Desktop
  photoView.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.photo-view-header') || e.target.closest('.photo-view-footer')) return;
    if (e.pointerType === 'touch') return; 
    
    if (pvStartDrag(e.clientX, e.clientY)) {
      photoView.setPointerCapture(e.pointerId);
    }
  });

  photoView.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pvMoveDrag(e.clientX, e.clientY, e);
  });

  photoView.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    pvEndDrag();
  });

  photoView.addEventListener('pointercancel', (e) => {
    if (e.pointerType === 'touch') return;
    pvEndDrag();
  });

  // HP
  photoView.addEventListener('touchstart', (e) => {
    if (e.target.closest('.photo-view-header') || e.target.closest('.photo-view-footer')) return;
    if (e.touches.length > 1) return; 
    
    const touch = e.touches[0];
    if (pvStartDrag(touch.clientX, touch.clientY)) {
      pvTouchId = touch.identifier;
    }
  }, { passive: false });

  photoView.addEventListener('touchmove', (e) => {
    if (!pvDrag || pvTouchId === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === pvTouchId);
    if (touch) {
      pvMoveDrag(touch.clientX, touch.clientY, e);
    }
  }, { passive: false });

  photoView.addEventListener('touchend', (e) => {
    if (!pvDrag || pvTouchId === null) return;
    const touch = Array.from(e.changedTouches).find(t => t.identifier === pvTouchId);
    if (touch) {
      pvTouchId = null;
      pvEndDrag();
    }
  });

  photoView.addEventListener('touchcancel', () => {
    pvTouchId = null;
    pvEndDrag();
  });

  // Panggil refresh UI pas pertama kali load
  refreshAllFavoriteUI();

  render(0);
});