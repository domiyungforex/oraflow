"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { LogOut, Settings } from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: "📊" },
  { name: "Orders", href: "/dashboard/orders", icon: "📦" },
  { name: "Products", href: "/dashboard/products", icon: "🏷️" },
  { name: "Customers", href: "/dashboard/customers", icon: "👥" },
  { name: "Inventory", href: "/dashboard/inventory", icon: "📋" },
  { name: "Conversations", href: "/dashboard/conversations", icon: "💬" },
  { name: "Payments", href: "/dashboard/payments", icon: "💳" },
  { name: "Deliveries", href: "/dashboard/deliveries", icon: "🚚" },
  { name: "Automations", href: "/dashboard/automations", icon: "⚡" },
  { name: "Analytics", href: "/dashboard/analytics", icon: "📈" },
  { name: "Integrations", href: "/dashboard/integrations", icon: "🔗" },
  { name: "Team", href: "/dashboard/team", icon: "👤" },
  { name: "Billing", href: "/dashboard/billing", icon: "💰" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.emailAddresses?.[0]?.emailAddress || "User";

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">OF</span>
        </div>
        <span className="text-xl font-bold">OrderFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-9 h-9 rounded-full"
            />
          ) : (
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{userInitials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.emailAddresses?.[0]?.emailAddress}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
