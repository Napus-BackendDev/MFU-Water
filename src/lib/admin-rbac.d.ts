export type PermissionLevel = 'none' | 'view' | 'edit'
export type CommunityScopeId = 'thaton' | 'ruammit' | 'pongkhong' | 'pakingtai'
export type AdminPageKey =
  | 'overview'
  | 'hamlets'
  | 'samples'
  | 'evacuation'
  | 'places'
  | 'reporters'
  | 'print-map'
  | 'news'
  | 'research'
  | 'reports'
  | 'settings'
  | 'users'

export type AdminPageMeta = {
  readonly key: AdminPageKey
  readonly label: string
  readonly subtitle: string
  readonly group: string
}

export type AdminPermissions = Record<AdminPageKey, PermissionLevel>

export type AdminRole = {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: AdminPermissions
  created_at?: string
  updated_at?: string
}

export type AdminUser = {
  id: string
  username: string
  displayName: string
  roleId: string
  roleName?: string
  allowedCommunities: string[]
  active: boolean
  lastLoginAt?: string | null
  created_at?: string
  updated_at?: string
}

export type AdminMe = {
  ok: boolean
  bypass: boolean
  isSuperAdmin: boolean
  userId: string | null
  username: string | null
  displayName: string
  roleId: string
  roleName: string
  permissions: AdminPermissions
  allowedCommunities: string[]
}

export declare const PERMISSION_LEVELS: readonly PermissionLevel[]
export declare const ALL_COMMUNITY_IDS: readonly CommunityScopeId[]
export declare const ADMIN_PAGES: readonly AdminPageMeta[]
export declare const ADMIN_PAGE_KEYS: AdminPageKey[]
export declare const DEFAULT_ROLES: AdminRole[]
export declare function makePermissions(level?: PermissionLevel, overrides?: Partial<AdminPermissions>): AdminPermissions
export declare function normalizePermissions(input: unknown): AdminPermissions
export declare function normalizeAllowedCommunities(input: unknown): string[]
export declare function hasPageAccess(permissions: Partial<AdminPermissions> | null | undefined, pageKey: AdminPageKey, required?: 'view' | 'edit'): boolean
export declare function canAccessCommunity(allowedCommunities: string[] | null | undefined, communityId: string): boolean
