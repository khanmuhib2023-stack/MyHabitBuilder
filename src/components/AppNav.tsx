"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { ui } from "@/lib/uiClasses";

const linkBase =
  "rounded-full px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]/30";

export default function AppNav() {
  const pathname = usePathname();

  const item = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`${linkBase} ${active ? ui.navLinkActive : ui.navLink}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className={`sticky top-0 z-40 ${ui.nav}`}>
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {item("/", "Today")}
          {item("/graphs", "Graphs")}
          {item("/comments", "Comments")}
          {item("/settings", "Settings")}
        </div>
        <UserMenu />
      </div>
    </nav>
  );
}
