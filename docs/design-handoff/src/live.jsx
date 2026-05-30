/* =========================================================================
   live.jsx — the hero: Scoreboard, Timer, ScoringRow, EventLog, LiveScreen
   ========================================================================= */

// UI accent for a team, READABLE against the current theme background.
// A near-black primary vanishes on dark; a near-white primary vanishes on
// light. Fall back to the secondary, then to a safe tone. Kit chips always
// keep the true primary + secondary, so identity is never lost.
function teamAccent(t, dark = window.__dark) {
  const bgL = window.relLuminance(dark ? '#0C0E12' : '#EDEFF3');
  const ratio = (c) => {
    const L = window.relLuminance(c);
    return (Math.max(L, bgL) + 0.05) / (Math.min(L, bgL) + 0.05);
  };
  if (ratio(t.primary) >= 2.3) return t.primary;
  if (ratio(t.secondary) >= 2.3) return t.secondary;
  return dark ? '#E8ECF2' : '#15171C';
}

// ---- Scoreboard ---------------------------------------------------------
function Scoreboard({ game, events, style = 'bars', flash }) {
  const sport = window.getSport(game.sport);
  const split = sport.scoreDisplay === 'split';
  const homeScore = events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0);
  const awayScore = events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0);
  const scoreText = (team, n) => (split ? window.gaelicSplit(events, team) : String(n));

  const aHome = teamAccent(game.home), aAway = teamAccent(game.away);

  // ---- BLOCKS: two color-blocked halves with diagonal seam --------------
  if (style === 'blocks') {
    const Half = (side, team, score, accent) => {
      const ink = window.inkOn(team.primary);
      const isHome = side === 'home';
      return (
        <div style={{
          position: 'relative', flex: 1, background: team.primary, padding: '18px 16px 20px',
          display: 'flex', flexDirection: 'column', alignItems: isHome ? 'flex-start' : 'flex-end',
          textAlign: isHome ? 'left' : 'right', minWidth: 0,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: team.secondary, opacity: 0.95 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: ink, opacity: 0.92, marginBottom: 2, flexDirection: isHome ? 'row' : 'row-reverse' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{isHome ? 'Home' : 'Away'}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14.5, color: ink, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{team.name}</div>
          <div className={flash === side ? 'score-pop' : ''} style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: split ? 56 : 76, lineHeight: 0.92, color: ink, fontVariantNumeric: 'tabular-nums', marginTop: 6, letterSpacing: split ? '0' : '-0.02em' }}>{scoreText(side, score)}</div>
          {split && <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12, color: ink, opacity: 0.7 }}>{score} pts</div>}
        </div>
      );
    };
    return (
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)', display: 'flex' }}>
        {Half('home', game.home, homeScore, aHome)}
        <div style={{ width: 0, position: 'relative', zIndex: 2 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translate(-50%,-50%)', width: 30, height: 30, borderRadius: 999, background: 'var(--surface)', boxShadow: 'var(--shadow-card)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, color: 'var(--txt-2)', letterSpacing: '0.02em' }}>VS</div>
        </div>
        {Half('away', game.away, awayScore, aAway)}
      </div>
    );
  }

  // ---- BARS (default) & MINIMAL: neutral surface, colored accents -------
  const minimal = style === 'minimal';
  const Col = (side, team, score, accent) => {
    const isHome = side === 'home';
    const numColor = minimal ? 'var(--txt)' : accent;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, padding: '0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, width: '100%' }}>
          <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={20} radius={6} />
          <span style={{ minWidth: 0, flex: '0 1 auto', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{team.name}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', marginBottom: 2 }}>{isHome ? 'Home' : 'Away'}</div>
        <div className={flash === side ? 'score-pop' : ''} style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: split ? 50 : 68, lineHeight: 0.9, color: numColor, fontVariantNumeric: 'tabular-nums', letterSpacing: split ? '0' : '-0.02em' }}>{scoreText(side, score)}</div>
        {!minimal && <div style={{ width: 38, height: 4, borderRadius: 999, background: accent, marginTop: 10 }} />}
        {minimal && <div style={{ width: 38, height: 3, borderRadius: 999, background: accent, marginTop: 10, opacity: 0.85 }} />}
        {split && <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 11.5, color: 'var(--txt-3)', marginTop: 6 }}>{score} pts</div>}
      </div>
    );
  };
  return (
    <div style={{ position: 'relative', borderRadius: 20, background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line)', padding: '18px 10px 20px', display: 'flex', alignItems: 'center' }}>
      {Col('home', game.home, homeScore, aHome)}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '6px 0' }} />
      {Col('away', game.away, awayScore, aAway)}
    </div>
  );
}

// ---- Stadium clock ------------------------------------------------------
function Timer({ seconds, running, onToggle, periodLabel }) {
  return (
    <button className="pressable" onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 16px',
      cursor: 'pointer', color: 'var(--txt)',
    }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 999, background: running ? 'var(--txt)' : 'transparent', color: running ? 'var(--bg)' : 'var(--txt-2)', boxShadow: running ? 'none' : 'inset 0 0 0 1px var(--line-2)' }}>
        {running ? <window.IPause size={15} /> : <window.IPlay size={14} />}
      </span>
      <span style={{ fontFamily: 'var(--font-score)', fontWeight: 600, fontSize: 30, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>{window.fmtTimer(seconds)}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 2 }}>
        {running && <window.LiveDot size={6} />}
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>{periodLabel}</span>
      </span>
    </button>
  );
}

// ---- Scoring row (one team) --------------------------------------------
function ScoringRow({ team, side, events, sport, style, onScore }) {
  const accent = teamAccent(team);
  const score = events.filter((e) => e.team === side).reduce((a, e) => a + e.points, 0);
  const blocks = style === 'blocks';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
        <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={22} radius={7} />
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, color: 'var(--txt)', letterSpacing: '-0.01em' }}>{team.name}</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>{side}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-score)', fontWeight: 600, fontSize: 20, color: accent, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sport.scoringEvents.length}, 1fr)`, gap: 8 }}>
        {sport.scoringEvents.map((ev) => (
          <button key={ev.type} className="pressable score-btn" onClick={() => onScore(side, ev.type, ev.points, ev.label)}
            style={{
              position: 'relative', border: 'none', cursor: 'pointer', borderRadius: 15, padding: '13px 8px 12px',
              background: blocks ? accent : window.rgba(accent, 0.12),
              color: blocks ? window.inkOn(accent) : accent,
              boxShadow: blocks ? `0 5px 14px ${window.rgba(accent, 0.3)}` : `inset 0 0 0 1px ${window.rgba(accent, 0.32)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
            <span style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: 26, lineHeight: 1 }}>+{ev.points}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11.5, letterSpacing: '0.01em', opacity: blocks ? 0.92 : 1 }}>{ev.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Event log ----------------------------------------------------------
function EventLog({ game, events }) {
  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--txt-3)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
        No plays yet — tap a button above to log the first score.
      </div>
    );
  }
  const recent = [...events].slice(-8).reverse();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {recent.map((e) => {
        const team = e.team === 'home' ? game.home : game.away;
        const accent = teamAccent(team);
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 4px' }}>
            <span style={{ fontFamily: 'var(--font-score)', fontWeight: 600, fontSize: 14, color: 'var(--txt-3)', width: 42, fontVariantNumeric: 'tabular-nums' }}>{window.fmtTimer(e.t)}</span>
            <span style={{ width: 3, height: 22, borderRadius: 999, background: accent }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5, color: 'var(--txt)' }}>{e.label}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--txt-3)' }}>{team.name}</span>
            {e.points > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: 15, color: accent }}>+{e.points}</span>}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Scoreboard, Timer, ScoringRow, EventLog, teamAccent });
