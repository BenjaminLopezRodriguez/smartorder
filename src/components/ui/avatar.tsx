import { cn } from "~/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
}

/**
 * Initial-only avatar — keeps the header calm and avoids loading user images
 * until we have an auth surface.
 */
export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden
      className={cn(
        "bg-brand-soft text-brand-soft-foreground inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold tracking-wide",
        className,
      )}
    >
      {initials || "·"}
    </div>
  );
}
