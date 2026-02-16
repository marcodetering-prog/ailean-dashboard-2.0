"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/constants/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              A
            </div>
            <span className="text-lg font-semibold">AILEAN</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 hover:bg-sidebar-accent transition-colors"
          title={collapsed ? "Sidebar einblenden" : "Sidebar ausblenden"}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto h-[calc(100vh-4rem)]">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section divider */}
            {section.title && (
              <div
                className={cn(
                  "mt-4 mb-2 px-3",
                  collapsed && "mt-4 mb-2 px-0"
                )}
              >
                {!collapsed && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </span>
                )}
                {collapsed && (
                  <div className="mx-auto h-px w-8 bg-border" />
                )}
              </div>
            )}

            {/* Nav items */}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {!collapsed && item.isNew && (
                    <span className="ml-auto rounded-full bg-kpi-blue px-2 py-0.5 text-[10px] font-semibold text-white">
                      NEU
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
