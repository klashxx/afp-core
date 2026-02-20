import * as React from "react";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};

const ChartContext = React.createContext<ChartConfig | null>(null);

export function useChartConfig() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChartConfig must be used within ChartContainer");
  }
  return context;
}

export function ChartContainer({
  config,
  className,
  children
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={config}>
      <div className={cn("h-[280px] w-full", className)}>{children}</div>
    </ChartContext.Provider>
  );
}
