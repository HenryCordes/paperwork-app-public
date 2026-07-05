import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { formatCurrency } from "../../../utils/formatters";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  revenue: number;
  expenses: number;
  isDarkMode: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  revenue,
  expenses,
  isDarkMode,
}) => {
  const data = [formatCurrency(revenue), formatCurrency(expenses)];
  const labels = ["Omzet", "Uitgaven"];
  const customLabels = labels.map((label, index) => `${label}: ${data[index]}`);

  const chartData = {
    labels: customLabels,
    datasets: [
      {
        data: [revenue, expenses],
        backgroundColor: ["rgba(54, 162, 235, 0.6)", "rgba(255, 99, 132, 0.6)"],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDarkMode ? "#ffffff" : "#333333",
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const splitPos = label.indexOf(":");
            const labelName = label.substring(0, splitPos);
            return labelName;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "250px", width: "100%" }}>
      <Pie data={chartData} options={chartOptions} />
    </div>
  );
};

export default PieChart;
