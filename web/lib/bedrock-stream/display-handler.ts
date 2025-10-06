/**
 * Display handler for streaming content with thinking tag detection
 * Ported from cli-interface/cli.py CLIStreamDisplay class
 *
 * This handler properly detects <thinking> and </thinking> tags that may be
 * split across multiple stream chunks and ensures proper display.
 */

export interface DisplayCallbacks {
  onNormalContent?: (text: string) => void
  onThinkingStart?: () => void
  onThinkingContent?: (text: string) => void
  onThinkingEnd?: () => void
}

/**
 * Handles content streaming with proper thinking tag detection across chunk boundaries
 */
export class StreamDisplayHandler {
  private contentBuffer: string = ""
  private displayPosition: number = 0
  private inThinking: boolean = false
  private showThinkingEnabled: boolean = true

  constructor(showThinking: boolean = true) {
    this.showThinkingEnabled = showThinking
  }

  /**
   * Check if buffer ends with a partial tag
   */
  private isPartialTag(bufferEnd: string): boolean {
    const potentialTags = ["<thinking>", "</thinking>"]

    for (const tag of potentialTags) {
      for (let i = 1; i < tag.length; i++) {
        if (bufferEnd.endsWith(tag.substring(0, i))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Handle content delta, detecting and displaying thinking tags
   */
  handleContentDelta(text: string, callbacks: DisplayCallbacks): void {
    if (!text) {
      return
    }

    // Add new text to buffer
    this.contentBuffer += text

    // Find thinking tags in the buffer starting from displayPosition
    const searchContent = this.contentBuffer.substring(this.displayPosition)
    const thinkingStartIdx = searchContent.indexOf("<thinking>")
    const thinkingEndIdx = searchContent.indexOf("</thinking>")

    // Convert to absolute positions in the buffer
    const absoluteStartIdx = thinkingStartIdx !== -1 ? this.displayPosition + thinkingStartIdx : -1
    const absoluteEndIdx = thinkingEndIdx !== -1 ? this.displayPosition + thinkingEndIdx : -1

    // Determine how much we can safely display
    if (!this.inThinking) {
      // Not in thinking mode
      if (absoluteStartIdx !== -1) {
        // Found opening tag - display everything before it
        const beforeThinking = this.contentBuffer.substring(this.displayPosition, absoluteStartIdx)
        if (beforeThinking) {
          callbacks.onNormalContent?.(beforeThinking)
        }

        // Start thinking mode
        this.inThinking = true
        if (this.showThinkingEnabled) {
          callbacks.onThinkingStart?.()
        }

        this.displayPosition = absoluteStartIdx + "<thinking>".length

        // Check if we have the closing tag too
        if (absoluteEndIdx !== -1 && absoluteEndIdx > absoluteStartIdx) {
          // Complete thinking block
          const thinkingContent = this.contentBuffer.substring(this.displayPosition, absoluteEndIdx)
          if (this.showThinkingEnabled && thinkingContent) {
            callbacks.onThinkingContent?.(thinkingContent)
          }
          if (this.showThinkingEnabled) {
            callbacks.onThinkingEnd?.()
          }

          this.inThinking = false
          this.displayPosition = absoluteEndIdx + "</thinking>".length

          // Recursively process remaining content
          const remaining = this.contentBuffer.substring(this.displayPosition)
          if (remaining && !this.isPartialTag(remaining)) {
            callbacks.onNormalContent?.(remaining)
            this.displayPosition = this.contentBuffer.length
          }
        } else {
          // Only opening tag, show partial thinking content but check for partial closing tag
          const contentAfterOpen = this.contentBuffer.substring(this.displayPosition)

          // Check if buffer ends with partial closing tag
          if (this.isPartialTag(contentAfterOpen)) {
            // Hold back the partial tag
            let safeEnd = this.contentBuffer.length
            for (let i = 1; i < "</thinking>".length; i++) {
              if (this.contentBuffer.endsWith("</thinking>".substring(0, i))) {
                safeEnd = this.contentBuffer.length - i
                break
              }
            }
            const safeContent = this.contentBuffer.substring(this.displayPosition, safeEnd)
            if (this.showThinkingEnabled && safeContent) {
              callbacks.onThinkingContent?.(safeContent)
            }
            this.displayPosition = safeEnd
          } else {
            // No partial tag, display all
            if (this.showThinkingEnabled && contentAfterOpen) {
              callbacks.onThinkingContent?.(contentAfterOpen)
            }
            this.displayPosition = this.contentBuffer.length
          }
        }
      } else {
        // No opening tag found yet
        // Check if buffer ends with partial opening tag
        const undisplayed = this.contentBuffer.substring(this.displayPosition)

        if (this.isPartialTag(undisplayed)) {
          // Hold back potential partial tag
          let safeEnd = this.contentBuffer.length
          for (let i = 1; i < "<thinking>".length; i++) {
            if (this.contentBuffer.endsWith("<thinking>".substring(0, i))) {
              safeEnd = this.contentBuffer.length - i
              break
            }
          }
          const safeContent = this.contentBuffer.substring(this.displayPosition, safeEnd)
          if (safeContent) {
            callbacks.onNormalContent?.(safeContent)
          }
          this.displayPosition = safeEnd
        } else {
          // Safe to display everything
          if (undisplayed) {
            callbacks.onNormalContent?.(undisplayed)
          }
          this.displayPosition = this.contentBuffer.length
        }
      }
    } else {
      // In thinking mode - looking for closing tag
      if (absoluteEndIdx !== -1) {
        // Found closing tag
        const thinkingContent = this.contentBuffer.substring(this.displayPosition, absoluteEndIdx)
        if (this.showThinkingEnabled && thinkingContent) {
          callbacks.onThinkingContent?.(thinkingContent)
        }
        if (this.showThinkingEnabled) {
          callbacks.onThinkingEnd?.()
        }

        this.inThinking = false
        this.displayPosition = absoluteEndIdx + "</thinking>".length

        // Process any remaining content
        const remaining = this.contentBuffer.substring(this.displayPosition)
        if (remaining && !this.isPartialTag(remaining)) {
          callbacks.onNormalContent?.(remaining)
          this.displayPosition = this.contentBuffer.length
        }
      } else {
        // Still in thinking, no closing tag yet
        const contentAfterDisplay = this.contentBuffer.substring(this.displayPosition)

        // Check for partial closing tag
        if (this.isPartialTag(contentAfterDisplay)) {
          // Hold back the partial tag
          let safeEnd = this.contentBuffer.length
          for (let i = 1; i < "</thinking>".length; i++) {
            if (this.contentBuffer.endsWith("</thinking>".substring(0, i))) {
              safeEnd = this.contentBuffer.length - i
              break
            }
          }
          const safeContent = this.contentBuffer.substring(this.displayPosition, safeEnd)
          if (this.showThinkingEnabled && safeContent) {
            callbacks.onThinkingContent?.(safeContent)
          }
          this.displayPosition = safeEnd
        } else {
          // No partial tag, display all thinking content
          if (this.showThinkingEnabled && contentAfterDisplay) {
            callbacks.onThinkingContent?.(contentAfterDisplay)
          }
          this.displayPosition = this.contentBuffer.length
        }
      }
    }
  }

  /**
   * Reset the handler state (call when starting a new content block)
   */
  reset(): void {
    this.contentBuffer = ""
    this.displayPosition = 0
    this.inThinking = false
  }

  /**
   * Get current thinking state
   */
  isInThinking(): boolean {
    return this.inThinking
  }

  /**
   * Set whether to show thinking content
   */
  setShowThinking(show: boolean): void {
    this.showThinkingEnabled = show
  }
}
