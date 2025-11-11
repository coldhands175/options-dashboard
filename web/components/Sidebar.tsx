"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type UserProfile } from "@/types";
import {
  LayoutDashboard,
  TrendingUp,
  ListChecks,
  Star,
  Settings,
  LogOut,
  ChevronDown,
  FileCheck,
  BarChart3
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.profiles.getCurrentUserProfile) as UserProfile | undefined;
  const pendingCounts = useQuery(api.pendingTrades.getPendingTradesCounts);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", href: "/transactions", icon: TrendingUp },
    { label: "Active Positions", href: "/positions", icon: ListChecks },
    { label: "Trade Review", href: "/trades/review", icon: FileCheck },
    { label: "Monthly Analytics", href: "/analytics/monthly", icon: BarChart3 },
    { label: "Watchlist", href: "/watchlist", icon: Star },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }

    // Special handling for Settings (includes /settings/profile, etc.)
    if (href === "/settings") {
      return pathname?.startsWith("/settings");
    }

    // Special handling for Watchlist (also activates for /stocks/[symbol])
    if (href === "/watchlist") {
      return pathname?.startsWith("/watchlist") || pathname?.startsWith("/stocks");
    }

    // Special handling for Positions (includes /positions/[...details])
    if (href === "/positions") {
      return pathname?.startsWith("/positions");
    }

    // Special handling for Trade Review
    if (href === "/trades/review") {
      return pathname === "/trades/review";
    }

    // Special handling for Transactions (includes /transactions but NOT /trades/review)
    if (href === "/transactions") {
      return pathname?.startsWith("/transactions") ||
             (pathname?.startsWith("/trades") && pathname !== "/trades/review");
    }

    // Special handling for Monthly Analytics
    if (href === "/analytics/monthly") {
      return pathname?.startsWith("/analytics");
    }

    return pathname?.startsWith(href);
  };

  const getUserInitials = () => {
    if (!currentUser) return "U";
    const name = currentUser.displayName || currentUser.username;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="hidden lg:flex lg:w-[220px] shrink-0 border-r border-border bg-background min-h-screen sticky top-0 flex-col">
      <div className="flex flex-col h-full p-4 space-y-6">
        {/* Logo / Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-base shadow-sm group-hover:shadow-md transition-shadow">
            SC
          </div>
          <span className="text-lg font-bold tracking-tight">Scott Capital</span>
        </Link>

        <Separator />

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const showBadge = item.href === "/trades/review" && (pendingCounts?.pending ?? 0) > 0;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group
                  ${active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "group-hover:scale-110 transition-transform"}`} />
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {showBadge && (
                  <Badge
                    variant={active ? "secondary" : "default"}
                    className="h-5 min-w-5 px-1.5 text-xs font-semibold"
                  >
                    {pendingCounts.pending}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* User Profile Section */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors w-full text-left group">
                <Avatar className="h-9 w-9 border-2 border-border">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {currentUser.displayName || currentUser.username}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    @{currentUser.username}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void signOut().then(() => router.push("/"))}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
