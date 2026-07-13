import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Sport, Player, Team, GameMetadata, PeriodConfig, Game, SavedTeam } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';
import { loadSettings, saveSettings, getSavedTeams, upsertSavedTeam } from '../utils/settings';
import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT, squadKit } from '../sports/kits';
import Scoreboard from '../components/Scoreboard';
import TeamKitChip from '../components/TeamKitChip';
import ColorKitPicker from '../components/ColorKitPicker';
import PlayerRowsEditor, { type PlayerRowBase } from '../components/PlayerRowsEditor';
import SavedTeamPicker from '../components/SavedTeamPicker';
import { ChevronLeft, Whistle, Edit, Star } from '../components/icons';

export default function GameSetup() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const sport = getSportConfig(sportId as Sport);
  const [settings, setSettings] = useState(loadSettings);
  const savedTeams = getSavedTeams(settings, sport.id);
  const defaultLength = settings.periodLengths?.[sport.id];

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeKit, setHomeKit] = useState(DEFAULT_HOME_KITS[sport.id]);
  const [awayKit, setAwayKit] = useState(DEFAULT_AWAY_KIT);
  const [picker, setPicker] = useState<Team | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<PlayerRowBase[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerRowBase[]>([]);
  const [teamPicker, setTeamPicker] = useState<Team | null>(null);
  const [savedMsg, setSavedMsg] = useState<Team | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodConfig>(sport.periods);
  const [periodLength, setPeriodLength] = useState(defaultLength ? String(defaultLength) : '');

  const applyTeam = (team: Team, saved: SavedTeam) => {
    const kit = squadKit(saved, sport.id);
    const rows: PlayerRowBase[] = saved.players.map((p) => ({ name: p.name, number: p.number }));
    if (team === 'home') { setHomeTeam(saved.teamName); setHomePlayers(rows); setHomeKit(kit); }
    else { setAwayTeam(saved.teamName); setAwayPlayers(rows); setAwayKit(kit); }
    setShowPlayers(true);
  };

  const saveTeam = (team: Team) => {
    const name = (team === 'home' ? homeTeam : awayTeam).trim();
    if (!name) return;
    const kit = team === 'home' ? homeKit : awayKit;
    const rows = team === 'home' ? homePlayers : awayPlayers;
    const existing = savedTeams.find((t) => t.teamName.toLowerCase() === name.toLowerCase());
    const saved: SavedTeam = {
      id: existing?.id ?? uuid(),
      teamName: name,
      players: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), number: r.number })),
      primary: kit.primary,
      secondary: kit.secondary,
    };
    const next = upsertSavedTeam(settings, sport.id, saved);
    setSettings(next);
    saveSettings(next);
    setSavedMsg(team);
    setTimeout(() => setSavedMsg((t) => (t === team ? null : t)), 1600);
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    const gameId = uuid();
    const lengthNum = Math.floor(Number(periodLength) || 0);
    const metadata: GameMetadata = {
      periodCount: selectedPeriod.count,
      periodName: selectedPeriod.name,
      ...(lengthNum > 0 ? { periodLengthMinutes: lengthNum } : {}),
    };
    insertGame(db, {
      id: gameId,
      sport: sport.id,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      started_at: new Date().toISOString(),
      notes: JSON.stringify(metadata),
      home_primary: homeKit.primary,
      home_secondary: homeKit.secondary,
      away_primary: awayKit.primary,
      away_secondary: awayKit.secondary,
    });

    const savePlayers = (rows: PlayerRowBase[], team: Team) => {
      rows.filter((r) => r.name.trim()).forEach((r, i) => {
        const player: Player = {
          id: uuid(),
          game_id: gameId,
          team,
          name: r.name.trim(),
          number: r.number ? parseInt(r.number, 10) : null,
          status: 'active',
          sort_order: i,
        };
        insertPlayer(db, player);
      });
    };
    savePlayers(homePlayers, 'home');
    savePlayers(awayPlayers, 'away');
    persist();
    navigate(`/game/${gameId}`, { replace: true });
  };

  const previewGame: Game = {
    id: 'preview',
    sport: sport.id,
    home_team: homeTeam.trim() || 'Home',
    away_team: awayTeam.trim() || 'Away',
    home_score: 0,
    away_score: 0,
    status: 'in_progress',
    started_at: '',
    ended_at: null,
    notes: '',
    home_primary: homeKit.primary,
    home_secondary: homeKit.secondary,
    away_primary: awayKit.primary,
    away_secondary: awayKit.secondary,
  };

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3';

  const teamField = (label: string, which: Team) => {
    const name = which === 'home' ? homeTeam : awayTeam;
    const setName = which === 'home' ? setHomeTeam : setAwayTeam;
    const kit = which === 'home' ? homeKit : awayKit;
    return (
      <div className="bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3">
        <button type="button" onClick={() => setPicker(which)} className="relative shrink-0 press" aria-label={`Choose ${label.toLowerCase()} kit`}>
          <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={42} radius={12} />
          <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
            <Edit size={11} />
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <div className={`${eyebrow} mb-1`}>{label}</div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={which === 'home' ? 'Home team name' : 'Away team name'}
              className="min-w-0 flex-1 bg-transparent text-txt font-bold text-[15.5px] placeholder-txt-3 focus:outline-none -tracking-[0.01em]"
            />
            {savedTeams.length > 0 && (
              <button
                type="button"
                onClick={() => setTeamPicker(which)}
                className="shrink-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 press"
              >
                Use saved ▾
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const playerBlock = (which: Team) => {
    const label = which === 'home' ? (homeTeam || 'Home') : (awayTeam || 'Away');
    const rows = which === 'home' ? homePlayers : awayPlayers;
    const setRows = which === 'home' ? setHomePlayers : setAwayPlayers;
    const name = which === 'home' ? homeTeam : awayTeam;
    return (
      <div key={which}>
        <div className="flex items-center justify-between mb-2">
          <p className={eyebrow}>{label} players</p>
          <button
            type="button"
            onClick={() => saveTeam(which)}
            disabled={!name.trim()}
            className="shrink-0 flex items-center gap-1 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 disabled:opacity-40 press"
          >
            <Star size={12} /> {savedMsg === which ? 'Saved ✓' : 'Save team'}
          </button>
        </div>
        <PlayerRowsEditor players={rows} onChange={setRows} />
      </div>
    );
  };

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className={eyebrow}>New game</div>
          <h1 className="text-xl font-extrabold text-txt -tracking-[0.02em] truncate">{sport.name}</h1>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className={`${eyebrow} mb-2`}>Preview</p>
        <Scoreboard game={previewGame} events={[]} />
      </div>

      {/* Teams */}
      <div className="space-y-2.5">
        <p className={eyebrow}>Teams</p>
        {teamField('Home', 'home')}
        {teamField('Away', 'away')}
      </div>

      {/* Period selector */}
      {sport.periodOptions && sport.periodOptions.length > 1 && (
        <div>
          <p className={`${eyebrow} mb-2`}>Game format</p>
          <div className="flex gap-2">
            {sport.periodOptions.map((opt) => {
              const active = selectedPeriod.count === opt.count && selectedPeriod.name === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setSelectedPeriod(opt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold press ${active ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
                >
                  {opt.count} {opt.name}s
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Period length (optional) */}
      <div>
        <p className={`${eyebrow} mb-2`}>{selectedPeriod.name} length</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={periodLength}
            onChange={(e) => setPeriodLength(e.target.value)}
            placeholder="Optional"
            className="w-28 bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
          />
          <span className="text-sm text-txt-3">minutes — leave blank for a free-running clock</span>
        </div>
      </div>

      {/* Players (optional) */}
      {!showPlayers ? (
        <button type="button" onClick={() => setShowPlayers(true)} className="text-sm text-txt-3 underline">
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-5">
          {playerBlock('home')}
          {playerBlock('away')}
        </div>
      )}

      {/* Start */}
      <button
        type="button"
        onClick={startGame}
        disabled={!homeTeam.trim() || !awayTeam.trim()}
        className="w-full flex items-center justify-center gap-2 bg-txt text-bg rounded-xl py-4 font-bold text-lg disabled:opacity-40 press"
      >
        <Whistle size={19} /> Start Game
      </button>

      {/* Kit picker */}
      {picker && (
        <ColorKitPicker
          team={picker === 'home' ? (homeTeam.trim() || 'Home') : (awayTeam.trim() || 'Away')}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Saved team picker */}
      {teamPicker && (
        <SavedTeamPicker
          teams={savedTeams}
          sportId={sport.id}
          onSelect={(t) => { applyTeam(teamPicker, t); setTeamPicker(null); }}
          onClose={() => setTeamPicker(null)}
        />
      )}
    </div>
  );
}
