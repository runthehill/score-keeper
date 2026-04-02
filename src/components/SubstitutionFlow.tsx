import { useState } from 'react';
import type { Player, Team } from '../types';

interface Props {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  onSubstitute: (team: Team, offPlayerId: string, onPlayerId: string) => void;
  onClose: () => void;
}

type Step = 'pick_team' | 'pick_off' | 'pick_on';

export default function SubstitutionFlow({
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  onSubstitute,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('pick_team');
  const [team, setTeam] = useState<Team>('home');
  const [offPlayerId, setOffPlayerId] = useState<string>('');

  const players = team === 'home' ? homePlayers : awayPlayers;
  const activePlayers = players.filter((p) => p.status === 'active');
  const benchPlayers = players.filter((p) => p.status === 'bench');

  const handlePickTeam = (t: Team) => {
    setTeam(t);
    setStep('pick_off');
  };

  const handlePickOff = (playerId: string) => {
    setOffPlayerId(playerId);
    setStep('pick_on');
  };

  const handlePickOn = (playerId: string) => {
    onSubstitute(team, offPlayerId, playerId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface-800 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'pick_team' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Which team?</p>
            <div className="space-y-2">
              <button
                onClick={() => handlePickTeam('home')}
                className="w-full bg-home-dark border border-home rounded-lg py-3 font-semibold text-home active:opacity-80"
              >
                {homeTeamName}
              </button>
              <button
                onClick={() => handlePickTeam('away')}
                className="w-full bg-away-dark border border-away rounded-lg py-3 font-semibold text-away active:opacity-80"
              >
                {awayTeamName}
              </button>
            </div>
          </>
        )}

        {step === 'pick_off' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Player coming OFF</p>
            <div className="space-y-2">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickOff(p.id)}
                  className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
                >
                  {p.number != null && <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'pick_on' && (
          <>
            <p className="text-sm font-semibold text-gray-400 mb-3">Player coming ON</p>
            <div className="space-y-2">
              {benchPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickOn(p.id)}
                  className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
                >
                  {p.number != null && <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
              {benchPlayers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No players on bench</p>
              )}
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
}
