import React from "react";
import { BiomassEntry, WasteCategory } from "../types";
import { Scale, BarChart3, TrendingUp, Calendar, Trash2 } from "lucide-react";
import { motion } from "motion/react";

interface AnalyticsViewProps {
  entries: BiomassEntry[];
}

export default function AnalyticsView({ entries }: AnalyticsViewProps) {
  // Get totals
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);

  // Group by category
  const categoriesList: WasteCategory[] = [
    "Vegetable Waste",
    "Fruit Waste",
    "Food Waste",
    "Garden Waste",
    "Paper"
  ];

  const categoryColors: Record<WasteCategory, { bg: string; fill: string; border: string }> = {
    "Vegetable Waste": { bg: "bg-natural-primary", fill: "#5C7C59", border: "border-natural-border/50" },
    "Fruit Waste": { bg: "bg-natural-accent", fill: "#D48C46", border: "border-natural-border/50" },
    "Food Waste": { bg: "bg-[#B05B3C]", fill: "#B05B3C", border: "border-natural-border/50" },
    "Garden Waste": { bg: "bg-[#4B6E80]", fill: "#4B6E80", border: "border-natural-border/50" },
    "Paper": { bg: "bg-[#8E8670]", fill: "#8E8670", border: "border-natural-border/50" }
  };

  const categoryWeights = categoriesList.map((cat) => {
    const wt = entries.filter((e) => e.category === cat).reduce((sum, e) => sum + e.weight, 0);
    const pct = totalWeight > 0 ? (wt / totalWeight) * 100 : 0;
    return {
      category: cat,
      weight: wt,
      percentage: pct,
      color: categoryColors[cat]
    };
  });

  // Calculate 7-Day activity chart
  // Group entries by day of week for the last 7 days
  const get7DaysRange = () => {
    const result = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        dateStr: d.toDateString(),
        dayLabel: daysOfWeek[d.getDay()],
        rawDate: d,
        weight: 0
      });
    }
    return result;
  };

  const last7Days = get7DaysRange();
  
  // Aggregate entry weights into matching days
  entries.forEach((e) => {
    const entryDateStr = new Date(e.createdAt).toDateString();
    const matchDay = last7Days.find((d) => d.dateStr === entryDateStr);
    if (matchDay) {
      matchDay.weight += e.weight;
    }
  });

  // Find max weight for chart scaling
  const maxWeightInChart = Math.max(...last7Days.map((d) => d.weight), 5); // default min height is 5kg

  // SVG dimensions for 7-day activity chart
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  // Compute point coordinates
  const points = last7Days.map((d, index) => {
    const x = paddingX + (index * (svgWidth - paddingX * 2)) / 6;
    // Scale y coordinate (higher weight = smaller Y value in SVG)
    const y = svgHeight - paddingY - (d.weight / maxWeightInChart) * (svgHeight - paddingY * 2);
    return { x, y, dayLabel: d.dayLabel, weight: d.weight };
  });

  // Path commands for SVG Area Chart
  const pathData = points.reduce((str, pt, i) => {
    return str + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
  }, "");

  // Path for shaded area gradient
  const areaPathData = points.length > 0
    ? `${pathData} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : "";

  return (
    <div id="analytics_view" className="space-y-6 pb-24">
      
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-natural-dark">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-natural-dark/65 mt-1 font-medium">
          Analyze daily loads, organic ratios, and biomass waste composition trends.
        </p>
      </div>

      {/* 7-Day Activity Chart Card */}
      <div className="rounded-[2rem] bg-natural-cream p-5 border border-natural-border/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans text-sm font-bold text-natural-dark flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-natural-primary" /> 7-Day Bio-Load Activity
            </h3>
            <p className="text-[11px] text-natural-dark/50 mt-0.5 font-mono">Tracking biomass loading in kilograms (kg)</p>
          </div>
          <span className="text-[10px] font-bold text-natural-primary bg-natural-bg border border-natural-border/60 px-2.5 py-0.5 rounded-full uppercase font-mono">
            Active
          </span>
        </div>

        {/* SVG Drawing Area */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-natural-bg rounded-2xl border border-natural-border/40">
            <BarChart3 className="h-8 w-8 text-natural-primary/30 animate-pulse mb-2" />
            <p className="text-xs text-natural-dark/50 font-mono">No loading trends available yet.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[420px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                <defs>
                  {/* Area fill gradient */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5C7C59" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#5C7C59" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = paddingY + ratio * (svgHeight - paddingY * 2);
                  const gridVal = maxWeightInChart * (1 - ratio);
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#DCE8D9"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="font-mono text-[9px] fill-natural-dark/60 font-bold"
                      >
                        {gridVal.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area under Curve */}
                {areaPathData && <path d={areaPathData} fill="url(#areaGrad)" />}

                {/* Line Curve path */}
                {pathData && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#5C7C59"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive circles & data points */}
                {points.map((pt, i) => {
                  return (
                    <g key={i} className="group">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#ffffff"
                        stroke="#5C7C59"
                        strokeWidth="2.5"
                        className="hover:scale-125 transition-transform"
                      />
                      {pt.weight > 0 && (
                        <g>
                          {/* tooltip pill */}
                          <rect
                            x={pt.x - 18}
                            y={pt.y - 25}
                            width="36"
                            height="15"
                            rx="4"
                            fill="#1C3020"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 15}
                            textAnchor="middle"
                            className="font-mono text-[9px] font-bold fill-white"
                          >
                            {pt.weight.toFixed(1)}
                          </text>
                        </g>
                      )}
                      {/* X axis labels */}
                      <text
                        x={pt.x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className="text-[10px] font-semibold fill-natural-dark/60 font-mono"
                      >
                        {pt.dayLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Organic Ratio Composition */}
      <div className="rounded-[2rem] bg-natural-cream p-6 border border-natural-border/70 shadow-sm space-y-4">
        <div>
          <h3 className="font-sans text-sm font-bold text-natural-dark flex items-center gap-1.5">
            <BarChart3 className="h-4.5 w-4.5 text-natural-primary" /> Organic Ratio Composition
          </h3>
          <p className="text-[11px] text-natural-dark/50 mt-0.5 font-mono">Distribution of logged kitchen biomass types</p>
        </div>

        {totalWeight === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-natural-bg rounded-2xl border border-natural-border/40">
            <TrendingUp className="h-8 w-8 text-natural-primary/30 animate-pulse mb-2" />
            <p className="text-xs text-natural-dark/50 font-mono">Add a biomass log to calculate ratios.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {categoryWeights.map((cw) => {
              return (
                <div key={cw.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-natural-dark">{cw.category}</span>
                    <span className="text-natural-dark/80 font-mono font-bold">
                      {cw.weight.toFixed(1)} kg <span className="text-[10px] text-natural-dark/50 font-medium">({cw.percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  
                  {/* Progress Bar Track */}
                  <div className="h-3 w-full bg-natural-bg rounded-full overflow-hidden relative border border-natural-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cw.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${cw.color.bg} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
