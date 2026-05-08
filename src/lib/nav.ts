import {
  Boxes,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  /** Stable id used as React key and analytics handle. */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Short label used in the mobile bottom nav where horizontal space is tight.
   * Falls back to `label` when omitted.
   */
  shortLabel?: string;
  /** When true, the item is shown in the mobile bottom nav. */
  mobile?: boolean;
};

/**
 * Single source of truth for primary navigation.
 * Sidebar (desktop) and bottom nav (mobile) both render from this list.
 *
 * Keep the order operational: Dashboard → Search → Lists → BackroomVision → Settings.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    mobile: true,
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    icon: Search,
    mobile: true,
  },
  {
    id: "lists",
    label: "Lists",
    href: "/lists",
    icon: ListChecks,
    mobile: true,
  },
  {
    id: "backroom",
    label: "BackroomVision",
    shortLabel: "Backroom",
    href: "/backroom",
    icon: Boxes,
    mobile: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    mobile: true,
  },
];

export function getMobileNav(): NavItem[] {
  return PRIMARY_NAV.filter((item) => item.mobile);
}

/**
 * Returns true when `pathname` belongs to the section owned by `href`.
 * Exact match for "/" prefixes any nested screens (e.g. /lists/123).
 */
export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
