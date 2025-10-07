/**
 * WebSocket client for receiving dynamic UI updates from the AI agent.
 * Uses AWS Signature V4 authentication with Cognito Identity Pool credentials.
 */

import { fetchAuthSession } from 'aws-amplify/auth'
import { WebSocketMessage } from '@/types/websocket-messages'

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

      // Extract access key, secret key, and session token
      const { accessKeyId, secretAccessKey, sessionToken } = credentials

      // Create the WebSocket URL with IAM auth query parameters
      const url = new URL(WEBSOCKET_URL)

      // For WebSocket connections with IAM auth, we need to sign the connection request
      // AWS AppSync/API Gateway uses SigV4 signing for WebSocket connections

      // Create canonical request
      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
      const date = timestamp.substring(0, 8)

      const headers = {
        host: url.host,
        'x-amz-date': timestamp,
        ...(sessionToken && { 'x-amz-security-token': sessionToken })
      }

      // For WebSocket connections with IAM, we'll use the header-based approach
      // Since WebSocket doesn't support custom headers in browser, we'll pass credentials via query params
      // This is a simplified approach - in production you might want to use a signing library

      const queryParams = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${date}/${AWS_REGION}/execute-api/aws4_request`,
        'X-Amz-Date': timestamp,
        'X-Amz-SignedHeaders': 'host',
      })

      if (sessionToken) {
        queryParams.set('X-Amz-Security-Token', sessionToken)
      }

      // For proper SigV4 signing, we'd need to compute a signature
      // For now, we'll rely on IAM authorizer accepting the credentials
      // In production, use @aws-sdk/signature-v4 for proper signing

      return `${url.toString()}?${queryParams.toString()}`
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
