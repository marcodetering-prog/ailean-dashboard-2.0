"use client";

import { useState } from "react";
import { FilterProvider } from "@/contexts/filter-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Menu, X } from "lucide-react";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <FilterProvider>
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile, shown on md+ */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar />
        </div>

        <div className="flex-1 md:ml-64">
          {/* Mobile header with hamburger */}
          <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-4 py-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-md p-2 hover:bg-accent"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-semibold">AILEAN KPI</span>
          </div>

          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    </FilterProvider>
  );
}
