"use client";

import { useState, type MouseEvent } from "react";
import styles from "./TypesChart.module.css";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
  type Language,
} from "../../lib/utils";

type Point = { x: number; y: number };
type ChartPlayer = {
  id: number | null;
  name: string;
  imageUrl: string;
  startPosition: Point;
  path: Point[];
};

type TypesChartProps = {
  players: ChartPlayer[];
  selectedPlayerKey: string | null;
  language: Language;
  onSelectPlayer: (key: string) => void;
};

const pathColors = ["#16a34a", "#2563eb", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#be185d"];

const dimension = 101;
const padding = 46;
const step = 10;
const plot = dimension * step;
const canvas = plot + padding * 2;
const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

const typeDescriptions = [
  "A player with no particular stand-out attributes but who can contribute equally to both attack and defence.",
  "A player who roams all over the pitch switching quickly between attack and defence.",
  "An accomplished man-marking defender type who can also get forward to support in attack.",
  "An individualistic player who prefers to act independently.",
  "A man-marker who excels at pressuring opponents. Will use his body to block shots in critical situations.",
  "A seamless contributor to the zone defence. Will position himself to cover for his teammates during a crisis.",
  "A player who doggedly marks the opponent he's assigned to. Will aim to intercept the ball whenever possible.",
  "A zonal marker who aims to prevent dangerous situations from arising by persistently applying pressure.",
  "A skilled passer who keeps play ticking over and has a knack for getting on the end of a ball.",
  "High-speed attacker who bursts forward without hesitation.",
  "A player who moves freely around the pitch contributing to the team by creating space and chances.",
  "A player who specialises in losing his marker, with an excellent instinct for finding the goal.",
] as const;

function createChart() {
  const cells = new Uint8Array(dimension * dimension);
  const regions = Array.from(
    { length: PLAYER_TYPE_COLORS.length },
    () => ""
  );

  for (let y = 0; y < dimension; y++) {
    const row = playerTypeRows[y];
    let start = 0;

    for (let i = 0; i < row.length; i += 2) {
      const end = row[i];
      const type = row[i + 1];
      const x = padding + start * step;
      const top = padding + (dimension - 1 - y) * step;
      const width = (end - start + 1) * step;

      regions[type] += `M${x} ${top}h${width}v${step}h-${width}Z`;

      cells.fill(
        type,
        y * dimension + start,
        y * dimension + end + 1
      );

      start = end + 1;
    }
  }

  let borders = "";

  for (let x = 1; x < dimension; x++) {
    let start = -1;

    for (let y = 0; y <= dimension; y++) {
      const different =
        y < dimension &&
        cells[y * dimension + x - 1] !==
          cells[y * dimension + x];

      if (different && start === -1) start = y;

      if (!different && start !== -1) {
        borders +=
          `M${padding + x * step} ` +
          `${padding + (dimension - y) * step}` +
          `v${(y - start) * step}`;

        start = -1;
      }
    }
  }

  for (let y = 1; y < dimension; y++) {
    const boundaryY = padding + (dimension - y) * step;
    let start = -1;

    for (let x = 0; x <= dimension; x++) {
      const different =
        x < dimension &&
        cells[(y - 1) * dimension + x] !==
          cells[y * dimension + x];

      if (different && start === -1) start = x;

      if (!different && start !== -1) {
        borders +=
          `M${padding + start * step} ` +
          `${boundaryY}h${(x - start) * step}`;

        start = -1;
      }
    }
  }

  const sums = Array.from(
    { length: regions.length },
    () => ({ x: 0, y: 0, count: 0 })
  );

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const sum = sums[cells[y * dimension + x]];
      sum.x += x;
      sum.y += y;
      sum.count++;
    }
  }

  const labels = sums.map((sum, type) => {
    const meanX = sum.x / sum.count;
    const meanY = sum.y / sum.count;
    const distance = new Int16Array(cells.length);

    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const index = y * dimension + x;

        if (cells[index] !== type) continue;

        let d = Math.min(
          x + 1,
          y + 1,
          dimension - x,
          dimension - y
        );

        if (x && cells[index - 1] !== type) d = 1;
        if (y && cells[index - dimension] !== type) d = 1;

        if (
          x < dimension - 1 &&
          cells[index + 1] !== type
        ) {
          d = 1;
        }

        if (
          y < dimension - 1 &&
          cells[index + dimension] !== type
        ) {
          d = 1;
        }

        distance[index] = d;
      }
    }

    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const index = y * dimension + x;

        if (cells[index] !== type) continue;

        if (x && cells[index - 1] === type) {
          distance[index] = Math.min(
            distance[index],
            distance[index - 1] + 1
          );
        }

        if (
          y &&
          cells[index - dimension] === type
        ) {
          distance[index] = Math.min(
            distance[index],
            distance[index - dimension] + 1
          );
        }
      }
    }

    for (let y = dimension - 1; y >= 0; y--) {
      for (let x = dimension - 1; x >= 0; x--) {
        const index = y * dimension + x;

        if (cells[index] !== type) continue;

        if (
          x < dimension - 1 &&
          cells[index + 1] === type
        ) {
          distance[index] = Math.min(
            distance[index],
            distance[index + 1] + 1
          );
        }

        if (
          y < dimension - 1 &&
          cells[index + dimension] === type
        ) {
          distance[index] = Math.min(
            distance[index],
            distance[index + dimension] + 1
          );
        }
      }
    }

    let bestX = 50;
    let bestY = 50;
    let bestScore = -Infinity;

    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const index = y * dimension + x;

        if (cells[index] !== type) continue;

        const score =
          distance[index] * 2 -
          Math.hypot(x - meanX, y - meanY) * 0.16;

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    return {
      type,
      x: padding + (bestX + 0.5) * step,
      y: padding + (dimension - bestY - 0.5) * step,
    };
  });

  return { regions, borders, labels };
}

const chart = createChart();
const popupWidth = 420;
const popupHeight = 210;

export default function TypesChart({
  players,
  selectedPlayerKey,
  language,
  onSelectPlayer,
}: TypesChartProps) {
  const [selectedType, setSelectedType] = useState<{
    type: number;
    x: number;
    y: number;
  } | null>(null);

  function toggleType(event: MouseEvent<SVGPathElement>, type: number) {
    event.stopPropagation();
    event.currentTarget.blur();

    if (selectedType?.type === type) {
      setSelectedType(null);
      return;
    }

    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    let x = chart.labels[type].x;
    let y = chart.labels[type].y;

    if (svg && matrix) {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const svgPoint = point.matrixTransform(matrix.inverse());
      x = svgPoint.x;
      y = svgPoint.y;
    }

    setSelectedType({ type, x, y });
  }

  const popupX = selectedType
    ? Math.min(Math.max(10, selectedType.x + 16), canvas - popupWidth - 10)
    : 0;
  const popupY = selectedType
    ? selectedType.y + popupHeight + 16 > canvas
      ? Math.max(10, selectedType.y - popupHeight - 16)
      : Math.max(10, selectedType.y + 16)
    : 0;

  function chartX(value: number) {
    return padding + (Math.max(0, Math.min(100, value)) + 0.5) * step;
  }

  function chartY(value: number) {
    return padding + (100.5 - Math.max(0, Math.min(100, value))) * step;
  }

  const markers = players.map((player, index) => {
    const position = player.path.length > 0 ? player.path[player.path.length - 1] : player.startPosition;
    return {
      player,
      anchorX: chartX(position.x),
      anchorY: chartY(position.y),
      color: pathColors[index % pathColors.length],
      faded: selectedPlayerKey !== null && selectedPlayerKey !== (player.id === null ? "dummy" : String(player.id)),
    };
  });

  return (
  <>
    <p className={styles.chartDescription}>
      Training vectors change depending on the player&apos;s current
      position.
    </p>

    <svg

      className={styles.chart}
      viewBox={`0 0 ${canvas} ${canvas}`}
      role="img"
      aria-label="NPFC Player Types – click a coloured area for its description"
      onClick={() => setSelectedType(null)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g shapeRendering="crispEdges">
        {chart.regions.map((pathData, type) => (
          <path
            key={type}
            d={pathData}
            style={{
              fill: PLAYER_TYPE_COLORS[type],
              cursor: "pointer",
              outline: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            role="button"
            tabIndex={0}
            aria-label={`${PLAYER_TYPE_NAMES[language][type]} – show or hide description`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => toggleType(event, type)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              setSelectedType((current) =>
                current?.type === type
                  ? null
                  : { type, x: chart.labels[type].x, y: chart.labels[type].y }
              );
            }}
          />
        ))}
      </g>

      <g
        className={styles.grid}
        pointerEvents="none"
        shapeRendering="crispEdges"
      >
        {ticks.slice(1, -1).map((tick) => (
          <g key={tick}>
            <line
              x1={padding + (tick + 0.5) * step}
              y1={padding}
              x2={padding + (tick + 0.5) * step}
              y2={padding + plot}
            />
            <line
              x1={padding}
              y1={padding + (100.5 - tick) * step}
              x2={padding + plot}
              y2={padding + (100.5 - tick) * step}
            />
          </g>
        ))}
      </g>

      <path
        d={chart.borders}
        className={styles.boundary}
        pointerEvents="none"
        shapeRendering="crispEdges"
      />

      <rect
        x={padding}
        y={padding}
        width={plot}
        height={plot}
        className={styles.frame}
        pointerEvents="none"
      />

      <g className={styles.ticks} pointerEvents="none">
        {ticks.map((tick) => (
          <g key={tick}>
            <text
              x={padding + (tick + 0.5) * step}
              y={padding + plot + 23}
              textAnchor="middle"
            >
              {tick}
            </text>
            <text
              x={padding - 12}
              y={padding + (100.5 - tick) * step + 5}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}
      </g>
      
<g className={styles.axisLabels} pointerEvents="none">
  <text
    x={padding + plot / 2}
    y={canvas + 4}
    textAnchor="middle"
  >
    X
  </text>
  <text
    x={0}
    y={padding + plot / 2}
    textAnchor="middle"
    dominantBaseline="middle"
  >
    Y
  </text>
</g>


      <g className={styles.labels} pointerEvents="none">
        {chart.labels.map((label) => (
          <text
            key={label.type}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {PLAYER_TYPE_NAMES[language][label.type]}
          </text>
        ))}
      </g>

      {markers.map(({ player, color, faded }) => {
        const points = [player.startPosition, ...player.path];
        return (
          <g
            key={`path-${player.id ?? "dummy"}`}
            pointerEvents="none"
            opacity={faded ? 0.3 : 1}
          >
            {points.slice(1).map((point, index) => {
              const previous = points[index];
              return (
                <g key={index}>
                  <line
                    x1={chartX(previous.x)}
                    y1={chartY(previous.y)}
                    x2={chartX(point.x)}
                    y2={chartY(point.y)}
                    stroke={color}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={chartX(point.x)}
                    cy={chartY(point.y)}
                    r={8}
                    fill={color}
                    stroke="#000"
                    strokeWidth={2}
                  />
                  <text
                    x={chartX(point.x)}
                    y={chartY(point.y) - 14}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={800}
                    fill={color}
                  >{index + 1}</text>
                </g>
              );
            })}
            {player.path.length > 0 && (
              <circle
                cx={chartX(player.startPosition.x)}
                cy={chartY(player.startPosition.y)}
                r={8}
                fill={color}
                stroke="#000"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}

      {[...markers].sort((a, b) => Number(b.faded) - Number(a.faded)).map(({ player, anchorX, anchorY, color, faded }) => (
        <g
          key={`marker-${player.id ?? "dummy"}`}
          role="button"
          tabIndex={0}
          aria-label={`Select ${player.name}`}
          style={{ cursor: "pointer" }}
          onClick={(event) => {
            event.stopPropagation();
            onSelectPlayer(
              player.id === null ? "dummy" : String(player.id)
            );
            setSelectedType(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onSelectPlayer(
              player.id === null ? "dummy" : String(player.id)
            );
            setSelectedType(null);
          }}
        >
          <circle
            cx={anchorX}
            cy={anchorY}
            r={5}
            fill={color}
            stroke="#000"
            strokeWidth={1.5}
            opacity={faded ? 0.3 : 1}
          />
          <g opacity={faded ? 0.3 : 1} className={styles.playerSize}>
            <image
              href={player.imageUrl}
              x={anchorX - 37.5}
              y={anchorY - 37.5}
              width={75}
              height={75}
              preserveAspectRatio="xMidYMid meet"
            />
            <text
              x={anchorX}
              y={anchorY + 45}
              textAnchor="middle"
              fontSize={23}
              fontWeight={300}
              fill="#000"
              stroke="#fff"
              strokeWidth={3}
              paintOrder="stroke"
            >{player.name}</text>
          </g>
        </g>
      ))}

      {selectedType !== null && (
        <foreignObject
          x={popupX}
          y={popupY}
          width={popupWidth}
          height={popupHeight}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedType(null);
          }}
          style={{ cursor: "pointer" }}
        >
          <div
            role="dialog"
            aria-label={`${PLAYER_TYPE_NAMES[language][selectedType.type]} description`}
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              padding: "14px 18px",
              border: "2px solid #222",
              borderRadius: "12px",
              background: "#fffdf4",
              boxShadow: "0 5px 16px #0004",
              fontFamily: "var(--font-body)",
              color: "var(--font_black)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: "17px",
                  height: "17px",
                  border: "1px solid #222",
                  borderRadius: "3px",
                  backgroundColor: PLAYER_TYPE_COLORS[selectedType.type],
                }}
              />
              <strong style={{ fontSize: "25px", lineHeight: 1.2 }}>
                {PLAYER_TYPE_NAMES[language][selectedType.type]}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: "22px", lineHeight: 1.27 }}>
              {typeDescriptions[selectedType.type]}
            </p>
          </div>
        </foreignObject>
      )}

    </svg>
  </>
);
}
