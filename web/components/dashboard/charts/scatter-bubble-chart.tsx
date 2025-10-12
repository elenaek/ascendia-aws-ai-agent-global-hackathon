'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Scatter, Bubble } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getStandardAxisConfig, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

interface ScatterBubbleChartProps extends BaseChartProps {
  chartType: 'scatter' | 'bubble'
}

export function ScatterBubbleChart({ data, options, chartType }: ScatterBubbleChartProps) {
  // Default axis labels for scatter/bubble charts
  const xLabel = options?.scales?.x?.title?.text || 'Dimension 1'
  const yLabel = options?.scales?.y?.title?.text || 'Dimension 2'

  // Build scatter/bubble chart specific options
  const scatterBubbleOptions = {
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
            const value = context.parsed
            const dataPoint = context.raw as { x?: number; y?: number; label?: string }
            const pointLabel = dataPoint.label || label
            return `${pointLabel}: (${value.x}, ${value.y})`
          },
        },
      },
    },
  }

  // Merge with provided options
  const finalOptions = mergeChartOptions(scatterBubbleOptions, options as any)

  // Render appropriate chart type
  const ChartComponent = chartType === 'bubble' ? Bubble : Scatter

  return <ChartComponent data={data} options={finalOptions} />
}
