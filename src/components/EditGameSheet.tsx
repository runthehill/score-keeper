import { useState } from 'react';
import type { Game, Player, Team } from '../types';
import PlayerRowsEditor, { type PlayerRowBase } from './PlayerRowsEditor';
import ColorKitPicker from './ColorKitPicker';
import TeamKitChip from './TeamKitChip';
import { Edit } from './icons';

export interface EditRow extends PlayerRowBase { id?: string }
interface Kit { primary: string; secondary: string }

interface Props {
  game: Game;
  players: Player[];
  onSave: (data: {
    homeTeam: string; awayTeam: string;
    homeKit: Kit; awayKit: Kit;
    homeRows: EditRow[]; awayRows: EditRow[];
  }) => void;
  onClose: () => void;
}

const rowsFor = (players: Player[], team: Team): EditRow[] =>
  players.filter((p) => p.team === team).map((p) => ({ id: p.id, name: p.name, number: p.number == null ? '' : String(p.number) }));

export default function EditGameSheet({ game, players, onSave, onClose }: Props) {
  const [homeTeam, setHomeTeam] = useState(game.home_team);
  const [awayTeam, setAwayTeam] = useState(game.away_team);
  const [homeKit, setHomeKit] = useState<Kit>({ primary: game.home_primary, secondary: game.home_secondary });
  const [awayKit, setAwayKit] = useState<Kit>({ primary: game.away_primary, secondary: game.away_secondary });
  const [homeRows, setHomeRows] = useState<EditRow[]>(() => rowsFor(players, 'home'));
  const [awayRows, setAwayRows] = useState<EditRow[]>(() => rowsFor(players, 'away'));
  const [picker, setPicker] = useState<Team | null>(null);

  const save = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    onSave({ homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), homeKit, awayKit, homeRows, awayRows });
  };

  const INPUT = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

  const teamSection = (team: Team) => {
    const name = team === 'home' ? homeTeam : awayTeam;
    const setName = team === 'home' ? setHomeTeam : setAwayTeam;
    const kit = team === 'home' ? homeKit : awayKit;
    const rows = team === 'home' ? homeRows : awayRows;
    const setRows = team === 'home' ? setHomeRows : setAwayRows;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPicker(team)} className="relative shrink-0 press" aria-label={`Choose ${team} kit`}>
            <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={38} radius={11} />
            <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
              <Edit size={11} />
            </span>
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`${team === 'home' ? 'Home' : 'Away'} team name`}
            className={`${INPUT} flex-1`}
          />
        </div>
        <PlayerRowsEditor players={rows as PlayerRowBase[]} onChange={(r) => setRows(r as EditRow[])} allowRemove={false} createRow={(nm, num) => ({ name: nm, number: num })} />
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-extrabold text-txt mb-4">Edit game</h3>
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2">Home</p>
              {teamSection('home')}
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2">Away</p>
              {teamSection('away')}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
            <button type="button" onClick={save} disabled={!homeTeam.trim() || !awayTeam.trim()} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-40 press">Save changes</button>
          </div>
        </div>
      </div>
      {picker && (
        <ColorKitPicker
          team={picker === 'home' ? homeTeam : awayTeam}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
