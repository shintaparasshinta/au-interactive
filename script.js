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
      // Lebar desain ikut melebar kalau layar lebih "pendek" dari rasio desain,
      // jadi frame selalu menutupi seluruh lebar layar (tanpa pinggiran kosong)
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
    if (input.length === 4) setTimeout(checkPasscode, 120);
  }

  function checkPasscode() {
    if (input === PASSWORD) {
      state = 'home';
      dots.forEach(d => d.style.background = '#34C759');
      setTimeout(() => {
        homeScreen.classList.add('active'); // home fade in di atas passcode
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
    // pointerdown = langsung kebaca pas jari nempel (click baru nyala setelah jari diangkat)
    keypad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.key');
      if (!btn || btn.disabled || btn.classList.contains('key-empty')) return;
      e.preventDefault(); // cegah click susulan biar nggak kehitung dua kali
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

    /* ===== HOME SCREEN INTERACTION ===== */
  document.querySelectorAll('#screen-home .app-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      // Nanti kita arahkan ke App Overlay yang sesuai
      // Contoh: kalau yang diklik ikon iMessage (warna hijau dock)
      if (icon.querySelector('path[d*="M20 2H4"]')) {
        alert("Membuka iMessage...");
      }
    });
  });

  /* ===== APP OVERLAY: buka dari ikon, keluar dengan swipe up dari bawah ===== */
  const homeGesture = document.getElementById('homeGesture');

  // Daftar app: ikon di home -> overlay-nya. Tambah app baru tinggal nambah baris di sini.
  const APPS = [
    { icon: 'img[alt="Photos"]', overlay: 'app-photos' },
  ];

  let activeApp = null;   // { ov, iconEl, mode }

  // Posisi & ukuran ikon relatif ke pusat frame (px desain) = titik asal/tujuan animasi zoom
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

    // Start: kecil di posisi ikon
    ov.style.transition = 'none';
    ov.style.transform = iconTransform(o);
    ov.style.opacity = '0';
    ov.style.borderRadius = (15 / o.s) + 'px';
    ov.classList.add('open');
    void ov.offsetWidth; // paksa browser "mencatat" posisi awal

    // Zoom ke layar penuh
    ov.style.transition = `transform 0.5s ${EASE}, opacity 0.25s ease, border-radius 0.5s ${EASE}`;
    ov.style.transform = 'translate3d(0, 0, 0) scale(1)';
    ov.style.opacity = '1';
    ov.style.borderRadius = '0px';

    root.classList.add(activeApp.mode);   // status bar mode gelap
    frame.classList.add('app-open');      // aktifin zona gesture bawah
  }

  function closeApp() {
    if (!activeApp) return;
    const { ov, iconEl, mode } = activeApp;
    activeApp = null;

    // Mengecil balik ke ikonnya
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
      ov.style.cssText = ''; // balik ke gaya awal dari CSS
    }, 480);
  }

  APPS.forEach(app => {
    const icon = document.querySelector(app.icon);
    if (icon) icon.addEventListener('click', () => openApp(app, icon));
  });

  // --- Gesture keluar: tarik ke atas dari tepi bawah ---
  let appDrag = null;

  homeGesture.addEventListener('pointerdown', (e) => {
    if (!activeApp) return;
    homeGesture.setPointerCapture(e.pointerId);
    appDrag = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, d: 0 };
    activeApp.ov.style.transition = 'none'; // ikut jari 1:1
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

    // App mengecil jadi "kartu" sambil naik pelan
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
      closeApp(); // cukup jauh atau flick cepat -> keluar
    } else {
      // Belum cukup: balik lagi ke layar penuh
      const ov = activeApp.ov;
      ov.style.transition = `transform 0.4s ${EASE}, border-radius 0.4s ease, box-shadow 0.4s ease`;
      ov.style.transform = 'translate3d(0, 0, 0) scale(1)';
      ov.style.borderRadius = '0px';
      ov.style.boxShadow = 'none';
    }
  }
  homeGesture.addEventListener('pointerup', endAppDrag);
  homeGesture.addEventListener('pointercancel', endAppDrag);

  // Cadangan buat desktop: tombol Esc juga keluar dari app
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeApp) closeApp();
  });

    /* ===== INTERAKSI ALBUM PHOTOS ===== */
  const albumOverlay = document.getElementById('app-photos-album');
  const albumTitle = document.getElementById('albumTitle');
  const albumGrid = document.getElementById('albumGrid');

  // Data dummy album (kamu bisa ganti src dengan foto asli)
  const albumData = {
    'Recents': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'],
    'Favorites': ['2', '3', '5', '6', '8', '10', '11', '13', '15', '17'],
    '4boiz': ['13', '14', '16', '19', '20', '21', '22', '23', '24', '25'],
    'Videos': ['1', '4', '7', '10', '13'],
    'Selfies': ['2', '5', '10', '13', '15', '18', '20', '22', '24', ],
    'Screenshots': ['3', '6', '9', '12', '15']
  };

  // Fungsi buka album
  window.openAlbum = function(albumName) {
    albumTitle.textContent = albumName;
    albumGrid.innerHTML = ''; // Kosongin grid dulu
    
    // Isi foto berdasarkan album
    const photos = albumData[albumName] || [];
    photos.forEach(photoId => {
      const img = document.createElement('img');
      img.src = `photos/${photoId}.png`;
      img.className = 'photo-item';
      albumGrid.appendChild(img);
    });

    albumOverlay.classList.add('open');
  };

  // Fungsi tutup album
  window.closeAlbum = function() {
    albumOverlay.classList.remove('open');
  };

  // Sambungin klik dari halaman Photos Utama
  document.querySelectorAll('.ph-sec-item').forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('.ph-sec-label').textContent.split('\n')[0].trim();
      // Mapping nama album
      if (label.includes('Recents')) openAlbum('Recents');
      else if (label.includes('Favorites')) openAlbum('Favorites');
      else if (label.includes('4boiz')) openAlbum('4boiz');
    });
  });

  render(0);
});