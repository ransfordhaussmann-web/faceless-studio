# Faceless Studio

A content-creator desk for faceless Shorts in the isometric TikTok explainer style: teal agency board, desks, and huge outlined captions. Type one idea; the studio writes a six-beat script, plays a 9:16 preview with browser narration, and files the Short in a library and posting queue.

This is a local creator tool. Previews use the browser speech engine. They are not rendered MP4s and they are not uploaded to YouTube.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## What you can do

- **Create** — build a Short from a sentence. Watch Idea → Script → Scenes → Voice → Captions → Ready.
- **Play preview** — hear the narrator and read word captions on a 9:16 stage.
- **Library** — keep every Short on the desk. Three sample films ship so the shelves are not empty.
- **Queue** — schedule tonight or tomorrow morning. Scheduling stays in this browser.
- **Channel** — set name, niche, art style, and narrator once. New Shorts inherit that brand.

State is stored in `localStorage` under `faceless-studio-v1`.
