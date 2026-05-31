import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Sport, Player, Team, GameMetadata, PeriodConfig, Game } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';
import { loadSettings } from '../utils/settings';
import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT, squadKit } from '../sports/kits';
import Scoreboard from '../components/Scoreboard';
import TeamKitChip from '../components/TeamKitChip';
import ColorKitPicker from '../components/ColorKitPicker';
import { ChevronLeft, Whistle, Edit } from '../components/icons';

interface DraftPlayer {
  name: string;
  number: string;
  status: 'active' | 'bench';
}

export default function GameSetup() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const sport = getSportConfig(sportId as Sport);
  const appSettings = loadSettings();
  const defaultSquad = appSettings.squads[sport.id];

  const [homeTeam, setHomeTeam] = useState(appSettings.defaultHomeTeam || '');
  const [awayTeam, setAwayTeam] = useState(appSettings.defaultAwayTeam || '');
  const [homeKit, setHomeKit] = useState(DEFAULT_HOME_KITS[sport.id]);
  const [awayKit, setAwayKit] = useState(DEFAULT_AWAY_KIT);
  const [picker, setPicker] = useState<Team | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<DraftPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<DraftPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [addingFor, setAddingFor] = useState<Team>('home');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodConfig>(sport.periods);

  const loadSquad = (team: Team) => {
    if (!defaultSquad) return;
    const kit = squadKit(defaultSquad, sport.id);
    if (team === 'home') {
      setHomeTeam(defaultSquad.teamName);
      setHomePlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
      setHomeKit(kit);
    } else {
      setAwayTeam(defaultSquad.teamName);
      setAwayPlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
      setAwayKit(kit);
    }
    setShowPlayers(true);
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: DraftPlayer = { name: newPlayerName.trim(), number: newPlayerNumber, status: 'active' };
    if (addingFor === 'home') setHomePlayers((p) => [...p, player]);
    else setAwayPlayers((p) => [...p, player]);
    setNewPlayerName('');
    setNewPlayerNumber('');
  };

  const removePlayer = (team: Team, index: number) => {
    if (team === 'home') setHomePlayers((p) => p.filter((_, i) => i !== index));
    else setAwayPlayers((p) => p.filter((_, i) => i !== index));
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    const gameId = uuid();
    const metadata: GameMetadata = { periodCount: selectedPeriod.count, periodName: selectedPeriod.name };
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

    const savePlayers = (drafts: DraftPlayer[], team: Team) => {
      drafts.forEach((d) => {
        const player: Player = {
          id: uuid(),
          game_id: gameId,
          team,
          name: d.name,
          number: d.number ? parseInt(d.number, 10) : null,
          status: d.status,
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
    home_team: homeTeam.trim() || sport.defaultTeamName,
    away_team: awayTeam.trim() || 'Opponent',
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
  const inputClass = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

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
              placeholder={which === 'home' ? sport.defaultTeamName : 'Opponent'}
              className="min-w-0 flex-1 bg-transparent text-txt font-bold text-[15.5px] placeholder-txt-3 focus:outline-none -tracking-[0.01em]"
            />
            {defaultSquad && (
              <button
                type="button"
                onClick={() => loadSquad(which)}
                className="shrink-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 press"
              >
                {defaultSquad.teamName}
              </button>
            )}
          </div>
        </div>
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

      {/* Players (optional) */}
      {!showPlayers ? (
        <button type="button" onClick={() => setShowPlayers(true)} className="text-sm text-txt-3 underline">
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddingFor('home')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold press ${addingFor === 'home' ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
            >
              {homeTeam || 'Home'}
            </button>
            <button
              type="button"
              onClick={() => setAddingFor('away')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold press ${addingFor === 'away' ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
            >
              {awayTeam || 'Away'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name"
              className={`${inputClass} min-w-0 flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <input
              type="number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="#"
              className="w-16 shrink-0 bg-surface-2 border border-line rounded-xl px-2 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button type="button" onClick={addPlayer} className="shrink-0 bg-txt text-bg rounded-xl px-4 font-semibold press">
              Add
            </button>
          </div>

          {[
            { team: 'home' as Team, players: homePlayers, label: homeTeam || 'Home' },
            { team: 'away' as Team, players: awayPlayers, label: awayTeam || 'Away' },
          ].map(({ team, players, label }) =>
            players.length > 0 ? (
              <div key={team}>
                <p className={`${eyebrow} mb-2`}>{label}</p>
                <div className="space-y-1">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-2">
                      <span className="text-sm text-txt">
                        {p.number && <span className="text-txt-3 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button type="button" onClick={() => removePlayer(team, i)} className="text-txt-3 text-xs" aria-label={`Remove ${p.name}`}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
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
          team={picker === 'home' ? (homeTeam.trim() || sport.defaultTeamName) : (awayTeam.trim() || 'Opponent')}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
