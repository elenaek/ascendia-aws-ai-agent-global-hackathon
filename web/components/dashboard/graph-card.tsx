'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, BarChart3, AlertTriangle } from 'lucide-react'
import { GraphPayload } from '@/types/websocket-messages'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Bar, Line, Scatter, Radar, Pie, Doughnut, Bubble } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
)

interface GraphCardProps {
  data: GraphPayload
  onClose?: () => void
  className?: string
}

export function GraphCard({ data, onClose, className }: GraphCardProps) {
  const { title, graphType, data: chartData, options, category, description } = data

  // Check if chart type requires axes (radar charts use radial scales, not x/y axes)
  const requiresAxes = ['scatter', 'bar', 'line', 'bubble'].includes(graphType)

  // Check if axis labels are missing
  const missingXLabel = requiresAxes && !options?.scales?.x?.title?.text
  const missingYLabel = requiresAxes && !options?.scales?.y?.title?.text
  const hasDefaultLabels = missingXLabel || missingYLabel

  // Get default axis labels based on chart type
  const getDefaultAxisLabels = () => {
    switch (graphType) {
      case 'scatter':
      case 'bubble':
        return { x: 'Dimension 1', y: 'Dimension 2' }
      case 'bar':
        return { x: 'Categories', y: 'Values' }
      case 'line':
        return { x: 'Time/Category', y: 'Values' }
      default:
        return { x: 'X Axis', y: 'Y Axis' }
    }
  }

  const defaultAxisLabels = getDefaultAxisLabels()

  // Log warning if default labels are used
  if (hasDefaultLabels && process.env.NODE_ENV === 'development') {
    console.warn(
      `[GraphCard] Graph "${title}" is using default axis labels. ` +
      `Consider providing specific labels via options.scales.x.title.text and options.scales.y.title.text ` +
      `for better clarity. Current defaults: X="${defaultAxisLabels.x}", Y="${defaultAxisLabels.y}"`
    )
  }

  // Default options with dark theme
  const defaultOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 5,              // Normal dot size (default is 3)
        hoverRadius: 7,         // Dot size when hovering (default is 4)
        hitRadius: 10,          // Click/hover detection area
        borderWidth: 2,         // Border thickness around dots
        hoverBorderWidth: 3,    // Border thickness on hover
      },
      line: {
        borderWidth: 2,         // Line thickness for line charts
        tension: 0.4,           // Line curve smoothness (0 = straight, 0.4 = curved)
      },
    },
    onHover: (event, activeElements, chart) => {
      const canvas = event.native?.target as HTMLCanvasElement
      if (!canvas) return

      // Check if cursor is hovering over legend items
      const legend = chart.legend
      if (legend && event.x !== undefined && event.y !== undefined) {
        const isOverLegend = legend.legendItems?.some((item, index) => {
          const hitBox = legend.legendHitBoxes?.[index]
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
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e5e7eb',
          font: {
            size: 11,
          },
          padding: 12,
          usePointStyle: true,
          boxHeight: 8,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00ff88',
        bodyColor: '#e5e7eb',
        borderColor: '#00ff88',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            const value = context.parsed

            // For scatter/bubble charts, show both x and y
            if (graphType === 'scatter' || graphType === 'bubble') {
              const dataPoint = context.raw as { x?: number; y?: number; label?: string }
              const pointLabel = dataPoint.label || label
              return `${pointLabel}: (${value.x}, ${value.y})`
            }

            // For radar charts, use the r (radial) value
            if (graphType === 'radar') {
              return `${label}: ${value.r}`
            }

            // For other charts (bar, line, pie, doughnut)
            return `${label}: ${value.y !== undefined ? value.y : value}`
          },
        },
      },
    },
    scales:
      graphType !== 'pie' && graphType !== 'doughnut' && graphType !== 'radar'
        ? {
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
              ticks: {
                color: '#9ca3af',
                font: {
                  size: 10,
                },
              },
              title: {
                display: true,
                text: options?.scales?.x?.title?.text || defaultAxisLabels.x,
                color: '#9ca3af',
                font: {
                  size: 11,
                },
              },
            },
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
              ticks: {
                color: '#9ca3af',
                font: {
                  size: 10,
                },
              },
              title: {
                display: true,
                text: options?.scales?.y?.title?.text || defaultAxisLabels.y,
                color: '#9ca3af',
                font: {
                  size: 11,
                },
              },
            },
          }
        : graphType === 'radar'
        ? {
            r: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
              angleLines: {
                color: 'rgba(255, 255, 255, 0.1)',
              },
              pointLabels: {
                color: '#e5e7eb',
                font: {
                  size: 13,
                  weight: '500',
                },
              },
              ticks: {
                color: '#9ca3af',
                font: {
                  size: 10,
                },
                backdropColor: 'transparent',
              },
            },
          }
        : undefined,
  }

  // Merge provided options with defaults
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options?.scales,
    },
    elements: {
      ...defaultOptions.elements,
      ...options?.elements,
    },
    // Always preserve our onHover callback for legend interaction
    onHover: defaultOptions.onHover,
  }

  // Deep merge radar chart scales to preserve pointLabels styling
  if (graphType === 'radar' && defaultOptions.scales?.r && options?.scales?.r) {
    mergedOptions.scales.r = {
      ...defaultOptions.scales.r,
      ...options.scales.r,
      pointLabels: {
        ...defaultOptions.scales.r.pointLabels,
        ...options.scales.r.pointLabels,
      },
    }

    // Radar charts need straight lines (no tension/curve) to form proper polygons
    if (mergedOptions.elements?.line) {
      mergedOptions.elements.line = {
        ...mergedOptions.elements.line,
        tension: 0,  // Straight lines for proper radar polygon
      }
    }
  }

  // Render appropriate chart type
  const renderChart = () => {
    const chartProps = {
      data: chartData,
      options: mergedOptions,
    }

    switch (graphType) {
      case 'bar':
        return <Bar {...chartProps} />
      case 'line':
        return <Line {...chartProps} />
      case 'scatter':
        return <Scatter {...chartProps} />
      case 'radar':
        return <Radar {...chartProps} />
      case 'pie':
        return <Pie {...chartProps} />
      case 'doughnut':
        return <Doughnut {...chartProps} />
      case 'bubble':
        return <Bubble {...chartProps} />
      default:
        return <Bar {...chartProps} />
    }
  }

  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'

    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('competitive') || lowerCategory.includes('competitor')) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
    if (lowerCategory.includes('market')) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
    if (lowerCategory.includes('product') || lowerCategory.includes('feature')) {
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="bg-panel border-primary/30 glow overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2 flex-1">
              <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasDefaultLabels && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  title="Using default axis labels. Consider providing specific labels for clarity."
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Default Labels
                </Badge>
              )}
              {category && (
                <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', getCategoryColor(category))}>
                  {category}
                </Badge>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[70vh] mt-4">
            {renderChart()}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
