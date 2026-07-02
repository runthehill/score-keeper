import type { SavedTeam, Sport } from '../types';
import { squadKit } from '../sports/kits';
import TeamKitChip from './TeamKitChip';

interface Props {
  teams: SavedTeam[];
  sportId: Sport;
  onSelect: (team: SavedTeam) => void;
  onClose: () => void;
}

export default function SavedTeamPicker({ teams, sportId, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Use a saved team</p>
        <div className="space-y-2">
          {teams.map((t) => {
            const kit = squadKit(t, sportId);
            const count = t.players.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className="w-full flex items-center gap-3 bg-surface-2 border border-line rounded-xl py-3 px-3 text-left press"
              >
                <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={20} radius={6} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-txt truncate">{t.teamName}</p>
                  <p className="text-xs text-txt-3">{count > 0 ? `${count} player${count === 1 ? '' : 's'}` : 'No players'}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onClose} className="w-full mt-3 py-3 text-center text-sm text-txt-3">Cancel</button>
      </div>
    </div>
  );
}
