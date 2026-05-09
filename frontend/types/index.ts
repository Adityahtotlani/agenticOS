export interface Agent {
  id: number
  name: string
  model: string
  status: string
  parent_id: number | null
  system_prompt?: string
  knowledge_base_id?: number | null
}

export interface KnowledgeBase {
  id: number
  name: string
  description: string
  document_count: number
}

export interface KBDocument {
  id: number
  kb_id: number
  filename: string
  chunks_count: number
}

export interface AgentTemplate {
  id: string
  name: string
  description: string
  model: string
  system_prompt: string
}

export interface Task {
  id: number
  title: string
  description: string
  status: string
  agent_id: number | null
  parent_task_id: number | null
  result?: string
}

export interface Memory {
  id: number
  agent_id: number
  role: string // 'user' | 'assistant' | 'tool'
  content: string
  type: string // 'short_term' | 'long_term'
  created_at: string
}

export type TerminalEntry =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; input: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'error'; content: string }
