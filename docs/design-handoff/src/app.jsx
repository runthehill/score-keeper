/* =========================================================================
   app.jsx — root: state, navigation, timer, tweaks, device mount
   ========================================================================= */

const SCORE_FONTS = {
  saira: "'Saira Condensed', sans-serif",
  archivo: "'Archivo', sans-serif",
  oswald: "'Oswald', sans-serif",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": true,
  "board": "blocks",
  "scoreFont": "saira"
}/*EDITMODE-END*/;

// System-aware: default the theme to the OS color scheme.
const _prefersDark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
TWEAK_DEFAULTS.dark = _prefersDark;

let _eid = 0;
const newId = () => `e${++_eid}-${Date.now()}`;

function Root() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  window.__dark = t.dark; // theme-aware accents read this

  const [route, setRoute] = React.useState({ name: 'home' });
  const [tab, setTab] = React.useState('home');
  const [recent, setRecent] = React.useState(window.SEED_GAMES);

  // live game state
  const [live, setLive] = React.useState(null); // { game, events, period }
  const [seconds, setSeconds] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [summaryGame, setSummaryGame] = React.useState(null);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // ---- navigation / actions --------------------------------------------
  const goTab = (id) => { setTab(id); setRoute({ name: id === 'home' ? 'home' : id }); };

  const newSport = (id) => setRoute({ name: 'setup', sportId: id });

  const startGame = (game) => {
    setLive({ game, events: [], period: 1 });
    setSeconds(0); setRunning(false);
    setRoute({ name: 'live' });
  };

  const pushEvent = (team, type, points, label) => {
    setLive((L) => ({ ...L, events: [...L.events, { id: newId(), team, type, points, period: L.period, t: seconds, label }] }));
  };
  const undo = () => setLive((L) => (L && L.events.length ? { ...L, events: L.events.slice(0, -1) } : L));
  const advance = () => { setLive((L) => ({ ...L, period: L.period + 1 })); setSeconds(0); setRunning(false); };

  const endGame = () => {
    const g = live.game; const sport = window.getSport(g.sport);
    const hs = live.events.filter((e) => e.team === 'home').reduce((a, e) => a + e.points, 0);
    const as = live.events.filter((e) => e.team === 'away').reduce((a, e) => a + e.points, 0);
    const finished = {
      id: `g-${Date.now()}`, sport: g.sport, status: 'completed', home: g.home, away: g.away,
      homeScore: hs, awayScore: as, started_at: new Date().toISOString(),
      periodName: sport.periods.name, periodCount: sport.periods.count, events: live.events,
    };
    setRecent((r) => [finished, ...r]);
    setSummaryGame(finished);
    setLive(null); setRunning(false);
    setRoute({ name: 'summary', fromLive: true });
  };

  const openGame = (g) => { setSummaryGame(g); setRoute({ name: 'summary' }); };
  const goHome = () => { setTab('home'); setRoute({ name: 'home' }); };

  const timer = { seconds, running, toggle: () => setRunning((r) => !r) };

  // Live-follow the OS color scheme (until the user overrides in Tweaks/Settings)
  const userSetTheme = React.useRef(false);
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => { if (!userSetTheme.current) setTweak('dark', e.matches); };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange); };
  }, [setTweak]);
  const setDark = (v) => { userSetTheme.current = true; setTweak('dark', v); };

  // ---- screen router ----------------------------------------------------
  let screen;
  if (route.name === 'home') {
    screen = <window.HomeScreen live={live} recent={recent} onNewSport={newSport}
      onResume={() => setRoute({ name: 'live' })} onOpenGame={openGame} tab={tab} onTab={goTab} />;
  } else if (route.name === 'setup') {
    screen = <window.SetupScreen sportId={route.sportId} style={t.board} onBack={goHome} onStart={startGame} />;
  } else if (route.name === 'live' && live) {
    screen = <window.LiveScreen game={live.game} events={live.events} period={live.period} timer={timer} style={t.board}
      onScore={pushEvent} onUndo={undo} onAdvance={advance} onEnd={endGame} onHome={goHome}
      onCard={(s, type, label) => pushEvent(s, type, 0, label)} onStat={(s, type, label) => pushEvent(s, type, 0, label)} />;
  } else if (route.name === 'summary' && summaryGame) {
    screen = <window.SummaryScreen game={summaryGame} events={summaryGame.events} onHome={goHome} />;
  } else if (route.name === 'history') {
    screen = <window.HistoryScreen recent={recent} onOpenGame={openGame} tab="history" onTab={goTab} />;
  } else if (route.name === 'settings') {
    screen = <window.SettingsScreen tab="settings" onTab={goTab} dark={t.dark} onToggleDark={() => setDark(!t.dark)} />;
  } else {
    screen = <window.HomeScreen live={live} recent={recent} onNewSport={newSport} onResume={() => setRoute({ name: 'live' })} onOpenGame={openGame} tab={tab} onTab={goTab} />;
  }

  return (
    <div className="stage">
      <window.IOSDevice dark={t.dark}>
        <div className={`app theme-${t.dark ? 'dark' : 'light'}`} style={{ ['--font-score']: SCORE_FONTS[t.scoreFont] }}>
          {screen}
        </div>
      </window.IOSDevice>

      <window.TweaksPanel>
        <window.TweakSection label="Theme" />
        <window.TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setDark(v)} />
        <window.TweakSection label="Scoreboard" />
        <window.TweakRadio label="Style" value={t.board} options={['bars', 'blocks', 'minimal']} onChange={(v) => setTweak('board', v)} />
        <window.TweakSection label="Typography" />
        <window.TweakRadio label="Score numerals" value={t.scoreFont} options={['saira', 'archivo', 'oswald']} onChange={(v) => setTweak('scoreFont', v)} />
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
