import { Game, Player, GameEvent } from '../types';

export function exportGameCSV(game: Game, events: GameEvent[], players: Player[]): string {
  const header = 'game_id,sport,home_team,away_team,timestamp,period,event_type,team,player_name,player_number,points,home_score_after,away_score_after';
  const playerMap = new Map(players.map((p) => [p.id, p]));

  let homeRunning = 0;
  let awayRunning = 0;

  const rows = events.map((e) => {
    if (e.team === 'home') homeRunning += e.points;
    else awayRunning += e.points;

    const player = e.player_id ? playerMap.get(e.player_id) : undefined;
    const fields = [
      game.id, game.sport, game.home_team, game.away_team,
      e.timestamp, e.half_or_period, e.event_type, e.team,
      player?.name ?? '', player?.number ?? '', e.points,
      homeRunning, awayRunning,
    ];
    return fields.map((f) => {
      const str = String(f);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

export function exportGameJSON(game: Game, events: GameEvent[], players: Player[]): string {
  return JSON.stringify({ game, players, events }, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
