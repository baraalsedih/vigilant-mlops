import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export const TIME_WINDOWS = ['Last 1h', 'Last 6h', 'Last 24h', 'Last 7d', 'Last 30d'] as const;
export type TimeWindow = typeof TIME_WINDOWS[number];

interface FiltersCtx {
  timeWindow: TimeWindow;
  setTimeWindow: (v: TimeWindow) => void;
  modelVersion: string;
  setModelVersion: (v: string) => void;
}

const FiltersContext = createContext<FiltersCtx>({
  timeWindow: 'Last 7d',
  setTimeWindow: () => {},
  modelVersion: '',
  setModelVersion: () => {},
});

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('Last 7d');
  const [modelVersion, setModelVersion] = useState('');

  return (
    <FiltersContext.Provider value={{ timeWindow, setTimeWindow, modelVersion, setModelVersion }}>
      {children}
    </FiltersContext.Provider>
  );
}

export const useFilters = () => useContext(FiltersContext);
