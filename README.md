# Duomo di Modena — Guida Interattiva

Web app kiosk per installazione su **monitor touch da 70"**. Tour virtuale 360° del Duomo di Modena (UNESCO 1997) con navigazione interattiva, hotspot informativi e sistema di reset automatico per uso museale.

---

## Stack

| Tecnologia | Versione | Ruolo |
|---|---|---|
| React + TypeScript | 19 | UI principale |
| Vite | 8 | Build tool |
| Pannellum | 2.5.6 | Viewer panorami 360° (caricato via CDN) |
| Framer Motion | 12 | Animazioni (splash, title card, overlay) |
| Lucide React | 0.577 | Icone |
| qrcode.react | 3.x | QR code "Continua su mobile" |
| Playfair Display + Montserrat | — | Font (Google Fonts) |

---

## Avvio rapido

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build produzione in /dist
```

Per la demo su 70": metti il browser in **Full Screen (F11)** prima di aprire l'app.

---

## Architettura

### File principali

```
src/
  App.tsx     — componente unico, tutta la logica e il JSX
  App.css     — design system completo (variabili CSS + stili)
public/
  assets/panoramas/   — immagini equirettangolari 360°
    test-panorama.jpg   → Abside & Coro
    test-panorama2.jpg  → Esterno Duomo
    test-panorama3.jpg  → Cripta di S. Geminiano
```

### Struttura dati scene (`SCENES` in App.tsx)

```ts
interface Scene {
  id: string;
  name: string;          // label italiano
  nameEn: string;        // label inglese
  panorama: string;      // path immagine equirettangolare
  thumbnail: string;     // url miniatura bottom bar
  mapPos: { x: number; y: number }; // posizione % sulla pianta SVG
  type: '360' | 'hd';
  hotspots: Hotspot[];
}

interface Hotspot {
  id: string;
  pitch: number; yaw: number;  // coordinate nel panorama
  title: string; titleEn: string;
  text: string;  textEn: string;
  images: string[];             // galleria immagini nel POI panel
}
```

Per trovare `pitch` e `yaw` esatti di un hotspot: attiva il **Debug Mode** (icona ingranaggio in alto a destra), poi ruota la scena — le coordinate vengono mostrate in tempo reale.

---

## Design System

Colori ufficiali di Modena:

```css
--yellow:      #E8B84B   /* Giallo Modena — accenti, CTA, hotspot */
--yellow-bright:#F0C84D  /* Hover / pressed */
--blue-dark:   #0A1B45   /* Blu notte — sfondi panel */
--blue:        #143070   /* Blu medio — superfici interattive */
--blue-light:  #1E47A8   /* Blu chiaro — stati hover */
--bg:          #06080F   /* Background (quasi nero, vena blu) */
```

Touch targets minimi: `--touch: 64px` (ottimizzato per 70" touch).

---

## Funzionalità implementate

### UX / WOW
- **Splash screen** con shimmer dorato sul titolo, badge UNESCO, scelta lingua, CTA animato
- **Title card cinematica** — al cambio scena, overlay con nome scena in stile documentario
- **Auto-rotate idle** — il panorama ruota lentamente (5°/s) dopo 3s di inattività
- **Auto-rotate bloccato quando POI è aperto** — riprende 2s dopo la chiusura (fix: nudge `setYaw` per svegliare il RAF loop di pannellum)
- **Hint overlay** — 3 suggerimenti animati al primo ingresso, scompaiono dopo 4.5s

### Navigazione
- **Pianta interattiva SVG** — stile Nonantola, header blu/giallo, freccia direzione camera in giallo
- **Strip miniature** — bottom bar con thumbnail cliccabili, bordo giallo sull'attiva
- **Swipe per cambiare scena** — swipe orizzontale veloce sul panorama (> 100px, < 420ms)
- **Indicatori swipe** — frecce sui bordi laterali, cliccabili + animated pulse
- **Keyboard shortcuts** — `←→↑↓` pan, `+/-` zoom, `M` pianta, `F` fullscreen, `Esc` chiudi POI

### Kiosk (70" touch)
- **Touch targets 64px** — tutti i controlli interattivi ottimizzati per dito
- **Attract loop** — dopo 60s di inattività: overlay scuro con anelli pulsanti gialli + "TOCCA PER ESPLORARE"
- **Kiosk reset** — dopo 3 minuti di inattività: torna automaticamente alla splash screen
- **Hotspot label sempre visibili** su `pointer: coarse` (`@media (hover: none)`)
- **QR code panel** — fisso bottom-right, giallo su blu scuro, URL configurabile

### Caricamento
- **Loading overlay brandizzato** — spinner giallo + nome scena, appare istantaneamente al cambio scena, minimo 700ms (evita flash su file veloci)
- **Pannellum loader nascosto** — sostituito completamente dal nostro overlay

### Pannello POI
- **Slide-in** da destra (spring animation)
- **Galleria immagini** con prev/next
- **Pulsanti azione** — INGRANDISCI (primary giallo), AUDIO GUIDA + ASCOLTA (secondary blu)

### Sviluppo
- **Debug API** su `window.__duomo` (solo in DEV):
  ```js
  __duomo.attract()    // mostra attract loop
  __duomo.reset()      // simula kiosk reset → splash
  __duomo.nextScene()  // scena successiva
  __duomo.prevScene()  // scena precedente
  __duomo.help()       // lista comandi
  ```

---

## Costanti configurabili (`App.tsx`)

```ts
const QR_CODE_URL     = 'https://duomodimodena.it'; // URL produzione
const ATTRACT_TIMEOUT = 60  * 1000;  // ms → mostra attract loop (default: 60s)
const KIOSK_TIMEOUT   = 3   * 60 * 1000; // ms → torna alla splash (default: 3min)
const SWIPE_MIN_PX    = 100;   // px minimi per riconoscere swipe
const SWIPE_MAX_MS    = 420;   // ms massimi per swipe rapido
```

Per testare kiosk reset velocemente abbassa temporaneamente:
```ts
const ATTRACT_TIMEOUT = 8  * 1000;  // 8s
const KIOSK_TIMEOUT   = 20 * 1000;  // 20s
```

---

## Aggiungere contenuti reali

### Nuova scena panoramica
1. Aggiungi il file `.jpg` equirettangolare in `public/assets/panoramas/`
2. Aggiungi un oggetto in `SCENES` (App.tsx) con `panorama`, `thumbnail`, `mapPos`
3. Posiziona il marker sulla pianta: usa `mapPos: { x: 0-100, y: 0-100 }` (% dello spazio SVG `190×300`)

### Nuovi hotspot
1. Attiva Debug Mode (ingranaggio in alto a destra)
2. Ruota la scena fino al punto desiderato → leggi `pitch` e `yaw`
3. Aggiungi l'hotspot nell'array `hotspots` della scena

---

## Roadmap futura

- [ ] **Audio guide** — player per ogni hotspot con traccia `.mp3` + narrazione
- [ ] **PWA / Offline** — service worker per cachare i panorami localmente (essenziale se il Wi-Fi del museo cade)
- [ ] **Carosello immagini swipeable** nel pannello POI
- [ ] **Contenuti reali** — panorami e fotografie ufficiali del Duomo
- [ ] **Analytics** — tracciamento hotspot più visitati per report al cliente

---

*Sviluppato da TEL&CO — Claude Code*
