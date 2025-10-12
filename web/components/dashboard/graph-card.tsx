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
} from 'chart.js'
import { BarChart } from './charts/bar-chart'
import { LineChart } from './charts/line-chart'
import { ScatterBubbleChart } from './charts/scatter-bubble-chart'
import { RadarChart } from './charts/radar-chart'
import { PieDoughnutChart } from './charts/pie-doughnut-chart'
import { getCategoryColor } from './charts/shared/chart-utils'
import { legendHoverPlugin } from './charts/shared/chart-base-options'

// Register Chart.js components and plugins
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
  Legend,
  legendHoverPlugin
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

  // Log warning if default labels are used
  if (hasDefaultLabels && process.env.NODE_ENV === 'development') {
    console.warn(
      `[GraphCard] Graph "${title}" is using default axis labels. ` +
      `Consider providing specific labels via options.scales.x.title.text and options.scales.y.title.text ` +
      `for better clarity.`
    )
  }

  // Render appropriate chart component based on type
  const renderChart = () => {
    const chartProps = {
      data: chartData,
      options: options,
    }

    switch (graphType) {
      case 'bar':
        return <BarChart {...chartProps} />
      case 'line':
        return <LineChart {...chartProps} />
      case 'scatter':
        return <ScatterBubbleChart {...chartProps} chartType="scatter" />
      case 'bubble':
        return <ScatterBubbleChart {...chartProps} chartType="bubble" />
      case 'radar':
        return <RadarChart {...chartProps} />
      case 'pie':
        return <PieDoughnutChart {...chartProps} chartType="pie" />
      case 'doughnut':
        return <PieDoughnutChart {...chartProps} chartType="doughnut" />
      default:
        return <BarChart {...chartProps} />
    }
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
