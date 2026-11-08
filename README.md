# AI Content Control Room

A copy of the DailyinfoRH **AI Content Control Room** desk: social channel cards, bilingual production/approval, agent demo floor, plus the Faceless Shorts studio for 9:16 video.

Open the control room first — channel cards show **your live account stats** after OAuth. **Open demo** is only a practice floor with sample agents. Use **Open Shorts desk** (or `?app=studio`) for the isometric TikTok explainer pipeline. Connect **TikTok**, **Instagram Reels**, **Facebook**, and **YouTube** with official OAuth. App keys live in Cursor Secrets — never in the repo. First synthesized Short downloads the Mini model (~78 MB) and needs WebGPU (Chrome, Edge, or Safari 26+).

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## What you can do

- **Create** — build a Short from a sentence. Watch Idea → Script → Scenes → Voice → Video → Ready.
- **Play preview** — hear the narrator and read word captions on a 9:16 stage.
- **Export / Share** — record a 9:16 video with voice and captions, then share or download it.
- **Auto post** — connect TikTok, Instagram Reels, Facebook, and YouTube. Queued Shorts publish through the official APIs.
- **Library** — keep every Short on the desk. Three sample films ship so the shelves are not empty.
- **Queue** — schedule tonight or tomorrow morning. Keep the tab open so due posts can fire.
- **Channel** — set name, niche, art style, narrator, and connected accounts. New Shorts inherit that brand.

State is stored in `localStorage` under `faceless-studio-v5`. Exported videos stay in IndexedDB on that device.
