/* =========================================================================
   screens.jsx — Home, Setup, Live, Summary, History + chrome
   ========================================================================= */

const DEFAULT_HOME = {
  rugby_union: { name: 'Sligo RFC', primary: '#15171C', secondary: '#E03131' },
  soccer: { name: 'Strand Celtic', primary: '#1E8E4E', secondary: '#FFFFFF' },
  gaelic_football: { name: 'Coolera Strandhill', primary: '#16245A', secondary: '#F4C430' },
  basketball: { name: 'Sligo All Stars', primary: '#F25F1F', secondary: '#15171C' },
};

// ---- bits ---------------------------------------------------------------
function ScrollArea({ children, pad = true }) {
  return <div className="scrollarea" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: pad ? '0 16px 24px' : 0 }}>{children}</div>;
}

function AppHeader({ subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 16px 14px' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'].map((c, i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 17, color: 'var(--txt)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Jonathan's Score Keeper</div>
        {subtitle && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--txt-3)', marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function TabBar({ tab, onTab }) {
  const tabs = [
    { id: 'home', label: 'New Game', Icon: window.IPlus_sm || window.IPlus },
    { id: 'history', label: 'History', Icon: window.IHistory },
    { id: 'settings', label: 'Settings', Icon: window.ISettings },
  ];
  return (
    <nav style={{ display: 'flex', borderTop: '1px solid var(--line)', background: 'var(--surface)', paddingBottom: 6 }}>
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button key={t.id} className="pressable" onClick={() => onTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '11px 0 8px',
            background: 'transparent', border: 'none', cursor: 'pointer', color: active ? 'var(--txt)' : 'var(--txt-3)',
          }}>
            <t.Icon size={22} />
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 10.5, letterSpacing: '0.01em' }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
        fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15.5, color: 'var(--txt)', letterSpacing: '-0.01em',
      }} />
  );
}

// =========================================================================
// HOME
// =========================================================================
function HomeScreen({ live, recent, sport, onNewSport, onResume, onOpenGame, tab, onTab }) {
  const today = window.fmtDate(new Date().toISOString());
  return (
    <div className="screen">
      <AppHeader subtitle={today} />
      <ScrollArea>
        {live && <ResumeCard game={live.game} events={live.events} onResume={onResume} />}

        <p className="eyebrow" style={{ margin: '18px 2px 12px' }}>New game</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {window.SPORTS.map((s) => <SportTile key={s.id} sport={s} onClick={() => onNewSport(s.id)} />)}
        </div>

        {recent.length > 0 && (
          <>
            <p className="eyebrow" style={{ margin: '22px 2px 12px' }}>Recent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.map((g) => <RecentCard key={g.id} game={g} onClick={() => onOpenGame(g)} />)}
            </div>
          </>
        )}
        <div style={{ height: 8 }} />
      </ScrollArea>
      <TabBar tab={tab} onTab={onTab} />
    </div>
  );
}

function SportTile({ sport, onClick }) {
  const tint = { rugby_union: '#ea493c', soccer: '#47b26c', gaelic_football: '#16245A', basketball: '#F25F1F' }[sport.id];
  return (
    <button className="pressable card-hover" onClick={onClick} style={{
      textAlign: 'left', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 18,
      padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: 999, background: window.rgba(tint, 0.1) }} />
      <div style={{ width: 46, height: 46, borderRadius: 13, background: window.rgba(tint, 0.14), display: 'grid', placeItems: 'center', color: tint, position: 'relative' }}>
        <window.SportMark sport={sport} size={26} glyphColor={tint} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 15, color: 'var(--txt)', letterSpacing: '-0.01em' }}>{sport.name}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--txt-3)', marginTop: 2 }}>{sport.blurb}</div>
      </div>
    </button>
  );
}

function ResumeCard({ game, events, onResume }) {
  const sport = window.getSport(game.sport);
  const hs = events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0);
  const as = events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0);
  const split = sport.scoreDisplay === 'split';
  return (
    <button className="pressable card-hover" onClick={onResume} style={{
      width: '100%', textAlign: 'left', border: '1px solid var(--line-2)', background: 'var(--surface)', borderRadius: 20,
      padding: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <window.Pill tone="live"><window.LiveDot size={6} /> Live · {sport.name}</window.Pill>
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, color: 'var(--txt-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Resume <window.IChevR size={15} /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[['home', game.home, hs], ['away', game.away, as]].map(([side, team, sc], i) => (
          <React.Fragment key={side}>
            {i === 1 && <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, color: 'var(--txt-3)', padding: '0 10px' }}>VS</span>}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, flexDirection: i === 1 ? 'row-reverse' : 'row', minWidth: 0 }}>
              <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={26} radius={8} />
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
              <span style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: 30, color: window.teamAccent(team), marginLeft: i === 1 ? 0 : 'auto', marginRight: i === 1 ? 'auto' : 0, fontVariantNumeric: 'tabular-nums' }}>{split ? window.gaelicSplit(events, side) : sc}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </button>
  );
}

function RecentCard({ game, onClick }) {
  const sport = window.getSport(game.sport);
  const homeWin = game.homeScore > game.awayScore;
  const Row = (team, score, win) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={20} radius={6} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontWeight: win ? 800 : 600, fontSize: 14, color: win ? 'var(--txt)' : 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: 21, color: win ? 'var(--txt)' : 'var(--txt-3)', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
    </div>
  );
  return (
    <button className="pressable card-hover" onClick={onClick} style={{
      width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 16,
      padding: '14px 16px', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <window.SportMark sport={sport} size={15} glyphColor="var(--txt-3)" />
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>{sport.name}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--txt-3)' }}>{window.relDay(game.started_at)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {Row(game.home, game.homeScore, homeWin)}
        {Row(game.away, game.awayScore, !homeWin)}
      </div>
    </button>
  );
}

// =========================================================================
// SETUP
// =========================================================================
function SetupScreen({ sportId, style, onBack, onStart }) {
  const sport = window.getSport(sportId);
  const [home, setHome] = React.useState(DEFAULT_HOME[sportId]);
  const [away, setAway] = React.useState({ name: 'Opponent', primary: '#1E63D6', secondary: '#FFFFFF' });
  const [picker, setPicker] = React.useState(null); // 'home' | 'away'
  const game = { sport: sportId, home, away };

  const TeamField = (label, team, set, which) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button className="pressable" onClick={() => setPicker(which)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, position: 'relative' }}>
        <window.TeamKitChip primary={team.primary} secondary={team.secondary} size={42} radius={12} />
        <span style={{ position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 999, background: 'var(--txt)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }}><window.IEdit size={11} /></span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 3 }}>{label}</div>
        <TextInput value={team.name} onChange={(v) => set({ ...team, name: v })} placeholder="Team name" />
      </div>
    </div>
  );

  return (
    <div className="screen">
      <SubHeader title={sport.name} eyebrow="New game" onBack={onBack} sport={sport} />
      <ScrollArea>
        <p className="eyebrow" style={{ margin: '4px 2px 10px' }}>Preview</p>
        <window.Scoreboard game={game} events={[]} style={style} />

        <p className="eyebrow" style={{ margin: '22px 2px 10px' }}>Teams</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TeamField('Home', home, setHome, 'home')}
          {TeamField('Away', away, setAway, 'away')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 2px 6px', color: 'var(--txt-3)' }}>
          <window.IClock size={15} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>{sport.periods.count} {sport.periods.name.toLowerCase()}s · tap a color chip to set each team's kit</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <window.Button full size="lg" onClick={() => onStart(game)}><window.IWhistle size={19} /> Start game</window.Button>
        </div>
      </ScrollArea>

      {picker && (
        <window.ColorKitPicker
          team={picker === 'home' ? home.name : away.name}
          value={picker === 'home' ? home : away}
          onChange={(v) => picker === 'home' ? setHome({ ...home, ...v }) : setAway({ ...away, ...v })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function SubHeader({ title, eyebrow, onBack, sport, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 12px' }}>
      <button className="pressable" onClick={onBack} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--txt)', cursor: 'pointer' }}>
        <window.IChevL size={18} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 1 }}>{eyebrow}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {sport && <window.SportMark sport={sport} size={18} glyphColor="var(--txt-2)" />}
          <h1 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18, color: 'var(--txt)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', flexShrink: 0 }}>{title}</h1>
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

Object.assign(window, { HomeScreen, SetupScreen, TabBar, AppHeader, ScrollArea, SubHeader, TextInput, RecentCard, DEFAULT_HOME });
