"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";

export type GanttItem = {
  id: string;
  label: string;
  start: number; // ms epoch
  end: number;   // ms epoch
  color?: string;   // CSS color or Tailwind class via style prop
  rowClassName?: string; // Tailwind row bg/hover
};

export type MonthlyPremium = {
  year: number;
  month: number; // 0-11
  netPremium: number; // positive = credit, negative = debit
};

export default function GanttPositions({
  items,
  monthlyPremiums
}: {
  items: GanttItem[];
  monthlyPremiums?: MonthlyPremium[];
}) {
  // Initialize with a fallback value for SSR, then update on client
  const [now, setNow] = useState<number>(() => {
    // Use a stable fallback during SSR based on items
    if (items.length === 0) return 0;
    const mid = items.reduce((sum, i) => sum + i.start + i.end, 0) / (items.length * 2);
    return mid;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update to actual current time on client
    setNow(Date.now());
  }, []);
  const [minStart, maxEnd] = useMemo(() => {
    if (items.length === 0) return [now, now + 1] as const;
    const min = Math.min(...items.map((i) => i.start), now);
    const max = Math.max(...items.map((i) => i.end), now);
    const pad = Math.max(1, Math.round((max - min) * 0.05));
    return [min - pad, max + pad] as const;
  }, [items, now]);

  const range = Math.max(1, maxEnd - minStart);

  // Fixed width per day in pixels (zoom level)
  const PIXELS_PER_DAY = 30;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const totalDays = range / MS_PER_DAY;
  const timelineWidth = totalDays * PIXELS_PER_DAY;

  // Convert timestamp to pixel position
  const toPx = (t: number) => ((t - minStart) / range) * timelineWidth;

  // Weekly ticks for better granularity
  const weeklyTicks = useMemo(() => {
    const list: Array<{ t: number; left: number; isMonthStart: boolean }> = [];
    const startD = new Date(minStart);

    // Start from the beginning of the week containing minStart
    const current = new Date(startD);
    current.setHours(0, 0, 0, 0);
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to Monday
    current.setDate(current.getDate() - daysToMonday);

    while (current.getTime() <= maxEnd) {
      const t = current.getTime();
      if (t >= minStart) {
        const isMonthStart = current.getDate() <= 7; // First week of month
        list.push({
          t,
          left: toPx(t),
          isMonthStart
        });
      }
      current.setDate(current.getDate() + 7); // Next week
    }

    return list;
  }, [minStart, maxEnd, timelineWidth]);

  // Monthly expiration ticks: 3rd Friday of each month across range
  function thirdFridayEpochMs(year: number, monthIndex0: number): number {
    const first = new Date(year, monthIndex0, 1);
    const dow = first.getDay(); // 0..6
    const toFirstFriday = (5 - dow + 7) % 7; // Friday=5
    const firstFriday = 1 + toFirstFriday;
    const thirdFriday = firstFriday + 14;
    const d = new Date(year, monthIndex0, thirdFriday, 17, 0, 0, 0); // 5pm local
    return d.getTime();
  }

  const expirationTicks = useMemo(() => {
    const startD = new Date(minStart);
    const endD = new Date(maxEnd);
    const list: Array<{ t: number; left: number }> = [];
    let y = startD.getFullYear();
    let m = startD.getMonth();
    while (y < endD.getFullYear() || (y === endD.getFullYear() && m <= endD.getMonth())) {
      const t = thirdFridayEpochMs(y, m);
      if (t >= minStart && t <= maxEnd) {
        list.push({ t, left: toPx(t) });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return list;
  }, [minStart, maxEnd, timelineWidth]);

  // Create a map of monthly premiums by year-month key
  const premiumMap = useMemo(() => {
    if (!monthlyPremiums) return new Map<string, number>();
    const map = new Map<string, number>();
    monthlyPremiums.forEach(({ year, month, netPremium }) => {
      map.set(`${year}-${month}`, netPremium);
    });
    return map;
  }, [monthlyPremiums]);

  // Scroll to today's date on mount
  useEffect(() => {
    if (scrollContainerRef.current && now) {
      const todayPx = toPx(now);
      const containerWidth = scrollContainerRef.current.clientWidth;
      // Center today's date in the viewport
      scrollContainerRef.current.scrollLeft = todayPx - containerWidth / 2;
    }
  }, [now, timelineWidth]);

  return (
    <div className="w-full border rounded flex">
      {/* Sticky left column with contract labels */}
      <div className="flex-shrink-0 border-r bg-background">
        {/* Header for left column */}
        <div className="sticky top-0 z-20 h-12 border-b bg-background flex items-center px-3">
          <div className="text-sm font-bold text-muted-foreground">Contract</div>
        </div>

        {/* Labels column */}
        <div className="divide-y">
          {items.map((it) => (
            <div key={it.id} className={`h-10 px-3 flex items-center ${it.rowClassName ?? "hover:bg-accent/40"}`}>
              <div className="text-xs font-medium whitespace-nowrap">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline section */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto">
        {/* Timeline container with fixed width */}
        <div style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
          {/* Header scale */}
          <div className="sticky top-0 z-10 text-sm font-bold text-muted-foreground bg-background">
            <div className="relative h-12 border-b">
              {/* Weekly ticks */}
              {weeklyTicks.map(({ t, left, isMonthStart }, i) => {
                const date = new Date(t);
                return (
                  <div
                    key={i}
                    className={`absolute top-0 h-12 flex items-end pb-1 ${isMonthStart ? 'border-l-2' : 'border-l'}`}
                    style={{ left: `${left}px` }}
                  >
                    {isMonthStart && (
                      <div className="translate-x-1 px-1 whitespace-nowrap text-xs">
                        {date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Expiration ticks with premiums */}
              {expirationTicks.map(({ t, left }, i) => {
                const date = new Date(t);
                const year = date.getFullYear();
                const month = date.getMonth();
                const premium = premiumMap.get(`${year}-${month}`) ?? null;

                return (
                  <div
                    key={`exp-${i}`}
                    className="absolute top-0 h-12 border-l-2 border-blue-500 flex items-center"
                    style={{ left: `${left}px` }}
                  >
                    <div className="translate-x-1 px-1 whitespace-nowrap flex items-center gap-1.5 text-xs bg-background">
                      <span className="text-blue-600">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      {premium !== null && (
                        <>
                          <span>—</span>
                          <span className={premium >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {premium >= 0 ? '+' : ''}${Math.abs(premium).toFixed(0)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `${toPx(now)}px` }}
              />
            </div>
          </div>

          {/* Rows with gantt bars */}
          <div className="divide-y">
            {items.map((it) => {
              const left = Math.max(0, toPx(it.start));
              const width = Math.max(10, toPx(it.end) - left);
              return (
                <div key={it.id} className={`relative h-10 ${it.rowClassName ?? "hover:bg-accent/40"}`}>
                  <div
                    className="absolute top-2 h-6 rounded shadow-sm"
                    style={{ left: `${left}px`, width: `${width}px`, background: it.color ?? "#64748b" }}
                    title={`${it.label}: ${new Date(it.start).toLocaleDateString()} → ${new Date(it.end).toLocaleDateString()}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}