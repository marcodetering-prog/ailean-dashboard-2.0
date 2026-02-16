"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Brand } from "@/lib/types/database";

export type DashboardRole = "c-level" | "property-manager";

interface FilterState {
  dateFrom: string | null;
  dateTo: string | null;
  brand: Brand | "all";
  role: DashboardRole;
}

interface FilterContextValue extends FilterState {
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setBrand: (brand: Brand | "all") => void;
  setRole: (role: DashboardRole) => void;
  clearFilters: () => void;
  /** Get filters as URL query params string */
  toQueryString: () => string;
}

const defaultState: FilterState = {
  dateFrom: null,
  dateTo: null,
  brand: "all",
  role: "c-level",
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FilterState>(defaultState);

  const setDateFrom = useCallback((date: string | null) => {
    setState((prev) => ({ ...prev, dateFrom: date }));
  }, []);

  const setDateTo = useCallback((date: string | null) => {
    setState((prev) => ({ ...prev, dateTo: date }));
  }, []);

  const setDateRange = useCallback(
    (from: string | null, to: string | null) => {
      setState((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    },
    []
  );

  const setBrand = useCallback((brand: Brand | "all") => {
    setState((prev) => ({ ...prev, brand }));
  }, []);

  const setRole = useCallback((role: DashboardRole) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(defaultState);
  }, []);

  const toQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (state.dateFrom) params.set("dateFrom", state.dateFrom);
    if (state.dateTo) params.set("dateTo", state.dateTo);
    if (state.brand !== "all") params.set("brand", state.brand);
    return params.toString();
  }, [state]);

  return (
    <FilterContext.Provider
      value={{
        ...state,
        setDateFrom,
        setDateTo,
        setDateRange,
        setBrand,
        setRole,
        clearFilters,
        toQueryString,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
