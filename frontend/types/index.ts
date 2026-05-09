export interface Agent {
  id: number
  name: string
  model: string
  status: string
  parent_id: number | null
  system_prompt?: string
  knowledge_base_id?: number | null
  mcp_server_ids?: number[]
}

export interface MCPServer {
  id: number
  name: string
  description: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

export interface MCPTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface MCPTestResult {
  ok: boolean
  tools?: MCPTool[]
  error?: string
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
  | { type: 'prompt'; requestId: string; question: string; answer?: string; pending: boolean }
  | {
      type: 'approval'
      requestId: string
      toolName: string
      input: Record<string, unknown>
      decision?: 'approved' | 'denied'
      reason?: string
      pending: boolean
    }
