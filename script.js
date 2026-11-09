document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".viewport-wrapper");
  const frame = document.getElementById("iphoneFrame");
  const lockBg = document.getElementById("lockBg");
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
      const scale = Math.min(
        window.innerWidth / designWidth,
        window.innerHeight / MIN_H,
      );
      const H = window.innerHeight / scale;
      frameScale = scale;

      root.style.setProperty(
        "--vshift",
        String(clamp(designHeight - H, 0, 41)),
      );

      wrapper.style.zoom = "1";
      wrapper.style.width = window.innerWidth / scale + "px";
      wrapper.style.height = H + "px";
      wrapper.style.position = "absolute";
      wrapper.style.transformOrigin = "top left";
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.left = "0px";
      wrapper.style.top = "0px";
    } else {
      root.style.setProperty("--vshift", "0");
      wrapper.style.zoom = "1";
      wrapper.style.width = "";
      wrapper.style.height = "";
      wrapper.style.position = "relative";
      wrapper.style.left = "0";
      wrapper.style.top = "0";
      const scale = Math.min(
        (window.innerWidth - 40) / designWidth,
        (window.innerHeight - 40) / designHeight,
        1,
      );
      frameScale = scale;
      wrapper.style.transformOrigin = "center center";
      wrapper.style.transform = `scale(${scale})`;
    }
  }

  window.addEventListener("resize", resizeFrame);
  resizeFrame();
  setTimeout(resizeFrame, 100);

  /* ===== 2. ELEMENTS & STATE ===== */
  const lockScreen = document.getElementById("screen-lock");
  const passcodeScreen = document.getElementById("screen-passcode");
  const passcodeBody = document.getElementById("passcodeBody");
  const homeScreen = document.getElementById("screen-home");
  const lockContent = document.getElementById("lockContent");
  const btnCancel = document.getElementById("btnCancel");
  const swipeUpText = document.getElementById("swipeUpText");

  const OPEN_DIST = 380;
  let state = "lock";

  /* ===== 3. ANIMASI TRANSISI LOCK <-> PASSCODE ===== */
  function render(d) {
    d = clamp(d, 0, OPEN_DIST);
    const p = d / OPEN_DIST;

    lockContent.style.transform = `translate3d(0, ${-d}px, 0)`;
    lockContent.style.setProperty("--fade", 1 - clamp(p * 1.6, 0, 1));

    const blur = p * 10;
    lockBg.style.filter = `blur(${blur}px)`;
    root.style.setProperty("--bg-blur", `${blur}px`);

    passcodeScreen.style.setProperty("--pfade", clamp((p - 0.15) / 0.85, 0, 1));
    passcodeBody.style.transform = `translate3d(0, ${(1 - p) * 60}px, 0)`;
  }

  function setAnimating(on) {
    frame.classList.toggle("animating", on);
    root.classList.toggle("animating", on);
  }

  let animTimer = null;
  function animateTo(d) {
    setAnimating(true);
    render(d);
    clearTimeout(animTimer);
    animTimer = setTimeout(() => setAnimating(false), 600);
  }

  function openPasscode() {
    if (state !== "lock") return;
    state = "passcode";
    resetPasscode();
    frame.classList.add("passcode-mode");
    passcodeScreen.classList.add("active");
    animateTo(OPEN_DIST);
  }

  function closePasscode() {
    state = "lock";
    frame.classList.remove("passcode-mode");
    passcodeScreen.classList.remove("active");
    animateTo(0);
  }

  /* ===== 4. GESTURE SWIPE UP ===== */
  let isDragging = false;
  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let lastDragDist = 0;

  lockScreen.addEventListener("pointerdown", (e) => {
    if (state !== "lock") return;
    isDragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    clearTimeout(animTimer);
    setAnimating(false);
  });

  window.addEventListener("pointermove", (e) => {
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

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  document.querySelectorAll(".notif-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (lastDragDist < 8) openPasscode();
    });
  });
  if (swipeUpText) {
    swipeUpText.addEventListener("click", () => {
      if (lastDragDist < 8) openPasscode();
    });
  }

  /* ===== 5. LOGIKA PASSCODE ===== */
  const dots = document.querySelectorAll(".dot");
  const keypad = document.getElementById("keypad");
  const passcodeDots = document.getElementById("passcodeDots");
  const PASSWORD = "1879";
  let input = "";

  function updateDots() {
    dots.forEach((dot, i) => dot.classList.toggle("filled", i < input.length));
  }

  function resetPasscode() {
    input = "";
    updateDots();
    passcodeDots.classList.remove("shake");
    dots.forEach((d) => (d.style.background = ""));
  }

  function handleKey(key) {
    if (state !== "passcode") return;
    if (key === "del") {
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
      state = "home";
      dots.forEach((d) => (d.style.background = "#34C759"));
      setTimeout(() => {
        homeScreen.classList.add("active");
        root.classList.add("home-mode");
        setTimeout(() => {
          passcodeScreen.classList.remove("active");
          passcodeScreen.style.setProperty("--pfade", 0);
          frame.classList.remove("passcode-mode");
          resetPasscode();
        }, 450);
      }, 300);
    } else {
      passcodeDots.classList.add("shake");
      if (navigator.vibrate) navigator.vibrate(100);
      setTimeout(resetPasscode, 500);
    }
  }

  if (keypad) {
    keypad.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".key");
      if (!btn || btn.disabled || btn.classList.contains("key-empty")) return;
      e.preventDefault();
      const key = btn.dataset.key;
      if (key) handleKey(key);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (state !== "passcode") return;
    if (/^[0-9]$/.test(e.key)) handleKey(e.key);
    else if (e.key === "Backspace") handleKey("del");
  });

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      closePasscode();
    });
  }

  /* ===== 6. CLEAR ALL ===== */
  const closeBtn = document.querySelector(".close-btn");
  const notifHeader = document.querySelector(".notif-header");
  const notifItems = document.querySelectorAll(".notif-item");

  if (closeBtn) {
    let expandedTimer = null;
    closeBtn.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        closeBtn.classList.add("expanded");
        clearTimeout(expandedTimer);
      }
    });
    closeBtn.addEventListener("mouseleave", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        expandedTimer = setTimeout(
          () => closeBtn.classList.remove("expanded"),
          500,
        );
      }
    });
    closeBtn.addEventListener("click", () => {
      if (!closeBtn.classList.contains("expanded")) {
        closeBtn.classList.add("expanded");
        return;
      }
      notifItems.forEach((item, i) => {
        setTimeout(() => item.classList.add("clearing"), i * 40);
      });
      setTimeout(
        () => notifHeader.classList.add("hidden"),
        notifItems.length * 40 + 200,
      );
    });
  }

  /* ===== 7. APP OVERLAY: buka dari ikon, keluar swipe up ===== */
  const homeGesture = document.getElementById("homeGesture");

  const APPS = [{ icon: 'img[alt="Photos"]', overlay: "app-photos" }];

  let activeApp = null;

  function iconOrigin(iconEl) {
    const fr = frame.getBoundingClientRect();
    const ir = iconEl.getBoundingClientRect();
    return {
      dx: (ir.left + ir.width / 2 - (fr.left + fr.width / 2)) / frameScale,
      dy: (ir.top + ir.height / 2 - (fr.top + fr.height / 2)) / frameScale,
      s: ir.width / fr.width,
    };
  }
  const iconTransform = (o) =>
    `translate3d(${o.dx}px, ${o.dy}px, 0) scale(${o.s})`;
  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

  function openApp(app, iconEl) {
    if (activeApp) return;
    const ov = document.getElementById(app.overlay);
    if (!ov) return;

    const o = iconOrigin(iconEl);
    activeApp = { ov, iconEl, mode: app.overlay + "-mode" };

    ov.style.transition = "none";
    ov.style.transform = iconTransform(o);
    ov.style.opacity = "0";
    ov.style.borderRadius = 15 / o.s + "px";
    ov.classList.add("open");
    void ov.offsetWidth;

    ov.style.transition = `transform 0.5s ${EASE}, opacity 0.25s ease, border-radius 0.5s ${EASE}`;
    ov.style.transform = "translate3d(0, 0, 0) scale(1)";
    ov.style.opacity = "1";
    ov.style.borderRadius = "0px";

    root.classList.add(activeApp.mode);
    frame.classList.add("app-open");
  }

  function closeApp() {
    if (!activeApp) return;
    const { ov, iconEl, mode } = activeApp;
    activeApp = null;

    const o = iconOrigin(iconEl);
    ov.style.transition = `transform 0.45s ${EASE}, opacity 0.3s ease 0.1s, border-radius 0.45s ease, box-shadow 0.3s ease`;
    ov.style.transform = iconTransform(o);
    ov.style.opacity = "0";
    ov.style.borderRadius = 15 / o.s + "px";
    ov.style.boxShadow = "none";

    root.classList.remove(mode);
    frame.classList.remove("app-open");

    setTimeout(() => {
      ov.classList.remove("open");
      ov.style.cssText = "";
    }, 480);
  }

  APPS.forEach((app) => {
    const icon = document.querySelector(app.icon);
    if (icon) icon.addEventListener("click", () => openApp(app, icon));
  });

  let appDrag = null;

  homeGesture.addEventListener("pointerdown", (e) => {
    if (!activeApp) return;
    homeGesture.setPointerCapture(e.pointerId);
    appDrag = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: performance.now(),
      v: 0,
      d: 0,
    };
    activeApp.ov.style.transition = "none";
  });

  homeGesture.addEventListener("pointermove", (e) => {
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
    ov.style.borderRadius = 54 + p * 50 + "px";
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
      ov.style.transform = "translate3d(0, 0, 0) scale(1)";
      ov.style.borderRadius = "0px";
      ov.style.boxShadow = "none";
    }
  }
  homeGesture.addEventListener("pointerup", endAppDrag);
  homeGesture.addEventListener("pointercancel", endAppDrag);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeApp) closeApp();
  });

  /* ===== 8. GLOBAL FAVORITE LOGIC ===== */
  let favoritePhotos = ["2", "4", "7", "9", "13", "16", "20"];

  function isFavorite(src) {
    if (!src) return false;
    const fileName = src
      .split("/")
      .pop()
      .replace(".png", "")
      .replace(".jpg", "");
    return favoritePhotos.includes(fileName);
  }

  function refreshAllFavoriteUI() {
    document.querySelectorAll(".photo-item").forEach((img) => {
      if (isFavorite(img.dataset.full || img.src)) {
        img.classList.add("is-favorite");
      } else {
        img.classList.remove("is-favorite");
      }
    });

    const heartBtn = document.getElementById("pvHeart");
    const pvCur = document.getElementById("pvCur");
    if (heartBtn && pvCur && pvCur.src) {
      if (isFavorite(pvCur.src)) {
        heartBtn.classList.add("favorited");
      } else {
        heartBtn.classList.remove("favorited");
      }
    }
  }

  /* ===== 9. INTERAKSI ALBUM PHOTOS ===== */
  const albumOverlay = document.getElementById("app-photos-album");
  const albumTitle = document.getElementById("albumTitle");
  const albumGrid = document.getElementById("albumGrid");

  const albumData = {
    Recents: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "v1",
      "v2",
      "15",
      "16",
      "17",
      "18",
      "19",
      "v3",
      "20",
      "21",
      "v4",
      "22",
      "v5",
      "v6",
      "23",
      "24",
      "25",
      "v7"
    ],
    Favorites: ["2", "3", "5", "8", "9", "10", "11", "13", "15", "17"],
    "4boiz": ["13", "14", "v1", "v2", "16", "19", "v3", "20", "21", "v4", "22", "v5", "v6", "23", "24", "25", "v7"],
    Videos: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
    Selfies: ["2", "5", "10", "13", "15", "18", "20", "22", "24"],
    Screenshots: ["3", "6", "9", "12", "15"],
    Today: ["1", "2", "3", "4", "5", "6"],
    Yesterday: ["7", "8", "9", "10"],
  };

  window.openAlbum = function (albumName) {
    albumTitle.textContent = albumName;
    albumGrid.innerHTML = "";

    const items = albumData[albumName] || [];
    items.forEach((itemId) => {
      let img;
      if (itemId.startsWith("v")) {
        img = document.createElement("img");
        // thumbnail video namanya t1..t7 (sama kayak di grid utama), bukan "thumbnail-v1"
        img.src = `photos/t${itemId.slice(1)}.png`;
        img.setAttribute("data-video", `videos/${itemId}.mp4`);
        img.className = "photo-item video-thumb";
        img.alt = itemId;
      } else {
        img = document.createElement("img");
        img.src = `photos/${itemId}.png`;
        img.className = "photo-item";
        img.alt = itemId;
      }
      img.dataset.full = new URL(img.src, document.baseURI).href;
      albumGrid.appendChild(img);
    });

    refreshAllFavoriteUI();
    albumOverlay.classList.add("open");
  };

  window.closeAlbum = function () {
    albumOverlay.classList.remove("open");
  };

  document.querySelectorAll(".ph-sec-item").forEach((item) => {
    item.addEventListener("click", () => {
      const label = item
        .querySelector(".ph-sec-label")
        .textContent.split("\n")[0]
        .trim();
      if (label.includes("Recents")) openAlbum("Recents");
      else if (label.includes("Favorites")) openAlbum("Favorites");
      else if (label.includes("4boiz")) openAlbum("4boiz");
    });
  });

  /* ===== 10. FULLSCREEN PHOTO & VIDEO & SWIPE ===== */
  const photoView = document.getElementById("app-photo-view");
  const pvStage = photoView.querySelector(".photo-view-content");
  const pvPrev = document.getElementById("pvPrev");
  const pvCur = document.getElementById("pvCur");
  const pvNext = document.getElementById("pvNext");
  const pvVideo = document.getElementById("pvVideo");
  const pvTransition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";

  const PV_GAP = 20;
  let currentPhotoList = [];
  let currentPhotoIndex = 0;
  let pvAnimating = false;
  let pvTimer = null;
  let pvMuted = false;

  // FIX: guard biar loadeddata handler nggak play video yang udah nggak aktif
  let pvLoadToken = 0;

  const pvWidth = () => pvStage.offsetWidth || 430;

  function pvResolveSrc(item) {
    if (!item) return null;
    if (item.videoSrc) return new URL(item.videoSrc, document.baseURI).href;
    return item.src || null;
  }

  function pvSetSlides() {
    const currentItem = currentPhotoList[currentPhotoIndex];
    const isVid = !!(currentItem && currentItem.videoSrc);

    // Video juga dapat slide gambar (poster/thumbnail) — jadi pas swipe & pas
    // video lagi loading nggak ada layar hitam kosong; video fade-in di atasnya.
    const setImg = (el, i) => {
      const item = currentPhotoList[i];
      if (item && item.src) {
        el.src = item.src;
        el.style.visibility = "visible";
      } else {
        el.removeAttribute("src");
        el.style.visibility = "hidden";
      }
    };
    setImg(pvPrev, currentPhotoIndex - 1);
    setImg(pvCur, currentPhotoIndex);
    setImg(pvNext, currentPhotoIndex + 1);

    // FIX: token baru tiap ganti slide — biar event lama nggak nge-trigger play
    pvLoadToken++;
    const myToken = pvLoadToken;

    // Reset video dulu
    pvVideo.pause();
    pvVideo.classList.remove("ready");
    pvVideo.removeAttribute("src");
    try {
      pvVideo.load();
    } catch (_) {}
    pvStopFilmstrip();
    pvUpdateHead();

    if (isVid) {
      const src = pvResolveSrc(currentItem);
      pvVideo.muted = true; // Paksa mute biar autoplay jalan
      pvMuted = true;
      pvMuteBtn.innerHTML = ICON_MUTE;
      // simpan token SEBELUM src di-set, dicek di loadeddata
      pvVideo.dataset.loadToken = String(myToken);
      photoView.classList.add("has-video");
      photoView.classList.remove("paused");
      pvPlayBtn.innerHTML = ICON_PLAY;
      pvVideo.src = src;
      try {
        pvVideo.load();
      } catch (_) {}
    } else {
      photoView.classList.remove("has-video", "paused");
    }
  }

  function pvLayout(dx, animate) {
    const step = pvWidth() + PV_GAP;
    [pvPrev, pvCur, pvNext, pvVideo].forEach((el) => {
      if (el) el.style.transition = animate ? pvTransition : "none";
    });
    pvPrev.style.transform = `translate3d(${dx - step}px, 0, 0)`;
    pvCur.style.transform = `translate3d(${dx}px, 0, 0)`;
    pvNext.style.transform = `translate3d(${dx + step}px, 0, 0)`;
    // FIX: SELALU translate video, nggak peduli display-nya apa.
    // Visibility diatur lewat class .ready di CSS.
    pvVideo.style.transform = `translate3d(${dx}px, 0, 0)`;
    // jaga fade-in video (opacity) tetap jalan walau transform lagi "none"
    pvVideo.style.transition =
      (animate ? pvTransition + ", " : "") + "opacity 0.2s ease";
  }

  window.openPhotoView = function (currentItem, list = [], index = 0) {
    clearTimeout(pvTimer);
    pvAnimating = false;
    currentPhotoList = list.length ? list : [currentItem];
    currentPhotoIndex = list.length ? index : 0;

    pvSetSlides();
    pvLayout(0, false);
    refreshAllFavoriteUI();

    photoView.classList.remove("chrome-hidden");
    photoView.classList.add("open");
    root.classList.add("app-photos-mode");
  };

  window.closePhotoView = function () {
    photoView.classList.remove("open", "has-video", "paused", "chrome-hidden");
    if (pvVideo) {
      pvVideo.pause();
      pvVideo.removeAttribute("src");
      try {
        pvVideo.load();
      } catch (_) {}
      pvVideo.classList.remove("ready");
    }
    pvLoadToken++; // batalkan event video yang masih nyangkut
    pvStopFilmstrip();
    if (
      !document.getElementById("app-photos").classList.contains("open") &&
      !document.getElementById("app-photos-album").classList.contains("open")
    ) {
      root.classList.remove("app-photos-mode");
    }
  };

  // GLOBAL EVENT LISTENER UNTUK SEMUA .photo-item
  document.addEventListener("click", (e) => {
    // 1. PRIORITAS UTAMA: Klik foto/video di grid atau album
    const mediaElement = e.target.closest(".photo-item");
    if (mediaElement) {
      e.stopPropagation();

      const container = mediaElement.parentElement;
      const allMedia = Array.from(container.querySelectorAll(".photo-item"));

      const allItems = allMedia.map((m) => {
        if (!m.dataset.full) {
          m.dataset.full = new URL(m.src, document.baseURI).href;
        }
        if (m.hasAttribute("data-video")) {
          return {
            src: m.dataset.full,
            videoSrc: new URL(m.getAttribute("data-video"), document.baseURI)
              .href,
          };
        }
        return { src: m.dataset.full };
      });

      const clickedIndex = allMedia.indexOf(mediaElement);
      const clickedItem = allItems[clickedIndex];

      openPhotoView(clickedItem, allItems, clickedIndex);
      return;
    }

    // 2. Klik ikon Photos di Home Screen
    const photosIcon = e.target.closest('img[alt="Photos"]');
    if (photosIcon && !activeApp) {
      openApp({ overlay: "app-photos" }, photosIcon);
    }
  });

  // Toggle Love
  const heartBtn = document.getElementById("pvHeart");
  if (heartBtn) {
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentItem = currentPhotoList[currentPhotoIndex];
      if (currentItem && currentItem.videoSrc) return;

      const currentSrc = currentItem ? currentItem.src : null;
      if (!currentSrc) return;

      const fileName = currentSrc
        .split("/")
        .pop()
        .replace(".png", "")
        .replace(".jpg", "");

      if (favoritePhotos.includes(fileName)) {
        favoritePhotos = favoritePhotos.filter((id) => id !== fileName);
      } else {
        favoritePhotos.push(fileName);
      }
      refreshAllFavoriteUI();
    });
  }

  // ===== SWIPE LOGIC =====
  let pvDrag = null;
  let pvTouchId = null;

  function pvStartDrag(clientX, clientY) {
    if (!photoView.classList.contains("open") || pvAnimating) return false;
    pvDrag = {
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastT: performance.now(),
      v: 0,
      dx: 0,
      dir: null,
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
        pvDrag.dir = Math.abs(rawX) >= Math.abs(rawY) ? "h" : "v";
      } else {
        return;
      }
    }

    if (pvDrag.dir !== "h") return;
    if (e && e.cancelable) e.preventDefault();

    const now = performance.now();
    const dt = now - pvDrag.lastT;
    if (dt > 0) pvDrag.v = (clientX - pvDrag.lastX) / frameScale / dt;
    pvDrag.lastX = clientX;
    pvDrag.lastT = now;

    const atStart = currentPhotoIndex === 0 && rawX > 0;
    const atEnd = currentPhotoIndex === currentPhotoList.length - 1 && rawX < 0;
    pvDrag.dx = atStart || atEnd ? rawX * 0.3 : rawX;
    pvLayout(pvDrag.dx, false);
  }

  function pvEndDrag() {
    if (!pvDrag) return;
    const d = pvDrag;
    pvDrag = null;

    // Tap (nggak geser) = sembunyiin / munculin bar atas-bawah, kayak iOS
    if (d.dir === null) {
      photoView.classList.toggle("chrome-hidden");
      pvLayout(0, false);
      return;
    }

    if (d.dir !== "h") {
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
        refreshAllFavoriteUI();
      }
      pvLayout(0, false);
      pvAnimating = false;
    }, 400);
  }

  // Desktop
  photoView.addEventListener("pointerdown", (e) => {
    if (
      e.target.closest(
        ".photo-view-header, .photo-view-footer, .pv-video-bar, .pv-bigplay",
      )
    )
      return;
    if (e.pointerType === "touch") return;
    if (pvStartDrag(e.clientX, e.clientY))
      photoView.setPointerCapture(e.pointerId);
  });

  photoView.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    pvMoveDrag(e.clientX, e.clientY, e);
  });

  photoView.addEventListener("pointerup", (e) => {
    if (e.pointerType === "touch") return;
    pvEndDrag();
  });

  photoView.addEventListener("pointercancel", (e) => {
    if (e.pointerType === "touch") return;
    pvEndDrag();
  });

  // HP
  photoView.addEventListener(
    "touchstart",
    (e) => {
      if (
        e.target.closest(
          ".photo-view-header, .photo-view-footer, .pv-video-bar, .pv-bigplay",
        )
      )
        return;
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      if (pvStartDrag(touch.clientX, touch.clientY))
        pvTouchId = touch.identifier;
    },
    { passive: false },
  );

  photoView.addEventListener(
    "touchmove",
    (e) => {
      if (!pvDrag || pvTouchId === null) return;
      const touch = Array.from(e.touches).find(
        (t) => t.identifier === pvTouchId,
      );
      if (touch) pvMoveDrag(touch.clientX, touch.clientY, e);
    },
    { passive: false },
  );

  photoView.addEventListener("touchend", (e) => {
    if (!pvDrag || pvTouchId === null) return;
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === pvTouchId,
    );
    if (touch) {
      pvTouchId = null;
      pvEndDrag();
    }
  });

  photoView.addEventListener("touchcancel", () => {
    pvTouchId = null;
    pvEndDrag();
  });

  /* ===== 11. THUMBNAIL ===== */
  const THUMB_PX = 400;
  const thumbCache = new Map();

  function getThumb(full) {
    if (!thumbCache.has(full)) {
      thumbCache.set(
        full,
        new Promise((resolve) => {
          const im = new Image();
          im.decoding = "async";
          im.onload = async () => {
            try {
              const bmp = await createImageBitmap(im, {
                resizeWidth: THUMB_PX,
                resizeQuality: "medium",
              });
              const c = document.createElement("canvas");
              c.width = bmp.width;
              c.height = bmp.height;
              c.getContext("2d").drawImage(bmp, 0, 0);
              c.toBlob(
                (b) => resolve(b ? URL.createObjectURL(b) : full),
                "image/jpeg",
                0.85,
              );
            } catch (err) {
              resolve(full);
            }
          };
          im.onerror = () => resolve(full);
          im.src = full;
        }),
      );
    }
    return thumbCache.get(full);
  }

  function applyThumb(img) {
    const full = img.dataset.full || (img.dataset.full = img.src);
    img.decoding = "async";
    getThumb(full).then((url) => {
      if (url !== full) img.src = url;
    });
  }

  const initThumbs = () =>
    document.querySelectorAll("#app-photos .photo-item").forEach(applyThumb);
  // requestIdleCallback butuh object ({timeout}), bukan angka — kalau angka dia
  // melempar TypeError dan semua kode di bawahnya (kontrol video dll) nggak jalan.
  if (window.requestIdleCallback) {
    window.requestIdleCallback(initThumbs, { timeout: 200 });
  } else {
    setTimeout(initThumbs, 200);
  }

  /* ===== 12. KONTROL VIDEO ===== */
  const pvPlayBtn = document.getElementById("pvPlayBtn");
  const pvMuteBtn = document.getElementById("pvMuteBtn");
  const pvBigPlay = document.getElementById("pvBigPlay");
  const pvStrip = document.getElementById("pvStrip");
  const pvFrames = document.getElementById("pvFrames");
  const pvHead = document.getElementById("pvHead");

  const svg = (inner) =>
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">${inner}</svg>`;
  const ICON_PLAY = svg(
    '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
  );
  const ICON_PAUSE = svg(
    '<rect x="5.5" y="4" width="4.2" height="16" rx="1.3"/><rect x="14.3" y="4" width="4.2" height="16" rx="1.3"/>',
  );
  const ICON_VOL = svg(
    '<path d="M3 9.5v5h3.5L11.5 19V5L6.5 9.5H3z"/><path d="M15 8.5a5 5 0 0 1 0 7M17.8 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  );
  const ICON_MUTE = svg(
    '<path d="M3 9.5v5h3.5L11.5 19V5L6.5 9.5H3z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  );

  let scrubbing = false;
  let wasPlaying = false;
  let headRaf = 0;

  function pvUpdateHead() {
    const p = pvVideo.duration ? pvVideo.currentTime / pvVideo.duration : 0;
    pvHead.style.left = clamp(p, 0, 1) * (pvStrip.clientWidth - 3) + "px";
  }

  function pvSyncPlayUI() {
    // Abaikan event dari video yang srcnya sudah dicopot (pas ganti slide),
    // biar tombol play besar nggak kedip.
    if (!pvVideo.getAttribute("src")) return;
    const playing = scrubbing ? wasPlaying : !pvVideo.paused && !pvVideo.ended;
    photoView.classList.toggle("paused", !playing);
    pvPlayBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  }

  /* --- Filmstrip: ambil frame asli dari video buat scrubber --- */
  let stripToken = 0;

  function pvStopFilmstrip() {
    stripToken++;
    pvFrames.innerHTML = "";
  }

  function pvBuildFilmstrip(src) {
    const token = ++stripToken;
    pvFrames.innerHTML = "";

    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;

    const cleanup = () => {
      v.removeAttribute("src");
      try {
        v.load();
      } catch (_) {}
    };

    const waitSeek = () =>
      new Promise((res) => {
        const t = setTimeout(res, 1500);
        v.addEventListener(
          "seeked",
          () => {
            clearTimeout(t);
            res();
          },
          { once: true },
        );
      });

    v.addEventListener(
      "loadedmetadata",
      async () => {
        if (token !== stripToken) return cleanup();
        const W = pvStrip.clientWidth || 300;
        const H = pvStrip.clientHeight || 44;
        const n = Math.max(4, Math.round(W / (H * 0.6)));
        const dur = v.duration || 1;
        const fw = Math.ceil((W / n) * 2);
        const fh = H * 2;

        const canvases = [];
        for (let i = 0; i < n; i++) {
          const c = document.createElement("canvas");
          c.width = fw;
          c.height = fh;
          pvFrames.appendChild(c);
          canvases.push(c);
        }

        for (let i = 0; i < n; i++) {
          if (token !== stripToken) return cleanup();
          v.currentTime = Math.min(dur - 0.05, ((i + 0.5) / n) * dur);
          await waitSeek();
          if (token !== stripToken) return cleanup();
          try {
            const vw = v.videoWidth || fw;
            const vh = v.videoHeight || fh;
            const s = Math.max(fw / vw, fh / vh);
            const dw = vw * s;
            const dh = vh * s;
            canvases[i]
              .getContext("2d")
              .drawImage(v, (fw - dw) / 2, (fh - dh) / 2, dw, dh);
          } catch (_) {}
        }
        cleanup();
      },
      { once: true },
    );
    v.addEventListener("error", cleanup, { once: true });
  }

  function pvHeadLoop() {
    pvUpdateHead();
    if (!pvVideo.paused) headRaf = requestAnimationFrame(pvHeadLoop);
  }

  function pvTogglePlay() {
    if (pvVideo.paused) pvVideo.play().catch(() => {});
    else pvVideo.pause();
  }

  pvVideo.addEventListener("play", () => {
    cancelAnimationFrame(headRaf);
    pvHeadLoop();
    pvSyncPlayUI();
  });
  pvVideo.addEventListener("pause", pvSyncPlayUI);
  pvVideo.addEventListener("ended", () => {
    pvUpdateHead();
    pvSyncPlayUI();
  });
  pvVideo.addEventListener("seeked", pvUpdateHead);
  pvVideo.addEventListener("timeupdate", pvUpdateHead);
  pvVideo.addEventListener("loadedmetadata", pvUpdateHead);

  // true kalau event ini milik video yang sekarang aktif (bukan sisa slide lama)
  function pvIsActiveVideo() {
    if (pvVideo.dataset.loadToken !== String(pvLoadToken)) return false;
    const item = currentPhotoList[currentPhotoIndex];
    return !!(
      item &&
      item.videoSrc &&
      pvVideo.getAttribute("src") &&
      pvVideo.src === pvResolveSrc(item)
    );
  }

  pvVideo.addEventListener("loadeddata", () => {
    if (!pvIsActiveVideo()) return;

    pvVideo.classList.add("ready");
    pvBuildFilmstrip(pvVideo.src);

    const playPromise = pvVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay diblokir browser -> tampilkan tombol play besar
        photoView.classList.add("paused");
        pvPlayBtn.innerHTML = ICON_PLAY;
      });
    }
  });

  pvVideo.addEventListener("canplay", () => {
    if (pvIsActiveVideo()) pvVideo.classList.add("ready");
  });

  pvVideo.addEventListener("error", () => {
    // error palsu dari src yang sengaja dicopot -> abaikan
    if (!pvVideo.getAttribute("src")) return;
    const code = pvVideo.error && pvVideo.error.code;
    console.error(
      "Video Error Code:",
      code,
      "(4 = file nggak ketemu / codec nggak didukung) src:",
      pvVideo.currentSrc,
    );

    // poster (thumbnail) tetap kelihatan, tombol play besar muncul
    pvVideo.classList.remove("ready");
    photoView.classList.add("paused");
    pvPlayBtn.innerHTML = ICON_PLAY;
  });

  pvPlayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    pvTogglePlay();
  });
  pvBigPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    pvTogglePlay();
  });
  pvMuteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    pvMuted = !pvMuted;
    pvVideo.muted = pvMuted;
    pvMuteBtn.innerHTML = pvMuted ? ICON_MUTE : ICON_VOL;
  });
  pvPlayBtn.innerHTML = ICON_PLAY;
  pvMuteBtn.innerHTML = ICON_MUTE; // Langsung mute biar autoplay jalan
  pvMuted = true;
  pvVideo.muted = true;

  function scrubTo(e) {
    const r = pvStrip.getBoundingClientRect();
    const p = clamp((e.clientX - r.left) / r.width, 0, 1);
    if (pvVideo.duration) pvVideo.currentTime = p * pvVideo.duration;
    pvUpdateHead();
  }
  pvStrip.addEventListener("pointerdown", (e) => {
    pvStrip.setPointerCapture(e.pointerId);
    wasPlaying = !pvVideo.paused && !pvVideo.ended;
    scrubbing = true;
    pvVideo.pause();
    scrubTo(e);
  });
  pvStrip.addEventListener("pointermove", (e) => {
    if (scrubbing) scrubTo(e);
  });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    if (wasPlaying) pvVideo.play().catch(() => {});
    pvSyncPlayUI();
  };
  pvStrip.addEventListener("pointerup", endScrub);
  pvStrip.addEventListener("pointercancel", endScrub);

  refreshAllFavoriteUI();
  render(0);
});