export type ArtStyleId =
  | "ember"
  | "paper"
  | "neon"
  | "ink"
  | "clay"
  | "star"
  | "mosaic"
  | "brass";

export type VoiceId = "rowan" | "mira" | "cassian" | "nell";

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
};

export type Channel = {
  name: string;
  niche: string;
  style: ArtStyleId;
  voice: VoiceId;
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
  rate: number;
  pitch: number;
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
  { id: "rowan", name: "Rowan", note: "Low, unhurried", rate: 0.92, pitch: 0.82 },
  { id: "mira", name: "Mira", note: "Warm, close-mic", rate: 1.02, pitch: 1.18 },
  { id: "cassian", name: "Cassian", note: "Dry documentary", rate: 0.98, pitch: 0.9 },
  { id: "nell", name: "Nell", note: "Hushed story", rate: 0.88, pitch: 1.08 },
];

export const PIPELINE = [
  "Idea",
  "Script",
  "Scenes",
  "Voice",
  "Captions",
  "Ready",
] as const;

const STORAGE_KEY = "faceless-studio-v1";

type Stored = {
  channel: Channel;
  shorts: Short[];
};

export const defaultChannel = (): Channel => ({
  name: "Night Desk",
  niche: "Strange history and quiet science",
  style: "ember",
  voice: "rowan",
});

export function styleOf(id: ArtStyleId): ArtStyle {
  return ART_STYLES.find((item) => item.id === id) ?? ART_STYLES[0];
}

export function voiceOf(id: VoiceId): Voice {
  return VOICES.find((item) => item.id === id) ?? VOICES[0];
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
  if (/\b(space|planet|atom|brain|ocean|virus|quantum)\b/.test(lower)) return "Science";
  if (/\b(money|bank|gold|trade|market)\b/.test(lower)) return "Money";
  if (/\b(myth|ghost|legend|curse|secret)\b/.test(lower)) return "Story";
  return channel.niche.split(" ")[0] || "Explainer";
}

export function generateShort(idea: string, channel: Channel): Short {
  const source = cleanIdea(idea) || "a forgotten library that still answers questions";
  const title = titleFrom(source);
  const subject = source.replace(/[.?!]+$/g, "");
  const niche = nicheFrom(channel, source);

  const beats: Beat[] = [
    {
      id: uid("beat"),
      heading: "Hook",
      line: `Stop scrolling. ${title.replace(/[.?!…]+$/g, "")} is not the story you were told.`,
      caption: "This is not the story you were told.",
    },
    {
      id: uid("beat"),
      heading: "Setup",
      line: `Most people file ${subject} under trivia. The record is messier, and it starts in a room nobody filmed.`,
      caption: "The record is messier than the headline.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: `First: the official version skips the part that does not fit a thirty-second recap. That gap is where ${subject} actually lives.`,
      caption: "The official version skips the gap.",
    },
    {
      id: uid("beat"),
      heading: "Beat",
      line: `Then a small, stubborn fact: someone kept the notes, the map, the receipt. Not a legend — a paper trail.`,
      caption: "Not a legend. A paper trail.",
    },
    {
      id: uid("beat"),
      heading: "Turn",
      line: `Here is the turn: once you see that trail, ${subject} stops being content. It becomes a decision someone already made.`,
      caption: "It was a decision, not a myth.",
    },
    {
      id: uid("beat"),
      heading: "Close",
      line: `If this is your niche, stay. ${channel.name} builds the next Short from one line — no camera, no timeline.`,
      caption: "One line. Next Short. No camera.",
    },
  ];

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
  const seeds = [
    {
      idea: "the tomb no one has opened",
      title: "The tomb no one has opened",
      niche: "History",
      style: "brass" as ArtStyleId,
      beats: [
        "They mapped the door. They never turned the key.",
        "A sealed chamber is not empty. It is postponed.",
        "The inventory lists honey, linen, and a name with the face scratched out.",
        "Every century, someone argues for a drill. Every century, someone says wait.",
        "Waiting is also a kind of opening — just not the kind cameras like.",
        "Follow for the rooms history left closed.",
      ],
    },
    {
      idea: "why the ocean has a memory",
      title: "Why the ocean has a memory",
      niche: "Science",
      style: "star" as ArtStyleId,
      beats: [
        "Water keeps the heat of summers you do not remember.",
        "The deep does not refresh like a feed. It files.",
        "A current can carry last decade's warmth under this week's storm.",
        "That is why a calm surface can still be an argument.",
        "The ocean is not moody. It is keeping notes.",
        "One idea. A faceless Short. Stay for the next note.",
      ],
    },
    {
      idea: "the library that answered after closing",
      title: "The library that answered after closing",
      niche: "Story",
      style: "ink" as ArtStyleId,
      beats: [
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
    beats: seed.beats.map((line, beatIndex) => ({
      id: `sample-${index + 1}-${beatIndex}`,
      heading: beatIndex === 0 ? "Hook" : beatIndex === seed.beats.length - 1 ? "Close" : "Beat",
      line,
      caption: line,
    })),
    status: index === 2 ? "queued" : "ready",
    sample: true,
    createdAt: Date.now() - (index + 2) * 86_400_000,
    queuedAt: index === 2 ? Date.now() + 36_000_000 : null,
  }));
}

export function loadState(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed.channel && Array.isArray(parsed.shorts)) return parsed;
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
