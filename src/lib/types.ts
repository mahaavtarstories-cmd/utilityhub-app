export type UserRole = 'admin' | 'manager' | 'researcher' | 'qa' | 'viewer'

export type ProjectPlatform = 'ebay' | 'amazon' | 'gunbroker' | 'nightgalaxy'

export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'submitted' | 'qa_pending' | 'rejected' | 'approved' | 'completed'

export type RulebookStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  platform: ProjectPlatform
  status: 'active' | 'paused' | 'archived'
  manager_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Product {
  id: string
  project_id: string
  internal_sku: string | null
  brand: string | null
  manufacturer: string | null
  mpn: string | null
  upc: string | null
  model: string | null
  product_name: string | null
  manufacturer_url: string | null
  product_url: string | null
  description: string | null
  specifications: Record<string, unknown> | null
  research_status: string
  qa_status: string
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  product_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  assigned_to: string | null
  assigned_by: string | null
  qa_assigned_to: string | null
  qa_comment: string | null
  submitted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export const PLATFORM_LABELS: Record<ProjectPlatform, string> = {
  ebay: 'eBay',
  amazon: 'Amazon',
  gunbroker: 'GunBroker',
  nightgalaxy: 'Night Galaxy',
}

export const PLATFORM_COLORS: Record<ProjectPlatform, string> = {
  ebay: 'bg-red-100 text-red-700 border-red-200',
  amazon: 'bg-orange-100 text-orange-700 border-orange-200',
  gunbroker: 'bg-blue-100 text-blue-700 border-blue-200',
  nightgalaxy: 'bg-purple-100 text-purple-700 border-purple-200',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  researcher: 'Researcher',
  qa: 'QA',
  viewer: 'Viewer',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  researcher: 'bg-green-100 text-green-700 border-green-200',
  qa: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  qa_pending: 'QA Pending',
  rejected: 'Rejected',
  approved: 'Approved',
  completed: 'Completed',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  new: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-purple-100 text-purple-700',
  qa_pending: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
}