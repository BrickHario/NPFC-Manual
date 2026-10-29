
export default function PotentialChart({
  potential,
}: {
  potential: Record<string, number>;
}) {
  const values = Array.from({ length: 33 }, (_, i) =>
    potential[`point_${String(i).padStart(2, "0")}`]
  );

  const x = (i: number) => 45 + (i / 32) * 700;
  const y = (v: number) => 210 - (v / 100) * 190;

  const points = values
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 760 255"
      style={{ width: "100%", maxWidth: 760 }}
      role="img"
      aria-label="Potentialkurve von 0 bis 8 Jahren"
    >
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
        <g key={v}>
          <line
            x1={45} y1={y(v)}
            x2={745} y2={y(v)}
            stroke="#ccc"
          />
          <text x={38} y={y(v) + 4} textAnchor="end" fontSize="12">
            {v}%
          </text>
        </g>
      ))}

      {values.map((_, i) => (
        <g key={i}>
          <line
            x1={x(i)} y1={210}
            x2={x(i)} y2={215}
            stroke="currentColor"
          />
          {i % 4 === 0 && (
            <text
              x={x(i)}
              y={232}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
            >
              {i / 4}
            </text>
          )}
        </g>
      ))}

      <polyline
        points={points}
        fill="none"
        stroke="var(--color-physical)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={3}
          fill="var(--color-physical)"
        >
          <title>{`${i / 4} Years: ${v}%`}</title>
        </circle>
      ))}

      <text x={395} y={250} textAnchor="middle" fontSize="12">
        Years
      </text>
    </svg>
  );
}
