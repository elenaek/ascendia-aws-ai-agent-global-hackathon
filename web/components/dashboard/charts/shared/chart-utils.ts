/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Gets the appropriate color class for a category badge
 */
export function getCategoryColor(category?: string): string {
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

/**
 * Deep merges Chart.js options, ensuring nested properties are preserved
 */
export function mergeChartOptions<T extends object>(base: T, override?: Partial<T>): T {
  if (!override) return base

  const merged = { ...base }

  for (const key in override) {
    const baseValue = base[key]
    const overrideValue = override[key]

    if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      // Recursively merge nested objects
      merged[key] = mergeChartOptions(baseValue, overrideValue as any) as any
    } else if (overrideValue !== undefined) {
      // Override primitive values and arrays
      merged[key] = overrideValue as any
    }
  }

  return merged
}
