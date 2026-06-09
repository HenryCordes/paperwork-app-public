/**
 * Dashboard API types
 */

/**
 * Period types for dashboard data
 */
export type PeriodType = 'daily' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Period presets for dashboard data
 */
export type PeriodPreset = 'last-month' | 'last-3-months' | 'last-12-months' | 'this-year' | 'last-year' | 'custom';

/**
 * Dashboard stats request parameters
 */
export interface DashboardStatsRequest {
  periodType?: PeriodType;
  periodPreset?: PeriodPreset;
  year?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Stats data point for dashboard charts
 */
export interface StatsDataPoint {
  date: string;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  netProfit: number;
  invoiceCount: number;
  expenseCount: number;
}

/**
 * Category breakdown item
 */
export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

/**
 * Raw data point in the dashboard response
 */
export interface RawDataPoint {
  period: string;
  periodKey: string;
  periodType: string;
  totalRevenue: number;
  paidRevenue: number;
  invoiceCount: number;
  taxCollected: number;
  totalExpenses: number;
  expenseCount: number;
  taxPaid: number;
  netProfit: number;
}

/**
 * Period info in the dashboard response
 */
export interface PeriodInfo {
  startDate: string;
  endDate: string;
  groupingLevel: string;
}

/**
 * Dashboard stats response
 */
export interface DashboardStatsResponse {
  success: boolean;
  data: {
    labels: string[];
    turnover: number[];
    expenses: number[];
    rawData: RawDataPoint[];
  };
  source: 'pre-calculated' | 'dynamic';
  periodInfo: PeriodInfo;
  summary?: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalExpenses: number;
    paidExpenses: number;
    unpaidExpenses: number;
    netProfit: number;
    invoiceCount: number;
    expenseCount: number;
  };
  revenueByCategory?: CategoryBreakdown[];
  expensesByCategory?: CategoryBreakdown[];
}
