import { useEffect, useMemo, useRef, useState } from "react";
import type { Channel, Short } from "./studio";
import { boardOf, handleOf, scriptText, voiceOf } from "./studio";

type PlayerProps = {
  short: Short;
  channel: Channel;
  autoPlay?: boolean;
  onEnded?: () => void;
};

export function Player({ short, channel, autoPlay = false, onEnded }: PlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState(short.beats[0]?.caption ?? "");
  const ended = useRef(onEnded);
  ended.current = onEnded;
  const board = useMemo(() => boardOf(short, channel.name), [short, channel.name]);
  const narration = useMemo(() => short.beats.map((beat) => beat.line), [short]);
  const handle = handleOf(channel.name);

  useEffect(() => {
    setIndex(0);
    setCaption(short.beats[0]?.caption ?? "");
    setPlaying(false);
    window.speechSynthesis.cancel();
  }, [short.id]);

  useEffect(() => {
    if (autoPlay) play();
    return () => window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short.id, autoPlay]);

  function speakFrom(start: number) {
    window.speechSynthesis.cancel();
    const voice = voiceOf(short.voice);
    const voices = window.speechSynthesis.getVoices();
    const picked =
      voices.find((item) => item.lang.startsWith("en") && /female|woman/i.test(item.name) && short.voice !== "rowan" && short.voice !== "cassian") ||
      voices.find((item) => item.lang.startsWith("en")) ||
      voices[0];

    let cursor = start;
    const next = () => {
      if (cursor >= narration.length) {
        setPlaying(false);
        ended.current?.();
        return;
      }
      setIndex(cursor);
      setCaption(short.beats[cursor]?.caption ?? "");
      const utterance = new SpeechSynthesisUtterance(narration[cursor]);
      utterance.rate = voice.rate;
      utterance.pitch = voice.pitch;
      if (picked) utterance.voice = picked;
      utterance.onend = () => {
        cursor += 1;
        next();
      };
      utterance.onerror = () => {
        cursor += 1;
        next();
      };
      window.speechSynthesis.speak(utterance);
    };
    setPlaying(true);
    next();
  }

  function play() {
    speakFrom(index >= short.beats.length ? 0 : index);
  }

  function pause() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  return (
    <div className="player">
      <div className="tt" data-playing={playing}>
        <div className={`tt-video style-${short.style}`}>
          <IsoBoard board={board} active={index} />
          <p className="tt-caption">{caption}</p>
          <div className="tt-actions" aria-hidden="true">
            <span className="tt-avatar">
              {channel.name.slice(0, 1)}
              <i>+</i>
            </span>
            <span className="tt-act">
              <Heart />
              13
            </span>
            <span className="tt-act">
              <Bubble />
              3
            </span>
            <span className="tt-act">
              <Bookmark />
            </span>
            <span className="tt-act">
              <Share />
              3
            </span>
            <span className={playing ? "tt-disc spin" : "tt-disc"} />
          </div>
          <div className="tt-meta">
            <p className="tt-user">
              @{handle} <em>· now</em>
            </p>
            <p className="tt-desc">
              {short.idea} <span>… more</span>
            </p>
            <p className="tt-sound">♪ original sound - {channel.name}</p>
          </div>
        </div>
      </div>
      <div className="player-bar">
        <button type="button" className="btn primary" onClick={playing ? pause : play}>
          {playing ? "Pause" : "Play preview"}
        </button>
        <p className="muted">
          {index + 1}/{short.beats.length} · {voiceOf(short.voice).name} · TikTok-style preview, not an upload
        </p>
        <p className="sr-only">{scriptText(short)}</p>
      </div>
    </div>
  );
}

function IsoBoard({
  board,
  active,
}: {
  board: ReturnType<typeof boardOf>;
  active: number;
}) {
  return (
    <div className="iso-board">
      <div className="iso-top">
        <strong>{board.brand}</strong>
        <div className="iso-pills">
          {board.pills.map((pill) => (
            <span key={pill}>{pill}</span>
          ))}
        </div>
      </div>
      <div className="iso-split">
        <div className="iso-list">
          <p>
            Tasks in progress <em>{board.tasks.length} running</em>
          </p>
          {board.tasks.map((task, index) => (
            <div key={`${task.name}-${index}`} className={index === active ? "iso-task on" : "iso-task"}>
              <i style={{ background: task.tone }} />
              <div>
                <strong>{task.name}</strong>
                <span>
                  {task.step} · {task.pct}%
                </span>
                <b style={{ width: `${task.pct}%`, background: task.tone }} />
              </div>
            </div>
          ))}
        </div>
        <div className="iso-room" aria-hidden="true">
          <div className="iso-window">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <em>{board.stat}</em>
          </div>
          <div className="iso-floor">
            <div className="desk d1">
              <span className="screen" />
              <span className="fig blue" />
              <em>Ads</em>
            </div>
            <div className="desk d2">
              <span className="screen" />
              <span className="fig pink" />
              <em>Copy</em>
            </div>
            <div className="desk d3">
              <span className="screen" />
              <span className="fig mint" />
              <em>Book</em>
            </div>
            <div className="plant" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 21s-6.7-4.35-9.33-8.22C.7 9.7 2.2 6 5.7 6c2.1 0 3.3 1.2 4.3 2.7C11 7.2 12.2 6 14.3 6c3.5 0 5 3.7 3.03 6.78C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}
function Bubble() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M4 4h16v12H7l-3 3V4z" />
    </svg>
  );
}
function Bookmark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M6 3h12v18l-6-4-6 4V3z" />
    </svg>
  );
}
function Share() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 3l7 7h-4v7H9v-7H5l7-7z" />
    </svg>
  );
}
