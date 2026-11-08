import { extensionOf, putFile } from "./files";
import { narrateShort } from "./narrate";
import { renderVideo } from "./render";
import { fileNameOf, type Channel, type Short } from "./studio";

export async function exportShort(
  short: Short,
  channel: Channel,
  onProgress?: (stage: string) => void,
): Promise<Short> {
  const narration = await narrateShort(short, onProgress);
  const blob = await renderVideo(short, channel, narration, onProgress);
  if (blob.size < 8000) throw new Error("Video recording was empty — try Chrome or Edge");
  const name = fileNameOf(short, extensionOf(blob));
  await putFile(short.id, blob, name);
  return {
    ...short,
    cues: narration.cues,
    audioSeconds: Math.round(narration.duration),
    fileName: name,
    exported: true,
  };
}
