import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Title,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Title
);

const EmotionChart = ({ emotionData }: { emotionData: { happy: number; sad: number; angry: number } }) => {
  const data = {
    labels: ['Happy', 'Sad', 'Angry'],
    datasets: [
      {
        data: [emotionData.happy, emotionData.sad, emotionData.angry],
        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
        hoverBackgroundColor: ['#66BB6A', '#FFD54F', '#EF5350'],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
      },
    },
    cutout: '70%',
    elements: {
      arc: {
        borderWidth: 2,
      },
    },
  };

  return <Doughnut data={data} options={options} height={200} width={200} />;
};

export default EmotionChart;


