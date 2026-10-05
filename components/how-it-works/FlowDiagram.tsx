/**
 * How a verdict is made, drawn: the sources on the left feed the rules,
 * which settle on one of the verdict colors. Pulses of light travel each
 * line (CSS stroke-dashoffset, see .flow-pulse in globals.css); with reduced
 * motion the lines are simply drawn, still. Pure SVG, no client JS.
 */
const SOURCE_Y = [70, 160, 250, 340];
const RULES = { x: 400, y: 205 };
const VERDICTS = [
  { y: 110, color: "var(--color-pass)" },
  { y: 205, color: "var(--color-fail)" },
  { y: 300, color: "var(--color-unsure)" },
];
const VERDICT_X = 640;

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

export default function FlowDiagram({ labels }: { labels: { rules: string; verdict: string; forums: string } }) {
  const sources = ["Steam", "SteamHunters", "Achievement Scouts", labels.forums];
  const sourcePaths = SOURCE_Y.map((y) => curve(196, y, RULES.x - 60, RULES.y));
  const verdictPaths = VERDICTS.map((v) => curve(RULES.x + 60, RULES.y, VERDICT_X - 14, v.y));

  return (
    <svg viewBox="0 0 720 410" className="h-auto w-full" aria-hidden>
      {/* Base lines */}
      {[...sourcePaths, ...verdictPaths].map((d) => (
        <path key={d} d={d} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="1" />
      ))}
      {/* Traveling pulses, staggered */}
      {sourcePaths.map((d, i) => (
        <path
          key={`p-${d}`}
          d={d}
          fill="none"
          stroke="rgb(255 255 255 / 0.75)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="flow-pulse"
          style={{ animationDelay: `${-i * 1.1}s` }}
        />
      ))}
      {verdictPaths.map((d, i) => (
        <path
          key={`v-${d}`}
          d={d}
          fill="none"
          stroke={VERDICTS[i].color}
          strokeWidth="1.5"
          strokeLinecap="round"
          className="flow-pulse"
          style={{ animationDelay: `${-0.6 - i * 1.5}s`, animationDuration: "5.5s" }}
        />
      ))}

      {/* Source nodes */}
      {sources.map((name, i) => (
        <g key={name}>
          <rect x="16" y={SOURCE_Y[i] - 18} width="180" height="36" fill="var(--color-void)" stroke="rgb(255 255 255 / 0.22)" />
          <text x="30" y={SOURCE_Y[i] + 5} fill="var(--color-ash)" fontSize="13">
            {name}
          </text>
        </g>
      ))}

      {/* Rules node */}
      <rect x={RULES.x - 60} y={RULES.y - 22} width="120" height="44" fill="var(--color-void)" stroke="rgb(255 255 255 / 0.5)" />
      <text x={RULES.x} y={RULES.y + 5} fill="var(--color-chalk)" fontSize="14" fontWeight="600" textAnchor="middle">
        {labels.rules}
      </text>

      {/* Verdicts */}
      {VERDICTS.map((v) => (
        <g key={v.y}>
          <circle cx={VERDICT_X} cy={v.y} r="13" fill="none" stroke={v.color} strokeOpacity="0.35" />
          <circle cx={VERDICT_X} cy={v.y} r="6" fill={v.color} />
        </g>
      ))}
      <text x={VERDICT_X} y="360" fill="var(--color-graphite)" fontSize="13" textAnchor="middle">
        {labels.verdict}
      </text>
    </svg>
  );
}
