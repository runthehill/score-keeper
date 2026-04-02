import { useState, useEffect } from 'react';
import { useDB } from '../hooks/useDB';
import { listGames, listEvents, listPlayers } from '../db/queries';
import { exportGameJSON, downloadFile } from '../utils/export';
import { clearDB } from '../db/init';

const SETTINGS_KEY = 'score-keeper-settings';

interface AppSettings {
  defaultHomeTeam: string;
  defaultAwayTeam: string;
  darkMode: boolean;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AppSettings;
  } catch {}
  return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const { db } = useDB();
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleExportAll = () => {
    const games = listGames(db);
    const allData = games.map((game) => {
      const events = listEvents(db, game.id);
      const players = listPlayers(db, game.id);
      return exportGameJSON(game, events, players);
    });
    const json = JSON.stringify(allData, null, 2);
    downloadFile(json, 'score-keeper-all-data.json', 'application/json');
  };

  const handleClearAll = async () => {
    await clearDB();
    setShowClearConfirm(false);
    window.location.reload();
  };

  const inputClass =
    'w-full bg-surface-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Default Teams
        </h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Home Team</label>
          <input
            type="text"
            value={settings.defaultHomeTeam}
            onChange={(e) => setSettings((s) => ({ ...s, defaultHomeTeam: e.target.value }))}
            placeholder="e.g. St Mary's"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Away Team</label>
          <input
            type="text"
            value={settings.defaultAwayTeam}
            onChange={(e) => setSettings((s) => ({ ...s, defaultAwayTeam: e.target.value }))}
            placeholder="e.g. Blackrock"
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Data</h2>
        <button
          onClick={handleExportAll}
          className="w-full bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700"
        >
          Export All Data (JSON)
        </button>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full bg-surface-800 border border-red-900/50 rounded-xl py-3 text-sm font-semibold text-red-400 active:bg-surface-700"
        >
          Clear All Data
        </button>
      </section>

      <p className="text-xs text-gray-600 text-center pt-4">Score Keeper v1.0</p>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Clear All Data?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete all games, players, and events. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 bg-red-600 rounded-lg text-sm font-bold"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
