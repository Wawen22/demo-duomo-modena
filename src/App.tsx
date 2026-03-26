import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, ChevronRight, ChevronLeft,
  Maximize2, Minimize2, Headphones, Map, Info, Settings,
  ZoomIn, ZoomOut, Volume2, MousePointer,
} from 'lucide-react';
import './App.css';

// ── CONFIG ──────────────────────────────────────────────────────────────────
const QR_CODE_URL      = 'https://duomodimodena.it';   // sostituire con URL prod
const ATTRACT_TIMEOUT  = 60  * 1000;                   // 60s → attract loop
const KIOSK_TIMEOUT    = 3   * 60 * 1000;              // 3min → torna alla splash
const SWIPE_MIN_PX     = 100;                          // px minimi per riconoscere swipe
const SWIPE_MAX_MS     = 420;                          // ms massimi per swipe rapido
const SWIPE_MAX_DY     = 80;                           // px verticali tollerati

// ── INTERFACCE ──────────────────────────────────────────────────────────────
interface Scene {
  id: string;
  name: string;
  nameEn: string;
  panorama: string;
  thumbnail: string;
  mapPos: { x: number; y: number };
  type: '360' | 'hd';
  hotspots: Hotspot[];
}

interface Hotspot {
  id: string;
  pitch: number;
  yaw: number;
  title: string;
  titleEn: string;
  text: string;
  textEn: string;
  images: string[];
}

type Language = 'it' | 'en';

// ── SCENE ───────────────────────────────────────────────────────────────────
const SCENES: Scene[] = [
  {
    id: 'esterno',
    name: 'Esterno Duomo',
    nameEn: 'Cathedral Exterior',
    panorama: '/assets/panoramas/test-panorama4.jpg',
    thumbnail: 'https://picsum.photos/seed/duomo2/200/120',
    mapPos: { x: 50, y: 93 },
    type: '360',
    hotspots: [
      {
        id: 'facciata',
        pitch: 0, yaw: 0,
        title: 'Facciata del Duomo',
        titleEn: 'Cathedral Facade',
        text: 'Esempio supremo di architettura romanica, con i bassorilievi del Wiligelmo che narrano le storie della Genesi. Patrimonio UNESCO dal 1997.',
        textEn: 'A supreme example of Romanesque architecture, with Wiligelmo\'s bas-reliefs narrating stories from Genesis. UNESCO Heritage since 1997.',
        images: ['https://picsum.photos/seed/facciata/800/600'],
      },
    ],
  },
  {
    id: 'abside',
    name: 'Abside & Coro',
    nameEn: 'Apse & Choir',
    panorama: '/assets/panoramas/test-panorama5.jpg',
    thumbnail: 'https://picsum.photos/seed/abside/200/120',
    mapPos: { x: 50, y: 20 },
    type: '360',
    hotspots: [
      {
        id: 'abside-dettaglio',
        pitch: -2, yaw: -126.36,
        title: 'Decorazioni Absidali',
        titleEn: 'Apsidal Decorations',
        text: 'Le decorazioni absidali rappresentano uno dei punti più alti dell\'arte medievale europea. Gli affreschi risalgono al XIII secolo.',
        textEn: 'The apsidal decorations represent one of the highlights of medieval European art. The frescoes date back to the 13th century.',
        images: ['https://picsum.photos/seed/abside1/800/600'],
      },
    ],
  },
  {
    id: 'cripta',
    name: 'Cripta di S. Geminiano',
    nameEn: 'Crypt of St. Geminianus',
    panorama: '/assets/panoramas/test-panorama6.jpg',
    thumbnail: 'https://picsum.photos/seed/cripta/200/120',
    mapPos: { x: 50, y: 45 },
    type: '360',
    hotspots: [
      {
        id: 'cripta-tomba',
        pitch: -20, yaw: 0,
        title: 'Tomba di San Geminiano',
        titleEn: 'Tomb of Saint Geminianus',
        text: 'La cripta ospita la tomba di San Geminiano, patrono di Modena, risalente all\'XI secolo. Il sarcofago è opera di Agostino di Duccio.',
        textEn: 'The crypt houses the tomb of Saint Geminianus, patron of Modena, dating back to the 11th century. The sarcophagus is by Agostino di Duccio.',
        images: ['https://picsum.photos/seed/cripta1/800/600'],
      },
    ],
  },
  {
    id: 'porta-regia',
    name: 'Porta Regia',
    nameEn: 'Royal Portal',
    panorama: '/assets/panoramas/test-panorama7.jpg',
    thumbnail: 'https://picsum.photos/seed/portareg/200/120',
    mapPos: { x: 80, y: 60 },
    type: '360',
    hotspots: [
      {
        id: 'bassorilievi-porta',
        pitch: 0, yaw: 45,
        title: 'Bassorilievi della Porta Regia',
        titleEn: 'Royal Portal Bas-reliefs',
        text: 'La Porta Regia è celebre per i suoi bassorilievi che raffigurano scene bibliche e simboli medievali, realizzati da maestranze campionesi.',
        textEn: 'The Royal Portal is renowned for its bas-reliefs depicting biblical scenes and medieval symbols, crafted by Campionese masters.',
        images: ['https://picsum.photos/seed/portareg1/800/600'],
      },
    ],
  },
];

// ── APP ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => {

  // ── State UI ──
  const [currentScene,        setCurrentScene]        = useState<Scene>(SCENES[0]);
  const [activePOI,           setActivePOI]           = useState<Hotspot | null>(null);
  const [currentYaw,          setCurrentYaw]          = useState(0);
  const [currentPitch,        setCurrentPitch]        = useState(0);
  const [currentPOIImageIndex,setCurrentPOIImageIndex]= useState(0);
  const [isMapOpen,           setIsMapOpen]           = useState(false);
  const [isFullscreen,        setIsFullscreen]        = useState(false);
  const [language,            setLanguage]            = useState<Language>('it');
  const [debugMode,           setDebugMode]           = useState(false);

  // ── State WOW + Kiosk ──
  const [showSplash,      setShowSplash]      = useState(true);
  const [sceneTitle,      setSceneTitle]      = useState<{ it: string; en: string } | null>(null);
  const [showHint,        setShowHint]        = useState(false);
  const [showAttract,     setShowAttract]     = useState(false);
  const [isLoadingScene,  setIsLoadingScene]  = useState(false);

  // ── Refs ──
  const viewerRef           = useRef<any>(null);
  const requestRef          = useRef<number>(0);
  const appRef              = useRef<HTMLDivElement>(null);
  const isFirstSceneChange  = useRef(true);
  const showSplashRef       = useRef(true);          // copia sincrona per callback stabili
  const currentSceneRef     = useRef(currentScene);  // copia sincrona per touch handler
  const touchStartRef       = useRef<{ x: number; y: number; t: number } | null>(null);
  const loadStartRef        = useRef<number>(0);     // timestamp inizio caricamento scena
  const isLoadingRef        = useRef(false);         // copia sincrona per handler stabili
  const autoRotateResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attractTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kioskTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantieni i ref sincronizzati con lo state
  useEffect(() => { showSplashRef.current   = showSplash;    }, [showSplash]);
  useEffect(() => { currentSceneRef.current = currentScene;  }, [currentScene]);

  // ── Debug helpers esposti su window (solo in development) ──
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__duomo = {
        attract:    () => setShowAttract(true),
        reset:      () => { isFirstSceneChange.current = true; showSplashRef.current = true; setCurrentScene(SCENES[0]); setShowSplash(true); setShowAttract(false); setActivePOI(null); setIsMapOpen(false); },
        nextScene:  () => { const i = SCENES.findIndex(s => s.id === currentSceneRef.current.id); setActivePOI(null); setCurrentScene(SCENES[(i + 1) % SCENES.length]); },
        prevScene:  () => { const i = SCENES.findIndex(s => s.id === currentSceneRef.current.id); setActivePOI(null); setCurrentScene(SCENES[(i - 1 + SCENES.length) % SCENES.length]); },
        help:       () => console.table({ attract: 'mostra attract loop', reset: 'torna alla splash', nextScene: 'scena successiva', prevScene: 'scena precedente' }),
      };
      console.info('%c🏛 Duomo Debug API disponibile su window.__duomo', 'color:#E8B84B;font-weight:bold');
      console.info('%cDigita __duomo.help() per vedere i comandi', 'color:#8ab4f8');
    }
  }, []);

  // ────────────────────────────────────────────────────────────
  //  KIOSK: resetTimers – chiamato ad ogni interazione utente
  // ────────────────────────────────────────────────────────────
  const resetTimers = useCallback(() => {
    setShowAttract(false);

    // Non avviare timer durante la splash
    if (showSplashRef.current) return;

    if (attractTimerRef.current) clearTimeout(attractTimerRef.current);
    if (kioskTimerRef.current)   clearTimeout(kioskTimerRef.current);

    // Dopo ATTRACT_TIMEOUT: mostra attract loop
    attractTimerRef.current = setTimeout(() => {
      if (!showSplashRef.current) setShowAttract(true);
    }, ATTRACT_TIMEOUT);

    // Dopo KIOSK_TIMEOUT: reset completo alla splash
    kioskTimerRef.current = setTimeout(() => {
      if (!showSplashRef.current) {
        isFirstSceneChange.current = true;
        showSplashRef.current = true;
        setCurrentScene(SCENES[0]);
        setShowSplash(true);
        setShowAttract(false);
        setActivePOI(null);
        setIsMapOpen(false);
      }
    }, KIOSK_TIMEOUT);
  }, []); // stabile – usa solo ref e setState stabili

  // Ascolta qualsiasi interazione per resettare i timer
  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown'] as const;
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (attractTimerRef.current) clearTimeout(attractTimerRef.current);
      if (kioskTimerRef.current)   clearTimeout(kioskTimerRef.current);
    };
  }, [resetTimers]);

  // ────────────────────────────────────────────────────────────
  //  SPLASH: entra nell'esperienza
  // ────────────────────────────────────────────────────────────
  const handleEnter = useCallback(() => {
    showSplashRef.current = false;
    setShowSplash(false);
    resetTimers(); // avvia i timer kiosk

    setTimeout(() => {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 4500);
    }, 1500);
  }, [resetTimers]);

  // ────────────────────────────────────────────────────────────
  //  AUTO-ROTATE: stop quando POI è aperto, riprende 2s dopo la chiusura
  //
  //  Problema precedente: impostare autoRotateInactivityDelay = -1
  //  disabilitava il meccanismo interno di pannellum e la semplice
  //  modifica di cfg.autoRotate = 5 non risvegliava il loop RAF se
  //  nessun evento di interazione era stato ricevuto.
  //
  //  Soluzione: non toccare autoRotateInactivityDelay. Al resume,
  //  dopo aver impostato cfg.autoRotate = 5, chiamare setYaw() con
  //  il valore corrente per forzare una nuova requestAnimationFrame
  //  e svegliare il loop di pannellum in modo garantito.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRotateResumeRef.current) clearTimeout(autoRotateResumeRef.current);
    try {
      const cfg = viewerRef.current?.getConfig();
      if (!cfg) return;

      if (activePOI) {
        // Stop immediato — non toccare autoRotateInactivityDelay
        cfg.autoRotate = 0;
      } else {
        // Riprende dopo 2s
        autoRotateResumeRef.current = setTimeout(() => {
          if (!viewerRef.current) return;
          try {
            const c = viewerRef.current.getConfig();
            c.autoRotate = 5;
            // "Nudge" — setYaw forza una nuova RAF frame e sveglia il loop
            // 0.001° è impercettibile (serve 360.000 aperture POI per derivare di 360°)
            viewerRef.current.setYaw(viewerRef.current.getYaw() + 0.001);
          } catch (_) {}
        }, 2000);
      }
    } catch (_) { /* viewer non ancora pronto al primo render */ }
  }, [activePOI]);

  // ────────────────────────────────────────────────────────────
  //  TITLE CARD al cambio scena (non al primo caricamento)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstSceneChange.current) {
      isFirstSceneChange.current = false;
      return;
    }
    setSceneTitle({ it: currentScene.name, en: currentScene.nameEn });
    const t = setTimeout(() => setSceneTitle(null), 2600);
    return () => clearTimeout(t);
  }, [currentScene]);

  // ────────────────────────────────────────────────────────────
  //  KEYBOARD SHORTCUTS (utile per staff / debug)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSplashRef.current) return;
      const v = viewerRef.current;
      const step = 15;
      switch (e.key) {
        case 'ArrowLeft':  if (v) v.setYaw(v.getYaw() - step);  e.preventDefault(); break;
        case 'ArrowRight': if (v) v.setYaw(v.getYaw() + step);  e.preventDefault(); break;
        case 'ArrowUp':    if (v) v.setPitch(Math.min(85,  v.getPitch() + step)); e.preventDefault(); break;
        case 'ArrowDown':  if (v) v.setPitch(Math.max(-85, v.getPitch() - step)); e.preventDefault(); break;
        case '+': case '=': if (v) v.setHfov(Math.max(30,  v.getHfov() - 10)); break;
        case '-':           if (v) v.setHfov(Math.min(120, v.getHfov() + 10)); break;
        case 'Escape': setActivePOI(null); break;
        case 'm': case 'M': setIsMapOpen(p => !p); break;
        case 'f': case 'F':
          if (!document.fullscreenElement) appRef.current?.requestFullscreen();
          else document.exitFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ────────────────────────────────────────────────────────────
  //  SWIPE per cambiare scena (solo sull'area panorama)
  // ────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (showSplashRef.current) return;
    const target = e.target as Element;
    const panoramaEl = document.getElementById('panorama');
    if (!panoramaEl?.contains(target)) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.t;
    touchStartRef.current = null;

    const isSwipe =
      Math.abs(dx) >= SWIPE_MIN_PX &&
      Math.abs(dy) <= SWIPE_MAX_DY &&
      dt <= SWIPE_MAX_MS &&
      Math.abs(dx) / dt > 0.3;

    if (!isSwipe) return;

    const idx = SCENES.findIndex(s => s.id === currentSceneRef.current.id);
    const nextIdx = dx > 0
      ? (idx - 1 + SCENES.length) % SCENES.length  // swipe dx → scena precedente
      : (idx + 1) % SCENES.length;                  // swipe sx → scena successiva

    setActivePOI(null);
    setCurrentScene(SCENES[nextIdx]);
  }, []); // stabile – usa solo ref e setState stabili

  // ── Sync yaw/pitch con animationFrame ──
  const syncViewerState = useCallback(() => {
    if (viewerRef.current) {
      setCurrentYaw(viewerRef.current.getYaw());
      setCurrentPitch(viewerRef.current.getPitch());
    }
    requestRef.current = requestAnimationFrame(syncViewerState);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(syncViewerState);
    return () => cancelAnimationFrame(requestRef.current);
  }, [syncViewerState]);

  // ── Fullscreen listener ──
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Preload panoramiche in background (riempie la cache del browser) ──
  useEffect(() => {
    SCENES.forEach(scene => {
      const img = new Image();
      img.src = scene.panorama;
    });
  }, []);

  // ── Pannellum init (reinit ad ogni cambio scena) ──
  useEffect(() => {
    const initViewer = () => {
      if (!(window as any).pannellum) return;
      if (viewerRef.current) viewerRef.current.destroy();

      viewerRef.current = (window as any).pannellum.viewer('panorama', {
        type: 'equirectangular',
        panorama: currentScene.panorama,
        autoLoad: true,
        showControls: false,
        autoRotate: 5,
        autoRotateInactivityDelay: 3000,
        hotSpots: currentScene.hotspots.map(h => ({
          pitch: h.pitch,
          yaw: h.yaw,
          cssClass: 'custom-hotspot',
          createTooltipFunc: (el: HTMLElement) => {
            el.innerHTML = `
              <div class="hotspot-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <span class="hotspot-label">${h.title}</span>`;
          },
          clickHandlerFunc: () => {
            setCurrentPOIImageIndex(0);
            setActivePOI(h);
          },
        })),
      });

      // Listener load: nasconde l'overlay non appena Pannellum ha finito
      viewerRef.current.on('load', () => {
        isLoadingRef.current = false;
        setIsLoadingScene(false);
      });
    };

    if (!(window as any).pannellum) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      script.onload = initViewer;
      document.body.appendChild(script);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
      document.head.appendChild(link);
    } else {
      initViewer();
    }

    return () => { if (viewerRef.current) viewerRef.current.destroy(); };
  }, [currentScene]);

  // ── Helpers ──
  const switchScene = (scene: Scene) => {
    if (scene.id === currentSceneRef.current.id) return;
    if (isLoadingRef.current) return;
    setActivePOI(null);
    if (!showSplashRef.current) {
      loadStartRef.current = Date.now();
      isLoadingRef.current = true;
      setIsLoadingScene(true);
    }
    setCurrentScene(scene);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) appRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };
  // ...existing code...
  const zoom = (dir: 'in'|'out') => {
    if (!viewerRef.current) return;
    const h = viewerRef.current.getHfov();
    viewerRef.current.setHfov(Math.max(30, Math.min(120, h + (dir === 'in' ? -10 : 10))));
  };
  const getDirectionArrow = (scene: Scene) => {
    const cx = scene.mapPos.x * 1.9;
    const cy = scene.mapPos.y * 3.0;
    const rad = ((currentYaw - 90) * Math.PI) / 180;
    return { cx, cy, dx: Math.cos(rad) * 18, dy: Math.sin(rad) * 18 };
  };

  const currentIndex = SCENES.findIndex(s => s.id === currentScene.id);

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div
      className="app-container"
      ref={appRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Panorama (carica in background anche durante la splash) */}
      <div id="panorama" className="panorama-viewer" />

      {/* ══════════════════════════════════════
          SPLASH SCREEN
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="splash-screen"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeInOut' }}
          >
            <div className="splash-arch-lines" aria-hidden>
              <div className="arch-line arch-line--left" />
              <div className="arch-line arch-line--right" />
            </div>

            <div className="splash-content">
              <motion.div className="splash-badge"
                initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}>
                ✦ UNESCO · Patrimonio dell'Umanità · 1997 ✦
              </motion.div>

              <motion.h1 className="splash-title"
                initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.7, ease: 'easeOut' }}>
                DUOMO<br />DI MODENA
              </motion.h1>

              <motion.div className="splash-line"
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ delay: 1.0, duration: 0.65, ease: 'easeOut' }} />

              <motion.p className="splash-subtitle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}>
                {language === 'it' ? 'Guida Interattiva' : 'Interactive Guide'}
              </motion.p>

              <motion.div className="splash-lang"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.35, duration: 0.5 }}>
                <button className={`lang-btn ${language === 'it' ? 'active' : ''}`}
                  onClick={() => setLanguage('it')} title="Italiano">🇮🇹</button>
                <button className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')} title="English">🇬🇧</button>
              </motion.div>

              <motion.button className="splash-cta" onClick={handleEnter}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.55, duration: 0.6 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {language === 'it' ? 'Entra nel Duomo' : 'Enter the Cathedral'}
                <ChevronRight size={20} />
              </motion.button>

              <motion.span className="splash-year"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.5 }}>
                Fondato nel 1099 · Wiligelmo · Lanfranco
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          TITLE CARD (effetto documentario)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {sceneTitle && (
          <motion.div className="scene-title-card"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}>
            <motion.div className="scene-title-inner"
              initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: -22, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
              <span className="scene-title-label">DUOMO DI MODENA</span>
              <div className="scene-title-line" />
              <h2 className="scene-title-name">
                {language === 'it' ? sceneTitle.it : sceneTitle.en}
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          HINT OVERLAY (primo ingresso)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showHint && (
          <motion.div className="hint-overlay"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.5 }}>
            <div className="hint-item">
              <MousePointer size={15} className="hint-icon-svg" />
              <span>{language === 'it' ? 'Trascina per esplorare' : 'Drag to explore'}</span>
            </div>
            <div className="hint-sep" />
            <div className="hint-item">
              <Info size={15} className="hint-icon-svg" />
              <span>{language === 'it' ? 'Clicca i punti luminosi' : 'Click glowing points'}</span>
            </div>
            <div className="hint-sep" />
            <div className="hint-item">
              <Map size={15} className="hint-icon-svg" />
              <span>{language === 'it' ? 'Scorri per cambiare sala' : 'Swipe to change room'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          LOADING OVERLAY (cambio scena)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {isLoadingScene && !showSplash && (
          <motion.div
            className="scene-loader-overlay"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="loader-spinner" />
            <span className="loader-scene-name">
              {language === 'it' ? currentScene.name : currentScene.nameEn}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          ATTRACT LOOP (idle > 60s)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showAttract && (
          <motion.div
            className="attract-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            onTouchStart={resetTimers}
            onClick={resetTimers}
          >
            {/* Anelli pulsanti */}
            <div className="attract-rings">
              <div className="attract-ring attract-ring--1" />
              <div className="attract-ring attract-ring--2" />
              <div className="attract-ring attract-ring--3" />
              <div className="attract-core">
                <MousePointer size={32} color="var(--blue-dark)" />
              </div>
            </div>
            <p className="attract-text">
              {language === 'it' ? 'TOCCA PER ESPLORARE' : 'TOUCH TO EXPLORE'}
            </p>
            <p className="attract-sub">DUOMO DI MODENA</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          INDICATORI SWIPE (bordi laterali)
      ══════════════════════════════════════ */}
      {!showSplash && (
        <>
          <button
            className="swipe-indicator swipe-indicator--left"
            onClick={() => switchScene(SCENES[(currentIndex - 1 + SCENES.length) % SCENES.length])}
            aria-label="Scena precedente"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            className="swipe-indicator swipe-indicator--right"
            onClick={() => switchScene(SCENES[(currentIndex + 1) % SCENES.length])}
            aria-label="Scena successiva"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* ══════════════════════════════════════
          TOGGLE PIANTA (top-left)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {!isMapOpen && !showSplash && (
          <motion.button className="map-toggle-btn" onClick={() => setIsMapOpen(true)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Map size={18} />
            <span>{language === 'it' ? 'PIANTA' : 'FLOOR PLAN'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          OVERLAY PIANTA
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div className="map-overlay"
            initial={{ opacity: 0, x: -30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}>
            <header className="map-header">
              <span className="map-title-it">Duomo di Modena – Pianta e punti di interesse</span>
              <span className="map-title-en">Cathedral of Modena – Plan and points of interest</span>
            </header>

            <div className="map-plan-wrapper">
              <svg viewBox="0 0 190 300" className="plan-svg" xmlns="http://www.w3.org/2000/svg">
                <rect width="190" height="300" fill="#f0ebe0" />
                <path d="M 72 18 A 23 23 0 0 1 118 18 L 118 42 L 72 42 Z" fill="#b8a882" stroke="#7a5c1e" strokeWidth="2" />
                <path d="M 40 96 A 13 13 0 0 0 40 122 L 54 122 L 54 96 Z" fill="#b8a882" stroke="#7a5c1e" strokeWidth="1.5" />
                <path d="M 150 96 A 13 13 0 0 1 150 122 L 136 122 L 136 96 Z" fill="#b8a882" stroke="#7a5c1e" strokeWidth="1.5" />
                <rect x="72" y="38" width="46" height="52" fill="#d4c9ac" stroke="#7a5c1e" strokeWidth="2" />
                <rect x="40" y="88" width="110" height="48" fill="#d4c9ac" stroke="#7a5c1e" strokeWidth="2" />
                <rect x="50" y="134" width="90" height="118" fill="#d4c9ac" stroke="#7a5c1e" strokeWidth="2" />
                <rect x="64" y="251" width="62" height="22" fill="#ccc0a0" stroke="#7a5c1e" strokeWidth="1.5" />
                <rect x="68" y="136" width="54" height="114" fill="#f5f0e5" />
                <rect x="52" y="136" width="16" height="114" fill="#ede7d8" />
                <rect x="122" y="136" width="16" height="114" fill="#ede7d8" />
                <rect x="76" y="42" width="38" height="46" fill="#ede7d8" />
                {[148, 165, 182, 199, 216, 237].map((yv, i) => (
                  <g key={i}>
                    <circle cx="68" cy={yv - 8} r="3" fill="#8B6C2E" />
                    <circle cx="122" cy={yv - 8} r="3" fill="#8B6C2E" />
                  </g>
                ))}
                <rect x="70" y="272" width="50" height="3" fill="none" stroke="#7a5c1e" strokeWidth="1" strokeDasharray="3,2" />
                <rect x="74" y="275" width="42" height="3" fill="none" stroke="#7a5c1e" strokeWidth="1" strokeDasharray="3,2" />

                {SCENES.map(scene => {
                  const mx = scene.mapPos.x * 1.9;
                  const my = scene.mapPos.y * 3.0;
                  const isActive = scene.id === currentScene.id;
                  return (
                    <g key={scene.id} onClick={() => { switchScene(scene); setIsMapOpen(false); }} style={{ cursor: 'pointer' }}>
                      {isActive && <circle cx={mx} cy={my} r="18" fill="rgba(20,48,112,0.22)" />}
                      <rect x={mx - 17} y={my - 10} width={scene.type === '360' ? 34 : 24} height="19" rx="4"
                        fill={isActive ? '#0A1B45' : '#1a2240'} stroke={isActive ? '#2455C8' : '#4a5a7a'} strokeWidth="1" />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize="7.5"
                        fill="white" fontWeight="bold" fontFamily="Montserrat, sans-serif">
                        {scene.type === '360' ? '360°' : 'HD'}
                      </text>
                    </g>
                  );
                })}

                {(() => {
                  const { cx, cy, dx, dy } = getDirectionArrow(currentScene);
                  return (
                    <g>
                      <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy}
                        stroke="#E8B84B" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx={cx + dx} cy={cy + dy} r="2.5" fill="#E8B84B" />
                    </g>
                  );
                })()}

                <g transform="translate(6, 270)">
                  <rect x="0" y="0" width="10" height="10" rx="2" fill="#0A1B45" stroke="#2455C8" strokeWidth="0.8" />
                  <text x="13" y="8" fontSize="6.5" fill="#555" fontFamily="Montserrat, sans-serif">360°</text>
                </g>
              </svg>
            </div>

            <button className="map-close-btn" onClick={() => setIsMapOpen(false)}>
              CHIUDI – CLOSE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          TOP-RIGHT: Branding + controlli
      ══════════════════════════════════════ */}
      {!showSplash && (
        <div className="top-right-panel">
          <div className="app-branding">
            <p className="branding-sub">{language === 'it' ? 'Guida Interattiva' : 'Interactive Guide'}</p>
            <h1>DUOMO DI MODENA</h1>
          </div>
          <div className="top-controls-row">
            <button className={`lang-btn ${language === 'it' ? 'active' : ''}`} onClick={() => setLanguage('it')} title="Italiano">IT</button>
            <button className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')} title="English">EN</button>
            <div className="separator" />
            <button className="icon-circle-btn" title="Informazioni"><Info size={20} /></button>
            <button className={`icon-circle-btn ${debugMode ? 'active' : ''}`}
              onClick={() => setDebugMode(p => !p)} title="Debug">
              <Settings size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Debug panel */}
      <AnimatePresence>
        {debugMode && (
          <motion.div className="debug-panel"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <div className="debug-title">COORDINATE FINDER</div>
            <div className="debug-row">PITCH <strong>{currentPitch.toFixed(2)}</strong></div>
            <div className="debug-row">YAW   <strong>{currentYaw.toFixed(2)}</strong></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          PAN + ZOOM (bottom-left)
      ══════════════════════════════════════ */}
      {!showSplash && (
        <div className="nav-controls">
          <div className="zoom-stack">
            <button className="ctrl-btn zoom" onClick={() => zoom('in')} title="Zoom In"><ZoomIn size={24} /></button>
            <button className="ctrl-btn zoom" onClick={() => zoom('out')} title="Zoom Out"><ZoomOut size={24} /></button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          QR CODE PANEL (fisso, bottom-right)
      ══════════════════════════════════════ */}
      {!showSplash && (
        <div className="qr-panel">
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={QR_CODE_URL}
              size={72}
              bgColor="transparent"
              fgColor="#E8B84B"
              level="M"
            />
          </div>
          <span className="qr-label">
            {language === 'it' ? 'Continua su mobile' : 'Continue on mobile'}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════
          BOTTOM BAR
      ══════════════════════════════════════ */}
      {!showSplash && (
        <footer className="bottom-bar">
          <div className="scene-name-area">
            <span className="scene-counter">{currentIndex + 1} / {SCENES.length}</span>
            <span className="scene-label">{language === 'it' ? currentScene.name : currentScene.nameEn}</span>
          </div>

          <div className="thumb-strip">
            <button className="strip-nav-btn"
              onClick={() => switchScene(SCENES[(currentIndex - 1 + SCENES.length) % SCENES.length])}>
              <ChevronLeft size={22} />
            </button>

            <div className="thumbs-scroll">
              {SCENES.map(s => (
                <button key={s.id} className={`thumb-btn ${s.id === currentScene.id ? 'active' : ''}`}
                  onClick={() => switchScene(s)} title={language === 'it' ? s.name : s.nameEn}>
                  <img src={s.thumbnail} alt={s.name} />
                  {s.id === currentScene.id && <div className="thumb-active-bar" />}
                </button>
              ))}
            </div>

            <button className="strip-nav-btn"
              onClick={() => switchScene(SCENES[(currentIndex + 1) % SCENES.length])}>
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="bottom-right-actions">
            <button className="fullscreen-btn" onClick={toggleFullscreen}
              title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}>
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        </footer>
      )}

      {/* ══════════════════════════════════════
          PANNELLO POI
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {activePOI && (
          <motion.aside className="poi-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 220 }}>
            <button className="poi-close-btn" onClick={() => setActivePOI(null)}>
              <X size={22} />
            </button>

            <div className="poi-scroll">
              <div className="poi-hero">
                <img src={activePOI.images[currentPOIImageIndex]}
                  alt={language === 'it' ? activePOI.title : activePOI.titleEn} />
                <div className="poi-hero-overlay" />
                {activePOI.images.length > 1 && (
                  <div className="poi-img-nav">
                    <button onClick={() => setCurrentPOIImageIndex(p => p > 0 ? p - 1 : activePOI.images.length - 1)}>
                      <ChevronLeft size={18} />
                    </button>
                    <span>{currentPOIImageIndex + 1} / {activePOI.images.length}</span>
                    <button onClick={() => setCurrentPOIImageIndex(p => p < activePOI.images.length - 1 ? p + 1 : 0)}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="poi-body">
                <span className="poi-category">ARCHITETTURA & STORIA</span>
                <h2 className="poi-title">{language === 'it' ? activePOI.title : activePOI.titleEn}</h2>
                <p className="poi-text">{language === 'it' ? activePOI.text : activePOI.textEn}</p>
              </div>
            </div>

            <div className="poi-actions">
              <button className="btn-primary"><Maximize2 size={17} /> {language === 'it' ? 'INGRANDISCI' : 'ENLARGE'}</button>
              <button className="btn-secondary"><Volume2 size={17} /> {language === 'it' ? 'AUDIO GUIDA' : 'AUDIO GUIDE'}</button>
              <button className="btn-secondary"><Headphones size={17} /> {language === 'it' ? 'ASCOLTA' : 'LISTEN'}</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
