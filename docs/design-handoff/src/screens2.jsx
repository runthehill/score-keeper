/* =========================================================================
   screens2.jsx — LiveScreen, ShareCard, SummaryScreen, History, Settings
   ========================================================================= */

// =========================================================================
// LIVE
// =========================================================================
function LiveScreen({ game, events, period, timer, style, onScore, onUndo, onAdvance, onEnd, onHome, onCard, onStat }) {
  const sport = window.getSport(game.sport);
  const [flash, setFlash] = React.useState(null);
  const [sheet, setSheet] = React.useState(null); // 'card' | 'stat' | 'end' | 'share' | 'next'
  const [statType, setStatType] = React.useState(null);
  const shareRef = React.useRef(null);
  const [saving, setSaving] = React.useState(false);
  const doShare = async (name) => {
    setSaving(true);
    const hs = events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0);
    const as = events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0);
    await window.exportShareCard(shareRef.current, name, `${game.home.name} ${hs}–${as} ${game.away.name}`);
    setSaving(false);
  };

  const handleScore = (side, type, pts, label) => {
    onScore(side, type, pts, label);
    setFlash(side);
    setTimeout(() => setFlash(null), 480);
  };

  const isRegEnd = period >= sport.periods.count;
  const periodLabel = `${sport.periods.name} ${period}`;

  const fouls = sport.id === 'basketball' ? {
    home: events.filter((e) => e.team === 'home' && e.type === 'foul' && e.period === period).length,
    away: events.filter((e) => e.team === 'away' && e.type === 'foul' && e.period === period).length,
  } : null;

  const actionBtn = (Icon, label, onClick) => (
    <button className="pressable" onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '11px 4px',
      background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 13, cursor: 'pointer', color: 'var(--txt-2)',
    }}>
      <Icon size={19} />
      <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 10.5, color: 'var(--txt-2)' }}>{label}</span>
    </button>
  );

  return (
    <div className="screen">
      <SubHeader title={sport.name} onBack={onHome} sport={sport}
        right={<window.Pill tone="accent" accent={window.teamAccent(game.home)}>{period} / {sport.periods.count}</window.Pill>} />
      <ScrollArea>
        <window.Scoreboard game={game} events={events} style={style} flash={flash} />

        <div style={{ marginTop: 12 }}>
          <window.Timer seconds={timer.seconds} running={timer.running} onToggle={timer.toggle} periodLabel={periodLabel} />
        </div>

        {fouls && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 6px 0' }}>
            {['home', 'away'].map((s) => (
              <span key={s} style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: fouls[s] >= 5 ? '#FF5A5A' : 'var(--txt-3)' }}>
                Team fouls {fouls[s]}{fouls[s] >= 5 ? ' · bonus' : ''}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <window.ScoringRow team={game.home} side="home" events={events} sport={sport} style={style} onScore={handleScore} />
          <window.ScoringRow team={game.away} side="away" events={events} sport={sport} style={style} onScore={handleScore} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {sport.cardEvents.length > 0 && actionBtn(window.ICard, 'Card', () => setSheet('card'))}
          {sport.statEvents.length > 0 && actionBtn(window.IStar, 'Stat', () => setSheet('stat'))}
          {actionBtn(window.IUndo, 'Undo', onUndo)}
          {actionBtn(window.IFlag, isRegEnd ? 'Full time' : 'Next', () => setSheet(isRegEnd ? 'end' : 'next'))}
        </div>

        <button className="pressable" onClick={() => setSheet('share')} style={{
          width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'transparent', border: '1px dashed var(--line-2)', borderRadius: 13, padding: '11px', cursor: 'pointer', color: 'var(--txt-2)',
          fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
        }}><window.IShare size={16} /> Share current score</button>

        {/* Play-by-play */}
        <div style={{ marginTop: 22 }}>
          <p className="eyebrow" style={{ margin: '0 2px 6px' }}>Play-by-play</p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '6px 12px' }}>
            <window.EventLog game={game} events={events} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <window.Button full variant="danger" onClick={() => setSheet('end')}>End game</window.Button>
        </div>
        <div style={{ height: 6 }} />
      </ScrollArea>

      {/* ---- sheets ---- */}
      {sheet === 'card' && (
        <window.Sheet title="Issue card" onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sport.cardEvents.map((c) => (
              <div key={c.type} style={{ display: 'flex', gap: 10 }}>
                {['home', 'away'].map((s) => {
                  const team = s === 'home' ? game.home : game.away;
                  return (
                    <button key={s} className="pressable" onClick={() => { onCard(s, c.type, `${c.label} card`); setSheet(null); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 13, cursor: 'pointer', minWidth: 0 }}>
                      <span style={{ width: 16, height: 22, borderRadius: 4, background: c.color, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label} · {team.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </window.Sheet>
      )}

      {sheet === 'stat' && (
        <window.Sheet title={statType ? 'Which team?' : 'Log stat'} onClose={() => { setSheet(null); setStatType(null); }}>
          {!statType ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {sport.statEvents.map((st) => (
                <button key={st.type} className="pressable" onClick={() => setStatType(st)} style={{ padding: '16px 8px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{st.label}</button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['home', 'away'].map((s) => {
                const team = s === 'home' ? game.home : game.away;
                return (
                  <button key={s} className="pressable" onClick={() => { onStat(s, statType.type, statType.label); setSheet(null); setStatType(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 13, cursor: 'pointer' }}>
                    <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={26} radius={8} />
                    <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{statType.label} · {team.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </window.Sheet>
      )}

      {sheet === 'next' && (
        <window.Sheet title={`Start ${sport.periods.name} ${period + 1}?`} onClose={() => setSheet(null)}>
          <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--txt-2)', lineHeight: 1.5 }}>The clock resets to 00:00. Your scores carry over.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <window.Button variant="ghost" full onClick={() => setSheet(null)}>Cancel</window.Button>
            <window.Button full onClick={() => { onAdvance(); setSheet(null); }}>Next {sport.periods.name.toLowerCase()}</window.Button>
          </div>
        </window.Sheet>
      )}

      {sheet === 'end' && (
        <window.Sheet title="End the game?" onClose={() => setSheet(null)}>
          <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--txt-2)', lineHeight: 1.5 }}>
            Final score · {game.home.name} {events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0)} – {events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0)} {game.away.name}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <window.Button variant="ghost" full onClick={() => setSheet(null)}>Keep playing</window.Button>
            <window.Button full onClick={() => { setSheet(null); onEnd(); }}><window.IWhistle size={17} /> Full time</window.Button>
          </div>
        </window.Sheet>
      )}

      {sheet === 'share' && (
        <window.Sheet title="Share score" onClose={() => setSheet(null)}>
          <ShareCard game={game} events={events} statusLabel="Live" cardRef={shareRef} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <window.Button variant="ghost" full onClick={() => setSheet(null)}>Close</window.Button>
            <window.Button full onClick={() => doShare('score-keeper-live')}><window.IShare size={16} /> {saving ? 'Preparing…' : 'Share image'}</window.Button>
          </div>
        </window.Sheet>
      )}
    </div>
  );
}

// =========================================================================
// SHARE CARD — the configurable-color payoff (fixed dark artifact)
// =========================================================================
function ShareCard({ game, events, statusLabel = 'Full time', cardRef }) {
  const sport = window.getSport(game.sport);
  const split = sport.scoreDisplay === 'split';
  const hs = events ? events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0) : game.homeScore;
  const as = events ? events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0) : game.awayScore;
  const homeWin = hs > as, draw = hs === as;
  const txt = (side) => split && events ? window.gaelicSplit(events, side) : String(side === 'home' ? hs : as);
  const date = window.fmtDate(game.started_at || new Date().toISOString());

  const ac = (team) => window.teamAccent(team, true); // share card is always dark
  const TeamSide = (side, team, score, win) => {
    const isHome = side === 'home';
    const accent = ac(team);
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isHome ? 'flex-start' : 'flex-end' }}>
        <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={34} radius={10} />
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13.5, color: '#fff', marginTop: 9, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: isHome ? 'left' : 'right', width: '100%', letterSpacing: '-0.01em' }}>{team.name}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{isHome ? 'Home' : 'Away'} {win && !draw ? '· Win' : ''}</div>
        <div style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: split ? 46 : 62, lineHeight: 0.9, color: win || draw ? accent : 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', marginTop: 8, letterSpacing: split ? 0 : '-0.02em' }}>{txt(side)}</div>
      </div>
    );
  };

  return (
    <div ref={cardRef} style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', background: '#0A0C10', boxShadow: '0 18px 50px rgba(0,0,0,0.5)', padding: '18px 18px 16px' }}>
      <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: 999, background: window.rgba(game.home.primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 999, background: window.rgba(game.away.primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {statusLabel === 'Live' ? <window.LiveDot size={6} /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: '#47b26c' }} />}{statusLabel}
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{sport.name} · {date}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {TeamSide('home', game.home, hs, homeWin)}
          <div style={{ fontFamily: 'var(--font-score)', fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.3)', alignSelf: 'center', paddingTop: 30 }}>–</div>
          {TeamSide('away', game.away, as, !homeWin)}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', gap: 2.5 }}>{['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'].map((c, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: c }} />)}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>Score Keeper</span>
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>
            {draw ? 'Full-time draw' : `${(homeWin ? game.home : game.away).name} by ${Math.abs(hs - as)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUMMARY
// =========================================================================
function SummaryScreen({ game, events, onHome }) {
  const sport = window.getSport(game.sport);
  const plays = events ? events.filter((e) => e.points > 0) : [];
  const cardRef = React.useRef(null);
  const [saving, setSaving] = React.useState(false);
  const share = async () => {
    setSaving(true);
    await window.exportShareCard(cardRef.current, 'score-keeper-fulltime',
      `${game.home.name} ${game.homeScore ?? ''}–${game.awayScore ?? ''} ${game.away.name}`);
    setSaving(false);
  };
  return (
    <div className="screen">
      <SubHeader title="Full time" onBack={onHome} sport={sport} />
      <ScrollArea>
        <div style={{ marginTop: 4 }}><ShareCard game={game} events={events} statusLabel="Full time" cardRef={cardRef} /></div>

        {plays.length > 0 && (
          <>
            <p className="eyebrow" style={{ margin: '22px 2px 8px' }}>Scoring summary</p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '6px 12px' }}>
              <window.EventLog game={game} events={events.filter((e) => e.points > 0)} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <window.Button variant="ghost" full onClick={onHome}>Done</window.Button>
          <window.Button full onClick={share}><window.IShare size={16} /> {saving ? 'Preparing…' : 'Share result'}</window.Button>
        </div>
        <div style={{ height: 8 }} />
      </ScrollArea>
    </div>
  );
}

// =========================================================================
// HISTORY + SETTINGS
// =========================================================================
function HistoryScreen({ recent, onOpenGame, tab, onTab }) {
  return (
    <div className="screen">
      <AppHeader subtitle="Past games" />
      <ScrollArea>
        <p className="eyebrow" style={{ margin: '4px 2px 12px' }}>All games · {recent.length}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recent.map((g) => <window.RecentCard key={g.id} game={g} onClick={() => onOpenGame(g)} />)}
        </div>
        <div style={{ height: 8 }} />
      </ScrollArea>
      <window.TabBar tab={tab} onTab={onTab} />
    </div>
  );
}

function SettingsScreen({ tab, onTab, dark, onToggleDark }) {
  const Row = ({ label, detail, last, onClick, control }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', minHeight: 50, padding: '0 14px', cursor: onClick ? 'pointer' : 'default', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14.5, color: 'var(--txt)' }}>{label}</span>
      {detail && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--txt-3)', marginRight: 6 }}>{detail}</span>}
      {control}
    </div>
  );
  const Toggle = ({ on, onClick }) => (
    <button className="pressable" onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, background: on ? 'var(--txt)' : 'var(--line-2)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: 'var(--surface)', transition: 'left .15s var(--ease)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
  const group = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' };
  return (
    <div className="screen">
      <AppHeader subtitle="Preferences" />
      <ScrollArea>
        <p className="eyebrow" style={{ margin: '4px 2px 10px' }}>Appearance</p>
        <div style={group}>
          <Row label="Dark mode" control={<Toggle on={dark} onClick={onToggleDark} />} />
          <Row label="Scoreboard style" detail="Tweaks panel" last />
        </div>
        <p className="eyebrow" style={{ margin: '20px 2px 10px' }}>Game</p>
        <div style={group}>
          <Row label="Keep screen awake" control={<Toggle on={true} onClick={() => {}} />} />
          <Row label="Sound on score" control={<Toggle on={false} onClick={() => {}} />} />
          <Row label="Default game length" detail="Sport default" last />
        </div>
        <p className="eyebrow" style={{ margin: '20px 2px 10px' }}>Data</p>
        <div style={group}>
          <Row label="Export games" detail="CSV · JSON" />
          <Row label="About Score Keeper" detail="v2.0" last />
        </div>
        <div style={{ height: 8 }} />
      </ScrollArea>
      <window.TabBar tab={tab} onTab={onTab} />
    </div>
  );
}

Object.assign(window, { LiveScreen, ShareCard, SummaryScreen, HistoryScreen, SettingsScreen });
