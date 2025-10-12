'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Line } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getStandardAxisConfig, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

export function LineChart({ data, options }: BaseChartProps) {
  // Default axis labels for line charts
  const xLabel = options?.scales?.x?.title?.text || 'Time/Category'
  const yLabel = options?.scales?.y?.title?.text || 'Values'

  // Build line chart specific options
  const lineOptions = {
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
  const finalOptions = mergeChartOptions(lineOptions, options as any)

  return <Line data={data} options={finalOptions} />
}
