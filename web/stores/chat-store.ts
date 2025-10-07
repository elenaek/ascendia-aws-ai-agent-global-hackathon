import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinking?: string
  toolUses?: ToolUse[]
}

interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown> | string
  status: 'running' | 'completed'
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  isThinking: boolean
  thinkingContent: string
  currentStreamingId: string | null
  toolUses: ToolUse[]
  showCompletedThinking: boolean
  showCompletedToolUses: boolean
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  appendToMessage: (id: string, text: string) => void
  setLoading: (loading: boolean) => void
  setThinking: (thinking: boolean) => void
  setThinkingContent: (content: string) => void
  appendThinkingContent: (text: string) => void
  setStreamingId: (id: string | null) => void
  saveThinkingToMessage: (id: string, thinking: string) => void
  saveToolUsesToMessage: (id: string) => void
  toggleShowCompletedThinking: () => void
  toggleShowCompletedToolUses: () => void
  addToolUse: (toolUse: Omit<ToolUse, 'status'>) => void
  updateToolUse: (id: string, updates: Partial<ToolUse>) => void
  clearToolUses: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,
      isThinking: false,
      thinkingContent: '',
      currentStreamingId: null,
      toolUses: [],
      showCompletedThinking: true,
      showCompletedToolUses: true,
  addMessage: (message) => {
    const id = crypto.randomUUID()
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id,
          timestamp: new Date(),
        },
      ],
    }))
    return id
  },
  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    })),
  appendToMessage: (id, text) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + text } : msg
      ),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setThinking: (thinking) =>
    set((state) => {
      // When thinking ends, save it to the current streaming message if toggle is enabled
      if (!thinking && state.isThinking && state.showCompletedThinking && state.thinkingContent && state.currentStreamingId) {
        return {
          isThinking: false,
          thinkingContent: '',
          messages: state.messages.map((msg) =>
            msg.id === state.currentStreamingId ? { ...msg, thinking: state.thinkingContent } : msg
          ),
        }
      }
      // Otherwise just update thinking state
      return { isThinking: thinking, thinkingContent: thinking ? state.thinkingContent : '' }
    }),
  setThinkingContent: (content) => set({ thinkingContent: content }),
  appendThinkingContent: (text) => set((state) => ({ thinkingContent: state.thinkingContent + text })),
  setStreamingId: (id) => set({ currentStreamingId: id }),
  saveThinkingToMessage: (id, thinking) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, thinking } : msg
      ),
    })),
  toggleShowCompletedThinking: () => set((state) => ({ showCompletedThinking: !state.showCompletedThinking })),
  toggleShowCompletedToolUses: () => set((state) => ({ showCompletedToolUses: !state.showCompletedToolUses })),
  saveToolUsesToMessage: (id: string) =>
    set((state) => {
      // Only save tool uses to message if the toggle is enabled
      if (!state.showCompletedToolUses) {
        return {}
      }
      return {
        messages: state.messages.map((msg) =>
          msg.id === id ? { ...msg, toolUses: [...state.toolUses] } : msg
        ),
      }
    }),
  addToolUse: (toolUse) =>
    set((state) => ({
      toolUses: [
        ...state.toolUses,
        {
          ...toolUse,
          status: 'running' as const,
        },
      ],
    })),
  updateToolUse: (id, updates) =>
    set((state) => ({
      toolUses: state.toolUses.map((tool) =>
        tool.id === id ? { ...tool, ...updates } : tool
      ),
    })),
  clearToolUses: () => set({ toolUses: [] }),
  clearMessages: () => set({ messages: [], currentStreamingId: null, thinkingContent: '', toolUses: [] }),
    }),
    {
      name: 'chat-preferences',
      partialize: (state) => ({
        showCompletedThinking: state.showCompletedThinking,
        showCompletedToolUses: state.showCompletedToolUses,
      }),
    }
  )
)
