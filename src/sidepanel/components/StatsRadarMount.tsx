import { useMemo } from "react";
import type { Stat } from "../../data/schema";

interface Props {
  stats: Partial<Record<Stat, number>>;
  axes: Stat[];
  max?: number;
  theme?: "dark" | "light";
}

export function StatsRadarMount({ stats, axes, max = 60, theme = "dark" }: Props) {
  const statsAttr = useMemo(() => JSON.stringify(stats), [stats]);
  const axesAttr = useMemo(() => JSON.stringify(axes), [axes]);

  return (
    <stats-radar
      stats={statsAttr}
      axes={axesAttr}
      max={max}
      theme={theme}
    />
  );
}
