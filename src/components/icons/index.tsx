import { Icon } from './Icon';

type P = { size?: number; className?: string };

export const Undo = (p: P) => <Icon {...p}><path d="M3 8h11a5 5 0 0 1 0 10H8" /><path d="M6 4 3 8l3 4" /></Icon>;
export const Plus = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const Minus = (p: P) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const Play = (p: P) => <Icon {...p} stroke="none"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></Icon>;
export const Pause = (p: P) => <Icon {...p} stroke="none"><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" /><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" /></Icon>;
export const Card = (p: P) => <Icon {...p}><rect x="5" y="3.5" width="14" height="17" rx="2.2" /></Icon>;
export const Sub = (p: P) => <Icon {...p}><path d="M4 7h11l-3-3M4 7l3 3" /><path d="M20 17H9l3-3M20 17l-3 3" /></Icon>;
export const Flag = (p: P) => <Icon {...p}><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></Icon>;
export const Share = (p: P) => <Icon {...p}><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="5.5" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" /></Icon>;
export const Whistle = (p: P) => <Icon {...p}><path d="M3 10h9l4 2v0a5 5 0 1 1-5 5v-2" /><path d="M12 6V3" /></Icon>;
export const Clock = (p: P) => <Icon {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></Icon>;
export const ChevronLeft = (p: P) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>;
export const ChevronRight = (p: P) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>;
export const Close = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const Check = (p: P) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>;
export const Edit = (p: P) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Icon>;
export const History = (p: P) => <Icon {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5V9H8" /><path d="M12 8v4.5l3 2" /></Icon>;
export const Settings = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" /></Icon>;
export const Star = (p: P) => <Icon {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></Icon>;
export const Trophy = (p: P) => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 19h6M10 15.5V19M14 15.5V19M8 21h8" /></Icon>;

export function SportGlyph({ size = 26, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }} className={className}>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 5v22M5 16h22" />
      <path d="M9 9c3 2.2 3 11.8 0 14M23 9c-3 2.2-3 11.8 0 14" strokeWidth={1.4} />
    </svg>
  );
}
