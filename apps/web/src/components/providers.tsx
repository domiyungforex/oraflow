"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { setTokenProvider } from "@/lib/api";

function TokenSetup() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "hsl(221.2, 83.2%, 53.3%)",
          colorBackground: "hsl(0, 0%, 100%)",
          colorText: "hsl(222.2, 84%, 4.9%)",
          borderRadius: "0.5rem",
        },
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "shadow-none border",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TokenSetup />
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  );
}
