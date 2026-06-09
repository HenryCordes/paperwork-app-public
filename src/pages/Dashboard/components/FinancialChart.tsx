import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ChartOptions,
  ChartData,
  TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatCurrency } from "../../../utils/formatters";
import {
  DashboardChart,
  DashBoardChartScrollContainer,
} from "./financialChartStyled";
import {
  DASHBOARD_CHART_MARGINS_WIDTH,
  DASHBOARD_CHART_MAX_LABELS,
} from "../../../common/versionConstants";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FinancialChartProps {
  labels: string[];
  chartData: {
    turnover: number[];
    expenses: number[];
  };
  isDarkMode: boolean;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  labels,
  chartData,
  isDarkMode,
}) => {
  const [chartDataState, setChartDataState] = useState<ChartData<"bar">>({
    labels: [],
    datasets: [],
  });
  const [containerWidth, setContainerWidth] = useState<number | undefined>(
    undefined
  );

  // Color config with dark mode support
  const colors = {
    revenue: {
      light: "rgba(54, 162, 235, 1)",
      dark: "rgba(72, 202, 255, 1)",
      lightBackground: "rgba(54, 162, 235, 0.1)",
      darkBackground: "rgba(72, 202, 255, 0.1)",
    },
    expenses: {
      light: "rgba(255, 99, 132, 1)",
      dark: "rgba(255, 129, 152, 1)",
      lightBackground: "rgba(255, 99, 132, 0.1)",
      darkBackground: "rgba(255, 129, 152, 0.1)",
    },
    profit: {
      light: "rgba(75, 192, 192, 1)",
      dark: "rgba(102, 255, 255, 1)",
      lightBackground: "rgba(75, 192, 192, 0.1)",
      darkBackground: "rgba(102, 255, 255, 0.1)",
    },
  };

  // Prepare data for the chart
  useEffect(() => {
    if (!labels || !chartData) return;

    // 'tension' is a line-chart property that chart.js silently ignores on bar
    // datasets; cast avoids a spurious TS2353 without changing runtime behavior.
    setChartDataState({
      labels: labels,
      datasets: [
        {
          label: `Omzet: ${formatCurrency(
            chartData.turnover.reduce((accumulator, currentValue) => {
              return accumulator + currentValue;
            }, 0)
          )}`,
          data: chartData.turnover,
          borderColor: isDarkMode ? colors.revenue.dark : colors.revenue.light,
          backgroundColor: isDarkMode
            ? colors.revenue.dark
            : colors.revenue.light,
          borderWidth: 2,
          tension: 0.4,
        } as ChartData<"bar">["datasets"][number],
        {
          label: `Uitgaven: ${formatCurrency(
            chartData.expenses.reduce((accumulator, currentValue) => {
              return accumulator + currentValue;
            }, 0)
          )}`,
          data: chartData.expenses,
          borderColor: isDarkMode
            ? colors.expenses.dark
            : colors.expenses.light,
          backgroundColor: isDarkMode
            ? colors.expenses.dark
            : colors.expenses.light,
          borderWidth: 2,
          tension: 0.4,
        } as ChartData<"bar">["datasets"][number],
      ],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: colors is derived from isDarkMode which is already in the dep array
  }, [labels, chartData, isDarkMode]);

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: true,
          color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
        },
      },
      y: {
        grid: {
          display: true,
          color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
          callback: function (value: number | string) {
            return formatCurrency(Number(value));
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode
          ? "rgba(0, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.8)",
        titleColor: isDarkMode
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(0, 0, 0, 0.9)",
        bodyColor: isDarkMode
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(0, 0, 0, 0.9)",
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const label = context.dataset.label || "";
            const splitPos = label.indexOf(":");
            let labelName = label.substring(0, splitPos);

            if (labelName) {
              labelName += ": ";
            }
            if (typeof context.raw === "number") {
              labelName += formatCurrency(context.raw);
            }
            return labelName;
          },
        },
      },
    },
  };

  useEffect(() => {
    const totalLabels = labels.length;
    if (totalLabels > DASHBOARD_CHART_MAX_LABELS) {
      const newWidth =
        window.innerWidth -
        DASHBOARD_CHART_MARGINS_WIDTH +
        (totalLabels - DASHBOARD_CHART_MAX_LABELS) * 40;
      setContainerWidth(newWidth);
    }
  }, [labels]);

  return (
    <DashboardChart>
      {labels && labels.length > 0 ? (
        <DashBoardChartScrollContainer width={containerWidth}>
          <Bar data={chartDataState} options={chartOptions} />
        </DashBoardChartScrollContainer>
      ) : (
        <div className="no-data-message">
          Geen gegevens beschikbaar voor deze periode
        </div>
      )}
    </DashboardChart>
  );
};

export default FinancialChart;
