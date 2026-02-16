"use client";

import { useFilters } from "@/contexts/filter-context";

const presets = [
  { label: "Letzte 7 Tage", days: 7 },
  { label: "Letzte 30 Tage", days: 30 },
  { label: "Letzte 90 Tage", days: 90 },
  { label: "Alles", days: null },
];

function getDateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function DateRangePicker() {
  const { dateFrom, dateTo, setDateRange } = useFilters();

  return (
    <div className="flex items-center gap-2">
      {/* Preset buttons */}
      <div className="hidden md:flex items-center gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              if (preset.days === null) {
                setDateRange(null, null);
              } else {
                setDateRange(getDateNDaysAgo(preset.days), getTodayISO());
              }
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              preset.days === null && !dateFrom && !dateTo
                ? "bg-primary text-primary-foreground"
                : preset.days !== null &&
                  dateFrom === getDateNDaysAgo(preset.days)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">Von:</label>
        <input
          type="date"
          value={dateFrom || ""}
          onChange={(e) =>
            setDateRange(e.target.value || null, dateTo)
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <label className="text-xs text-muted-foreground">Bis:</label>
        <input
          type="date"
          value={dateTo || ""}
          onChange={(e) =>
            setDateRange(dateFrom, e.target.value || null)
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>
    </div>
  );
}
