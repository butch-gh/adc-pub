import React from "react";
import ReactECharts from "echarts-for-react";
import { useTheme } from "@mui/material";

interface BookingTrendChartProps {
  months: string[] | undefined; // Data for the xAxis
  bookings: number[] | undefined; // Data for the series
}

const BookingTrendChart: React.FC<BookingTrendChartProps> = ({ months, bookings }) => {
  const theme = useTheme();
  // Chart options for ECharts
  const options = {
    title: {
      text: "Booking Trend",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: months,
      axisLine: {
        lineStyle: {
          color: theme.palette.mode === "dark" ? "#ffffff" : "#000000", // X-axis line color
        },
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          color: theme.palette.mode === "dark" ? "#ffffff" : "#000000", // Y-axis line color
        },
      },
      splitLine: {
        lineStyle: {
          color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)", // Y-axis grid line color
        },
      },
    },
    series: [
      {
        name: "Bookings",
        type: "line",
        data: bookings,
        smooth: true,
        areaStyle: {
          color: "rgba(63, 81, 181, 0.3)",
        },
        lineStyle: {
          color: "#3f51b5",
        },
      },
    ],
  };

  return <ReactECharts option={options} style={{ height: 300, width: "100%" }} />;
};

export default BookingTrendChart;
