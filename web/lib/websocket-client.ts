/**
 * WebSocket client for receiving dynamic UI updates from the AI agent.
 * Uses AWS Signature V4 authentication with Cognito Identity Pool credentials.
 */

import { fetchAuthSession } from 'aws-amplify/auth'
import { WebSocketMessage } from '@/types/websocket-messages'
import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'
import { HttpRequest } from '@smithy/protocol-http'

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || ''
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'

export interface WebSocketClientConfig {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: WebSocketClientConfig
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second
  private isConnecting = false
  private shouldReconnect = true

  constructor(config: WebSocketClientConfig) {
    this.config = config
  }

  /**
   * Sign WebSocket URL with AWS Signature V4 using Cognito credentials
   */
  private async getSignedWebSocketUrl(): Promise<string> {
    try {
      // Get Cognito credentials from Amplify
      const session = await fetchAuthSession()
      const credentials = session.credentials

      if (!credentials) {
        throw new Error('No AWS credentials available')
      }

      // Convert wss:// to https:// for signing (required by SigV4)
      const signingUrl = WEBSOCKET_URL.replace('wss://', 'https://')
      const parsedUrl = new URL(signingUrl)

      // Create HTTP request for signing with presign
      const request = new HttpRequest({
        method: 'GET',
        protocol: 'https:',
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        headers: {
          host: parsedUrl.hostname,
        },
      })

      // Create SigV4 signer with presigning
      const signer = new SignatureV4({
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
        region: AWS_REGION,
        service: 'execute-api',
        sha256: Sha256,
      })

      // Presign the request (300 second expiry)
      const presigned = await signer.presign(request, {
        expiresIn: 300,
      })

      // Build the final WebSocket URL
      const signedUrl = new URL(WEBSOCKET_URL)

      // Copy all query parameters from presigned request
      if (presigned.query) {
        Object.entries(presigned.query).forEach(([key, value]) => {
          signedUrl.searchParams.set(key, value as string)
        })
      }

      console.log('WebSocket URL signed successfully')
      return signedUrl.toString()
    } catch (error) {
      console.error('Error signing WebSocket URL:', error)
      throw error
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting')
      return
    }

    try {
      this.isConnecting = true
      this.shouldReconnect = true

      // Get signed URL with IAM credentials
      const signedUrl = await this.getSignedWebSocketUrl()

      // Create WebSocket connection
      this.ws = new WebSocket(signedUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        this.config.onConnect?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          this.config.onMessage?.(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.config.onError?.(new Error('WebSocket error'))
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.ws = null
        this.config.onDisconnect?.()

        // Attempt reconnection with exponential backoff
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
          console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

          setTimeout(() => {
            this.connect()
          }, delay)
        }
      }
    } catch (error) {
      this.isConnecting = false
      console.error('Error connecting to WebSocket:', error)
      this.config.onError?.(error as Error)
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.reconnectAttempts = 0

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Send a message (not used in this implementation, but included for completeness)
   */
  send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }
}
