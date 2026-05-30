/* =========================================================================
   icons.jsx — line icons (actions) + sport glyphs
   2px stroke, round caps, inherit currentColor.
   ========================================================================= */

function Ico({ d, size = 22, sw = 2, fill = 'none', children, vb = 24, style }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill}
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', ...style }}>
      {d ? <path d={d} /> : children}
    </svg>
  );
}

const IUndo     = (p) => <Ico {...p} children={<><path d="M3 8h11a5 5 0 0 1 0 10H8" /><path d="M6 4 3 8l3 4" /></>} />;
const IPlus     = (p) => <Ico {...p} d="M12 5v14M5 12h14" />;
const IMinus    = (p) => <Ico {...p} d="M5 12h14" />;
const IPlay     = (p) => <Ico {...p} fill="currentColor" sw="0" children={<path d="M7 4.5v15l13-7.5z" />} />;
const IPause    = (p) => <Ico {...p} children={<><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" /><rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" /></>} />;
const ICard     = (p) => <Ico {...p} children={<rect x="5" y="3.5" width="14" height="17" rx="2.2" />} />;
const ISub      = (p) => <Ico {...p} children={<><path d="M4 7h11l-3-3M4 7l3 3" /><path d="M20 17H9l3-3M20 17l-3 3" /></>} />;
const IFlag     = (p) => <Ico {...p} children={<><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></>} />;
const IShare    = (p) => <Ico {...p} children={<><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="5.5" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" /></>} />;
const IWhistle  = (p) => <Ico {...p} children={<><path d="M3 10h9l4 2v0a5 5 0 1 1-5 5v-2" /><path d="M12 6V3" /></>} />;
const IClock    = (p) => <Ico {...p} children={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></>} />;
const IChevL    = (p) => <Ico {...p} d="M15 5l-7 7 7 7" />;
const IChevR    = (p) => <Ico {...p} d="M9 5l7 7-7 7" />;
const IClose    = (p) => <Ico {...p} d="M6 6l12 12M18 6L6 18" />;
const ICheck    = (p) => <Ico {...p} d="M5 12.5l4.5 4.5L19 7" />;
const IEdit     = (p) => <Ico {...p} children={<><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>} />;
const IHistory  = (p) => <Ico {...p} children={<><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5V9H8" /><path d="M12 8v4.5l3 2" /></>} />;
const ISettings = (p) => <Ico {...p} children={<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" /></>} />;
const IBall     = (p) => <Ico {...p} children={<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" /></>} />;
const IPlus_sm  = (p) => <Ico {...p} d="M12 6v12M6 12h12" />;
const IStar     = (p) => <Ico {...p} children={<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />} />;
const ITrophy   = (p) => <Ico {...p} children={<><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 19h6M10 15.5V19M14 15.5V19M8 21h8" /></>} />;
const IDot      = (p) => <Ico {...p} children={<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />} />;

// ---- Sport glyphs (line-drawn, sit alongside emoji) --------------------
function SportGlyph({ glyph, size = 26 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 32 32', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block' },
  };
  if (glyph === 'gaa') {
    // round ball with GAA-style seam panels
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="11" />
        <path d="M16 5v22M5 16h22" />
        <path d="M9 9c3 2.2 3 11.8 0 14M23 9c-3 2.2-3 11.8 0 14" strokeWidth="1.4" />
      </svg>
    );
  }
  // fallback simple ball
  return (
    <svg {...common}><circle cx="16" cy="16" r="11" /><path d="M16 5v22M5 16h22" /></svg>
  );
}

// Renders the sport's emoji if present, else the custom glyph.
function SportMark({ sport, size = 26, glyphColor }) {
  if (sport.emoji) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{sport.emoji}</span>;
  }
  return <span style={{ color: glyphColor || 'currentColor' }}><SportGlyph glyph={sport.glyph} size={size} /></span>;
}

Object.assign(window, {
  IUndo, IPlus, IMinus, IPlay, IPause, ICard, ISub, IFlag, IShare, IWhistle,
  IClock, IChevL, IChevR, IClose, ICheck, IEdit, IHistory, ISettings, IBall,
  IStar, ITrophy, IDot, SportGlyph, SportMark,
});
