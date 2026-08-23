"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({
  title,
  description,
  actions,
  showMobileMenu,
  onMobileMenuToggle,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="border-b bg-card shrink-0">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-3 min-w-0">
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={onMobileMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            {title && (
              <h1 className="text-lg md:text-xl font-semibold truncate">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground truncate hidden sm:block">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>No new notifications</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Page actions */}
          {actions}
        </div>
      </div>
    </header>
  );
}
