import { cn } from "@/lib/utils";
import {
  type ThresholdColor,
  getThresholdClasses,
} from "@/lib/utils/thresholds";

interface StatusBadgeProps {
  label: string;
  color?: ThresholdColor;
  variant?: "default" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  label,
  color = "blue",
  variant = "default",
  size = "sm",
  className,
}: StatusBadgeProps) {
  const colors = getThresholdClasses(color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        variant === "default"
          ? cn(colors.bg, colors.text)
          : cn("border", colors.border, colors.text),
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {label}
    </span>
  );
}
