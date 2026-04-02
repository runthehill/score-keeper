import type { ScoringEventConfig, Team } from '../types';
import ScoreButton from './ScoreButton';

interface Props {
  events: ScoringEventConfig[];
  team: Team;
  teamName: string;
  onScore: (eventType: string, points: number) => void;
}

export default function ScoringRow({ events, team, teamName, onScore }: Props) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${team === 'home' ? 'text-home' : 'text-away'}`}>
        {teamName}
      </p>
      <div className="flex gap-2">
        {events.map((event) => (
          <ScoreButton
            key={event.type}
            event={event}
            team={team}
            onClick={() => onScore(event.type, event.points)}
          />
        ))}
      </div>
    </div>
  );
}
