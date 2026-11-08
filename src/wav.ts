let ctx: AudioContext | null = null;

export function audioContext(): AudioContext {
  if (!ctx || ctx.state === "closed") ctx = new AudioContext();
  return ctx;
}

export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const context = audioContext();
  if (context.state === "suspended") await context.resume();
  const copy = await blob.arrayBuffer();
  return context.decodeAudioData(copy);
}

export function concatBuffers(buffers: AudioBuffer[], gapSeconds = 0.12): {
  buffer: AudioBuffer;
  cues: number[];
  duration: number;
} {
  const rate = buffers[0]?.sampleRate ?? 24000;
  const gap = Math.round(gapSeconds * rate);
  const cues: number[] = [];
  let samples = 0;
  for (let i = 0; i < buffers.length; i += 1) {
    cues.push(samples / rate);
    samples += buffers[i].length;
    if (i < buffers.length - 1) samples += gap;
  }
  const context = audioContext();
  const out = context.createBuffer(1, Math.max(samples, 1), rate);
  const data = out.getChannelData(0);
  let offset = 0;
  for (let i = 0; i < buffers.length; i += 1) {
    data.set(buffers[i].getChannelData(0), offset);
    offset += buffers[i].length;
    if (i < buffers.length - 1) offset += gap;
  }
  return { buffer: out, cues, duration: out.length / rate };
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm], { type: "audio/wav" });
}
