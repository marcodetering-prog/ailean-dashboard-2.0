"use client";

import { useFilters } from "@/contexts/filter-context";
import type { Brand } from "@/lib/types/database";

const brandOptions: { value: Brand | "all"; label: string }[] = [
  { value: "all", label: "Alle Marken" },
  { value: "peterhalter", label: "Peter Halter" },
  { value: "novac", label: "Novac" },
];

export function BrandFilter() {
  const { brand, setBrand } = useFilters();

  return (
    <select
      value={brand}
      onChange={(e) => setBrand(e.target.value as Brand | "all")}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {brandOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
