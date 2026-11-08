export type ProductionJob = {
  id: string;
  title: string;
  script_de: string;
  script_en: string;
  video_de: string;
  video_en: string;
  approved_at: string | null;
  render_error: string | null;
  render_lease_until: string | null;
  revision: number;
  created_at: string;
};

export type Publication = {
  job_id: string;
  language: "de" | "en";
  state: "queued" | "submitting" | "scheduled" | "failed";
  error?: string;
};

type Store = {
  jobs: ProductionJob[];
  publications: Publication[];
  voice: { region: string; configured: boolean };
};

const globalStore = globalThis as typeof globalThis & { __fsProduction?: Store };

function store(): Store {
  if (!globalStore.__fsProduction) {
    globalStore.__fsProduction = {
      jobs: [],
      publications: [],
      voice: { region: "", configured: false },
    };
  }
  return globalStore.__fsProduction;
}

export function listJobs(): ProductionJob[] {
  return store().jobs;
}

export function listPublications(): Publication[] {
  return store().publications;
}

export function voiceStatus() {
  const voice = store().voice;
  return { configured: voice.configured, setupAvailable: true, region: voice.region || null };
}

export function saveVoice(region: string): { configured: boolean } {
  store().voice = { region, configured: true };
  return { configured: true };
}

export function upsertJob(input: {
  action: string;
  id: string;
  title?: string;
  scriptDe?: string;
  scriptEn?: string;
  videoDe?: string;
  videoEn?: string;
  revision?: number;
}): ProductionJob {
  const jobs = store().jobs;
  const existing = jobs.find((job) => job.id === input.id);

  if (input.action === "create") {
    const title = String(input.title || "").trim();
    const script_de = String(input.scriptDe || "").trim();
    const script_en = String(input.scriptEn || "").trim();
    if (!title || !script_de || !script_en) throw new Error("Titel und beide Skripte sind nötig.");
    if (existing) throw new Error("Auftrag existiert bereits. Lade die Seite neu.");
    const job: ProductionJob = {
      id: input.id,
      title,
      script_de,
      script_en,
      video_de: "",
      video_en: "",
      approved_at: null,
      render_error: null,
      render_lease_until: null,
      revision: 1,
      created_at: new Date().toISOString(),
    };
    jobs.unshift(job);
    return job;
  }

  if (!existing) throw new Error("Auftrag nicht gefunden.");
  if (input.revision !== undefined && input.revision !== existing.revision) {
    throw new Error("Auftrag wurde inzwischen geändert. Bitte aktualisieren.");
  }

  if (input.action === "attach") {
    const video_de = String(input.videoDe || "").trim();
    const video_en = String(input.videoEn || "").trim();
    if (!video_de || !video_en) throw new Error("Beide Videolinks sind nötig.");
    existing.video_de = video_de;
    existing.video_en = video_en;
    existing.render_error = null;
    existing.revision += 1;
    return existing;
  }

  if (input.action === "retry") {
    existing.render_error = null;
    existing.render_lease_until = null;
    existing.revision += 1;
    return existing;
  }

  if (input.action === "approve" || input.action === "approve_publish") {
    if (!existing.video_de || !existing.video_en) throw new Error("Beide Videos müssen vorhanden sein.");
    existing.approved_at = new Date().toISOString();
    existing.revision += 1;
    if (input.action === "approve_publish") {
      const pubs = store().publications;
      for (const language of ["de", "en"] as const) {
        if (!pubs.some((item) => item.job_id === existing.id && item.language === language)) {
          pubs.push({ job_id: existing.id, language, state: "queued" });
        }
      }
    }
    return existing;
  }

  throw new Error("Unbekannte Aktion.");
}
