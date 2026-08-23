"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

// ---- Header Context ----
interface HeaderState {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

const HeaderContext = createContext<{
  header: HeaderState;
  setHeader: (s: HeaderState) => void;
}>({ header: {}, setHeader: () => {} });

export function useDashboardHeader() {
  return useContext(HeaderContext).setHeader;
}

// ---- Nested Layout Detection ----
const IsDashboardLayout = createContext(false);

// ---- Inner Layout ----
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { header, setHeader } = useContext(HeaderContext);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          title={header.title}
          description={header.description}
          actions={header.actions}
          showMobileMenu
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// ---- Public Component ----
export function DashboardLayout({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const isNested = useContext(IsDashboardLayout);

  // If nested, render children only (parent layout has the sidebar)
  if (isNested) {
    return <>{children}</>;
  }

  // Top-level layout: provide header context + sidebar
  const [header, setHeader] = useState<HeaderState>({
    title,
    description,
    actions,
  });

  const stableSetHeader = useCallback(
    (s: HeaderState) => setHeader((prev) => ({ ...prev, ...s })),
    []
  );

  return (
    <IsDashboardLayout.Provider value={true}>
      <HeaderContext.Provider value={{ header, setHeader: stableSetHeader }}>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </HeaderContext.Provider>
    </IsDashboardLayout.Provider>
  );
}
