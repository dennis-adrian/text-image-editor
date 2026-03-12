"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background">
      <div className="container mx-auto px-4 max-w-7xl flex items-center gap-6 h-12">
        <Link
          href="/"
          className={`text-sm font-medium transition-colors hover:text-foreground ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Editor
        </Link>
        <Link
          href="/print"
          className={`text-sm font-medium transition-colors hover:text-foreground ${
            pathname === "/print" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          Print Layout
        </Link>
      </div>
    </nav>
  );
}
