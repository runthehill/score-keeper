import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Sport, Player, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';

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

  const [homeTeam, setHomeTeam] = useState(() => {
    try {
      const s = localStorage.getItem('score-keeper-settings');
      return s ? JSON.parse(s).defaultHomeTeam || '' : '';
    } catch { return ''; }
  });
  const [awayTeam, setAwayTeam] = useState(() => {
    try {
      const s = localStorage.getItem('score-keeper-settings');
      return s ? JSON.parse(s).defaultAwayTeam || '' : '';
    } catch { return ''; }
  });
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<DraftPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<DraftPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [addingFor, setAddingFor] = useState<Team>('home');

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: DraftPlayer = {
      name: newPlayerName.trim(),
      number: newPlayerNumber,
      status: 'active',
    };
    if (addingFor === 'home') {
      setHomePlayers((p) => [...p, player]);
    } else {
      setAwayPlayers((p) => [...p, player]);
    }
    setNewPlayerName('');
    setNewPlayerNumber('');
  };

  const removePlayer = (team: Team, index: number) => {
    if (team === 'home') {
      setHomePlayers((p) => p.filter((_, i) => i !== index));
    } else {
      setAwayPlayers((p) => p.filter((_, i) => i !== index));
    }
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;

    const gameId = uuid();
    insertGame(db, {
      id: gameId,
      sport: sport.id,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      started_at: new Date().toISOString(),
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

  const inputClass =
    'w-full bg-surface-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{sport.icon}</span>
        <h1 className="text-xl font-bold">{sport.name}</h1>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-home uppercase tracking-wider font-semibold mb-1 block">
            Home Team
          </label>
          <input
            type="text"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder="Home team name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-away uppercase tracking-wider font-semibold mb-1 block">
            Away Team
          </label>
          <input
            type="text"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder="Away team name"
            className={inputClass}
          />
        </div>
      </div>

      {!showPlayers ? (
        <button
          onClick={() => setShowPlayers(true)}
          className="text-sm text-gray-400 underline"
        >
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAddingFor('home')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                addingFor === 'home' ? 'bg-home-dark text-home border border-home' : 'bg-surface-700 text-gray-400'
              }`}
            >
              {homeTeam || 'Home'}
            </button>
            <button
              onClick={() => setAddingFor('away')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                addingFor === 'away' ? 'bg-away-dark text-away border border-away' : 'bg-surface-700 text-gray-400'
              }`}
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
              className={`${inputClass} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <input
              type="number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="#"
              className={`${inputClass} w-16 text-center`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button onClick={addPlayer} className="bg-accent rounded-lg px-4 font-semibold">
              Add
            </button>
          </div>

          {[
            { team: 'home' as Team, players: homePlayers, label: homeTeam || 'Home' },
            { team: 'away' as Team, players: awayPlayers, label: awayTeam || 'Away' },
          ].map(({ team, players, label }) =>
            players.length > 0 ? (
              <div key={team}>
                <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${team === 'home' ? 'text-home' : 'text-away'}`}>
                  {label}
                </p>
                <div className="space-y-1">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-700 rounded-lg px-3 py-2">
                      <span className="text-sm">
                        {p.number && <span className="text-gray-400 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button onClick={() => removePlayer(team, i)} className="text-gray-500 text-xs">
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

      <button
        onClick={startGame}
        disabled={!homeTeam.trim() || !awayTeam.trim()}
        className="w-full bg-accent rounded-xl py-4 font-bold text-lg disabled:opacity-40 active:opacity-80 transition-opacity"
      >
        Start Game
      </button>
    </div>
  );
}
