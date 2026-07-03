import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import type { Game, GameEvent, Player } from '../types';
import { teamAccent } from '../utils/teamColors';
import { computeBoxScore, type BoxLine, type TeamBox } from '../utils/boxScore';

interface Props {
  game: Game;
  events: GameEvent[];
  players: Player[];
}

const COLS = ['PTS', '2PT', '3PT', 'FT', 'OR', 'DR', 'AST', 'STL', 'TO', 'PF'] as const;

const cells = (l: BoxLine): string[] => [
  String(l.pts),
  `${l.twoM}-${l.twoA}`,
  `${l.threeM}-${l.threeA}`,
  `${l.ftM}-${l.ftA}`,
  String(l.orb), String(l.drb), String(l.ast), String(l.stl), String(l.to), String(l.pf),
];

const th: CSSProperties = { padding: '4px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textAlign: 'right', whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '5px 8px', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' };
const nameCell: CSSProperties = { padding: '5px 8px', fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' };

const BoxScore = forwardRef<HTMLDivElement, Props>(function BoxScore({ game, events, players }, ref) {
  const box = computeBoxScore(events, players);

  const section = (which: 'home' | 'away', tb: TeamBox) => {
    const name = which === 'home' ? game.home_team : game.away_team;
    const primary = which === 'home' ? game.home_primary : game.away_primary;
    const secondary = which === 'home' ? game.home_secondary : game.away_secondary;
    const accent = teamAccent({ primary, secondary }, true);
    return (
      <div style={{ marginTop: which === 'away' ? 14 : 0 }}>
        <div className="font-sans" style={{ fontWeight: 800, fontSize: 12.5, color: accent, padding: '0 8px 4px' }}>{name}</div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Player</th>
              {COLS.map((c) => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {tb.rows.map(({ player, line }) => (
              <tr key={player.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td className="font-sans" style={{ ...nameCell, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  {player.number != null ? `${player.number} ` : ''}{player.name}
                </td>
                {cells(line).map((v, i) => <td key={i} className="font-score" style={td}>{v}</td>)}
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <td className="font-sans" style={{ ...nameCell, color: accent, fontWeight: 800 }}>Team</td>
              {cells(tb.total).map((v, i) => <td key={i} className="font-score" style={{ ...td, color: '#fff', fontWeight: 700 }}>{v}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div ref={ref} style={{ width: 'max-content', minWidth: '100%', background: '#0A0C10', borderRadius: 18, padding: '16px 10px' }}>
        <div className="font-sans" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 8px 12px' }}>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>Box Score</span>
          <span className="font-score" style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
            {game.home_team} {game.home_score} – {game.away_score} {game.away_team}
          </span>
        </div>
        {section('home', box.home)}
        {section('away', box.away)}
      </div>
    </div>
  );
});

export default BoxScore;
