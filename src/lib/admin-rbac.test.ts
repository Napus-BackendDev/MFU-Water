import { describe, expect, it } from 'vitest'
import {
  ADMIN_PAGES,
  ALL_COMMUNITY_IDS,
  DEFAULT_ROLES,
  canAccessCommunity,
  hasPageAccess,
  makePermissions,
  normalizeAllowedCommunities,
  normalizePermissions,
} from './admin-rbac'

describe('admin-rbac helpers', () => {
  it('defines all 12 admin pages and 4 preset roles', () => {
    expect(ADMIN_PAGES).toHaveLength(12)
    expect(DEFAULT_ROLES.map((r) => r.id)).toEqual([
      'super-admin',
      'reviewer',
      'researcher',
      'viewer',
    ])
  })

  it('evaluates 3-level page permissions (none < view < edit)', () => {
    const perms = makePermissions('none', {
      overview: 'view',
      samples: 'edit',
    })

    expect(hasPageAccess(perms, 'overview', 'view')).toBe(true)
    expect(hasPageAccess(perms, 'overview', 'edit')).toBe(false)
    expect(hasPageAccess(perms, 'samples', 'view')).toBe(true)
    expect(hasPageAccess(perms, 'samples', 'edit')).toBe(true)
    expect(hasPageAccess(perms, 'users', 'view')).toBe(false)
    expect(hasPageAccess(perms, 'users', 'edit')).toBe(false)
  })

  it('normalizes unknown permission levels to none', () => {
    const perms = normalizePermissions({
      overview: 'view',
      samples: 'invalid-level',
      users: 'edit',
    })
    expect(perms.overview).toBe('view')
    expect(perms.samples).toBe('none')
    expect(perms.users).toBe('edit')
    expect(perms.news).toBe('none')
  })

  it('normalizes and checks allowedCommunities scope', () => {
    // Missing = an account saved before village scoping; anything that names no valid village = no access.
    expect(normalizeAllowedCommunities(undefined)).toEqual(['all'])
    expect(normalizeAllowedCommunities(null)).toEqual(['all'])
    expect(normalizeAllowedCommunities([])).toEqual([])
    expect(normalizeAllowedCommunities(['thatonn'])).toEqual([])
    expect(normalizeAllowedCommunities('all')).toEqual([])
    expect(normalizeAllowedCommunities(['thaton', 'all'])).toEqual(['all'])
    expect(normalizeAllowedCommunities(['thaton', 'invalid', 'ruammit'])).toEqual(['thaton', 'ruammit'])

    expect(canAccessCommunity(['all'], 'thaton')).toBe(true)
    expect(canAccessCommunity(['thaton', 'pongkhong'], 'thaton')).toBe(true)
    expect(canAccessCommunity(['thaton', 'pongkhong'], 'ruammit')).toBe(false)
    expect(canAccessCommunity(['thaton'], 'all')).toBe(false)
    expect(canAccessCommunity([], 'thaton')).toBe(false)
    expect(canAccessCommunity(undefined, 'thaton')).toBe(false)
    expect(ALL_COMMUNITY_IDS).toEqual(['thaton', 'ruammit', 'pongkhong', 'pakingtai'])
  })

  it('configures preset role permissions as expected', () => {
    const superAdmin = DEFAULT_ROLES.find((r) => r.id === 'super-admin')!
    const reviewer = DEFAULT_ROLES.find((r) => r.id === 'reviewer')!
    const researcher = DEFAULT_ROLES.find((r) => r.id === 'researcher')!
    const viewer = DEFAULT_ROLES.find((r) => r.id === 'viewer')!

    expect(hasPageAccess(superAdmin.permissions, 'users', 'edit')).toBe(true)
    expect(hasPageAccess(reviewer.permissions, 'samples', 'edit')).toBe(true)
    expect(hasPageAccess(reviewer.permissions, 'users', 'view')).toBe(false)
    expect(hasPageAccess(researcher.permissions, 'research', 'edit')).toBe(true)
    expect(hasPageAccess(researcher.permissions, 'samples', 'view')).toBe(true)
    expect(hasPageAccess(researcher.permissions, 'samples', 'edit')).toBe(false)
    expect(hasPageAccess(viewer.permissions, 'overview', 'view')).toBe(true)
    expect(hasPageAccess(viewer.permissions, 'overview', 'edit')).toBe(false)
    expect(hasPageAccess(viewer.permissions, 'users', 'view')).toBe(false)
  })
})
