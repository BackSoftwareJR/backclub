import React, { useState, useEffect } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTH_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// ─── Sub-components ──────────────────────────────────────────────────────────

const Complication: React.FC<{ label: string; value: string; sub?: string; color: string }> = ({
  label, value, sub, color,
}) => (
  <div style={{
    padding: '6px 8px',
    borderRadius: 10,
    background: `${color}0e`,
    border: `1px solid ${color}1e`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  }}>
    <span style={{ fontSize: 8, color, letterSpacing: '0.09em', fontWeight: 700, lineHeight: 1 }}>
      {label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.9)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </span>
    {sub && (
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{sub}</span>
    )}
  </div>
);

// ─── Analog clock ring ───────────────────────────────────────────────────────

const AnalogFace: React.FC<{ now: Date; size: number }> = ({ now, size }) => {
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();

  const hourAngle   = h * 30 + m * 0.5;
  const minAngle    = m * 6 + s * 0.1;
  const secAngle    = s * 6;

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 4;

  const hx = (angle: number, len: number) => cx + len * Math.sin((angle * Math.PI) / 180);
  const hy = (angle: number, len: number) => cy - len * Math.cos((angle * Math.PI) / 180);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* Face */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30;
        const x1 = cx + (r - 1) * Math.sin((a * Math.PI) / 180);
        const y1 = cy - (r - 1) * Math.cos((a * Math.PI) / 180);
        const x2 = cx + (r - 6) * Math.sin((a * Math.PI) / 180);
        const y2 = cy - (r - 6) * Math.cos((a * Math.PI) / 180);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />;
      })}

      {/* Minute markers */}
      {Array.from({ length: 60 }).map((_, i) => {
        if (i % 5 === 0) return null;
        const a = i * 6;
        const x1 = cx + (r - 1) * Math.sin((a * Math.PI) / 180);
        const y1 = cy - (r - 1) * Math.cos((a * Math.PI) / 180);
        const x2 = cx + (r - 3.5) * Math.sin((a * Math.PI) / 180);
        const y2 = cy - (r - 3.5) * Math.cos((a * Math.PI) / 180);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />;
      })}

      {/* Hour hand */}
      <line
        x1={cx} y1={cy}
        x2={hx(hourAngle, r * 0.5)}
        y2={hy(hourAngle, r * 0.5)}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={cx} y1={cy}
        x2={hx(minAngle, r * 0.72)}
        y2={hy(minAngle, r * 0.72)}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1={hx(secAngle + 180, r * 0.18)}
        y1={hy(secAngle + 180, r * 0.18)}
        x2={hx(secAngle, r * 0.82)}
        y2={hy(secAngle, r * 0.82)}
        stroke="#FF3B30"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Center pip */}
      <circle cx={cx} cy={cy} r="2.5" fill="#FF3B30" />
      <circle cx={cx} cy={cy} r="1" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const ClockWidget: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';

  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const secStr  = String(s).padStart(2, '0');
  const dayStr  = DAY_IT[now.getDay()];
  const dateStr = `${now.getDate()} ${MONTH_IT[now.getMonth()]} ${now.getFullYear()}`;

  const tzOff    = -now.getTimezoneOffset();
  const tzH      = Math.floor(Math.abs(tzOff) / 60);
  const tzM      = Math.abs(tzOff) % 60;
  const tzStr    = `UTC${tzOff >= 0 ? '+' : '-'}${tzH}${tzM > 0 ? `:${String(tzM).padStart(2, '0')}` : ''}`;

  const weekNum  = getWeekNumber(now);
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  return (
    <div className="h-full flex flex-col" style={{ padding: '10px', gap: '10px' }}>
      {/* ── Top: analog + digital ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {/* Analog clock */}
        <AnalogFace now={now} size={90} />

        {/* Digital display */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Main time */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{
              fontSize: 36,
              fontWeight: 100,
              color: '#ffffff',
              letterSpacing: -2,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeStr}
            </span>
            <span style={{
              fontSize: 16,
              fontWeight: 200,
              color: 'rgba(255,255,255,0.35)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 0,
            }}>
              {secStr}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 2, fontWeight: 500 }}>
              {ampm}
            </span>
          </div>

          {/* Day */}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontWeight: 300 }}>
            {dayStr}
          </div>
          {/* Date */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* ── Bottom: complications ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        <Complication label="FUSO"     value={tzStr}               color="#5E5CE6" />
        <Complication label="SETT."    value={`W${weekNum}`}        color="#30D158" />
        <Complication label="GIORNO"   value={String(dayOfYear)}   sub="/365"      color="#FF9F0A" />
        <Complication label="ANNO"     value={String(now.getFullYear())}            color="#0A84FF" />
      </div>
    </div>
  );
};

export default ClockWidget;
