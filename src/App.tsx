import { useEffect, useMemo, useState } from "react";
import { Player } from "./Player";
import { downloadFile, hasFile, hydrateFiles, shareFile } from "./files";
import { exportShort } from "./produce";
import {
  ART_STYLES,
  EXPLAINER_SRC,
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [view, setView] = useState<ViewId>("create");
  const [channel, setChannel] = useState<Channel>(initial.channel);
  const [shorts, setShorts] = useState<Short[]>(initial.shorts);
  const [idea, setIdea] = useState("");
  const [pipeline, setPipeline] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [buildNote, setBuildNote] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initial.shorts[0]?.id ?? null);
  const [filesTick, setFilesTick] = useState(0);

  useEffect(() => {
    saveState({ channel, shorts });
  }, [channel, shorts]);

  useEffect(() => {
    void hydrateFiles(initial.shorts.map((item) => item.id)).then(() => setFilesTick((value) => value + 1));
  }, [initial.shorts]);

  const active = shorts.find((item) => item.id === activeId) ?? shorts[0] ?? null;
  const queued = shorts.filter((item) => item.status === "queued").sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
  const library = [...shorts].sort((a, b) => b.createdAt - a.createdAt);

  function produce() {
    const text = idea.trim();
    if (!text || busy) return;
    void runProduce(text);
  }

  async function runProduce(text: string) {
    setBusy(true);
    setBuildNote("");
    setPipeline(0);
    try {
      await wait(120);
      setPipeline(1);
      let next = generateShort(text, channel);
      setPipeline(2);
      await wait(80);
      setPipeline(3);
      next = await exportShort(next, channel, setBuildNote);
      setPipeline(4);
      if (channel.auto) {
        next = { ...next, status: "queued", queuedAt: laterTonight() };
      }
      setPipeline(5);
      setShorts((list) => [next, ...list]);
      setActiveId(next.id);
      setIdea("");
      setFilesTick((value) => value + 1);
      setBuildNote(channel.auto ? "Queued tonight · video ready to share" : "Video ready to share");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setBuildNote(
        /webgpu/i.test(message)
          ? "Yapper Mini needs Chrome, Edge, or Safari 26+ (WebGPU)"
          : message,
      );
      const fallback = generateShort(text, channel);
      setShorts((list) => [fallback, ...list]);
      setActiveId(fallback.id);
      setIdea("");
      setPipeline(1);
    } finally {
      setBusy(false);
    }
  }

  async function exportActive(id: string) {
    const short = shorts.find((item) => item.id === id);
    if (!short || busy) return;
    setBusy(true);
    setBuildNote("Exporting…");
    setPipeline(3);
    try {
      const next = await exportShort(short, channel, setBuildNote);
      const queued = channel.auto ? { ...next, status: "queued" as const, queuedAt: next.queuedAt ?? laterTonight() } : next;
      updateShort(id, queued);
      setFilesTick((value) => value + 1);
      setPipeline(5);
      setBuildNote("Video ready to share");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setBuildNote(
        /webgpu/i.test(message)
          ? "Yapper Mini needs Chrome, Edge, or Safari 26+ (WebGPU)"
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function share(id: string) {
    if (!hasFile(id)) await exportActive(id);
    const result = await shareFile(id);
    if (result === "missing") setBuildNote("Export the video first.");
    if (result === "downloaded") setBuildNote("Saved the file — share it to TikTok from your photos.");
    if (result === "shared") setBuildNote("Shared. Mark posted when TikTok has it.");
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
            buildNote={buildNote}
            auto={channel.auto}
            fileReady={Boolean(active && hasFile(active.id) && filesTick > -1)}
            onProduce={produce}
            active={active}
            channel={channel}
            onQueue={queueShort}
            onOpenLibrary={() => setView("library")}
            onExport={() => active && void exportActive(active.id)}
            onShare={() => active && void share(active.id)}
            onDownload={() => active && downloadFile(active.id)}
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
        {view === "queue" && (
          <QueueView
            shorts={queued.length ? queued : library.filter((item) => item.status !== "posted")}
            onOpen={(id) => {
              setActiveId(id);
              setView("create");
            }}
            onQueue={queueShort}
            onShare={(id) => void share(id)}
            onDownload={(id) => downloadFile(id)}
          />
        )}
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
  buildNote,
  auto,
  fileReady,
  onProduce,
  active,
  channel,
  onQueue,
  onOpenLibrary,
  onExport,
  onShare,
  onDownload,
}: {
  idea: string;
  setIdea: (value: string) => void;
  pipeline: number;
  busy: boolean;
  buildNote: string;
  auto: boolean;
  fileReady: boolean;
  onProduce: () => void;
  active: Short | null;
  channel: Channel;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
  onOpenLibrary: () => void;
  onExport: () => void;
  onShare: () => void;
  onDownload: () => void;
}) {
  return (
    <section className="page create-page">
      <header className="page-head">
        <div>
          <p className="kicker">New Short</p>
          <h1>Type one idea. Get a TikTok-style Short.</h1>
        </div>
        <p className="lede">
          One idea becomes a script, voice, and 9:16 video automatically. Share the file to TikTok or
          YouTube — this desk cannot log into those apps for you. Sample shorts are marked.
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
          placeholder="When we think about alien civilizations…"
          rows={3}
          disabled={busy}
        />
        <div className="composer-row">
          <button type="submit" className="btn primary" disabled={busy || !idea.trim()}>
            {busy ? "Building…" : auto ? "Build + export" : "Build Short"}
          </button>
          <ol className="pipe">
            {PIPELINE.map((step, index) => (
              <li key={step} data-on={pipeline >= index}>
                {step}
              </li>
            ))}
          </ol>
        </div>
        {buildNote ? <p className="build-note">{buildNote}</p> : null}
        <p className="muted auto-line">
          {auto
            ? "Auto is on: voice, 9:16 video, queue tonight, then share."
            : "Auto is off: script only. Turn it on in Channel."}
        </p>
      </form>

      {active ? (
        <div className="desk">
          <Player short={active} channel={channel} />
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
              {fileReady ? (
                <>
                  <button type="button" className="btn primary" onClick={onShare}>
                    Share to TikTok
                  </button>
                  <button type="button" className="btn" onClick={onDownload}>
                    Download video
                  </button>
                </>
              ) : (
                <button type="button" className="btn primary" disabled={busy} onClick={onExport}>
                  {busy ? "Exporting…" : "Export video"}
                </button>
              )}
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
                {hasFile(short.id) ? " · video" : ""}
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
  onShare,
  onDownload,
}: {
  shorts: Short[];
  onOpen: (id: string) => void;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
  onShare: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Queue</p>
          <h1>When the channel posts</h1>
        </div>
        <p className="lede">
          The queue is a posting calendar in this browser. When a time hits, share the video file to
          TikTok or YouTube — the studio cannot post into those apps by itself.
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
              {hasFile(short.id) ? (
                <button type="button" className="btn small" onClick={() => onShare(short.id)}>
                  Share
                </button>
              ) : null}
              {hasFile(short.id) ? (
                <button type="button" className="btn small" onClick={() => onDownload(short.id)}>
                  File
                </button>
              ) : null}
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
        <p className="lede">Style, voice, and auto-export stick to every Short you build after this.</p>
      </header>
      <label className="auto-toggle">
        <input
          type="checkbox"
          checked={channel.auto}
          onChange={(event) => patch("auto", event.target.checked)}
        />
        <span>
          <strong>Auto export</strong>
          <em>Build writes the voice, records a 9:16 video, and queues it tonight. You still share the file to TikTok.</em>
        </span>
      </label>
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
      <div className="ref-card">
        <p className="kicker">Voice reference</p>
        <strong>Science Explainer</strong>
        <p>
          The clip you sent — a measured male science narrator. The sample science Short plays that
          recording. New Shorts use Yapper Mini Jasper at the same low register and pace.
        </p>
        <audio controls preload="metadata" src={EXPLAINER_SRC}>
          Your browser cannot play the reference clip.
        </audio>
      </div>
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
