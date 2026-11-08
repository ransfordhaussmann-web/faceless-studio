export type StudioFile = {
  blob: Blob;
  name: string;
};

const memory = new Map<string, StudioFile>();
const DB_NAME = "faceless-studio-media";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getFile(id: string): StudioFile | undefined {
  return memory.get(id);
}

export function hasFile(id: string): boolean {
  return memory.has(id);
}

export async function putFile(id: string, blob: Blob, name: string): Promise<void> {
  const file = { blob, name };
  memory.set(id, file);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(file, id);
    });
    db.close();
  } catch {
    /* memory is enough for this session */
  }
}

export async function hydrateFiles(ids: string[]): Promise<void> {
  try {
    const db = await openDb();
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, "readonly");
            const request = tx.objectStore(STORE).get(id);
            request.onsuccess = () => {
              const value = request.result as StudioFile | undefined;
              if (value?.blob) memory.set(id, value);
              resolve();
            };
            request.onerror = () => resolve();
          }),
      ),
    );
    db.close();
  } catch {
    /* first run */
  }
}

export function downloadFile(id: string): boolean {
  const file = memory.get(id);
  if (!file) return false;
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export async function shareFile(id: string): Promise<"shared" | "downloaded" | "missing"> {
  const file = memory.get(id);
  if (!file) return "missing";
  const payload = new File([file.blob], file.name, { type: file.blob.type || "video/webm" });
  const data = { files: [payload], title: file.name, text: file.name };
  try {
    if (navigator.canShare?.(data)) {
      await navigator.share(data);
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "shared";
  }
  return downloadFile(id) ? "downloaded" : "missing";
}

export function extensionOf(blob: Blob): string {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mpeg") || blob.type.includes("mp3")) return "mp3";
  return "wav";
}
