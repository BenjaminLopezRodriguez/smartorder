import {
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  mobile?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
    mobile: true,
  },
  {
    id: "lists",
    label: "Lists",
    href: "/lists",
    icon: LayoutGrid,
    mobile: true,
  },
  {
    id: "order-guides",
    label: "Order guides",
    href: "/order-guides",
    icon: FileSpreadsheet,
    shortLabel: "Guides",
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

export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
