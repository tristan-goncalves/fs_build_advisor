const DEFAULT_AXES = ["VIG", "ATT", "END", "VIT", "STR", "DEX", "INT", "FTH", "LCK"];

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 40;

interface ParsedAttrs {
  stats: Record<string, number>;
  max: number;
  theme: "dark" | "light";
  axes: string[];
}

export class StatsRadarElement extends HTMLElement {
  static get observedAttributes() {
    return ["stats", "max", "theme", "axes"];
  }

  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  private parseAttrs(): ParsedAttrs {
    let stats: Record<string, number> = {};
    try {
      const raw = this.getAttribute("stats");
      if (raw) stats = JSON.parse(raw);
    } catch {
      stats = {};
    }

    let axes: string[] = DEFAULT_AXES;
    try {
      const raw = this.getAttribute("axes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          axes = parsed;
        }
      }
    } catch {
    }

    const maxAttr = this.getAttribute("max");
    const max = maxAttr ? Math.max(1, Number(maxAttr) || 60) : 60;

    const theme = this.getAttribute("theme") === "light" ? "light" : "dark";

    return { stats, max, theme, axes };
  }

  private render() {
    const { stats, max, theme, axes } = this.parseAttrs();
    const colors = themeColors(theme);

    const pointsAt = (ratio: number) =>
      axes.map((_, i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const r = RADIUS * ratio;
        return [CENTER + Math.cos(angle) * r, CENTER + Math.sin(angle) * r] as const;
      });

    const ringRatios = [0.25, 0.5, 0.75, 1];
    const rings = ringRatios
      .map((r) => {
        const pts = pointsAt(r)
          .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
          .join(" ");
        return `<polygon points="${pts}" fill="none" stroke="${colors.grid}" stroke-width="1" />`;
      })
      .join("");

    const axesLines = pointsAt(1)
      .map(
        ([x, y]) =>
          `<line x1="${CENTER}" y1="${CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${colors.grid}" stroke-width="1" />`,
      )
      .join("");

    const valuePoints = axes.map((axis, i) => {
      const value = Number.isFinite(stats[axis]) ? Math.max(0, Math.min(max, stats[axis] as number)) : 0;
      const ratio = value / max;
      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const r = RADIUS * ratio;
      const x = CENTER + Math.cos(angle) * r;
      const y = CENTER + Math.sin(angle) * r;
      return [x, y, axis, value] as const;
    });

    const polygon = valuePoints
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");

    const valueDots = valuePoints
      .map(
        ([x, y]) =>
          `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${colors.accent}" stroke="${colors.bg}" stroke-width="1.5" />`,
      )
      .join("");

    const labels = valuePoints
      .map(([, , axis, value], i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const labelR = RADIUS + 18;
        const lx = CENTER + Math.cos(angle) * labelR;
        const ly = CENTER + Math.sin(angle) * labelR;
        const anchor =
          Math.abs(Math.cos(angle)) < 0.3
            ? "middle"
            : Math.cos(angle) > 0
              ? "start"
              : "end";
        return `
          <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" class="axis-label">${axis}</text>
          <text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" class="axis-value">${value}</text>
        `;
      })
      .join("");

    this.root.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: ${SIZE}px;
          margin: 0 auto;
        }
        svg {
          width: 100%;
          height: auto;
          display: block;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .axis-label {
          fill: ${colors.label};
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .axis-value {
          fill: ${colors.accent};
          font-size: 12px;
          font-weight: 700;
        }
        .build-shape {
          fill: ${colors.accent};
          fill-opacity: 0.18;
          stroke: ${colors.accent};
          stroke-width: 2;
          stroke-linejoin: round;
        }
      </style>
      <svg viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Graphique radar des stats du build">
        <g>${rings}</g>
        <g>${axesLines}</g>
        <polygon class="build-shape" points="${polygon}" />
        ${valueDots}
        ${labels}
      </svg>
    `;
  }
}

function themeColors(theme: "dark" | "light") {
  if (theme === "light") {
    return {
      bg: "#fafaf7",
      grid: "rgba(0,0,0,0.18)",
      accent: "#a87d3d",
      label: "#3f3f3f",
    };
  }
  return {
    bg: "#100e0c",
    grid: "rgba(200,162,90,0.22)",
    accent: "#d4af6a",
    label: "#cfc6b0",
  };
}

if (!customElements.get("stats-radar")) {
  customElements.define("stats-radar", StatsRadarElement);
}
