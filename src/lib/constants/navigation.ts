// ============================================================
// Sidebar navigation configuration
// ============================================================

import {
  LayoutDashboard,
  Wrench,
  DollarSign,
  Building2,
  TrendingUp,
  BarChart3,
  GitCompareArrows,
  Brain,
  Bug,
  ClipboardCheck,
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
        label: "Handwerker",
        href: "/handwerker",
        icon: Wrench,
      },
      {
        label: "Kosten & Strategie",
        href: "/kosten",
        icon: DollarSign,
      },
      {
        label: "Liegenschaften",
        href: "/liegenschaften",
        icon: Building2,
      },
      {
        label: "ROI",
        href: "/roi",
        icon: TrendingUp,
      },
      {
        label: "Insights",
        href: "/insights",
        icon: BarChart3,
      },
      {
        label: "Benchmark",
        href: "/benchmark",
        icon: GitCompareArrows,
      },
    ],
  },
  {
    title: "AI & Qualitaet",
    items: [
      {
        label: "AI Qualitaet",
        href: "/ai-quality",
        icon: Brain,
        isNew: true,
      },
      {
        label: "Bug Tracker",
        href: "/bug-tracker",
        icon: Bug,
        isNew: true,
      },
      {
        label: "Review Queue",
        href: "/review-queue",
        icon: ClipboardCheck,
        isNew: true,
      },
    ],
  },
];
