import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DBProvider } from './hooks/DBProvider';
import { useDBReady } from './hooks/useDB';
import TabBar from './components/TabBar';
import Home from './screens/Home';
import GameSetup from './screens/GameSetup';
import LiveGame from './screens/LiveGame';
import GameSummary from './screens/GameSummary';
import History from './screens/History';
import Settings from './screens/Settings';
import PwaReloadPrompt from './components/PwaReloadPrompt';

function AppRoutes() {
  const ready = useDBReady();
  const location = useLocation();
  const hideTabBar = location.pathname.startsWith('/game/') || location.pathname.startsWith('/summary/');

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-txt-3">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-bg ${hideTabBar ? '' : 'pb-20'}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup/:sportId" element={<GameSetup />} />
        <Route path="/game/:gameId" element={<LiveGame />} />
        <Route path="/summary/:gameId" element={<GameSummary />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {!hideTabBar && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <DBProvider>
        <AppRoutes />
        <PwaReloadPrompt />
      </DBProvider>
    </HashRouter>
  );
}
