'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pie, Doughnut } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

interface PieDoughnutChartProps extends BaseChartProps {
  chartType: 'pie' | 'doughnut'
}

export function PieDoughnutChart({ data, options, chartType }: PieDoughnutChartProps) {
  // Build pie/doughnut chart specific options (no scales needed)
  const pieDoughnutOptions = {
    ...getBaseChartOptions(),
    // Remove scales since pie/doughnut charts don't use axes
    scales: undefined,
    onHover: getLegendHoverCallback(),
    plugins: {
      ...getBaseChartOptions().plugins,
      tooltip: {
        ...getBaseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || context.label || ''
            const value = context.parsed
            return `${label}: ${value}`
          },
        },
      },
    },
  }

  // Merge with provided options
  const finalOptions = mergeChartOptions(pieDoughnutOptions, options as any)

  // Render appropriate chart type
  const ChartComponent = chartType === 'doughnut' ? Doughnut : Pie

  return <ChartComponent data={data} options={finalOptions} />
}
