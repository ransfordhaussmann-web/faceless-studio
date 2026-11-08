import { useEffect, useMemo, useState } from "react";
import { Player } from "./Player";
import {
  ART_STYLES,
  PIPELINE,
  VOICES,
  durationLabel,
  generateShort,
  laterTonight,
  loadState,
  queueLabel,
  saveState,
  tomorrowMorning,
  type ArtStyleId,
  type Channel,
  type Short,
  type ViewId,
  type VoiceId,
} from "./studio";

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [view, setView] = useState<ViewId>("create");
  const [channel, setChannel] = useState<Channel>(initial.channel);
  const [shorts, setShorts] = useState<Short[]>(initial.shorts);
  const [idea, setIdea] = useState("");
  const [pipeline, setPipeline] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(initial.shorts[0]?.id ?? null);

  useEffect(() => {
    saveState({ channel, shorts });
  }, [channel, shorts]);

  const active = shorts.find((item) => item.id === activeId) ?? shorts[0] ?? null;
  const queued = shorts.filter((item) => item.status === "queued").sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
  const library = [...shorts].sort((a, b) => b.createdAt - a.createdAt);

  function produce() {
    const text = idea.trim();
    if (!text || busy) return;
    setBusy(true);
    setPipeline(0);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setPipeline(step);
      if (step >= PIPELINE.length - 1) {
        window.clearInterval(timer);
        const next = generateShort(text, channel);
        setShorts((list) => [next, ...list]);
        setActiveId(next.id);
        setBusy(false);
        setIdea("");
      }
    }, 280);
  }

  function updateShort(id: string, patch: Partial<Short>) {
    setShorts((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function queueShort(id: string, when: number | null, status: Short["status"]) {
    updateShort(id, { queuedAt: when, status });
    setView("queue");
  }

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="brand-name">Faceless Studio</p>
            <p className="brand-note">Content creator desk</p>
          </div>
        </div>
        <nav>
          {(
            [
              ["create", "Create"],
              ["library", "Library"],
              ["queue", "Queue"],
              ["channel", "Channel"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? "nav on" : "nav"} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <p className="muted">{channel.name}</p>
          <p className="muted">{ART_STYLES.find((item) => item.id === channel.style)?.name}</p>
        </div>
      </aside>

      <main>
        {view === "create" && (
          <CreateView
            idea={idea}
            setIdea={setIdea}
            pipeline={pipeline}
            busy={busy}
            onProduce={produce}
            active={active}
            onQueue={queueShort}
            onOpenLibrary={() => setView("library")}
          />
        )}
        {view === "library" && (
          <LibraryView
            shorts={library}
            activeId={active?.id ?? null}
            onOpen={(id) => {
              setActiveId(id);
              setView("create");
            }}
            onQueue={queueShort}
          />
        )}
        {view === "queue" && <QueueView shorts={queued.length ? queued : library.filter((item) => item.status !== "posted")} onOpen={(id) => { setActiveId(id); setView("create"); }} onQueue={queueShort} />}
        {view === "channel" && <ChannelView channel={channel} onChange={setChannel} />}
      </main>
    </div>
  );
}

function CreateView({
  idea,
  setIdea,
  pipeline,
  busy,
  onProduce,
  active,
  onQueue,
  onOpenLibrary,
}: {
  idea: string;
  setIdea: (value: string) => void;
  pipeline: number;
  busy: boolean;
  onProduce: () => void;
  active: Short | null;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
  onOpenLibrary: () => void;
}) {
  return (
    <section className="page create-page">
      <header className="page-head">
        <div>
          <p className="kicker">New Short</p>
          <h1>Type one idea. The desk writes the rest.</h1>
        </div>
        <p className="lede">
          Script, illustrated scenes, a narrator, and word captions — a faceless content-creator
          workflow with no camera and no timeline. Previews use your browser voice. Sample shorts
          are marked.
        </p>
      </header>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          onProduce();
        }}
      >
        <label htmlFor="idea">Video idea</label>
        <textarea
          id="idea"
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="A census of storms kept in a lighthouse log…"
          rows={3}
          disabled={busy}
        />
        <div className="composer-row">
          <button type="submit" className="btn primary" disabled={busy || !idea.trim()}>
            {busy ? "Building…" : "Build Short"}
          </button>
          <ol className="pipe">
            {PIPELINE.map((step, index) => (
              <li key={step} data-on={pipeline >= index}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </form>

      {active ? (
        <div className="desk">
          <Player short={active} />
          <article className="script-card">
            <div className="script-head">
              <div>
                <p className="kicker">{active.sample ? "Sample Short" : "Ready Short"}</p>
                <h2>{active.title}</h2>
              </div>
              <p className="pill">
                {active.niche} · {durationLabel(active)}
              </p>
            </div>
            <ol className="beats">
              {active.beats.map((beat) => (
                <li key={beat.id}>
                  <span>{beat.heading}</span>
                  <p>{beat.line}</p>
                </li>
              ))}
            </ol>
            <div className="actions">
              <button type="button" className="btn" onClick={() => onQueue(active.id, laterTonight(), "queued")}>
                Queue tonight
              </button>
              <button type="button" className="btn" onClick={() => onQueue(active.id, tomorrowMorning(), "queued")}>
                Queue tomorrow 8:00
              </button>
              <button type="button" className="btn" onClick={onOpenLibrary}>
                Open library
              </button>
            </div>
          </article>
        </div>
      ) : (
        <p className="muted">Build a Short to open the desk.</p>
      )}
    </section>
  );
}

function LibraryView({
  shorts,
  activeId,
  onOpen,
  onQueue,
}: {
  shorts: Short[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Library</p>
          <h1>Every Short on the desk</h1>
        </div>
        <p className="lede">Sample entries ship with the studio so the shelves are not empty on first open.</p>
      </header>
      <div className="grid">
        {shorts.map((short) => (
          <article key={short.id} className={short.id === activeId ? "card on" : "card"}>
            <button type="button" className={`thumb style-${short.style}`} onClick={() => onOpen(short.id)}>
              <span>{short.niche}</span>
              <strong>{short.title}</strong>
            </button>
            <div className="card-meta">
              <p>
                {short.status} · {durationLabel(short)}
                {short.sample ? " · sample" : ""}
              </p>
              <div className="actions tight">
                <button type="button" className="btn small" onClick={() => onOpen(short.id)}>
                  Edit
                </button>
                <button type="button" className="btn small" onClick={() => onQueue(short.id, laterTonight(), "queued")}>
                  Queue
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QueueView({
  shorts,
  onOpen,
  onQueue,
}: {
  shorts: Short[];
  onOpen: (id: string) => void;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Queue</p>
          <h1>When the channel posts</h1>
        </div>
        <p className="lede">
          Scheduling is local to this browser — a posting calendar for the creator desk, not a live
          YouTube upload.
        </p>
      </header>
      <ul className="queue">
        {shorts.map((short) => (
          <li key={short.id}>
            <button type="button" className={`mini style-${short.style}`} onClick={() => onOpen(short.id)} />
            <div>
              <strong>{short.title}</strong>
              <p className="muted">
                {queueLabel(short)} · {short.niche}
              </p>
            </div>
            <div className="actions tight">
              <button type="button" className="btn small" onClick={() => onQueue(short.id, laterTonight(), "queued")}>
                Tonight
              </button>
              <button type="button" className="btn small" onClick={() => onQueue(short.id, null, "posted")}>
                Mark posted
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChannelView({
  channel,
  onChange,
}: {
  channel: Channel;
  onChange: (channel: Channel) => void;
}) {
  function patch<K extends keyof Channel>(key: K, value: Channel[K]) {
    onChange({ ...channel, [key]: value });
  }

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Channel</p>
          <h1>Brand the desk once</h1>
        </div>
        <p className="lede">Style and voice stick to every Short you build after this. Change them here, not per clip.</p>
      </header>
      <div className="channel-form">
        <label>
          Channel name
          <input value={channel.name} onChange={(event) => patch("name", event.target.value)} />
        </label>
        <label>
          Niche
          <input value={channel.niche} onChange={(event) => patch("niche", event.target.value)} />
        </label>
      </div>
      <h2 className="sub">Art style</h2>
      <div className="choice-row">
        {ART_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            className={channel.style === style.id ? "choice on" : "choice"}
            onClick={() => patch("style", style.id as ArtStyleId)}
          >
            <span className={`swatch style-${style.id}`} />
            <strong>{style.name}</strong>
            <em>{style.note}</em>
          </button>
        ))}
      </div>
      <h2 className="sub">Narrator</h2>
      <div className="choice-row">
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            className={channel.voice === voice.id ? "choice on" : "choice"}
            onClick={() => patch("voice", voice.id as VoiceId)}
          >
            <strong>{voice.name}</strong>
            <em>{voice.note}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
