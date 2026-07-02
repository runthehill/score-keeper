import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Sport, SavedTeam, SavedTeamPlayer } from '../types';
import { SPORTS, getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { useThemeContext } from '../hooks/useTheme';
import { listGames, listEvents, listPlayers } from '../db/queries';

const APP_VERSION = __APP_VERSION__;
import { downloadFile } from '../utils/export';
import { clearDB } from '../db/init';
import { loadSettings, saveSettings, getSavedTeams, upsertSavedTeam, deleteSavedTeam } from '../utils/settings';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IosInstallSheet from '../components/IosInstallSheet';
import AppHeader from '../components/AppHeader';
import { squadKit } from '../sports/kits';
import ColorKitPicker from '../components/ColorKitPicker';
import TeamKitChip from '../components/TeamKitChip';
import PlayerRowsEditor, { type PlayerRowBase } from '../components/PlayerRowsEditor';
import { Edit } from '../components/icons';

const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2.5';
const INPUT = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="relative w-[46px] h-7 rounded-full shrink-0 transition-colors"
      style={{ background: on ? 'var(--txt)' : 'var(--line-2)' }}
    >
      <span className="absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all" style={{ left: on ? 21 : 3, background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

export default function Settings() {
  const { db } = useDB();
  const { dark, toggle } = useThemeContext();
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [managingSport, setManagingSport] = useState<Sport | null>(null);
  const [editing, setEditing] = useState<{ sport: Sport; team: SavedTeam } | null>(null);
  const [showKitPicker, setShowKitPicker] = useState(false);
  const { mode: installMode, promptInstall } = useInstallPrompt();
  const [showIosInstall, setShowIosInstall] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const newTeam = (): SavedTeam => ({ id: uuid(), teamName: '', players: [], primary: undefined, secondary: undefined });

  const openEditor = (sport: Sport, team: SavedTeam) => {
    setEditing({ sport, team });
    setShowKitPicker(false);
  };

  const patchEditing = (patch: Partial<SavedTeam>) =>
    setEditing((e) => (e ? { ...e, team: { ...e.team, ...patch } } : e));

  // Note: persistence is handled by the useEffect([settings]) above — keep these
  // updaters pure (no saveSettings side effect inside setSettings, which can run
  // twice under StrictMode).
  const saveEditing = () => {
    if (!editing || !editing.team.teamName.trim()) return;
    const team: SavedTeam = { ...editing.team, teamName: editing.team.teamName.trim() };
    setSettings((s) => upsertSavedTeam(s, editing.sport, team));
    setEditing(null);
  };

  const removeTeam = (sport: Sport, teamId: string) => {
    setSettings((s) => deleteSavedTeam(s, sport, teamId));
  };

  const setPeriodLength = (sportId: Sport, value: string) => {
    const n = Math.floor(Number(value) || 0);
    setSettings((s) => {
      const periodLengths = { ...(s.periodLengths ?? {}) };
      if (n > 0) periodLengths[sportId] = n;
      else delete periodLengths[sportId];
      return { ...s, periodLengths };
    });
  };

  const handleExportAll = () => {
    const games = listGames(db);
    const allData = games.map((game) => ({
      game,
      players: listPlayers(db, game.id),
      events: listEvents(db, game.id),
    }));
    downloadFile(JSON.stringify(allData, null, 2), 'score-keeper-all-data.json', 'application/json');
  };

  const handleClearAll = async () => {
    await clearDB();
    setShowClearConfirm(false);
    window.location.reload();
  };

  const handleShareApp = async () => {
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
  };

  const cardBtn = 'w-full bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press';

  return (
    <div className="p-4 space-y-6">
      <AppHeader subtitle="Preferences" />

      {/* Appearance */}
      <section>
        <h2 className={EYEBROW}>Appearance</h2>
        <div className="bg-surface border border-line rounded-2xl flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold text-txt">Dark mode</span>
          <Toggle on={dark} onClick={toggle} label="Dark mode" />
        </div>
      </section>

      {/* Saved teams */}
      <section>
        <h2 className={EYEBROW}>Saved teams</h2>
        <p className="text-xs text-txt-3 mb-2.5">Save any team — name, colours, and optional players. Load them in one tap when starting a game.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => {
            const teams = getSavedTeams(settings, sport.id);
            return (
              <button key={sport.id} type="button" onClick={() => setManagingSport(sport.id)} className="w-full bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between press">
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-txt">{sport.name}</p>
                    <p className="text-xs text-txt-3">{teams.length > 0 ? `${teams.length} saved team${teams.length === 1 ? '' : 's'}` : 'No teams yet'}</p>
                  </div>
                </div>
                <span className="text-txt-3 text-sm">Manage</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Default period lengths */}
      <section>
        <h2 className={EYEBROW}>Match length defaults</h2>
        <p className="text-xs text-txt-3 mb-2.5">Default minutes per half/period for each sport. Pre-fills new games; leave blank for a free-running clock.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => (
            <div key={sport.id} className="w-full bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                <p className="text-sm font-semibold text-txt">{sport.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`${sport.name} default length in minutes`}
                  value={settings.periodLengths?.[sport.id] ?? ''}
                  onChange={(e) => setPeriodLength(sport.id, e.target.value)}
                  placeholder="—"
                  className="w-16 bg-surface-2 border border-line rounded-xl px-2 py-2 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
                />
                <span className="text-xs text-txt-3">min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className={EYEBROW}>Data</h2>
        <div className="space-y-2">
          <button type="button" onClick={handleExportAll} className={cardBtn}>Export all data (JSON)</button>
          <button type="button" onClick={() => setShowClearConfirm(true)} className="w-full bg-surface-2 rounded-xl py-3 text-sm font-semibold text-danger press" style={{ boxShadow: 'inset 0 0 0 1px var(--line-2)' }}>Clear all data</button>
        </div>
      </section>

      {/* Share */}
      <section>
        <h2 className={EYEBROW}>Share</h2>
        <button type="button" onClick={handleShareApp} className={cardBtn}>{shareMessage || 'Share this app'}</button>
      </section>

      {/* Install */}
      {installMode !== 'hidden' && (
        <section>
          <h2 className={EYEBROW}>Install</h2>
          <button type="button" onClick={() => { if (installMode === 'ios') setShowIosInstall(true); else void promptInstall().catch(() => {}); }} className={cardBtn}>
            {installMode === 'ios' ? 'Add to home screen' : 'Install app'}
          </button>
        </section>
      )}

      {showIosInstall && <IosInstallSheet onClose={() => setShowIosInstall(false)} />}

      <div className="text-center pt-4 space-y-1">
        <p className="text-xs text-txt-3">Jonathan's Score Keeper v{APP_VERSION}</p>
        <a href="https://github.com/runthehill/score-keeper" target="_blank" rel="noopener noreferrer" className="text-xs text-txt-2 underline">GitHub</a>
      </div>

      {/* Per-sport saved-team list */}
      {managingSport && !editing && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setManagingSport(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-txt flex items-center gap-2 mb-4">
              <span aria-hidden="true">{getSportConfig(managingSport).icon}</span> {getSportConfig(managingSport).name} teams
            </h3>
            <div className="space-y-2">
              {getSavedTeams(settings, managingSport).map((t) => {
                const kit = squadKit(t, managingSport);
                return (
                  <div key={t.id} className="flex items-center gap-2 bg-surface-2 border border-line rounded-xl px-3 py-2.5">
                    <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={18} radius={5} />
                    <button type="button" onClick={() => openEditor(managingSport, t)} className="flex-1 min-w-0 text-left press">
                      <p className="text-sm font-semibold text-txt truncate">{t.teamName}</p>
                      <p className="text-xs text-txt-3">{t.players.length > 0 ? `${t.players.length} player${t.players.length === 1 ? '' : 's'}` : 'Name & colours'}</p>
                    </button>
                    <button type="button" onClick={() => removeTeam(managingSport, t.id)} className="shrink-0 text-xs text-danger px-2 py-1" aria-label={`Delete ${t.teamName}`}>Delete</button>
                  </div>
                );
              })}
              {getSavedTeams(settings, managingSport).length === 0 && (
                <p className="text-xs text-txt-3 text-center py-2">No teams saved yet</p>
              )}
            </div>
            <button type="button" onClick={() => openEditor(managingSport, newTeam())} className="w-full mt-3 py-3 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-txt-2 press">+ New team</button>
            <button type="button" onClick={() => setManagingSport(null)} className="w-full mt-2 py-3 text-center text-sm text-txt-3">Done</button>
          </div>
        </div>
      )}

      {/* Team editor */}
      {editing && (
        <>
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-txt flex items-center gap-2 mb-4">
              <span aria-hidden="true">{getSportConfig(editing.sport).icon}</span> {getSportConfig(editing.sport).name} team
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-txt-3 mb-1 block">Kit colours</label>
                <button type="button" onClick={() => setShowKitPicker(true)} aria-label="Choose team kit" className="relative inline-block press">
                  <TeamKitChip primary={squadKit(editing.team, editing.sport).primary} secondary={squadKit(editing.team, editing.sport).secondary} size={42} radius={12} />
                  <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
                    <Edit size={11} />
                  </span>
                </button>
              </div>

              <div>
                <label htmlFor="team-name" className="text-xs text-txt-3 mb-1 block">Team name</label>
                <input id="team-name" aria-label="Team name" type="text" value={editing.team.teamName} onChange={(e) => patchEditing({ teamName: e.target.value })} placeholder="e.g. Coolera U12s" className={INPUT} />
              </div>

              <div>
                <label className="text-xs text-txt-3 mb-1 block">Players</label>
                <PlayerRowsEditor
                  players={editing.team.players as PlayerRowBase[]}
                  onChange={(rows) => patchEditing({ players: rows as SavedTeamPlayer[] })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button type="button" onClick={saveEditing} disabled={!editing.team.teamName.trim()} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-40 press">Save team</button>
            </div>
          </div>
        </div>
        {showKitPicker && (
          <ColorKitPicker
            team={editing.team.teamName || getSportConfig(editing.sport).name}
            value={squadKit(editing.team, editing.sport)}
            onChange={(kit) => patchEditing({ primary: kit.primary, secondary: kit.secondary })}
            onClose={() => setShowKitPicker(false)}
          />
        )}
        </>
      )}

      {/* Clear data confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">Clear all data?</h3>
            <p className="text-sm text-txt-3 mb-4">This will permanently delete all games, players, and events. This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button type="button" onClick={handleClearAll} className="flex-1 py-3 rounded-xl text-sm font-bold text-white press" style={{ background: 'var(--danger)' }}>Delete everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
