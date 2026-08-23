"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface HeaderState {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

interface DashboardHeaderContextType {
  header: HeaderState;
  setHeader: (state: HeaderState) => void;
}

const DashboardHeaderContext = createContext<DashboardHeaderContextType>({
  header: {},
  setHeader: () => {},
});

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<HeaderState>({});

  return (
    <DashboardHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader() {
  const { setHeader } = useContext(DashboardHeaderContext);
  return setHeader;
}

export function useHeaderState() {
  const { header } = useContext(DashboardHeaderContext);
  return header;
}
