// ============================================================
// Sidebar navigation configuration
// ============================================================

import {
  LayoutDashboard,
  FileWarning,
  ClipboardList,
  Heart,
  TrendingUp,
  Brain,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  isNew?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    items: [
      {
        label: "Uebersicht",
        href: "/uebersicht",
        icon: LayoutDashboard,
      },
      {
        label: "Maengel-Analyse",
        href: "/maengel",
        icon: FileWarning,
      },
      {
        label: "Berichte",
        href: "/berichte",
        icon: ClipboardList,
      },
      {
        label: "Stimmung & Mieter",
        href: "/stimmung",
        icon: Heart,
      },
      {
        label: "ROI",
        href: "/roi",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Erweitert",
    items: [
      {
        label: "AI Performance",
        href: "/ai-performance",
        icon: Brain,
      },
      {
        label: "NOVAC Review",
        href: "/novac",
        icon: Building2,
      },
    ],
  },
];
