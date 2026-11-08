import { useEffect, useMemo, useRef, useState } from "react";
import type { Short } from "./studio";
import { scriptText, voiceOf } from "./studio";

type PlayerProps = {
  short: Short;
  autoPlay?: boolean;
  onEnded?: () => void;
};

export function Player({ short, autoPlay = false, onEnded }: PlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState(short.beats[0]?.caption ?? "");
  const ended = useRef(onEnded);
  ended.current = onEnded;

  const narration = useMemo(() => short.beats.map((beat) => beat.line), [short]);

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

  const beat = short.beats[index] ?? short.beats[0];

  return (
    <div className="player">
      <div className={`phone style-${short.style}`} data-playing={playing}>
        <div className="phone-frame">
          <div className="scene" data-style={short.style} data-beat={index}>
            <div className="scene-wash" />
            <div className="scene-shape a" />
            <div className="scene-shape b" />
            <div className="scene-shape c" />
            <p className="scene-kicker">{short.niche}</p>
            <p className="scene-title">{beat?.heading}</p>
          </div>
          <div className="captions">
            <p>{caption}</p>
          </div>
        </div>
      </div>
      <div className="player-bar">
        <button type="button" className="btn primary" onClick={playing ? pause : play}>
          {playing ? "Pause" : "Play preview"}
        </button>
        <p className="muted">
          {index + 1}/{short.beats.length} · {voiceOf(short.voice).name} · sample preview, not a rendered file
        </p>
        <p className="sr-only">{scriptText(short)}</p>
      </div>
    </div>
  );
}
