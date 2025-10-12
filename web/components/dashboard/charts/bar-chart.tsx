'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bar } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getStandardAxisConfig, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

export function BarChart({ data, options }: BaseChartProps) {
  // Default axis labels for bar charts
  const xLabel = options?.scales?.x?.title?.text || 'Categories'
  const yLabel = options?.scales?.y?.title?.text || 'Values'

  // Build bar chart specific options
  const barOptions = {
    ...getBaseChartOptions(),
    scales: getStandardAxisConfig(xLabel, yLabel),
    onHover: getLegendHoverCallback(),
    plugins: {
      ...getBaseChartOptions().plugins,
      tooltip: {
        ...getBaseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${value}`
          },
        },
      },
    },
  }

  // Merge with provided options
  const finalOptions = mergeChartOptions(barOptions, options as any)

  return <Bar data={data} options={finalOptions} />
}
