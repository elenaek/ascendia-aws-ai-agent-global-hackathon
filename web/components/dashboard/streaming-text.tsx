'use client'

import { useState, useEffect, useRef } from 'react'

interface StreamingTextProps {
  targetText: string
  isStreaming: boolean
  children: (displayedText: string) => React.ReactNode
}

/**
 * StreamingText component provides a smooth character-by-character
 * animation for streaming text content.
 *
 * When isStreaming is true, it gradually reveals characters at a natural pace.
 * When isStreaming is false, it speeds up the animation to quickly finish
 * displaying any remaining text, creating a smooth "catch-up" effect instead
 * of an abrupt flash to the complete message.
 */
export function StreamingText({ targetText, isStreaming, children }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const animationRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const targetTextRef = useRef(targetText)
  const isStreamingRef = useRef(isStreaming)
  const currentIndexRef = useRef(0)
  const hasEverAnimatedRef = useRef(false)
  const isMountedRef = useRef(false)

  // Update refs when props change
  useEffect(() => {
    targetTextRef.current = targetText
    isStreamingRef.current = isStreaming
  }, [targetText, isStreaming])

  useEffect(() => {
    // Mark component as mounted after first render
    if (!isMountedRef.current) {
      isMountedRef.current = true
    }

    // Handle reset when target text is empty (new message starting)
    if (targetText === '' && displayedText !== '') {
      setDisplayedText('')
      currentIndexRef.current = 0
      hasEverAnimatedRef.current = false
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    // CRITICAL: On initial mount with existing text and NOT streaming, show immediately
    // This prevents old messages from animating when the chat interface loads
    if (!hasEverAnimatedRef.current && targetText && !isStreaming && displayedText === '') {
      setDisplayedText(targetText)
      currentIndexRef.current = targetText.length
      return
    }

    // If target text is shorter than what we're displaying (edge case), reset
    if (targetText.length < displayedText.length) {
      setDisplayedText(targetText)
      currentIndexRef.current = targetText.length
      return
    }

    // If we're already showing everything, no animation needed
    if (currentIndexRef.current >= targetText.length) {
      return
    }

    // Animation function with adaptive speed based on streaming state
    const animate = (timestamp: number) => {
      // Initialize lastFrameTime on first frame
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp
      }

      const elapsed = timestamp - lastFrameTimeRef.current

      // Adaptive speed: slower while streaming, faster after stream completes
      const isCurrentlyStreaming = isStreamingRef.current
      const targetDelay = isCurrentlyStreaming ? 30 : 10  // 30ms while streaming, 10ms after
      const charsPerFrame = isCurrentlyStreaming ? 2 : 12 // 2 chars while streaming, 12 chars after

      if (elapsed >= targetDelay) {
        const remainingChars = targetTextRef.current.length - currentIndexRef.current
        const charsToAdd = Math.min(charsPerFrame, remainingChars)

        if (charsToAdd > 0) {
          currentIndexRef.current += charsToAdd
          setDisplayedText(targetTextRef.current.substring(0, currentIndexRef.current))
          lastFrameTimeRef.current = timestamp
        }
      }

      // Continue animation if we haven't reached the end
      if (currentIndexRef.current < targetTextRef.current.length) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        animationRef.current = null
        lastFrameTimeRef.current = 0
      }
    }

    // Start animation if we have more text to show
    if (currentIndexRef.current < targetText.length && animationRef.current === null) {
      hasEverAnimatedRef.current = true // Mark that we've started animating
      lastFrameTimeRef.current = 0
      animationRef.current = requestAnimationFrame(animate)
    }

    // Cleanup
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [targetText, isStreaming]) // Removed displayedText from dependencies to prevent circular re-renders

  return <>{children(displayedText)}</>
}
