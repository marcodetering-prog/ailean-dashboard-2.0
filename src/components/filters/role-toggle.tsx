"use client";

import { useFilters, type DashboardRole } from "@/contexts/filter-context";

export function RoleToggle() {
  const { role, setRole } = useFilters();

  return (
    <div className="flex items-center rounded-lg border border-input bg-background p-0.5">
      <button
        onClick={() => setRole("c-level")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          role === "c-level"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        C-Level
      </button>
      <button
        onClick={() => setRole("property-manager")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          role === "property-manager"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Verwalter
      </button>
    </div>
  );
}
