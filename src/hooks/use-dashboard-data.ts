"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/filter-context";

/**
 * Generic fetcher for SWR
 */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("API request failed");
    throw error;
  }
  return res.json();
}

/**
 * Hook to fetch dashboard data from an API endpoint,
 * automatically appending global filter params.
 *
 * @param endpoint - API route path (e.g. "/api/summary")
 * @param extraParams - Additional query params
 */
export function useDashboardData<T>(
  endpoint: string,
  extraParams?: Record<string, string>
) {
  const { toQueryString } = useFilters();

  // Build the full URL with filter params
  const filterParams = toQueryString();
  const extraStr = extraParams
    ? new URLSearchParams(extraParams).toString()
    : "";

  const parts = [filterParams, extraStr].filter(Boolean);
  const queryString = parts.join("&");
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    data: data ?? null,
    error,
    isLoading,
    refetch: mutate,
  };
}

/**
 * Hook specifically for the summary endpoint
 */
export function useSummaryData() {
  return useDashboardData<Record<string, unknown>>("/api/summary");
}

/**
 * Hook for AI quality data
 */
export function useAIQualityData() {
  return useDashboardData<Record<string, unknown>>("/api/ai-quality");
}

/**
 * Hook for bug data
 */
export function useBugData() {
  return useDashboardData<Record<string, unknown>>("/api/bugs/clusters");
}

/**
 * Hook for trend data
 */
export function useTrendData(type: "monthly" | "daily" = "monthly") {
  return useDashboardData<Record<string, unknown>[]>(`/api/trends/${type}`);
}
