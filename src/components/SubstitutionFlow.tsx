import { useState } from 'react';
import type { Player, Team } from '../types';
import TeamKitChip from './TeamKitChip';

interface Props {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName: string;
  awayTeamName: string;
  homePrimary: string;
  homeSecondary: string;
  awayPrimary: string;
  awaySecondary: string;
  onSubstitute: (team: Team, offPlayerId: string, onPlayerId: string) => void;
  onClose: () => void;
}

type Step = 'pick_team' | 'pick_off' | 'pick_on';

const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3';

export default function SubstitutionFlow({
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  homePrimary,
  homeSecondary,
  awayPrimary,
  awaySecondary,
  onSubstitute,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('pick_team');
  const [team, setTeam] = useState<Team>('home');
  const [offPlayerId, setOffPlayerId] = useState<string>('');

  const players = team === 'home' ? homePlayers : awayPlayers;
  const activePlayers = players.filter((p) => p.status === 'active');
  const benchPlayers = players.filter((p) => p.status === 'bench');

  const handlePickTeam = (t: Team) => { setTeam(t); setStep('pick_off'); };
  const handlePickOff = (playerId: string) => { setOffPlayerId(playerId); setStep('pick_on'); };
  const handlePickOn = (playerId: string) => { onSubstitute(team, offPlayerId, playerId); onClose(); };

  const teamButton = (t: Team) => {
    const isHome = t === 'home';
    return (
      <button
        type="button"
        onClick={() => handlePickTeam(t)}
        className="w-full flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl py-3 px-3 font-semibold text-txt press"
      >
        <TeamKitChip
          primary={isHome ? homePrimary : awayPrimary}
          secondary={isHome ? homeSecondary : awaySecondary}
          size={20}
          radius={6}
        />
        {isHome ? homeTeamName : awayTeamName}
      </button>
    );
  };

  const playerButton = (p: Player, onPick: (id: string) => void) => (
    <button
      key={p.id}
      type="button"
      onClick={() => onPick(p.id)}
      className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-left flex items-center gap-3 press"
    >
      {p.number != null && <span className="text-sm text-txt-3 font-mono w-8">#{p.number}</span>}
      <span className="font-medium text-txt">{p.name}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'pick_team' && (
          <>
            <p className={EYEBROW}>Which team?</p>
            <div className="space-y-2">
              {teamButton('home')}
              {teamButton('away')}
            </div>
          </>
        )}

        {step === 'pick_off' && (
          <>
            <p className={EYEBROW}>Player coming off</p>
            <div className="space-y-2">{activePlayers.map((p) => playerButton(p, handlePickOff))}</div>
          </>
        )}

        {step === 'pick_on' && (
          <>
            <p className={EYEBROW}>Player coming on</p>
            <div className="space-y-2">
              {benchPlayers.map((p) => playerButton(p, handlePickOn))}
              {benchPlayers.length === 0 && <p className="text-sm text-txt-3 text-center py-4">No players on bench</p>}
            </div>
          </>
        )}

        <button type="button" onClick={onClose} className="w-full mt-3 py-3 text-center text-sm text-txt-3 border border-line rounded-xl press">
          Cancel
        </button>
      </div>
    </div>
  );
}
