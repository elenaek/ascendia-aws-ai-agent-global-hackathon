'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Radar } from 'react-chartjs-2'
import { BaseChartProps } from './shared/chart-types'
import { getBaseChartOptions, getRadialAxisConfig, getLegendHoverCallback } from './shared/chart-base-options'
import { mergeChartOptions } from './shared/chart-utils'

export function RadarChart({ data, options }: BaseChartProps) {
  // Default color palette for fallback (should rarely be needed - backend provides colors)
  const defaultColors = [
    { bg: 'rgba(0, 255, 136, 0.2)', border: '#00ff88' },    // Green
    { bg: 'rgba(255, 107, 107, 0.2)', border: '#ff6b6b' },  // Red
    { bg: 'rgba(255, 217, 61, 0.2)', border: '#ffd93d' },   // Yellow
    { bg: 'rgba(107, 140, 255, 0.2)', border: '#6b8cff' },  // Blue
  ]

  // Apply color fallbacks if needed (defense-in-depth edge case handling)
  const processedData = {
    ...data,
    datasets: data.datasets?.map((dataset: any, index: number) => {
      const colorIndex = index % defaultColors.length
      const needsBackgroundColor = !dataset.backgroundColor
      const needsBorderColor = !dataset.borderColor

      if (needsBackgroundColor || needsBorderColor) {
        console.warn(
          `[RadarChart] Applying fallback colors for dataset '${dataset.label || 'unknown'}'. ` +
          `Colors should be provided by the backend.`
        )
      }

      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || defaultColors[colorIndex].bg,
        borderColor: dataset.borderColor || defaultColors[colorIndex].border,
      }
    }) || [],
  }

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

  return <Radar data={processedData} options={finalOptions as any} />
}
