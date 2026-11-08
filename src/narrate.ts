import type { Short } from "./studio";
import { yapperWav } from "./tts";
import { audioBufferToWav, concatBuffers, decodeBlob } from "./wav";

export type Narration = {
  blob: Blob;
  buffer: AudioBuffer;
  cues: number[];
  duration: number;
};

export async function narrateShort(
  short: Short,
  onProgress?: (stage: string) => void,
): Promise<Narration> {
  if (short.audioSrc) {
    onProgress?.("Loading reference clip…");
    const response = await fetch(short.audioSrc);
    if (!response.ok) throw new Error("Could not load the reference clip");
    const blob = await response.blob();
    const buffer = await decodeBlob(blob);
    return {
      blob,
      buffer,
      cues: short.cues?.length ? short.cues : [0],
      duration: buffer.duration,
    };
  }

  const buffers: AudioBuffer[] = [];
  for (let i = 0; i < short.beats.length; i += 1) {
    onProgress?.(`Voice ${i + 1}/${short.beats.length}`);
    const wav = await yapperWav(short.beats[i].line, short.voice, onProgress);
    buffers.push(await decodeBlob(wav));
  }
  const mixed = concatBuffers(buffers);
  return {
    blob: audioBufferToWav(mixed.buffer),
    buffer: mixed.buffer,
    cues: mixed.cues,
    duration: mixed.duration,
  };
}
