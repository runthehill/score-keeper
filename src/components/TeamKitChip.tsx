import { isPale } from '../utils/teamColors';

interface Props {
  primary: string;
  secondary: string;
  size?: number;
  radius?: number;
  ring?: boolean;
}

export default function TeamKitChip({ primary, secondary, size = 34, radius = 10, ring = true }: Props) {
  const ringColor = isPale(primary) ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.14)';
  return (
    <div
      data-testid="team-kit-chip"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: primary,
        boxShadow: ring ? `inset 0 0 0 1px ${ringColor}` : 'none',
      }}
    >
      <div
        data-testid="team-kit-slash"
        style={{ position: 'absolute', inset: 0, background: secondary, clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)' }}
      />
    </div>
  );
}
