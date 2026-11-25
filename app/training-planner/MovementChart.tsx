"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import styles from "./TypesChart.module.css";

type Point = { x: number; y: number };

type MovementPlayer = {
  id: number | null;
  name: string;
  imageUrl: string;
  startPosition: Point;
  path: Point[];
};

type Props = {
  players: MovementPlayer[];
  selectedPlayerKey: string | null;
  onSelectPlayer: (key: string | null) => void;
};

const pathColors = [
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#be185d",
];

const dimension = 101;
const padding = 46;
const step = 10;
const plot = dimension * step;
const canvas = plot + padding * 2;
const ticks = Array.from({ length: 11 }, (_, index) => index * 10);

const quadrantLabels = [
  { key: "offensive", lines: ["Offensive", "runs"], x: 18, y: padding + 90 },
  { key: "allround", lines: ["All-round", "movement"], x: 82, y: padding + 90 },
  {
    key: "holder",
    lines: ["Position", "holder"],
    x: 18,
    y: padding + plot - 170,
  },
  {
    key: "marker",
    lines: ["Active", "marker"],
    x: 82,
    y: padding + plot - 170,
  },
] as const;

function chartX(value: number) {
  return padding + (Math.max(0, Math.min(100, value)) + 0.5) * step;
}

function chartY(value: number) {
  return padding + (100.5 - Math.max(0, Math.min(100, value))) * step;
}

export default function MovementChart({
  players,
  selectedPlayerKey,
  onSelectPlayer,
}: Props) {
  const markers = players.map((player, index) => {
    const position =
      player.path[player.path.length - 1] ?? player.startPosition;
    const key = player.id === null ? "dummy" : String(player.id);

    return {
      player,
      key,
      anchorX: chartX(position.x),
      anchorY: chartY(position.y),
      color: pathColors[index % pathColors.length],
      faded: selectedPlayerKey !== null && selectedPlayerKey !== key,
    };
  });

  function selectMarker(
    event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>,
    key: string,
  ) {
    event.stopPropagation();
    onSelectPlayer(selectedPlayerKey === key ? null : key);
  }

  return (
    <>
      <p className={styles.chartDescription}>
        Movement during a match. Positive values only!
      </p>

      <svg
        className={styles.chart}
        viewBox={`0 0 ${canvas} ${canvas}`}
        role="img"
        aria-label="Movement chart: defensive movement on the horizontal axis and offensive movement on the vertical axis"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x={padding}
          y={padding}
          width={plot}
          height={plot}
          fill="#f0f5f1"
        />

        <g
          className={styles.grid}
          pointerEvents="none"
          shapeRendering="crispEdges"
        >
          {ticks.slice(1, -1).map((tick) => (
            <g key={tick}>
              <line
                x1={chartX(tick)}
                y1={padding}
                x2={chartX(tick)}
                y2={padding + plot}
              />
              <line
                x1={padding}
                y1={chartY(tick)}
                x2={padding + plot}
                y2={chartY(tick)}
              />
            </g>
          ))}
        </g>

        <g
          pointerEvents="none"
          stroke="#151515"
          strokeWidth={1.4}
          opacity={0.5}
        >
          <line
            x1={chartX(50)}
            y1={padding}
            x2={chartX(50)}
            y2={padding + plot}
          />
          <line
            x1={padding}
            y1={chartY(50)}
            x2={padding + plot}
            y2={chartY(50)}
          />
        </g>

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
                x={chartX(tick)}
                y={padding + plot + 23}
                textAnchor="middle"
              >
                {tick}
              </text>
              <text x={padding - 12} y={chartY(tick) + 5} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
        </g>

        <g className={styles.axisLabels} pointerEvents="none">
          <text x={padding + plot / 2} y={canvas + 4} textAnchor="middle">
            Defensive Movement
          </text>
          <text
            x={0}
            y={padding + plot / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90 0 ${padding + plot / 2})`}
          >
            Offensive Movement
          </text>
        </g>

        <g className={styles.labels} pointerEvents="none">
          {quadrantLabels.map((label) => (
            <text
              key={label.key}
              x={chartX(label.x)}
              y={label.y}
              textAnchor="middle"
            >
              <tspan x={chartX(label.x)}>{label.lines[0]}</tspan>
              <tspan x={chartX(label.x)} dy={34}>
                {label.lines[1]}
              </tspan>
            </text>
          ))}
        </g>

        {markers.map(({ player, key, color, faded }) => {
          const points = [player.startPosition, ...player.path];

          return (
            <g
              key={`movement-path-${key}`}
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
                    >
                      {index + 1}
                    </text>
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

        {[...markers]
          .sort((a, b) => Number(b.faded) - Number(a.faded))
          .map(({ player, key, color, anchorX, anchorY, faded }) => (
            <g
              key={`movement-player-${key}`}
              role="button"
              tabIndex={0}
              aria-label={`${player.name}${
                selectedPlayerKey === key ? ", selected" : ", select player"
              }`}
              aria-pressed={selectedPlayerKey === key}
              style={{ cursor: "pointer" }}
              onClick={(event) => selectMarker(event, key)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                selectMarker(event, key);
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
                >
                  {player.name}
                </text>
              </g>
              <rect
                x={anchorX - 37.5}
                y={anchorY - 37.5}
                width={75}
                height={75}
                fill="transparent"
                pointerEvents="all"
                aria-hidden="true"
              />
            </g>
          ))}
      </svg>
    </>
  );
}
