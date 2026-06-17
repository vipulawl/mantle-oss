"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "◉" },
  { href: "/customers", label: "Customers", icon: "◎" },
  { href: "/revenue", label: "Revenue", icon: "◈" },
  { href: "/reviews", label: "Reviews", icon: "◇" },
  { href: "/activity", label: "Activity", icon: "◑" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-5 border-b border-zinc-800">
        <span className="text-white font-semibold text-sm tracking-wide">mantle-oss</span>
        <span className="block text-zinc-500 text-xs mt-0.5">Shopify App Analytics</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-xs">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
