"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PotentialCurvesData = {
  players: Record<number, number[]>;
  dummy: number[] | null;
};

const PotentialCurvesContext = createContext<PotentialCurvesData>({
  players: {},
  dummy: null,
});

export default function PotentialCurvesProvider({
  value,
  children,
}: {
  value: PotentialCurvesData;
  children: ReactNode;
}) {
  return (
    <PotentialCurvesContext.Provider value={value}>
      {children}
    </PotentialCurvesContext.Provider>
  );
}

export function usePotentialCurves(): PotentialCurvesData {
  return useContext(PotentialCurvesContext);
}
