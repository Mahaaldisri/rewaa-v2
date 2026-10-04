import { useMemo } from "react";
import type { MonthlyPoint } from "@/types/calculator";
import { formatRiyals } from "@/lib/calculator-logic";

interface Props {
  timeline: MonthlyPoint[];
  breakEvenMonth: number | null;
  /** Used by the accessible summary. */
  monthsLabel: string;
}

/**
 * Lightweight cumulative-cost chart drawn with plain SVG — no chart library, so
 * the homepage never ships charting code and the calculator page stays light.
 *
 * Accessibility: the chart is decorative (`aria-hidden`) and the same
 * information is exposed as text + a small table right underneath.
 */
const WIDTH = 720;
const HEIGHT = 300;
const PAD = { top: 18, right: 16, bottom: 34, left: 62 };

export default function BreakEvenChart({ timeline, breakEvenMonth, monthsLabel }: Props) {

  const geometry = useMemo(() => {
    if (timeline.length === 0) return null;
    const maxValue = Math.max(
      timeline[timeline.length - 1].bottledCumulative,
      timeline[timeline.length - 1].filterCumulative,
      1
    );
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (month: number) => PAD.left + ((month - 1) / Math.max(1, timeline.length - 1)) * innerW;
    const y = (value: number) => PAD.top + innerH - (value / maxValue) * innerH;

    const line = (key: "bottledCumulative" | "filterCumulative") =>
      timeline.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.month).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");

    const breakPoint = breakEvenMonth ? timeline.find((point) => point.month === breakEvenMonth) : undefined;

    return {
      maxValue,
      x,
      y,
      bottledPath: line("bottledCumulative"),
      filterPath: line("filterCumulative"),
      breakPoint,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        value: maxValue * ratio,
        y: y(maxValue * ratio),
      })),
      monthTicks: [1, Math.round(timeline.length / 2), timeline.length].filter(
        (month, index, all) => all.indexOf(month) === index
      ),
    };
  }, [timeline, breakEvenMonth]);

  if (!geometry) return null;
  const { maxValue, x, y, bottledPath, filterPath, breakPoint, ticks, monthTicks } = geometry;
  const last = timeline[timeline.length - 1];

  return (
    <figure className="rounded-xl border border-ink-100 bg-surface p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-[14px] font-extrabold text-ink-950">التكلفة التراكمية عبر {monthsLabel}</h3>
        <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-ink-600">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-brand-700" aria-hidden="true" />
            شراء المياه
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-flow-600" aria-hidden="true" />
            امتلاك الفلتر
          </span>
        </div>
      </figcaption>

      <div className="mt-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-hidden="true"
          focusable="false"
        >
          {ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                className="text-ink-100"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" className="fill-ink-400 text-[11px]">
                {Math.round(tick.value).toLocaleString("ar-SA")}
              </text>
            </g>
          ))}

          <path d={bottledPath} fill="none" stroke="currentColor" className="text-brand-700" strokeWidth="2.5" strokeLinejoin="round" />
          <path d={filterPath} fill="none" stroke="currentColor" className="text-flow-600" strokeWidth="2.5" strokeLinejoin="round" />

          {breakPoint && (
            <>
              <line
                x1={x(breakPoint.month)}
                x2={x(breakPoint.month)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="currentColor"
                className="text-warning"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <circle cx={x(breakPoint.month)} cy={y(breakPoint.filterCumulative)} r="5" className="fill-warning" />
              <text
                x={Math.min(WIDTH - PAD.right - 4, Math.max(PAD.left + 4, x(breakPoint.month)))}
                y={PAD.top + 12}
                textAnchor="middle"
                className="fill-ink-800 text-[11px] font-bold"
              >
                بداية التوفير — الشهر {breakPoint.month}
              </text>
            </>
          )}

          {monthTicks.map((month) => (
            <text key={month} x={x(month)} y={HEIGHT - 12} textAnchor="middle" className="fill-ink-400 text-[11px]">
              {month}
            </text>
          ))}
          <text x={WIDTH - PAD.right} y={HEIGHT - 1} textAnchor="end" className="fill-ink-400 text-[10px]">
            الشهور
          </text>
        </svg>
      </div>

      {/* Text alternative — the same facts, readable by assistive technology. */}
      <details className="mt-3 rounded-lg border border-ink-100 bg-paper p-3">
        <summary className="cursor-pointer text-[12px] font-bold text-ink-800">ملخص الرسم بالأرقام</summary>
        <ul className="mt-2 space-y-1 text-[12px] leading-6 text-ink-600">
          <li>
            نهاية المدة ({last.month} شهرًا): تكلفة المياه المشتراة {formatRiyals(last.bottledCumulative)} مقابل تكلفة الفلتر{" "}
            {formatRiyals(last.filterCumulative)}.
          </li>
          <li>
            {breakPoint
              ? `نقطة التعادل عند الشهر ${breakPoint.month}.`
              : "لا توجد نقطة تعادل خلال المدة المختارة."}
          </li>
          <li>أعلى قيمة على المحور الرأسي: {formatRiyals(maxValue)}.</li>
        </ul>
      </details>
    </figure>
  );
}
