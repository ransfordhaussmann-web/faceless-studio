const KITTEN: Record<string, string> = {
  explainer: "Jasper",
  bella: "Bella",
  luna: "Luna",
  rosie: "Rosie",
  kiki: "Kiki",
  jasper: "Jasper",
  bruno: "Bruno",
  hugo: "Hugo",
  leo: "Leo",
  rowan: "Jasper",
  mira: "Bella",
  cassian: "Bruno",
  nell: "Luna",
};

const SPEED: Record<string, number> = {
  explainer: 0.96,
  jasper: 0.96,
  bruno: 0.98,
  hugo: 0.98,
};

const clips = new Map<string, Blob>();

export function yapperVoiceName(id: string): string {
  return KITTEN[id] ?? "Bella";
}

export function yapperSpeed(id: string): number {
  return SPEED[id] ?? 1.05;
}

export async function yapperWav(
  text: string,
  voiceId: string,
  onProgress?: (stage: string) => void,
): Promise<Blob> {
  const voice = yapperVoiceName(voiceId);
  const speed = yapperSpeed(voiceId);
  const key = `${voice}::${speed}::${text}`;
  const cached = clips.get(key);
  if (cached) return cached;
  const { textToSpeech } = await import("kitten-tts-webgpu");
  const blob = await textToSpeech(text, {
    model: "mini",
    voice,
    speed,
    onProgress,
  });
  clips.set(key, blob);
  return blob;
}

export function playWav(blob: Blob): { done: Promise<void>; stop: () => void } {
  const url = URL.createObjectURL(blob);
  const playback = playSrc(url, 0);
  const stop = () => {
    playback.stop();
    URL.revokeObjectURL(url);
  };
  void playback.done.finally(() => URL.revokeObjectURL(url));
  return { done: playback.done, stop };
}

export function playSrc(
  src: string,
  startAt = 0,
  onTime?: (seconds: number) => void,
): { done: Promise<void>; stop: () => void } {
  const audio = new Audio();
  audio.preload = "auto";
  let stopped = false;
  let settle: () => void = () => undefined;
  const done = new Promise<void>((resolve, reject) => {
    settle = () => resolve();
    audio.ontimeupdate = () => {
      if (!stopped) onTime?.(audio.currentTime);
    };
    audio.onended = () => {
      if (!stopped) settle();
    };
    audio.onerror = () => {
      if (!stopped) reject(new Error("audio failed"));
    };
    const kick = () => {
      if (stopped) return;
      void audio.play().catch((error: unknown) => {
        if (!stopped) reject(error);
      });
    };
    const start = () => {
      if (stopped) return;
      if (startAt > 0.05) {
        audio.currentTime = startAt;
        audio.onseeked = () => {
          audio.onseeked = null;
          kick();
        };
        return;
      }
      kick();
    };
    audio.onloadedmetadata = start;
    audio.src = src;
  });
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      settle();
    },
  };
}
