import { useState, useEffect } from 'react';
import type { Sport, DefaultSquadPlayer } from '../types';
import { SPORTS, getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames, listEvents, listPlayers } from '../db/queries';

const APP_VERSION = __APP_VERSION__;
import { downloadFile } from '../utils/export';
import { clearDB } from '../db/init';

export const SETTINGS_KEY = 'score-keeper-settings';

export interface AppSettings {
  defaultHomeTeam: string;
  defaultAwayTeam: string;
  darkMode: boolean;
  squads: Partial<Record<Sport, { teamName: string; players: DefaultSquadPlayer[] }>>;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true, squads: {}, ...parsed };
    }
  } catch {}
  return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true, squads: {} };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const { db } = useDB();
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [squadName, setSquadName] = useState('');
  const [squadPlayers, setSquadPlayers] = useState<DefaultSquadPlayer[]>([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const openSquadEditor = (sportId: Sport) => {
    const squad = settings.squads[sportId];
    const sportConfig = getSportConfig(sportId);
    setEditingSport(sportId);
    setSquadName(squad?.teamName ?? sportConfig.defaultTeamName);
    setSquadPlayers(squad?.players ? [...squad.players] : []);
    setNewName('');
    setNewNumber('');
  };

  const addSquadPlayer = () => {
    if (!newName.trim()) return;
    setSquadPlayers((p) => [...p, { name: newName.trim(), number: newNumber }]);
    setNewName('');
    setNewNumber('');
  };

  const removeSquadPlayer = (index: number) => {
    setSquadPlayers((p) => p.filter((_, i) => i !== index));
  };

  const saveSquad = () => {
    if (!editingSport) return;
    setSettings((s) => ({
      ...s,
      squads: {
        ...s.squads,
        [editingSport]: { teamName: squadName.trim(), players: squadPlayers },
      },
    }));
    setEditingSport(null);
  };

  const deleteSquad = () => {
    if (!editingSport) return;
    setSettings((s) => {
      const squads = { ...s.squads };
      delete squads[editingSport];
      return { ...s, squads };
    });
    setEditingSport(null);
  };

  const handleExportAll = () => {
    const games = listGames(db);
    const allData = games.map((game) => {
      const events = listEvents(db, game.id);
      const players = listPlayers(db, game.id);
      return { game, players, events };
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

      {/* Default squads per sport */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Default Squads
        </h2>
        <p className="text-xs text-gray-500">Set up your team and squad for each sport. Load them quickly when starting a game.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => {
            const squad = settings.squads[sport.id];
            return (
              <button
                key={sport.id}
                onClick={() => openSquadEditor(sport.id)}
                className="w-full bg-surface-800 rounded-xl px-4 py-3 flex items-center justify-between active:bg-surface-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sport.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{sport.name}</p>
                    {squad ? (
                      <p className="text-xs text-gray-400">{squad.teamName} — {squad.players.length} players</p>
                    ) : (
                      <p className="text-xs text-gray-500">No squad set</p>
                    )}
                  </div>
                </div>
                <span className="text-gray-500 text-sm">{squad ? 'Edit' : '+'}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Legacy default team names */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Default Team Names
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Share</h2>
        <button
          onClick={async () => {
            const url = 'https://runthehill.github.io/score-keeper/';
            const shareData = { title: "Jonathan's Score Keeper", text: 'Keep score at kids sports games — works offline!', url };
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(url);
                setShareMessage('Link copied!');
                setTimeout(() => setShareMessage(''), 2000);
              }
            } catch (e) {
              if ((e as Error).name !== 'AbortError') {
                await navigator.clipboard.writeText(url);
                setShareMessage('Link copied!');
                setTimeout(() => setShareMessage(''), 2000);
              }
            }
          }}
          className="w-full bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700"
        >
          {shareMessage || 'Share this app'}
        </button>
      </section>

      <div className="text-center pt-4 space-y-1">
        <p className="text-xs text-gray-600">Jonathan's Score Keeper v{APP_VERSION}</p>
        <a
          href="https://github.com/runthehill/score-keeper"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent underline"
        >
          github.com/runthehill/score-keeper
        </a>
      </div>

      {/* Squad editor modal */}
      {editingSport && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setEditingSport(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-surface-800 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {SPORTS.find((s) => s.id === editingSport)?.icon}{' '}
                {SPORTS.find((s) => s.id === editingSport)?.name} Squad
              </h3>
              {settings.squads[editingSport] && (
                <button onClick={deleteSquad} className="text-xs text-red-400">Clear</button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Team Name</label>
                <input
                  type="text"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  placeholder="e.g. St Mary's U14"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Players</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Player name"
                    className="min-w-0 flex-1 bg-surface-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()}
                  />
                  <input
                    type="number"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="#"
                    className="w-16 shrink-0 bg-surface-700 rounded-lg px-2 py-3 text-white text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()}
                  />
                  <button onClick={addSquadPlayer} className="shrink-0 bg-accent rounded-lg px-4 font-semibold">
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {squadPlayers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-700 rounded-lg px-3 py-2">
                      <span className="text-sm">
                        {p.number && <span className="text-gray-400 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button onClick={() => removeSquadPlayer(i)} className="text-gray-500 text-xs">
                        ✕
                      </button>
                    </div>
                  ))}
                  {squadPlayers.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No players added yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingSport(null)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveSquad}
                disabled={!squadName.trim()}
                className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold disabled:opacity-40"
              >
                Save Squad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear data confirmation */}
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
