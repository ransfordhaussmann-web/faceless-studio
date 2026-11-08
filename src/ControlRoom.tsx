import { useEffect } from "react";
import { bootControlRoom } from "./controlRoomBoot.js";
import "./controlRoom.css";

type Props = {
  onOpenStudio: () => void;
};

export function ControlRoom({ onOpenStudio }: Props) {
  useEffect(() => {
    document.body.classList.add("ccr-mode");
    document.title = "AI Content Control Room";
    const stop = bootControlRoom();
    return () => {
      stop();
      document.body.classList.remove("ccr-mode");
    };
  }, []);

  return (
    <div className="ccr-root">
      <header>
        <div className="brand">
          <div className="logo" aria-hidden="true">
            ✦
          </div>
          <div>
            <div className="eyebrow">Content operations</div>
            <h1>AI Content Control Room</h1>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" type="button" onClick={onOpenStudio}>
            Open Shorts desk
          </button>
          <span className="live" id="live-accounts" hidden>
            <i className="dot" />
            Live accounts
          </span>
          <button className="btn" id="mode" aria-pressed="false" type="button">
            Open demo
          </button>
          <span className="demo" id="demo-label" hidden>
            DEMO DATA
          </span>
          <span className="live" id="live" hidden>
            <i className="dot" />
            8 agents online
          </span>
          <button className="btn" id="toggle" hidden type="button">
            Pause demo
          </button>
          <button className="btn primary" id="new" hidden type="button">
            + New brief
          </button>
        </div>
      </header>

      <section className="setup" id="setup" aria-labelledby="setup-title">
        <section className="panel intro">
          <div className="eyebrow">Live analytics setup</div>
          <h2 id="setup-title">Your social channels</h2>
          <p className="setup-note" id="metrics-status" role="status">
            Loading your connected accounts…
          </p>
          <p className="setup-note" id="metrics-range" hidden />
        </section>

        <section className="panel intro money" aria-labelledby="money-title">
          <div className="eyebrow">All accounts</div>
          <h2 id="money-title">Money made</h2>
          <p className="money-total" id="money-total">
            —
          </p>
          <p className="setup-note" id="money-note">
            Total from YouTube, TikTok, Instagram, and Facebook. Connect each account to fill its row. YouTube
            uses estimated ad revenue; Facebook uses Page ad-break earnings when monetization is on.
          </p>
          <div className="money-rows" id="money-breakdown" />
        </section>

        <section className="panel intro production" lang="de-CH" aria-labelledby="production-title">
          <div className="eyebrow">DailyinfoRH</div>
          <h2 id="production-title">Produktion und Freigabe</h2>
          <p className="setup-note">
            Speichere beide Skripte als Auftrag. Für DailyinfoRH-Geschichten endet jede Folge mit einem
            Cliffhanger. Der Produktionslauf erstellt zwei Hochkantvideos. Fertige Videos kannst du hier
            prüfen und freigeben.
          </p>
          <details>
            <summary>Neuer Produktionsauftrag</summary>
            <form id="production-form">
              <label>
                Titel
                <input name="title" required maxLength={120} />
              </label>
              <div className="production-pair">
                <label>
                  Skript Deutsch
                  <textarea name="scriptDe" rows={4} required maxLength={3000} />
                </label>
                <label>
                  Skript Englisch
                  <textarea name="scriptEn" rows={4} required maxLength={3000} />
                </label>
              </div>
              <button className="btn primary" type="submit">
                Auftrag speichern
              </button>
            </form>
          </details>
          <button id="production-refresh" className="btn" type="button">
            Aufträge aktualisieren
          </button>
          <p id="production-voice" className="setup-note" />
          <details id="production-voice-settings" hidden>
            <summary>Sprecherstimmen einrichten</summary>
            <p className="setup-note">
              Du brauchst die Region und einen Schlüssel deiner Azure-Speech-Ressource. Der Kontrollraum
              prüft Seraphina und Ava vor dem Speichern.
            </p>
            <form id="production-voice-form" method="post" action="/api/production-voice-settings" autoComplete="off">
              <label>
                Azure-Region
                <input
                  name="region"
                  placeholder="z. B. westeurope"
                  maxLength={24}
                  pattern="[a-z0-9]{3,24}"
                  required
                  autoCapitalize="off"
                />
              </label>
              <label>
                Azure-Speech-Schlüssel
                <input
                  type="password"
                  name="key"
                  autoComplete="off"
                  spellCheck={false}
                  minLength={20}
                  maxLength={180}
                  required
                />
              </label>
              <button className="btn primary" type="submit">
                Zugang prüfen und speichern
              </button>
            </form>
            <p id="production-voice-message" className="setup-note" role="status" />
          </details>
          <p id="production-status" className="setup-note" role="status" />
          <div id="production-list" className="production" />
        </section>

        <div className="channels">
          <article className="panel channel" style={{ ["--accent" as string]: "#ff617d" }}>
            <span className="badge-icon" aria-hidden="true">
              ▷
            </span>
            <h3>YouTube</h3>
            <p className="quiet">Long videos and Shorts</p>
            <span className="demo" id="youtube-status">
              Awaiting data
            </span>
            <dl>
              <dt>Video views</dt>
              <dd id="youtube-views">—</dd>
              <dt>Subscribers</dt>
              <dd id="youtube-followers">—</dd>
              <dt>Money made</dt>
              <dd id="youtube-revenue">—</dd>
            </dl>
            <a id="youtube-link" href="/api/youtube/start">
              Connect YouTube ↗
            </a>
          </article>
          <article className="panel channel" style={{ ["--accent" as string]: "#56e6ec" }}>
            <span className="badge-icon" aria-hidden="true">
              ♪
            </span>
            <h3>TikTok</h3>
            <p className="quiet">Short clips and behind the scenes</p>
            <span className="demo" id="tiktok-status">
              Awaiting data
            </span>
            <dl>
              <dt>Profile likes</dt>
              <dd id="tiktok-views">—</dd>
              <dt>Followers</dt>
              <dd id="tiktok-followers">—</dd>
              <dt>Money made</dt>
              <dd id="tiktok-revenue">—</dd>
            </dl>
            <a id="tiktok-link" href="/api/tiktok/start">
              Connect TikTok ↗
            </a>
          </article>
          <article className="panel channel" style={{ ["--accent" as string]: "#ff67c6" }}>
            <span className="badge-icon" aria-hidden="true">
              ◎
            </span>
            <h3>Instagram</h3>
            <p className="quiet">Creator profile for Reels and posts</p>
            <span className="demo" id="instagram-status">
              Awaiting data
            </span>
            <dl>
              <dt>Reach</dt>
              <dd id="instagram-views">—</dd>
              <dt>Followers</dt>
              <dd id="instagram-followers">—</dd>
              <dt>Money made</dt>
              <dd id="instagram-revenue">—</dd>
            </dl>
            <a id="instagram-link" href="/api/meta/start">
              Connect Instagram Reels ↗
            </a>
          </article>
          <article className="panel channel" style={{ ["--accent" as string]: "#82a3ff" }}>
            <span className="badge-icon" aria-hidden="true">
              f
            </span>
            <h3>Facebook</h3>
            <p className="quiet">Brand Page for clips and updates</p>
            <span className="demo" id="facebook-status">
              Awaiting data
            </span>
            <dl>
              <dt>Impressions</dt>
              <dd id="facebook-views">—</dd>
              <dt>Followers</dt>
              <dd id="facebook-followers">—</dd>
              <dt>Money made</dt>
              <dd id="facebook-revenue">—</dd>
            </dl>
            <a id="facebook-link" href="/api/meta/start">
              Connect Facebook ↗
            </a>
          </article>
        </div>

        <section className="panel intro">
          <h3>Account access</h3>
          <p className="setup-note" id="account-access-note">
            Tap Connect on each card and log into your real TikTok, Instagram, Facebook Page, and YouTube
            accounts. Numbers update from those logins. This needs the Cursor-hosted app with secrets — the
            GitHub Pages phone copy cannot store them. Open demo is only a practice floor with sample data.
          </p>
        </section>
      </section>

      <div className="layout" id="demo-layout" hidden>
        <aside className="left" aria-label="Team and approvals">
          <section className="panel">
            <div className="section-title">
              <h2>Agent roster</h2>
              <span className="small">8 agents</span>
            </div>
            <div id="roster" className="status-list" />
          </section>
          <section className="panel">
            <div className="section-title">
              <h2>Needs your OK</h2>
              <span className="small" id="pending" />
            </div>
            <div id="queue" className="queue" />
          </section>
        </aside>
        <main>
          <div className="metrics" id="metrics" aria-label="Key metrics" />
          <section className="panel pipeline">
            <div className="section-title">
              <h2>Content pipeline</h2>
              <span className="small">● Agent workspace</span>
            </div>
            <div className="platforms" id="platforms" />
            <div className="floor" id="floor" />
          </section>
          <div className="bottom">
            <section className="panel">
              <div className="section-title">
                <h2>This week</h2>
                <span className="small" id="scheduled" />
              </div>
              <div className="calendar" id="calendar" />
            </section>
            <section className="panel latest">
              <div className="section-title">
                <h2>Latest video</h2>
                <span className="live">
                  <i className="dot" />
                  LIVE
                </span>
              </div>
              <div className="thumb">
                THE 3-CAMERA SETUP UNDER $500 <span>9:44</span>
              </div>
              <p>The desk setup I use every day</p>
              <div className="video-stats small">
                <span>78.4K views</span>
                <span>6.2% CTR</span>
              </div>
            </section>
          </div>
        </main>
        <aside className="right" aria-label="Analytics and activity">
          <section className="panel">
            <div className="section-title">
              <h2>Social pulse</h2>
              <span className="small">24H</span>
            </div>
            <div className="social" id="social" />
          </section>
          <section className="panel">
            <div className="section-title">
              <h2>Views by hour</h2>
              <span className="small">24H</span>
            </div>
            <svg
              className="chart"
              viewBox="0 0 208 60"
              preserveAspectRatio="none"
              role="img"
              aria-label="Sample hourly views fluctuate, with a peak near the end of the day"
            >
              <defs>
                <linearGradient id="chartFill" x2="0" y2="1" gradientUnits="objectBoundingBox">
                  <stop stopColor="#b179ff" stopOpacity=".35" />
                  <stop offset="1" stopColor="#b179ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 16H208M0 34H208M0 52H208" stroke="#302347" />
              <path
                d="M0 43 7 46 14 29 21 37 28 24 35 44 42 29 49 34 56 20 63 46 70 39 77 47 84 20 91 31 98 19 105 45 112 36 119 26 126 39 133 17 140 34 147 42 154 28 161 33 168 11 175 28 182 17 189 38 196 26 207 31V60H0Z"
                fill="url(#chartFill)"
              />
              <path
                d="M0 43 7 46 14 29 21 37 28 24 35 44 42 29 49 34 56 20 63 46 70 39 77 47 84 20 91 31 98 19 105 45 112 36 119 26 126 39 133 17 140 34 147 42 154 28 161 33 168 11 175 28 182 17 189 38 196 26 207 31"
                fill="none"
                stroke="#bc8aff"
                strokeWidth="2"
              />
            </svg>
            <div className="axis">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </section>
          <section className="panel">
            <div className="section-title">
              <h2>Activity feed</h2>
              <span className="small">Latest</span>
            </div>
            <div className="activity" id="activity" />
          </section>
        </aside>
      </div>
      <footer id="demo-footer" hidden>
        Interactive simulation · Agents and approval queue are demo data. Connected channel stats stay live
        on Back to channels.
      </footer>
      <dialog id="dialog" aria-labelledby="dialog-title" />
      <div id="toast" className="toast" role="status" />
    </div>
  );
}
