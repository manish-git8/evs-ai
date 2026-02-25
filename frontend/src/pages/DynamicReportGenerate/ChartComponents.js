import React from 'react';
import PropTypes from 'prop-types';
import { Pie as PieChart, Bar as BarChart, Line as LineChart, Doughnut as DoughnutChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels,
);

const FALLBACK_COLORS = [
  'rgba(33, 37, 41, 0.7)',
  'rgba(52, 58, 64, 0.7)',
  'rgba(108, 117, 125, 0.7)',
  'rgba(0, 123, 255, 0.7)',
  'rgba(40, 167, 69, 0.7)',
  'rgba(255, 193, 7, 0.7)',
];

const FALLBACK_BORDER_COLORS = [
  'rgba(33, 37, 41, 1)',
  'rgba(52, 58, 64, 1)',
  'rgba(108, 117, 125, 1)',
  'rgba(0, 123, 255, 1)',
  'rgba(40, 167, 69, 1)',
  'rgba(255, 193, 7, 1)',
];

const getChartData = (data, chartType) => {
  const datasets = data.datasets.map((dataset, i) => ({
    ...dataset,
    backgroundColor:
      dataset.backgroundColor ||
      (chartType === 'pie' || chartType === 'doughnut'
        ? FALLBACK_COLORS.slice(0, data.labels.length)
        : FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    borderColor:
      dataset.borderColor ||
      (chartType === 'pie' || chartType === 'doughnut'
        ? FALLBACK_BORDER_COLORS.slice(0, data.labels.length)
        : FALLBACK_BORDER_COLORS[i % FALLBACK_BORDER_COLORS.length]),
    borderWidth: dataset.borderWidth !== null ? dataset.borderWidth : 1,
    pointBackgroundColor:
      dataset.borderColor || FALLBACK_BORDER_COLORS[i % FALLBACK_BORDER_COLORS.length],
  }));

  return {
    labels: data.labels,
    datasets,
  };
};

const getDefaultOptions = (chartType) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      display: true,
      labels: {
        boxWidth: 12,
        padding: 20,
        font: {
          size: 10,
        },
      },
    },
    tooltip: {
      enabled: true,
    },
  },
  ...(chartType !== 'pie' && chartType !== 'doughnut' && {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
      x: {
        ticks: {
          font: {
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  }),
});

const mergeOptions = (defaultOpts, customOpts) => {
  if (!customOpts) return defaultOpts;

  const merged = { ...defaultOpts };

  Object.keys(customOpts).forEach((key) => {
    if (customOpts[key] === null) return;

    if (customOpts[key] && typeof customOpts[key] === 'object' && !Array.isArray(customOpts[key])) {
      merged[key] = mergeOptions(merged[key] || {}, customOpts[key]);
    } else {
      merged[key] = customOpts[key];
    }
  });

  return merged;
};



export const PieChartComponent = ({ data, options = {} }) => {
  const defaultOptions = getDefaultOptions('doughnut');
  const finalOptions = mergeOptions(defaultOptions, options);

  const dataset = data?.datasets?.[0];
  const values = dataset?.data || [];

  const total = values.reduce((sum, val) => sum + val, 0);

  const showPercentage =
    finalOptions?.plugins?.datalabels?.showPercentage ?? true; // default true

  // Set formatter functions if enabled
  if (showPercentage && total > 0) {
    // Data labels
    finalOptions.plugins.datalabels = {
      ...finalOptions.plugins.datalabels,
      formatter: (_, context) => {
        const index = context.dataIndex;
        const value = values[index];
        const percent = (value / total) * 100;
        return `${percent.toFixed(1)}%`;

      },
      color: '#fff',
    };

    // Tooltip
    finalOptions.plugins.tooltip = {
      ...finalOptions.plugins.tooltip,
      callbacks: {
       label(context) {
  const index = context.dataIndex;
  const label = context.label || '';
  const value = values[index];
  const percent = (value / total) * 100;
  return `${label}: ${percent.toFixed(1)}%`;
}
,
      },
    };
  }
  if (finalOptions.plugins?.legend?.labels && total > 0) {
  finalOptions.plugins.legend.labels.generateLabels = function (chart) {
    const labels1 = chart.data.labels;
    const dataset1 = chart.data.datasets[0];

    return labels1.map((label, i) => {
      const rawLabel = Array.isArray(label) ? label.join('') : label;
      const value = dataset1.data[i];
      const percent = ((value / total) * 100).toFixed(1);

      return {
        text: `${rawLabel} (${percent}%)`,
        fillStyle: dataset1.backgroundColor[i],
        strokeStyle: dataset1.borderColor?.[0] || '#fff',
        lineWidth: 1,
        hidden: false,
        index: i
      };
    });
  };
}

  // Responsive legend position
  if (window.innerWidth < 768) {
    finalOptions.plugins.legend.position = 'bottom';
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <PieChart data={getChartData(data, 'pie')} options={finalOptions} />
    </div>
  );

};

export const DoughnutChartComponent = ({ data, options = {} }) => {
  const defaultOptions = getDefaultOptions('doughnut');
  const finalOptions = mergeOptions(defaultOptions, options);

  const dataset = data?.datasets?.[0];
  const values = dataset?.data || [];

  const total = values.reduce((sum, val) => sum + val, 0);

  const showPercentage =
    finalOptions?.plugins?.datalabels?.showPercentage ?? true; // default true

  // Set formatter functions if enabled
  if (showPercentage && total > 0) {
    // Data labels
    finalOptions.plugins.datalabels = {
      ...finalOptions.plugins.datalabels,
      formatter: (_, context) => {
        const index = context.dataIndex;
        const value = values[index];
        const percent = (value / total) * 100;
        return `${percent.toFixed(1)}%`;

      },
      color: '#fff',
    };

    // Tooltip
    finalOptions.plugins.tooltip = {
      ...finalOptions.plugins.tooltip,
      callbacks: {
       label(context) {
  const index = context.dataIndex;
  const label = context.label || '';
  const value = values[index];
  const percent = (value / total) * 100;
  return `${label}: ${percent.toFixed(1)}%`;
}
,
      },
    };
  }
  if (finalOptions.plugins?.legend?.labels && total > 0) {
  finalOptions.plugins.legend.labels.generateLabels = function (chart) {
    const labels1 = chart.data.labels;
    const dataset1 = chart.data.datasets[0];

    return labels1.map((label, i) => {
      const rawLabel = Array.isArray(label) ? label.join('') : label;
      const value = dataset1.data[i];
      const percent = ((value / total) * 100).toFixed(1);

      return {
        text: `${rawLabel} (${percent}%)`,
        fillStyle: dataset1.backgroundColor[i],
        strokeStyle: dataset1.borderColor?.[0] || '#fff',
        lineWidth: 1,
        hidden: false,
        index: i
      };
    });
  };
}

  // Responsive legend position
  if (window.innerWidth < 768) {
    finalOptions.plugins.legend.position = 'bottom';
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <DoughnutChart data={getChartData(data, 'doughnut')} options={finalOptions} />

    </div>
  );

};


export const BarChartComponent = ({ data, options = {} }) => {
  const defaultOptions = getDefaultOptions('bar');   
  const finalOptions = mergeOptions(defaultOptions, options);

   const chartlabels = data.labels;
   const flattenedLabels = chartlabels.map(label =>
    Array.isArray(label) ? label.join('') : label
  );
  
  finalOptions.plugins.tooltip.callbacks = {
  title(tooltipItems) {
            const index = tooltipItems[0].dataIndex;
            return flattenedLabels[index];
          },
          label(context) {
            const index = context.dataIndex;
            const value = context.raw;
            return `${flattenedLabels[index]}: ${value}`;
          }
};
  if (window.innerWidth < 768) {
    finalOptions.plugins.legend.position = 'bottom';
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <BarChart data={getChartData(data, 'bar')} options={finalOptions} />
    </div>
  );
};

export const LineChartComponent = ({ data, options = {} }) => {
  const defaultOptions = getDefaultOptions('line');
  const finalOptions = mergeOptions(defaultOptions, options);

  finalOptions.elements = {
    line: {
      tension: 0.4,
      fill: false,
    },
    ...finalOptions.elements,
  };

  if (window.innerWidth < 768) {
    finalOptions.plugins.legend.position = 'bottom';
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <LineChart data={getChartData(data, 'line')} options={finalOptions} />
    </div>
  );
};

const propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    datasets: PropTypes.arrayOf(
      PropTypes.shape({
        data: PropTypes.arrayOf(PropTypes.number).isRequired,
        backgroundColor: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.string),
          PropTypes.string,
        ]),
        borderColor: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
        borderWidth: PropTypes.number,
        label: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
  options: PropTypes.object,
};

PieChartComponent.propTypes = propTypes;
BarChartComponent.propTypes = propTypes;
LineChartComponent.propTypes = propTypes;
DoughnutChartComponent.propTypes = propTypes;
