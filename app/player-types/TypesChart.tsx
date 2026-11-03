
import styles from "./TypesChart.module.css";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
  type Language,
} from "../../lib/utils";

type TypesChartProps = {
  player: {
    x: number;
    y: number;
  };
  language: Language;
};

const dimension = 101;
const padding = 46;
const step = 10;
const plot = dimension * step;
const canvas = plot + padding * 2;
const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

const typeColors = [
  "#ffc400",
  "#ff8700",
  "#fff4a3",
  "#fff100",
  "#ff3030",
  "#f020f5",
  "#ff9198",
  "#f7bcf4",
  "#05ed00",
  "#089cf4",
  "#ffffff",
  "#00c9ee",
] as const;

function createChart() {
  const cells = new Uint8Array(dimension * dimension);
  const regions = Array.from(
    { length: typeColors.length },
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

      regions[type] +=
        `M${x} ${top}h${width}v${step}h-${width}Z`;

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

export default function TypesChart({
  player,
  language,
}: TypesChartProps) {

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${canvas} ${canvas}`}
      role="img"
      aria-label="NPFC Player Types"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g shapeRendering="crispEdges">
        {chart.regions.map((path, type) => (
          <path
            key={type}
            d={path}
            style={{ fill: PLAYER_TYPE_COLORS[type] }}
          />
        ))}
      </g>

      <g
        className={styles.grid}
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
        shapeRendering="crispEdges"
      />

      <rect
        x={padding}
        y={padding}
        width={plot}
        height={plot}
        className={styles.frame}
      />

      <g className={styles.ticks}>
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

      <g className={styles.labels}>
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

      <g>
        <image
          href="/Dummy.png"
          x={padding + (player.x + 0.5) * step - 37.5}
          y={padding + (100.5 - player.y) * step - 37.5}
          width={75}
          height={75}
          preserveAspectRatio="xMidYMid meet"
        />
        <text
          x={padding + (player.x + 0.5) * step}
          y={padding + (100.5 - player.y) * step + 45}
          textAnchor="middle"
          fontSize={25}
          fill="#000"
        >
          Dummy
        </text>
      </g>
    </svg>
  );
}
