import type { GameEvent, Player, Team } from '../types';

export interface BoxLine {
  pts: number;
  twoM: number; twoA: number;
  threeM: number; threeA: number;
  ftM: number; ftA: number;
  orb: number; drb: number;
  ast: number; stl: number; to: number; pf: number;
}

export interface TeamBox {
  rows: { player: Player; line: BoxLine }[];
  total: BoxLine;
}

const empty = (): BoxLine => ({
  pts: 0, twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0,
  orb: 0, drb: 0, ast: 0, stl: 0, to: 0, pf: 0,
});

function lineFrom(events: GameEvent[]): BoxLine {
  const l = empty();
  for (const e of events) {
    l.pts += e.points;
    switch (e.event_type) {
      case 'field_goal': l.twoM++; l.twoA++; break;
      case 'field_goal_miss': l.twoA++; break;
      case 'three_pointer': l.threeM++; l.threeA++; break;
      case 'three_pointer_miss': l.threeA++; break;
      case 'free_throw': l.ftM++; l.ftA++; break;
      case 'free_throw_miss': l.ftA++; break;
      case 'off_rebound': l.orb++; break;
      case 'def_rebound': l.drb++; break;
      case 'assist': l.ast++; break;
      case 'steal': l.stl++; break;
      case 'turnover': l.to++; break;
      case 'foul': l.pf++; break;
    }
  }
  return l;
}

function teamBox(events: GameEvent[], players: Player[], team: Team): TeamBox {
  const teamEvents = events.filter((e) => e.team === team);
  const rows = players
    .filter((p) => p.team === team)
    .map((player) => ({ player, line: lineFrom(teamEvents.filter((e) => e.player_id === player.id)) }));
  return { rows, total: lineFrom(teamEvents) };
}

export function computeBoxScore(events: GameEvent[], players: Player[]): { home: TeamBox; away: TeamBox } {
  return { home: teamBox(events, players, 'home'), away: teamBox(events, players, 'away') };
}
