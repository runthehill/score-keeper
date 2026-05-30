interface Props {
  subtitle?: string;
}

const DOTS = ['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'];

export default function AppHeader({ subtitle }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px] shrink-0" aria-hidden="true">
        {DOTS.map((c) => (
          <span key={c} className="w-[7px] h-[7px] rounded-full" style={{ background: c }} />
        ))}
      </div>
      <div className="min-w-0">
        <h1 className="text-[17px] font-extrabold text-txt -tracking-[0.02em] leading-tight">Jonathan's Score Keeper</h1>
        {subtitle && <p className="text-xs text-txt-3 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
