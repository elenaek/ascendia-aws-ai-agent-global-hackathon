'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Radar } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getRadialAxisConfig, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

export function RadarChart({ data, options }: BaseChartProps) {
  // Build radar chart specific options
  const radarOptions = {
    ...getBaseChartOptions(),
    // Radar charts need straight lines (no tension/curve) to form proper polygons
    elements: {
      ...getBaseChartOptions().elements,
      line: {
        ...getBaseChartOptions().elements?.line,
        tension: 0, // Straight lines for proper radar polygon
      },
    },
    scales: getRadialAxisConfig(),
    onHover: getLegendHoverCallback(),
    plugins: {
      ...getBaseChartOptions().plugins,
      tooltip: {
        ...getBaseChartOptions().plugins?.tooltip,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.r
            return `${label}: ${value}`
          },
        },
      },
    },
  }

  // Deep merge with provided options, especially for radial scale pointLabels
  let finalOptions = mergeChartOptions(radarOptions, options as any)

  // Special handling for radar scales to preserve pointLabels styling
  if (options?.scales?.r && radarOptions.scales?.r) {
    finalOptions = {
      ...finalOptions,
      scales: {
        ...finalOptions.scales,
        r: {
          ...radarOptions.scales.r,
          ...options.scales.r,
          pointLabels: {
            ...radarOptions.scales.r.pointLabels,
            ...options.scales.r.pointLabels,
          } as any, // Type assertion needed for deep merge
        } as any, // Type assertion needed for radial scale
      },
    }
  }

  return <Radar data={data} options={finalOptions as any} />
}
