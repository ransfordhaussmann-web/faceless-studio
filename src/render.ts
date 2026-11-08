import type { ArtStyleId, Channel, Short } from "./studio";
import { boardOf, handleOf } from "./studio";
import { audioBufferToWav, audioContext } from "./wav";
import type { Narration } from "./narrate";

const WIDTH = 720;
const HEIGHT = 1280;

const FILLS: Record<ArtStyleId, [string, string]> = {
  ember: ["#3a1d12", "#c45a32"],
  paper: ["#d7c4a3", "#8d6b4a"],
  neon: ["#081226", "#123a44"],
  ink: ["#111111", "#5d5a54"],
  clay: ["#6a4632", "#d9a679"],
  star: ["#0b1c3a", "#1e4d8c"],
  mosaic: ["#1b0d2a", "#7a2e6a"],
  brass: ["#24180c", "#8a6a32"],
};

function recorderMime(): string {
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  short: Short,
  channel: Channel,
  beat: number,
) {
  const [top, bottom] = FILLS[short.style] ?? FILLS.star;
  const fill = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  fill.addColorStop(0, top);
  fill.addColorStop(0.55, "#0b5c52");
  fill.addColorStop(1, bottom);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const board = boardOf(short, channel.name);
  ctx.fillStyle = "#e8fff8";
  ctx.font = "700 28px Segoe UI, Helvetica Neue, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(board.brand, 36, 64);
  ctx.font = "600 16px Segoe UI, Helvetica Neue, sans-serif";
  let pillX = 36;
  for (const pill of board.pills.slice(0, 4)) {
    const width = ctx.measureText(pill).width + 24;
    ctx.fillStyle = "#ffffff28";
    roundRect(ctx, pillX, 84, width, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#e8fff8";
    ctx.fillText(pill, pillX + 12, 104);
    pillX += width + 10;
  }

  ctx.font = "700 14px Segoe UI, Helvetica Neue, sans-serif";
  ctx.fillStyle = "#b7efe4";
  ctx.fillText("TASKS IN PROGRESS", 36, 160);
  board.tasks.forEach((task, index) => {
    const y = 180 + index * 78;
    ctx.fillStyle = "#042f2ccc";
    roundRect(ctx, 36, y, 300, 70, 12);
    ctx.fill();
    if (index === beat) {
      ctx.strokeStyle = "#25f4ee";
      ctx.lineWidth = 2;
      roundRect(ctx, 36, y, 300, 70, 12);
      ctx.stroke();
    }
    ctx.fillStyle = task.tone;
    roundRect(ctx, 48, y + 12, 8, 46, 4);
    ctx.fill();
    ctx.fillStyle = "#e8fff8";
    ctx.font = "700 18px Segoe UI, Helvetica Neue, sans-serif";
    ctx.fillText(task.name, 68, y + 32);
    ctx.fillStyle = "#9ad9cc";
    ctx.font = "500 13px Segoe UI, Helvetica Neue, sans-serif";
    ctx.fillText(`${task.step} · ${task.pct}%`, 68, y + 52);
    ctx.fillStyle = "#0a3d38";
    roundRect(ctx, 68, y + 58, 250, 4, 2);
    ctx.fill();
    ctx.fillStyle = task.tone;
    roundRect(ctx, 68, y + 58, 250 * (task.pct / 100), 4, 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(470, 560);
  ctx.transform(1, 0.18, -0.45, 0.72, 0, 0);
  ctx.fillStyle = "#14a38a";
  ctx.fillRect(-110, -80, 240, 200);
  ctx.fillStyle = "#0c7466";
  ctx.fillRect(-90, -60, 240, 200);
  ctx.fillStyle = "#ead7b6";
  [
    [-40, -10],
    [40, -30],
    [20, 50],
  ].forEach(([x, y], index) => {
    ctx.fillRect(x, y, 70, 40);
    ctx.fillStyle = "#143d4a";
    ctx.fillRect(x + 16, y - 18, 32, 20);
    ctx.fillStyle = index === 1 ? "#ff8ab8" : index === 2 ? "#7dffc5" : "#7ecbff";
    ctx.fillRect(x + 44, y + 10, 14, 22);
    ctx.fillStyle = "#ead7b6";
  });
  ctx.restore();

  const caption = short.beats[beat]?.caption ?? "";
  ctx.textAlign = "center";
  ctx.font = "800 54px Segoe UI, Helvetica Neue, sans-serif";
  ctx.lineJoin = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#fff";
  const lines = wrap(ctx, caption, WIDTH * 0.72);
  lines.forEach((line, index) => {
    const y = HEIGHT * 0.38 + index * 64;
    ctx.strokeText(line, WIDTH / 2, y);
    ctx.fillText(line, WIDTH / 2, y);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 22px Segoe UI, Helvetica Neue, sans-serif";
  ctx.fillText(`@${handleOf(channel.name)}`, 36, HEIGHT - 90);
  ctx.font = "500 18px Segoe UI, Helvetica Neue, sans-serif";
  ctx.fillStyle = "#ddd";
  const idea = short.idea.length > 54 ? `${short.idea.slice(0, 51)}…` : short.idea;
  ctx.fillText(idea, 36, HEIGHT - 58);
  ctx.fillText(`♪ original sound - ${channel.name}`, 36, HEIGHT - 28);

  ctx.beginPath();
  ctx.fillStyle = "#25f4ee";
  ctx.arc(WIDTH - 48, HEIGHT - 280, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "800 22px Segoe UI, Helvetica Neue, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(channel.name.slice(0, 1).toUpperCase(), WIDTH - 48, HEIGHT - 272);
}

export async function renderVideo(
  short: Short,
  channel: Channel,
  narration: Narration,
  onProgress?: (stage: string) => void,
): Promise<Blob> {
  const mime = recorderMime();
  const canRecord =
    Boolean(mime) &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function";
  if (!canRecord) return audioBufferToWav(narration.buffer);

  onProgress?.("Recording 9:16 video…");
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.cssText = "position:fixed;left:-9999px;top:0;width:72px;height:128px";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    canvas.remove();
    return audioBufferToWav(narration.buffer);
  }

  drawFrame(ctx, short, channel, 0);
  const canvasStream = canvas.captureStream(30);
  const audioCtx = audioContext();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  const dest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = narration.buffer;
  source.connect(dest);

  const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 3_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
  });

  recorder.start(200);
  const started = performance.now();
  source.start();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const seconds = (performance.now() - started) / 1000;
      let beat = 0;
      for (let i = 0; i < narration.cues.length; i += 1) {
        if (seconds + 0.04 >= narration.cues[i]) beat = i;
      }
      drawFrame(ctx, short, channel, beat);
      if (seconds < narration.duration + 0.2) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  if (recorder.state === "recording") recorder.stop();
  try {
    source.stop();
  } catch {
    /* already ended */
  }
  canvasStream.getTracks().forEach((track) => track.stop());
  mixed.getTracks().forEach((track) => track.stop());
  canvas.remove();
  onProgress?.("Packaging file…");
  return finished;
}
