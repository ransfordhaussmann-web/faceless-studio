import { useEffect, useMemo, useRef, useState } from "react";
import { ControlRoom } from "./ControlRoom";
import { Player } from "./Player";
import { downloadFile, hasFile, hydrateFiles, shareFile } from "./files";
import {
  anyConnected,
  disconnectAccount,
  emptyAccounts,
  metaStatus,
  publishReady,
  tiktokStatus,
  youtubeStatus,
  type AccountStatus,
  type Accounts,
  type PostTarget,
} from "./post";
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

type Shell = "control-room" | "studio";

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [shell, setShell] = useState<Shell>(() => {
    const params = new URLSearchParams(window.location.search);
    const app = params.get("app");
    if (app === "studio") return "studio";
    if (params.get("view") === "create" || params.get("view") === "library" || params.get("view") === "queue" || params.get("view") === "channel") {
      return "studio";
    }
    if (params.get("tiktok") || params.get("youtube") || params.get("meta")) return "studio";
    return "control-room";
  });
  const [view, setView] = useState<ViewId>("create");
  const [channel, setChannel] = useState<Channel>(initial.channel);
  const [shorts, setShorts] = useState<Short[]>(initial.shorts);
  const [idea, setIdea] = useState("");
  const [pipeline, setPipeline] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [buildNote, setBuildNote] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initial.shorts[0]?.id ?? null);
  const [filesTick, setFilesTick] = useState(0);
  const [accounts, setAccounts] = useState<Accounts>(emptyAccounts);
  const posting = useRef(new Set<string>());
  const shortsRef = useRef(shorts);
  const accountsRef = useRef(accounts);
  shortsRef.current = shorts;
  accountsRef.current = accounts;

  useEffect(() => {
    saveState({ channel, shorts });
  }, [channel, shorts]);

  useEffect(() => {
    void hydrateFiles(initial.shorts.map((item) => item.id)).then(() => setFilesTick((value) => value + 1));
  }, [initial.shorts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextView = params.get("view");
    if (nextView === "create" || nextView === "library" || nextView === "queue" || nextView === "channel") {
      setView(nextView);
    }
    const tiktok = params.get("tiktok");
    const youtube = params.get("youtube");
    if (tiktok === "connected") setBuildNote("TikTok connected. New Shorts will post automatically.");
    if (tiktok === "denied") setBuildNote("TikTok login was cancelled.");
    if (tiktok === "missing") setBuildNote("Add TikTok keys in Cursor Secrets, then connect again.");
    if (youtube === "connected") setBuildNote("YouTube connected. New Shorts will post automatically.");
    if (youtube === "denied") setBuildNote("YouTube login was cancelled.");
    if (youtube === "missing") setBuildNote("Add YouTube keys in Cursor Secrets, then connect again.");
    const meta = params.get("meta");
    if (meta === "connected") setBuildNote("Facebook connected. Reels and Page posts will go out automatically.");
    if (meta === "denied") setBuildNote("Facebook login was cancelled.");
    if (meta === "missing") setBuildNote("Add Facebook keys in Cursor Secrets, then connect again.");
    if (meta === "nopage") setBuildNote("Facebook login worked, but no Page was found. Create a Page, then connect again.");
    if (params.toString()) window.history.replaceState({}, "", window.location.pathname || "./");
    void refreshAccounts();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void flushDue(), 20_000);
    void flushDue();
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      let live = accounts;
      if (channel.auto) {
        next = { ...next, status: "queued", queuedAt: laterTonight() };
        live = await refreshAccounts();
        if (anyConnected(live)) {
          setBuildNote("Posting…");
          next = await applyPost(next, live);
        }
      }
      setPipeline(5);
      setShorts((list) => [next, ...list]);
      setActiveId(next.id);
      setIdea("");
      setFilesTick((value) => value + 1);
      if (!next.postNote) {
        setBuildNote(channel.auto ? liveNote(live) : "Video ready to share");
      } else {
        setBuildNote(next.postNote);
      }
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
      let next = await exportShort(short, channel, setBuildNote);
      if (channel.auto) {
        next = { ...next, status: "queued", queuedAt: next.queuedAt ?? laterTonight() };
        const live = await refreshAccounts();
        if (anyConnected(live)) {
          setBuildNote("Posting…");
          next = await applyPost(next, live);
        }
      }
      updateShort(id, next);
      setFilesTick((value) => value + 1);
      setPipeline(5);
      setBuildNote(next.postNote || (channel.auto ? liveNote(accounts) : "Video ready to share"));
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

  async function refreshAccounts() {
    const [tiktok, youtube, meta] = await Promise.all([tiktokStatus(), youtubeStatus(), metaStatus()]);
    const next = { tiktok, youtube, facebook: meta.facebook, instagram: meta.instagram };
    setAccounts(next);
    return next;
  }

  async function applyPost(short: Short, live = accounts): Promise<Short> {
    const results = await publishReady(short, live);
    if (!results.length) {
      return {
        ...short,
        postNote: "Connect TikTok, Reels, Facebook, or YouTube in Channel to auto-post.",
      };
    }
    const ok = results.filter((item) => item.ok);
    const note = results.map((item) => item.message).join(" · ");
    if (ok.length) {
      return {
        ...short,
        status: "posted",
        queuedAt: short.queuedAt,
        postedTo: ok.map((item) => item.target),
        postNote: note,
      };
    }
    return { ...short, postNote: note };
  }

  function liveNote(live: Accounts): string {
    if (anyConnected(live)) {
      return "Queued · will post to connected accounts.";
    }
    if (
      live.tiktok.error === "static" ||
      live.youtube.error === "static" ||
      live.facebook.error === "static" ||
      live.instagram.error === "static"
    ) {
      return "Queued. Auto-post needs the Cursor-hosted app — this copy can still share the file.";
    }
    return "Queued tonight. Connect TikTok, Reels, Facebook, or YouTube in Channel to post automatically.";
  }

  async function postNow(id: string) {
    const short = shorts.find((item) => item.id === id);
    if (!short || busy) return;
    if (!hasFile(id)) await exportActive(id);
    const current = shorts.find((item) => item.id === id);
    const target = current ?? short;
    if (!hasFile(target.id)) return;
    setBusy(true);
    setBuildNote("Posting…");
    try {
      const live = await refreshAccounts();
      const next = await applyPost(target, live);
      updateShort(id, next);
      setBuildNote(next.postNote || "Posted.");
    } finally {
      setBusy(false);
    }
  }

  function updateShort(id: string, patch: Partial<Short>) {
    setShorts((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function queueShort(id: string, when: number | null, status: Short["status"]) {
    updateShort(id, { queuedAt: when, status });
    setView("queue");
  }

  async function flushDue() {
    const list = shortsRef.current;
    const live = accountsRef.current;
    const due = list.filter(
      (item) =>
        item.status === "queued" &&
        (item.queuedAt ?? 0) <= Date.now() &&
        hasFile(item.id) &&
        !item.postedTo?.length &&
        !item.postNote,
    );
    if (!due.length) return;
    if (!anyConnected(live)) return;
    for (const short of due) {
      if (posting.current.has(short.id)) continue;
      posting.current.add(short.id);
      try {
        const next = await applyPost(short, live);
        if (next.status === "posted" || next.postNote) updateShort(short.id, next);
      } finally {
        posting.current.delete(short.id);
      }
    }
  }

  if (shell === "control-room") {
    return <ControlRoom onOpenStudio={() => setShell("studio")} />;
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
          <button type="button" className="nav" onClick={() => setShell("control-room")}>
            Control room
          </button>
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
            onPost={() => active && void postNow(active.id)}
            canPost={anyConnected(accounts)}
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
            onPost={(id) => void postNow(id)}
            canPost={anyConnected(accounts)}
          />
        )}
        {view === "channel" && (
          <ChannelView
            channel={channel}
            onChange={setChannel}
            accounts={accounts}
            onDisconnect={(target) => void disconnectAccount(target).then(() => refreshAccounts())}
          />
        )}
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
  onPost,
  canPost,
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
  onPost: () => void;
  canPost: boolean;
}) {
  return (
    <section className="page create-page">
      <header className="page-head">
        <div>
          <p className="kicker">New Short</p>
          <h1>Type one idea. Get a TikTok-style Short.</h1>
        </div>
        <p className="lede">
          One idea becomes a script, voice, and 9:16 video. Connect TikTok, Reels, Facebook, and
          YouTube in Channel and new Shorts post by themselves. Sample shorts are marked.
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
            ? "Auto is on: voice, video, queue, and post to any connected account."
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
                  {canPost ? (
                    <button type="button" className="btn primary" disabled={busy} onClick={onPost}>
                      Post now
                    </button>
                  ) : (
                    <button type="button" className="btn primary" onClick={onShare}>
                      Share to TikTok
                    </button>
                  )}
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
            {active.postNote ? <p className="build-note">{active.postNote}</p> : null}
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
                {short.postedTo?.length ? " · posted" : ""}
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
  onPost,
  canPost,
}: {
  shorts: Short[];
  onOpen: (id: string) => void;
  onQueue: (id: string, when: number | null, status: Short["status"]) => void;
  onShare: (id: string) => void;
  onDownload: (id: string) => void;
  onPost: (id: string) => void;
  canPost: boolean;
}) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Queue</p>
          <h1>When the channel posts</h1>
        </div>
        <p className="lede">
          When a time hits, the desk posts to any TikTok, Reels, Facebook, or YouTube account you
          connected. Keep this tab open, or tap Post now.
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
                {short.postNote ? ` · ${short.postNote}` : ""}
              </p>
            </div>
            <div className="actions tight">
              {hasFile(short.id) && canPost ? (
                <button type="button" className="btn small" onClick={() => onPost(short.id)}>
                  Post
                </button>
              ) : null}
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
  accounts,
  onDisconnect,
}: {
  channel: Channel;
  onChange: (channel: Channel) => void;
  accounts: Accounts;
  onDisconnect: (target: PostTarget) => void;
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
        <p className="lede">Style, voice, and auto-post stick to every Short you build after this.</p>
      </header>
      <label className="auto-toggle">
        <input
          type="checkbox"
          checked={channel.auto}
          onChange={(event) => patch("auto", event.target.checked)}
        />
        <span>
          <strong>Auto post</strong>
          <em>Build writes the voice, records a 9:16 video, queues it, and posts to connected TikTok, Reels, Facebook, and YouTube accounts.</em>
        </span>
      </label>
      <div className="account-row">
        <AccountCard
          title="TikTok"
          account={accounts.tiktok}
          href="/api/tiktok/start"
          onDisconnect={() => onDisconnect("tiktok")}
        />
        <AccountCard
          title="Instagram Reels"
          account={accounts.instagram}
          href="/api/meta/start"
          onDisconnect={() => onDisconnect("instagram")}
        />
        <AccountCard
          title="Facebook"
          account={accounts.facebook}
          href="/api/meta/start"
          onDisconnect={() => onDisconnect("facebook")}
        />
        <AccountCard
          title="YouTube"
          account={accounts.youtube}
          href="/api/youtube/start"
          onDisconnect={() => onDisconnect("youtube")}
        />
      </div>
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

function AccountCard({
  title,
  account,
  href,
  onDisconnect,
}: {
  title: string;
  account: AccountStatus;
  href: string;
  onDisconnect: () => void;
}) {
  const staticHost = account.error === "static";
  return (
    <div className="ref-card">
      <p className="kicker">{title}</p>
      <strong>
        {account.connected ? `Connected · ${account.name || title}` : `${title} not connected`}
      </strong>
      <p>
        {account.connected
          ? "New Shorts post to this account when Auto post is on."
          : staticHost
            ? "This GitHub Pages copy cannot log into accounts. Use the Cursor-hosted app with secrets."
            : account.configured
              ? `Connect ${title} once. The desk then posts by itself.`
              : account.error && account.error !== "static" && account.error !== "offline"
                ? account.error
                : `Add keys in Cursor Secrets, then connect ${title}.`}
      </p>
      {account.connected ? (
        <button type="button" className="btn" onClick={onDisconnect}>
          Disconnect
        </button>
      ) : staticHost || !account.configured ? null : (
        <a className="btn primary" href={href}>
          Connect {title}
        </a>
      )}
    </div>
  );
}
