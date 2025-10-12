/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chart, ChartOptions, LegendItem, Plugin } from 'chart.js'

/**
 * Common theme colors for charts
 */
export const chartTheme = {
  grid: 'rgba(255, 255, 255, 0.1)',
  text: {
    primary: '#e5e7eb',
    secondary: '#9ca3af',
  },
  tooltip: {
    background: 'rgba(0, 0, 0, 0.8)',
    title: '#00ff88',
    body: '#e5e7eb',
    border: '#00ff88',
  },
  legendHover: 'rgba(0, 255, 136, 0.1)', // Primary color with low opacity
}

/**
 * Plugin to draw a highlight background behind hovered legend items
 */
export const legendHoverPlugin: Plugin = {
  id: 'legendHoverHighlight',
  afterDraw: (chart) => {
    const legend = chart.legend
    if (!legend) return

    // Check if there's a hovered legend item
    const hoveredIndex = (chart as any)._hoveredLegendIndex
    if (hoveredIndex === undefined || hoveredIndex === null) return

    // Access legendHitBoxes (internal Chart.js property not in public types)
    const hitBox = (legend as any).legendHitBoxes?.[hoveredIndex]
    if (!hitBox) return

    const ctx = chart.ctx
    ctx.save()

    // Draw rounded rectangle background
    const padding = 4
    const borderRadius = 6

    ctx.fillStyle = chartTheme.legendHover
    ctx.beginPath()
    ctx.roundRect(
      hitBox.left - padding,
      hitBox.top - padding,
      hitBox.width + padding * 2,
      hitBox.height + padding * 2,
      borderRadius
    )
    ctx.fill()

    ctx.restore()
  },
}

/**
 * Strips alpha channel from rgba/hsla colors to ensure legend markers are fully opaque
 * Examples:
 *   'rgba(255, 99, 132, 0.2)' -> 'rgb(255, 99, 132)'
 *   'hsla(220, 90%, 50%, 0.5)' -> 'hsl(220, 90%, 50%)'
 */
const stripAlphaChannel = (color: string): string => {
  if (typeof color !== 'string') return color

  // Convert rgba to rgb
  if (color.startsWith('rgba(')) {
    return color.replace('rgba(', 'rgb(').replace(/,\s*[\d.]+\)$/, ')')
  }

  // Convert hsla to hsl
  if (color.startsWith('hsla(')) {
    return color.replace('hsla(', 'hsl(').replace(/,\s*[\d.]+\)$/, ')')
  }

  return color
}

/**
 * Generates legend labels with hollow/filled markers based on dataset visibility
 * - Filled markers for visible datasets
 * - Hollow (stroke-only) markers for hidden datasets
 */
const generateHollowFilledLabels = (chart: Chart): LegendItem[] => {
  const data = chart.data

  // Customize each legend item based on visibility
  return data.datasets.map((dataset, i) => {
    const meta = chart.getDatasetMeta(i)
    const hidden = meta.hidden

    // Prioritize borderColor (typically solid) over backgroundColor (often semi-transparent)
    const datasetColor = dataset.borderColor as string || dataset.backgroundColor as string || '#ccc'

    // Extract the actual color if it's an array (use first color)
    let color = Array.isArray(datasetColor) ? datasetColor[0] : datasetColor

    // Strip alpha channel to ensure legend markers are fully opaque
    color = stripAlphaChannel(color)

    return {
      text: dataset.label || `Dataset ${i + 1}`,
      // For hidden datasets: transparent fill with colored stroke (hollow)
      // For visible datasets: colored fill (filled)
      fillStyle: hidden ? 'transparent' : color,
      strokeStyle: color,
      lineWidth: hidden ? 2 : 0, // Show border only for hidden (hollow) items
      hidden: hidden,
      index: i,
      fontColor: chartTheme.text.primary,
      pointStyle: (dataset as any).pointStyle || 'circle',
      datasetIndex: i,
    } as LegendItem
  })
}

/**
 * Base options shared across all chart types
 */
export const getBaseChartOptions = (): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    point: {
      radius: 5,
      hoverRadius: 7,
      hitRadius: 10,
      borderWidth: 2,
      hoverBorderWidth: 3,
    },
    line: {
      borderWidth: 2,
      tension: 0.4, // Smooth curves for line charts (will be overridden for radar)
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: chartTheme.text.primary,
        font: {
          size: 12,
        },
        padding: 12,
        usePointStyle: true,
        boxHeight: 8,
        // Custom label generation for hollow/filled markers
        generateLabels: generateHollowFilledLabels,
      },
      // Hover callbacks for visual feedback and cursor change
      onHover: (event, legendItem, legend) => {
        const chart = legend.chart
        // Change cursor to pointer
        const canvas = event.native?.target as HTMLCanvasElement
        if (canvas) {
          canvas.style.cursor = 'pointer'
        }
        // Store the hovered legend item index
        ;(chart as any)._hoveredLegendIndex = legendItem.index
        // Defer redraw to next animation frame to avoid conflicting with legend click updates
        requestAnimationFrame(() => chart.draw())
      },
      onLeave: (event, legendItem, legend) => {
        const chart = legend.chart
        // Reset cursor to default
        const canvas = event.native?.target as HTMLCanvasElement
        if (canvas) {
          canvas.style.cursor = 'default'
        }
        // Clear the hovered legend item index
        ;(chart as any)._hoveredLegendIndex = null
        // Defer redraw to next animation frame to avoid conflicting with legend click updates
        requestAnimationFrame(() => chart.draw())
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: chartTheme.tooltip.background,
      titleColor: chartTheme.tooltip.title,
      bodyColor: chartTheme.tooltip.body,
      borderColor: chartTheme.tooltip.border,
      borderWidth: 1,
    },
  },
})

/**
 * Creates onHover callback for legend interaction (cursor pointer on legend items)
 */
export const getLegendHoverCallback = (): ChartOptions['onHover'] => {
  return (event, activeElements, chart) => {
    const canvas = event.native?.target as HTMLCanvasElement
    if (!canvas) return

    // Check if cursor is hovering over legend items
    const legend = chart.legend
    if (legend && event.x !== undefined && event.y !== undefined) {
      const isOverLegend = legend.legendItems?.some((item, index) => {
        // Access legendHitBoxes (internal Chart.js property not in public types)
        const hitBox = (legend as any).legendHitBoxes?.[index]
        if (!hitBox) return false
        return (
          event.x! >= hitBox.left &&
          event.x! <= hitBox.left + hitBox.width &&
          event.y! >= hitBox.top &&
          event.y! <= hitBox.top + hitBox.height
        )
      })

      canvas.style.cursor = isOverLegend ? 'pointer' : 'default'
    }
  }
}

/**
 * Standard axis configuration for charts with x/y axes
 */
export const getStandardAxisConfig = (xLabel?: string, yLabel?: string) => ({
  x: {
    grid: {
      color: chartTheme.grid,
    },
    ticks: {
      color: chartTheme.text.secondary,
      font: {
        size: 10,
      },
    },
    title: {
      display: true,
      text: xLabel || 'X Axis',
      color: chartTheme.text.secondary,
      font: {
        size: 11,
      },
    },
  },
  y: {
    grid: {
      color: chartTheme.grid,
    },
    ticks: {
      color: chartTheme.text.secondary,
      font: {
        size: 10,
      },
    },
    title: {
      display: true,
      text: yLabel || 'Y Axis',
      color: chartTheme.text.secondary,
      font: {
        size: 11,
      },
    },
  },
})

/**
 * Radial axis configuration for radar charts
 */
export const getRadialAxisConfig = () => ({
  r: {
    grid: {
      color: chartTheme.grid,
    },
    angleLines: {
      color: chartTheme.grid,
    },
    pointLabels: {
      color: chartTheme.text.primary,
      font: {
        size: 13,
        weight: '500' as const,
      },
    },
    ticks: {
      color: chartTheme.text.secondary,
      font: {
        size: 10,
      },
      backdropColor: 'transparent',
    },
  },
})
