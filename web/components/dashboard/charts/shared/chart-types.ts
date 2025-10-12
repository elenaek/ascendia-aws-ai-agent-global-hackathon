/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartOptions } from 'chart.js'
import { GraphPayload } from '@/types/websocket-messages'

/**
 * Base props shared by all chart components
 */
export interface BaseChartProps {
  data: GraphPayload['data']
  options?: GraphPayload['options']
  title?: string
  description?: string
}

/**
 * Chart type discriminator for different chart implementations
 */
export type ChartType = 'bar' | 'line' | 'scatter' | 'bubble' | 'radar' | 'pie' | 'doughnut'

/**
 * Extended Chart.js options with proper typing
 */
export type ExtendedChartOptions = ChartOptions<any>
