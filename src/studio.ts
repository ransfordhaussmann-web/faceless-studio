export type ArtStyleId =
  | "ember"
  | "paper"
  | "neon"
  | "ink"
  | "clay"
  | "star"
  | "mosaic"
  | "brass";

export type VoiceId =
  | "explainer"
  | "bella"
  | "luna"
  | "rosie"
  | "kiki"
  | "jasper"
  | "bruno"
  | "hugo"
  | "leo";

export type ShortStatus = "draft" | "ready" | "queued" | "posted";

export type ViewId = "create" | "library" | "queue" | "channel";

export type Beat = {
  id: string;
  heading: string;
  line: string;
  caption: string;
};

export type Short = {
  id: string;
  idea: string;
  title: string;
  niche: string;
  style: ArtStyleId;
  voice: VoiceId;
  beats: Beat[];
  status: ShortStatus;
  sample: boolean;
  createdAt: number;
  queuedAt: number | null;
  audioSrc?: string;
  cues?: number[];
  audioSeconds?: number;
  fileName?: string;
  exported?: boolean;
  postedTo?: string[];
  postNote?: string;
};

export type Channel = {
  name: string;
  niche: string;
  style: ArtStyleId;
  voice: VoiceId;
  auto: boolean;
};

export type ArtStyle = {
  id: ArtStyleId;
  name: string;
  note: string;
};

export type Voice = {
  id: VoiceId;
  name: string;
  note: string;
};

export const ART_STYLES: ArtStyle[] = [
  { id: "ember", name: "Ember cinema", note: "Warm dusk light, deep shadows" },
  { id: "paper", name: "Paper cut", note: "Layered card, quiet craft" },
  { id: "neon", name: "Neon grid", note: "Night city, hard color" },
  { id: "ink", name: "Ink wash", note: "Black brush, wet paper" },
  { id: "clay", name: "Clay stage", note: "Soft forms, studio lamp" },
  { id: "star", name: "Star chart", note: "Navy field, gold lines" },
  { id: "mosaic", name: "Mosaic night", note: "Broken glass, jewel tiles" },
  { id: "brass", name: "Brass etching", note: "Old plate, engraved lines" },
];

export const VOICES: Voice[] = [
  { id: "explainer", name: "Science Explainer", note: "Your clip · Mini Jasper" },
  { id: "bella", name: "Bella", note: "Yapper Mini · bright" },
  { id: "luna", name: "Luna", note: "Yapper Mini · even" },
  { id: "rosie", name: "Rosie", note: "Yapper Mini · warm" },
  { id: "kiki", name: "Kiki", note: "Yapper Mini · light" },
  { id: "jasper", name: "Jasper", note: "Yapper Mini · low" },
  { id: "bruno", name: "Bruno", note: "Yapper Mini · solid" },
  { id: "hugo", name: "Hugo", note: "Yapper Mini · dry" },
  { id: "leo", name: "Leo", note: "Yapper Mini · punchy" },
];

export const PIPELINE = [
  "Idea",
  "Script",
  "Scenes",
  "Voice",
  "Video",
  "Ready",
] as const;

export const EXPLAINER_SRC = `${import.meta.env.BASE_URL}voices/science-explainer.mp3`;

const STORAGE_KEY = "faceless-studio-v5";

type Stored = {
  channel: Channel;
  shorts: Short[];
};

export const defaultChannel = (): Channel => ({
  name: "Night Desk",
  niche: "Science explainers",
  style: "star",
  voice: "explainer",
  auto: true,
});

export type BoardTask = {
  name: string;
  step: string;
  pct: number;
  tone: string;
};

export type Board = {
  brand: string;
  pills: string[];
  tasks: BoardTask[];
  desks: string[];
  stat: number;
};

export function handleOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "studio";
}

export function fileNameOf(short: Short, ext: string): string {
  const slug =
    short.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "short";
  return `${slug}.${ext}`;
}

const TONES = ["#ff4d6d", "#3dffb0", "#ffb020", "#6aa8ff", "#c084fc"];

const FLOOR_JOBS = ["Outreach sequence", "Ad variants", "Booking follow-up", "Client brief", "Caption pack"];
const SCIENCE_JOBS = ["Fossil layer", "Isotope clock", "Tech species", "Buried tools", "Implication"];

function isScience(short: Short): boolean {
  return (
    short.niche.toLowerCase() === "science" ||
    /\b(space|planet|alien|civilizations?|fossils?|galaxy|ocean|quantum|atom)\b/i.test(short.idea)
  );
}

export function boardOf(short: Short, brand: string): Board {
  const science = isScience(short);
  const pills = science
    ? ["Deep time", "Earth", "Space", "Record"]
    : short.niche.toLowerCase().includes("ai") || /\bagent|chatgpt|workflow\b/i.test(short.idea)
      ? ["Restaurant", "Dental clinic", "Online store", "Fitness studio"]
      : [short.niche, "Brief", "Ads", "Social"].slice(0, 4);
  const jobs = science ? SCIENCE_JOBS : FLOOR_JOBS;
  const tasks: BoardTask[] = jobs.map((name, index) => ({
    name,
    step: `Step ${Math.min(index + 1, 6)} of 6`,
    pct: [28, 45, 62, 83, 100][index] ?? 70,
    tone: TONES[index] ?? "#3dffb0",
  }));
  return {
    brand: brand || "Studio",
    pills,
    tasks,
    desks: science ? ["Scan", "Date", "Map"] : ["Ads", "Copy", "Book"],
    stat: 120 + (short.title.length * 11) % 90,
  };
}

export function styleOf(id: ArtStyleId): ArtStyle {
  return ART_STYLES.find((item) => item.id === id) ?? ART_STYLES[0];
}

export function voiceOf(id: string): Voice {
  const legacy: Record<string, VoiceId> = {
    rowan: "jasper",
    mira: "bella",
    cassian: "bruno",
    nell: "luna",
  };
  const mapped = (legacy[id] ?? id) as VoiceId;
  return VOICES.find((item) => item.id === mapped) ?? VOICES[0];
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function cleanIdea(idea: string): string {
  return idea.replace(/\s+/g, " ").trim();
}

function titleFrom(idea: string): string {
  const text = cleanIdea(idea).replace(/[.?!]+$/g, "");
  if (!text) return "Untitled Short";
  const clipped = text.length > 72 ? `${text.slice(0, 69).trimEnd()}…` : text;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

function nicheFrom(channel: Channel, idea: string): string {
  const lower = idea.toLowerCase();
  if (/\b(tomb|pharaoh|empire|war|king|queen|ancient|medieval)\b/.test(lower)) return "History";
  if (/\b(ai|agent|chatgpt|workflow|agency)\b/.test(lower)) return "AI";
  if (/\b(space|planet|atom|brain|ocean|virus|quantum|alien|civilizations?|fossils?|galaxy|dinosaur)\b/.test(lower)) {
    return "Science";
  }
  if (/\b(money|bank|gold|trade|market)\b/.test(lower)) return "Money";
  if (/\b(myth|ghost|legend|curse|secret)\b/.test(lower)) return "Story";
  return channel.niche.split(" ")[0] || "Explainer";
}

function punchyHook(idea: string): string {
  const text = cleanIdea(idea).replace(/[.?!]+$/g, "");
  const words = text.split(" ");
  if (words.length <= 6) return `${text.charAt(0).toUpperCase()}${text.slice(1)} 👀`;
  return `${words.slice(0, 5).join(" ")}… 👀`;
}

function scienceBeats(subject: string, channel: Channel, hook: string): Beat[] {
  return [
    {
      id: uid("beat"),
      heading: "Hook",
      line: `When we think about ${subject}, we tend to look at the obvious story on the surface.`,
      caption: hook,
    },
    {
      id: uid("beat"),
      heading: "Setup",
      line: "But there is another dimension we might be giving too little thought to.",
      caption: "There's another dimension.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: `Look closer, and ${subject} is not trivia. It becomes a timeline.`,
      caption: "It becomes a timeline.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: "Tools, leftovers, and whole species pile up. Most of that record is easy to miss.",
      caption: "Most of the record is easy to miss.",
    },
    {
      id: uid("beat"),
      heading: "Turn",
      line: "The question is not only what happened. It is what still sits under our feet.",
      caption: "What's still under our feet?",
    },
    {
      id: uid("beat"),
      heading: "Close",
      line: `That is the implication ${channel.name} keeps coming back to. One idea. One Short.`,
      caption: "One idea. One Short.",
    },
  ];
}

function floorBeats(title: string, subject: string, channel: Channel, hook: string): Beat[] {
  return [
    {
      id: uid("beat"),
      heading: "Hook",
      line: `Stop scrolling. ${title.replace(/[.?!…]+$/g, "")} is not a chatbot trick — it is a desk that never clocks out.`,
      caption: hook,
    },
    {
      id: uid("beat"),
      heading: "Setup",
      line: `Most people still run ${subject} in one chat window. That is a person. Not a team.`,
      caption: "One chat is not a team.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: "Put the work on desks: briefs, ads, booking, follow-up. Each desk is an agent with a job.",
      caption: "Give every job a desk.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: "They pass the file, not the vibe. Outreach. Tracking. Copy. The queue moves while you sleep.",
      caption: "The queue moves at night.",
    },
    {
      id: uid("beat"),
      heading: "Turn",
      line: `That is the whole agency floor — without hiring the floor. ${subject} becomes a workflow, not a prompt.`,
      caption: "That's the whole floor.",
    },
    {
      id: uid("beat"),
      heading: "Close",
      line: `If you run this messy, stay. ${channel.name} builds the next faceless Short from one line.`,
      caption: "One line. Whole team.",
    },
  ];
}

export function generateShort(idea: string, channel: Channel): Short {
  const source = cleanIdea(idea) || "AI agents running a whole marketing team";
  const title = titleFrom(source);
  const subject = source.replace(/[.?!]+$/g, "");
  const niche = nicheFrom(channel, source);
  const hook = punchyHook(source);
  const beats = niche === "Science" ? scienceBeats(subject, channel, hook) : floorBeats(title, subject, channel, hook);

  return {
    id: uid("short"),
    idea: source,
    title,
    niche,
    style: channel.style,
    voice: channel.voice,
    beats,
    status: "ready",
    sample: false,
    createdAt: Date.now(),
    queuedAt: null,
  };
}

function sampleShorts(channel: Channel): Short[] {
  const seeds: Array<{
    idea: string;
    title: string;
    niche: string;
    style: ArtStyleId;
    captions: string[];
    lines: string[];
    audioSrc?: string;
    cues?: number[];
    audioSeconds?: number;
  }> = [
    {
      idea: "when we think about alien civilizations we look to space, not time",
      title: "When we think about alien civilizations",
      niche: "Science",
      style: "star",
      audioSrc: EXPLAINER_SRC,
      cues: [0, 8.74, 15.22, 16.8, 24.46, 32.88],
      audioSeconds: 42,
      captions: [
        "Alien civilizations… 👀",
        "We look to faraway planets.",
        "Time.",
        "Other civilizations. On Earth?",
        "Buried under our feet.",
        "What does that mean for us?",
      ],
      lines: [
        "When we think about alien civilizations, we tend to look into the vastness of space to far away planet.",
        "But there is another incredibly vast dimension that we might be giving too little thought to.",
        "Time.",
        "Could it be that over the last hundreds of millions of years other civilizations existed on Earth?",
        "Indigenous technological species that rose and died out and that they owe their artifacts a buried beneath our feet.",
        "What designs have to say about this and what the implications for us?",
      ],
    },
    {
      idea: "AI agent workflows can coordinate entire marketing teams",
      title: "You're using ChatGPT wrong",
      niche: "AI",
      style: "neon",
      captions: [
        "You're using ChatGPT wrong 👀",
        "One chat is not a team.",
        "Put every job on a desk.",
        "Outreach. Ads. Booking.",
        "That's six jobs. Done.",
        "One line. Whole floor.",
      ],
      lines: [
        "You're using ChatGPT like a person in a box. Agencies do not run on one box.",
        "A marketing team is desks: brief, ads, social, booking, follow-up.",
        "Give each desk an agent with a job and a queue.",
        "They pass the file. The floor keeps moving.",
        "That is a workflow, not a prompt.",
        "Stay if you still run this in one chat.",
      ],
    },
    {
      idea: "the library that answered after closing",
      title: "The library that answered after closing",
      niche: "Story",
      style: "ink",
      captions: [
        "The library answered after close 👀",
        "Lights out. Slip still in.",
        "A book nobody booked.",
        "The date stamp did not lie.",
        "Some rooms keep promises.",
        "One line. Next Short.",
      ],
      lines: [
        "The lights went out. The request slip did not.",
        "A night clerk found a book waiting on a desk nobody had booked.",
        "The title matched a question asked three hours after lockup.",
        "They wrote it off as a misfile. They did not check the date stamp.",
        "Some rooms keep hours. Some rooms keep promises.",
        "Night Desk writes the next closed-door Short from one line.",
      ],
    },
  ];

  return seeds.map((seed, index) => ({
    id: `sample-${index + 1}`,
    idea: seed.idea,
    title: seed.title,
    niche: seed.niche,
    style: seed.style,
    voice: channel.voice,
    beats: seed.captions.map((caption, beatIndex) => ({
      id: `sample-${index + 1}-${beatIndex}`,
      heading: beatIndex === 0 ? "Hook" : beatIndex === seed.captions.length - 1 ? "Close" : "Beat",
      line: seed.lines[beatIndex] ?? caption,
      caption,
    })),
    status: index === 2 ? "queued" : "ready",
    sample: true,
    createdAt: Date.now() - (index + 2) * 86_400_000,
    queuedAt: index === 2 ? Date.now() + 36_000_000 : null,
    audioSrc: seed.audioSrc,
    cues: seed.cues,
    audioSeconds: seed.audioSeconds,
  }));
}

export function loadState(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed.channel && Array.isArray(parsed.shorts)) {
        return {
          channel: { ...defaultChannel(), ...parsed.channel, auto: parsed.channel.auto !== false },
          shorts: parsed.shorts,
        };
      }
    }
  } catch {
    /* sample data on a fresh machine */
  }
  const channel = defaultChannel();
  return { channel, shorts: sampleShorts(channel) };
}

export function saveState(state: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function scriptText(short: Short): string {
  return short.beats.map((beat) => beat.line).join(" ");
}

export function durationLabel(short: Short): string {
  if (short.audioSeconds) return `${Math.round(short.audioSeconds)}s`;
  const words = scriptText(short).split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(28, Math.round((words / 2.4) * 10) / 10);
  const whole = Math.round(seconds);
  return `${whole}s`;
}

export function queueLabel(short: Short): string {
  if (short.status === "posted") return "Posted";
  if (!short.queuedAt) return "Unscheduled";
  return new Date(short.queuedAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function laterTonight(): number {
  const date = new Date();
  date.setHours(21, 0, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function tomorrowMorning(): number {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return date.getTime();
}
