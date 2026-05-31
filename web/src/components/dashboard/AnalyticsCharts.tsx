"use client";

import { Text } from "@mantine/core";
import { AreaChart } from "@mantine/charts";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";

/** Client wrappers — chart components take function props (valueFormatter / activeShape)
 *  that can't cross the Server Component boundary, so we keep them here and pass only data in. */

export function RevenueAreaChart({ data }: { data: { date: string; Venit: number }[] }) {
  return (
    <AreaChart
      h={280}
      data={data}
      dataKey="date"
      series={[{ name: "Venit", color: "brand.6" }]}
      curveType="monotone"
      withGradient
      fillOpacity={0.35}
      strokeWidth={2.5}
      // withDots must be on for activeDotProps to apply — hide the static dots (r:0) and
      // show only the glowing dot that follows the cursor on hover.
      withDots
      dotProps={{ r: 0, strokeWidth: 0 }}
      activeDotProps={{
        r: 5,
        fill: "var(--mantine-color-brand-6)",
        stroke: "var(--mantine-color-body)",
        strokeWidth: 2,
      }}
      tickLine="y"
      valueFormatter={(v) => `${v.toFixed(0)} lei`}
    />
  );
}

type Seg = { name: string; value: number; colorKey: string };

/** Hovered segment: pushed out + soft luminous glow in its own colour. */
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  const glow = `var(--mantine-color-${(payload as Seg).colorKey}-5)`;
  return (
    <g style={{ filter: `drop-shadow(0 0 9px ${glow})` }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={4}
        fill={fill}
      />
    </g>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      style={{
        backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        boxShadow: "var(--mantine-shadow-md)",
        padding: "6px 12px",
        position: "relative",
        zIndex: 20,
      }}
    >
      <Text fz="sm" fw={600}>
        {p.name}
      </Text>
      <Text fz="xs" c="dimmed">
        {p.value} comenzi
      </Text>
    </div>
  );
}

export function StatusDonut({ data, label }: { data: Seg[]; label: string }) {
  return (
    <div style={{ position: "relative", width: 240, height: 240 }}>
      {/* Rendered before the chart so the hover tooltip paints above it; the label
          still shows through the donut's transparent center hole. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Text fw={700} fz={28} lh={1}>
          {label}
        </Text>
        <Text fz="xs" c="dimmed" mt={4}>
          comenzi
        </Text>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {data.map((d, i) => (
              <linearGradient key={i} id={`donut-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--mantine-color-${d.colorKey}-4)`} />
                <stop offset="100%" stopColor={`var(--mantine-color-${d.colorKey}-7)`} />
              </linearGradient>
            ))}
          </defs>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={64}
            outerRadius={92}
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
            activeShape={renderActiveShape}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#donut-grad-${i})`} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
