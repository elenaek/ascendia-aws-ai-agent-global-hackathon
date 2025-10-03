import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  isThinking: boolean
  thinkingContent: string
  currentStreamingId: string | null
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  appendToMessage: (id: string, text: string) => void
  setLoading: (loading: boolean) => void
  setThinking: (thinking: boolean) => void
  setThinkingContent: (content: string) => void
  appendThinkingContent: (text: string) => void
  setStreamingId: (id: string | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isThinking: false,
  thinkingContent: '',
  currentStreamingId: null,
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
  setThinking: (thinking) => set({ isThinking: thinking, thinkingContent: thinking ? '' : '' }),
  setThinkingContent: (content) => set({ thinkingContent: content }),
  appendThinkingContent: (text) => set((state) => ({ thinkingContent: state.thinkingContent + text })),
  setStreamingId: (id) => set({ currentStreamingId: id }),
  clearMessages: () => set({ messages: [], currentStreamingId: null, thinkingContent: '' }),
}))
