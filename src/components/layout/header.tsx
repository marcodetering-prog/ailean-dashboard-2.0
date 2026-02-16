"use client";

import { DateRangePicker } from "@/components/filters/date-range-picker";
import { BrandFilter } from "@/components/filters/brand-filter";
import { RoleToggle } from "@/components/filters/role-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 py-3">
      <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
        <DateRangePicker />
        <div className="h-6 w-px bg-border hidden md:block" />
        <BrandFilter />
        <div className="h-6 w-px bg-border hidden md:block" />
        <RoleToggle />
      </div>
    </header>
  );
}
