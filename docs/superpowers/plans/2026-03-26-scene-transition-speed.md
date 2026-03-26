# Scene Transition Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere i cambi di scena quasi istantanei eliminando delay artificiali, precaricando le immagini in background e comprimendo i file pesanti.

**Architecture:** Tre interventi indipendenti su `src/App.tsx` e sulle immagini in `public/assets/panoramas/`. Il preload sfrutta la cache del browser: una volta scaricate, le immagini vengono fornite da cache a Pannellum → evento `load` quasi immediato.

**Tech Stack:** React 19, TypeScript, Pannellum 2.5.7, Node.js `sharp` (compressione immagini)

---

### Task 1: Rimuovere il delay artificiale di 700ms

**Files:**
- Modify: `src/App.tsx:414-422`

- [ ] **Step 1: Aprire App.tsx e localizzare il listener `load`**

Cercare il blocco a riga ~414:
```typescript
viewerRef.current.on('load', () => {
  const elapsed = Date.now() - loadStartRef.current;
  const delay   = Math.max(0, 700 - elapsed);
  setTimeout(() => {
    isLoadingRef.current = false;
    setIsLoadingScene(false);
  }, delay);
});
```

- [ ] **Step 2: Sostituire con hide immediato**

```typescript
viewerRef.current.on('load', () => {
  isLoadingRef.current = false;
  setIsLoadingScene(false);
});
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "perf: remove artificial 700ms loading delay on scene change"
```

---

### Task 2: Preload di tutte le panoramiche all'avvio

**Files:**
- Modify: `src/App.tsx` (aggiungere un `useEffect` dopo gli altri effetti di init)

- [ ] **Step 1: Individuare il punto di inserimento in App.tsx**

Inserire il nuovo `useEffect` dopo il blocco fullscreen listener (riga ~375), prima del blocco Pannellum init (~riga 378).

- [ ] **Step 2: Aggiungere il preload effect**

```typescript
// ── Preload panoramiche in background ──
useEffect(() => {
  SCENES.forEach(scene => {
    const img = new Image();
    img.src = scene.panorama;
  });
}, []);
```

Questo scarica tutte le immagini una volta sola al mount del componente. Il browser le mette in cache → quando Pannellum le richiede al cambio scena, arrivano dalla cache locale invece che dalla rete.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "perf: preload all panorama images at startup for instant scene switching"
```

---

### Task 3: Comprimere le immagini panoramiche pesanti

**Files:**
- Script temporaneo: `scripts/compress-panoramas.mjs` (da eliminare dopo l'uso)
- Immagini: `public/assets/panoramas/test-panorama*.jpg`

Dimensioni attuali:
| File | Dimensione |
|---|---|
| test-panorama4.jpg | 4.3 MB |
| test-panorama5.jpg | **16 MB** ← principale collo di bottiglia |
| test-panorama6.jpg | 7.0 MB |
| test-panorama7.jpg | 5.3 MB |

- [ ] **Step 1: Installare sharp come devDependency**

```bash
npm install --save-dev sharp
```

- [ ] **Step 2: Creare lo script di compressione**

```javascript
// scripts/compress-panoramas.mjs
import sharp from 'sharp';
import { readdirSync, renameSync } from 'fs';
import { join } from 'path';

const dir = 'public/assets/panoramas';
const files = readdirSync(dir).filter(f => f.match(/^test-panorama\d+\.jpg$/));

for (const file of files) {
  const input = join(dir, file);
  const output = join(dir, file.replace('.jpg', '_compressed.jpg'));
  const info = await sharp(input)
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toFile(output);
  console.log(`${file}: ${(info.size / 1024 / 1024).toFixed(1)} MB`);
}
```

- [ ] **Step 3: Eseguire la compressione (prima di sovrascrivere, controlla output)**

```bash
node scripts/compress-panoramas.mjs
```

Output atteso (valori approssimativi):
```
test-panorama4.jpg: ~1.2 MB
test-panorama5.jpg: ~4.5 MB
test-panorama6.jpg: ~2.0 MB
test-panorama7.jpg: ~1.5 MB
```

- [ ] **Step 4: Rinominare i file compressi sostituendo gli originali**

```bash
cd public/assets/panoramas
for f in *_compressed.jpg; do mv "$f" "${f/_compressed/}"; done
```

- [ ] **Step 5: Verificare che i path in App.tsx siano invariati**

I path nelle SCENES restano identici (`/assets/panoramas/test-panorama4.jpg` ecc.) — nessuna modifica al codice.

- [ ] **Step 6: Eliminare lo script temporaneo e rimuovere sharp**

```bash
rm scripts/compress-panoramas.mjs
rmdir scripts 2>/dev/null || true
npm uninstall sharp
```

- [ ] **Step 7: Commit**

```bash
git add public/assets/panoramas/
git commit -m "perf: compress panorama images (16MB→~4.5MB, others proportionally)"
```

---

## Risultato atteso

| Metrica | Prima | Dopo |
|---|---|---|
| Delay artificiale | 700ms minimo | 0ms |
| Prima visita scena (cache fredda) | download completo | uguale |
| Rivisita scena (cache calda) | download completo | ~istantaneo |
| Dimensione totale panoramiche | ~32 MB | ~9 MB |
| Cambio verso test-panorama5 | attesa >5s su rete lenta | ~1.5s su rete lenta |
