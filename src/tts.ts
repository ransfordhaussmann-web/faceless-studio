const KITTEN: Record<string, string> = {
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

const clips = new Map<string, Blob>();

export function yapperVoiceName(id: string): string {
  return KITTEN[id] ?? "Bella";
}

export async function yapperWav(
  text: string,
  voiceId: string,
  onProgress?: (stage: string) => void,
): Promise<Blob> {
  const voice = yapperVoiceName(voiceId);
  const key = `${voice}::${text}`;
  const cached = clips.get(key);
  if (cached) return cached;
  const { textToSpeech } = await import("kitten-tts-webgpu");
  const blob = await textToSpeech(text, {
    model: "mini",
    voice,
    speed: 1.05,
    onProgress,
  });
  clips.set(key, blob);
  return blob;
}

export function playWav(blob: Blob): { done: Promise<void>; stop: () => void } {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let stopped = false;
  let settle: () => void = () => undefined;
  const done = new Promise<void>((resolve, reject) => {
    settle = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onended = () => {
      if (!stopped) settle();
    };
    audio.onerror = () => {
      if (!stopped) {
        URL.revokeObjectURL(url);
        reject(new Error("audio failed"));
      }
    };
    void audio.play().catch((error: unknown) => {
      if (!stopped) reject(error);
    });
  });
  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      audio.removeAttribute("src");
      settle();
    },
  };
}
