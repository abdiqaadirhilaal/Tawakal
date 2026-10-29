import { useState } from 'react';

// Shax tiirar ah oo fudud (SVG), oo aan u baahnayn maktabad dibadda ah.
export default function BarChart({ data, valueKey = 'sales', formatValue = (v) => v, formatLabel = (v) => v, describe, height = 240 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const W = 720;
  const padL = 8;
  const padB = 26;
  const padT = 14;
  const innerH = height - padB - padT;
  const slot = (W - padL * 2) / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(34, slot * 0.62));
  const labelEvery = Math.ceil(data.length / 8);
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure>
      <div className="mb-2 flex min-h-6 items-baseline justify-between gap-3 text-sm">
        <span className="num font-semibold text-navy">
          {active ? `${formatLabel(active.period)}: ${formatValue(active[valueKey])}${describe ? ` · ${describe(active)}` : ''}` : `Wadarta: ${formatValue(total)}`}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Shaxda iibka" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padL} x2={W - padL} y1={padT + innerH * (1 - f)} y2={padT + innerH * (1 - f)} stroke="#E2E8F0" strokeWidth="1" strokeDasharray={f === 0 ? '' : '4 4'} />
        ))}
        {data.map((d, i) => {
          const h = (d[valueKey] / max) * innerH;
          const x = padL + slot * i + (slot - barW) / 2;
          return (
            <g key={d.period} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${formatLabel(d.period)}: ${formatValue(d[valueKey])}`}>
              <rect x={padL + slot * i} y={padT} width={slot} height={innerH} fill="transparent" />
              <rect x={x} y={padT + innerH - Math.max(h, d[valueKey] > 0 ? 2 : 0)} width={barW} height={Math.max(h, d[valueKey] > 0 ? 2 : 0)} rx="3" fill={hover === i ? '#D4AF37' : '#123B7A'} />
              {i % labelEvery === 0 && (
                <text x={padL + slot * i + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748B">
                  {formatLabel(d.period)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.period}>
                <th scope="row">{d.period}</th>
                <td>{formatValue(d[valueKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
