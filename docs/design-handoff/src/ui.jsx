/* =========================================================================
   ui.jsx — shared primitives: Sheet, Button, Pill, TeamKitChip, ColorKitPicker
   ========================================================================= */

// ---- TeamKit chip: a two-tone kit swatch (primary + secondary slash) ----
function TeamKitChip({ primary, secondary, size = 34, radius = 10, ring = true }) {
  const pale = window.isPale(primary);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, position: 'relative',
      overflow: 'hidden', flexShrink: 0, background: primary,
      boxShadow: ring ? `inset 0 0 0 1px ${pale ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.14)'}` : 'none',
    }}>
      <div style={{
        position: 'absolute', inset: 0, background: secondary,
        clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)',
      }} />
    </div>
  );
}

// ---- Button -------------------------------------------------------------
function Button({ children, onClick, variant = 'primary', accent, full, size = 'md', disabled, style }) {
  const pad = size === 'lg' ? '16px 22px' : size === 'sm' ? '9px 14px' : '13px 18px';
  const fs = size === 'lg' ? 17 : size === 'sm' ? 13.5 : 15;
  const base = {
    border: 'none', borderRadius: 14, fontFamily: 'var(--font-ui)', fontWeight: 700,
    fontSize: fs, padding: pad, cursor: disabled ? 'default' : 'pointer', width: full ? '100%' : undefined,
    letterSpacing: '0.01em', transition: 'transform .12s var(--ease), filter .12s var(--ease), background .12s var(--ease)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    opacity: disabled ? 0.45 : 1, WebkitTapHighlightColor: 'transparent', ...style,
  };
  let v;
  if (variant === 'primary') {
    const a = accent || 'var(--txt)';
    const ink = accent ? window.inkOn(accent) : 'var(--bg)';
    v = { background: a, color: ink, boxShadow: accent ? `0 6px 18px ${window.rgba(accent, 0.32)}` : 'var(--shadow-cta)' };
  } else if (variant === 'ghost') {
    v = { background: 'var(--surface-2)', color: 'var(--txt)', boxShadow: 'inset 0 0 0 1px var(--line)' };
  } else if (variant === 'danger') {
    v = { background: 'transparent', color: 'var(--danger)', boxShadow: 'inset 0 0 0 1px var(--line-2)' };
  } else {
    v = { background: 'transparent', color: 'var(--txt-2)' };
  }
  return (
    <button className="pressable" onClick={disabled ? undefined : onClick} style={{ ...base, ...v }}>{children}</button>
  );
}

// ---- Pill (eyebrow / badge) --------------------------------------------
function Pill({ children, tone = 'neutral', accent, style }) {
  let bg = 'var(--surface-2)', col = 'var(--txt-2)', bd = 'var(--line)';
  if (tone === 'accent' && accent) { bg = window.rgba(accent, 0.16); col = accent; bd = window.rgba(accent, 0.3); }
  if (tone === 'live') { bg = 'rgba(255,77,77,0.14)'; col = '#FF5A5A'; bd = 'rgba(255,77,77,0.34)'; }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
      fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em',
      textTransform: 'uppercase', background: bg, color: col, boxShadow: `inset 0 0 0 1px ${bd}`, ...style,
    }}>{children}</span>
  );
}

// ---- Live dot (pulsing) -------------------------------------------------
function LiveDot({ color = '#FF5A5A', size = 7 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: color }} />
      <span className="live-ping" style={{ position: 'absolute', inset: 0, borderRadius: 999, background: color }} />
    </span>
  );
}

// ---- Bottom Sheet (absolute within the app/screen root) ----------------
function Sheet({ children, onClose, title, accent }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} className="sheet-scrim"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(4,6,10,0.62)', backdropFilter: 'blur(2px)' }} />
      <div className="sheet-panel" style={{
        position: 'relative', background: 'var(--surface)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.4)', padding: '12px 18px 26px', maxHeight: '82%', overflowY: 'auto',
        borderTop: '1px solid var(--line)',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: 'var(--line-2)', margin: '2px auto 14px' }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18, color: 'var(--txt)', letterSpacing: '-0.01em' }}>{title}</h3>
            <button className="pressable" onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'var(--txt-2)', cursor: 'pointer' }}>
              <window.IClose size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---- Swatch grid --------------------------------------------------------
function SwatchGrid({ value, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 8 }}>
      {window.SWATCHES.map((c) => {
        const active = value && value.toLowerCase() === c.toLowerCase();
        const pale = window.isPale(c);
        return (
          <button key={c} className="pressable" onClick={() => onPick(c)} aria-label={c}
            style={{
              aspectRatio: '1', borderRadius: 9, background: c, cursor: 'pointer', position: 'relative',
              border: 'none',
              boxShadow: active
                ? `0 0 0 2px var(--surface), 0 0 0 4px var(--txt)`
                : `inset 0 0 0 1px ${pale ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)'}`,
            }}>
            {active && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: window.inkOn(c) }}><window.ICheck size={15} /></span>}
          </button>
        );
      })}
    </div>
  );
}

// ---- Color Kit Picker (sheet) ------------------------------------------
function ColorKitPicker({ team, value, onChange, onClose }) {
  const [primary, setPrimary] = React.useState(value.primary);
  const [secondary, setSecondary] = React.useState(value.secondary);
  const commit = (p, s) => { setPrimary(p); setSecondary(s); onChange({ primary: p, secondary: s }); };

  return (
    <Sheet title={`${team} kit`} onClose={onClose}>
      {/* Live preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--line)', marginBottom: 18 }}>
        <TeamKitChip primary={primary} secondary={secondary} size={46} radius={13} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 16, color: 'var(--txt)' }}>{team}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--txt-3)', marginTop: 2, letterSpacing: '0.02em' }}>{primary.toUpperCase()} · {secondary.toUpperCase()}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-score)', fontWeight: 700, fontSize: 34, color: primary, lineHeight: 1 }}>14</div>
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Quick kits</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        {window.KITS.map((k) => {
          const active = k.primary === primary && k.secondary === secondary;
          return (
            <button key={k.name} className="pressable" onClick={() => commit(k.primary, k.secondary)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ borderRadius: 11, padding: 2, boxShadow: active ? '0 0 0 2px var(--txt)' : 'none' }}>
                <TeamKitChip primary={k.primary} secondary={k.secondary} size={40} radius={10} />
              </div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 600, color: active ? 'var(--txt)' : 'var(--txt-3)' }}>{k.name}</span>
            </button>
          );
        })}
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Primary</p>
      <div style={{ marginBottom: 18 }}><SwatchGrid value={primary} onPick={(c) => commit(c, secondary)} /></div>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Secondary</p>
      <div style={{ marginBottom: 22 }}><SwatchGrid value={secondary} onPick={(c) => commit(primary, c)} /></div>

      <Button full size="lg" onClick={onClose}>Done</Button>
    </Sheet>
  );
}

// ---- Export the share card to a PNG (Web Share API, else download) ------
async function exportShareCard(node, filename, shareText) {
  if (!node || !window.htmlToImage) return;
  try {
    const dataUrl = await window.htmlToImage.toPng(node, {
      pixelRatio: 2.5, cacheBust: true, backgroundColor: '#0A0C10',
    });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${filename}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Score Keeper', text: shareText || '' });
    } else {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = `${filename}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    }
  } catch (e) {
    // user cancelled the share sheet, or capture failed — non-critical
  }
}

Object.assign(window, { TeamKitChip, Button, Pill, LiveDot, Sheet, SwatchGrid, ColorKitPicker, exportShareCard });
