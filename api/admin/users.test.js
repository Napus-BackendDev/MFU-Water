// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ROLES } from '../../src/lib/admin-rbac.js'
import { hashPassword, verifyPassword, listRoles, listUsers } from './_users_db.js'
import {
  createRoleHandler,
  createUserHandler,
  deleteRoleHandler,
  getMeHandler,
  getRolesHandler,
  getUsersHandler,
} from './_users.js'
import samples from './samples.js'
import review from './review.js'
import { buildAdminQueue, reviewSample } from '../surveys/_db.js'

vi.mock('./_users_db.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    listRoles: vi.fn(async () => DEFAULT_ROLES),
    getRoleById: vi.fn(async (id) => DEFAULT_ROLES.find((r) => r.id === id) || null),
    listUsers: vi.fn(async () => []),
    getUserById: vi.fn(async () => null),
    getUserByUsername: vi.fn(async () => null),
    createUser: vi.fn(async (body) => ({ id: 'u-1', ...body })),
    createRole: vi.fn(async (body) => ({ id: 'custom-role', ...body })),
    deleteRole: vi.fn(async (id) => {
      if (['super-admin', 'reviewer', 'researcher', 'viewer'].includes(id)) {
        throw new Error('ไม่สามารถลบบทบาทระบบเริ่มต้นได้')
      }
    }),
  }
})

vi.mock('../surveys/_db.js', async (importOriginal) => ({
  statusAfterEdit: (await importOriginal()).statusAfterEdit,
  buildAdminQueue: vi.fn(async () => ({ items: [], counts: { total: 0, pending: 0, approved: 0, autoPublished: 0, rejected: 0 } })),
  reviewSample: vi.fn(async () => ({ ok: true })),
}))

const reply = () => {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

const enableDevBypass = () => {
  vi.stubEnv('VERCEL', '')
  vi.stubEnv('APP_ENV', 'development')
  vi.stubEnv('ADMIN_BYPASS', '')
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('password hashing', () => {
  it('hashes and verifies passwords with scrypt', () => {
    const hash = hashPassword('StrongPass!2026')
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    expect(verifyPassword('StrongPass!2026', hash)).toBe(true)
    expect(verifyPassword('WrongPass', hash)).toBe(false)
    expect(verifyPassword('StrongPass!2026', 'bad-format')).toBe(false)
  })
})

describe('RBAC dev preview and API enforcement', () => {
  it('returns super-admin permissions by default in dev bypass', async () => {
    enableDevBypass()
    const res = reply()
    await getMeHandler({ method: 'GET', headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.bypass).toBe(true)
    expect(body.roleId).toBe('super-admin')
    expect(body.permissions.users).toBe('edit')
    expect(body.allowedCommunities).toEqual(['all'])
  })

  it('applies x-dev-role-id and x-dev-communities in dev bypass', async () => {
    enableDevBypass()
    const res = reply()
    await getMeHandler({
      method: 'GET',
      headers: {
        'x-dev-role-id': 'viewer',
        'x-dev-communities': 'thaton',
      },
    }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.roleId).toBe('viewer')
    expect(body.permissions.samples).toBe('view')
    expect(body.permissions.users).toBe('none')
    expect(body.allowedCommunities).toEqual(['thaton'])
  })

  it('allows viewer to GET samples but blocks POST review with 403', async () => {
    enableDevBypass()
    const headers = { 'x-dev-role-id': 'viewer' }

    const getRes = reply()
    await samples({ method: 'GET', headers, query: {} }, getRes)
    expect(buildAdminQueue).toHaveBeenCalledTimes(1)
    expect(getRes.status).toHaveBeenCalledWith(200)

    const postRes = reply()
    await review({ method: 'POST', headers, body: { sampleCode: 'KOK-1', decision: 'approved' } }, postRes)
    expect(reviewSample).not.toHaveBeenCalled()
    expect(postRes.status).toHaveBeenCalledWith(403)
  })

  it('blocks reviewer from accessing /api/admin/users with 403', async () => {
    enableDevBypass()
    const headers = { 'x-dev-role-id': 'reviewer' }

    const usersRes = reply()
    await getUsersHandler({ method: 'GET', headers }, usersRes)
    expect(listUsers).not.toHaveBeenCalled()
    expect(usersRes.status).toHaveBeenCalledWith(403)

    const rolesRes = reply()
    await getRolesHandler({ method: 'GET', headers }, rolesRes)
    expect(listRoles).not.toHaveBeenCalled()
    expect(rolesRes.status).toHaveBeenCalledWith(403)
  })

  it('allows super-admin to list/create users and prevents deleting system preset roles', async () => {
    enableDevBypass()
    const headers = { 'x-dev-role-id': 'super-admin' }

    const createRes = reply()
    await createUserHandler({
      method: 'POST',
      headers,
      body: { username: 'nurse1', password: 'password123', roleId: 'reviewer', allowedCommunities: ['thaton'] },
    }, createRes)
    expect(createRes.status).toHaveBeenCalledWith(201)

    const roleRes = reply()
    await createRoleHandler({
      method: 'POST',
      headers,
      body: { name: 'Field Coordinator', permissions: { samples: 'edit' } },
    }, roleRes)
    expect(roleRes.status).toHaveBeenCalledWith(201)

    const delRes = reply()
    await deleteRoleHandler({ method: 'DELETE', headers, query: { id: 'viewer' } }, delRes)
    expect(delRes.status).toHaveBeenCalledWith(400)
  })
})
