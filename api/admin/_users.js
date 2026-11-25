import { ADMIN_PAGE_KEYS, DEFAULT_ROLES, canAccessCommunity, hasPageAccess, normalizeAllowedCommunities, normalizePermissions } from '../../src/lib/admin-rbac.js'
import { respond } from '../surveys/_shared.js'
import { adminEndpoint } from './_admin_shared.js'
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  listRoles,
  getUserById,
  listUsers,
  updateRole,
  updateUser,
} from './_users_db.js'

// Only a Super Admin may create or change Super Admins, and nobody can hand out more than they hold:
// not a wider village scope and not a higher page level than their own role has.
const forbidden = (res, message) => respond(res, 403, { error: message })

function beyondOwnScope(ctx, communities) {
  if (ctx.isSuperAdmin || communities === undefined) return false
  const wanted = normalizeAllowedCommunities(communities)
  const all = wanted.includes('all')
  return all ? !canAccessCommunity(ctx.allowedCommunities, 'all') : wanted.some((id) => !canAccessCommunity(ctx.allowedCommunities, id))
}

function beyondOwnPermissions(ctx, permissions) {
  if (ctx.isSuperAdmin || !permissions) return false
  const wanted = normalizePermissions(permissions)
  return ADMIN_PAGE_KEYS.some((key) => wanted[key] === 'edit' ? !hasPageAccess(ctx.permissions, key, 'edit') : wanted[key] === 'view' && !hasPageAccess(ctx.permissions, key, 'view'))
}

function parseBody(req) {
  if (!req.body) return {}
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

export const getMeHandler = adminEndpoint('GET', async (_req, res, _settings, ctx) => {
  const payload = {
    ok: true,
    bypass: ctx.bypass,
    isSuperAdmin: ctx.isSuperAdmin,
    userId: ctx.userId,
    username: ctx.username,
    displayName: ctx.displayName,
    roleId: ctx.roleId,
    roleName: ctx.roleName,
    permissions: ctx.permissions,
    allowedCommunities: ctx.allowedCommunities,
  }
  if (ctx.bypass) {
    payload.devRoles = await listRoles().catch(() => DEFAULT_ROLES)
  }
  return respond(res, 200, payload)
})

export const getUsersHandler = adminEndpoint('GET', async (_req, res) => {
  const users = await listUsers()
  return respond(res, 200, { ok: true, users })
}, { page: 'users', level: 'view' })

export const createUserHandler = adminEndpoint('POST', async (req, res, _settings, ctx) => {
  try {
    const body = parseBody(req)
    if (body?.roleId === 'super-admin' && !ctx.isSuperAdmin) return forbidden(res, 'เฉพาะ Super Admin เท่านั้นที่กำหนดบทบาทนี้ได้')
    if (beyondOwnScope(ctx, body?.allowedCommunities)) return forbidden(res, 'กำหนดชุมชนกว้างกว่าสิทธิ์ของคุณเองไม่ได้')
    const user = await createUser(body)
    return respond(res, 201, { ok: true, user })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'สร้างผู้ใช้งานไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })

export const updateUserHandler = adminEndpoint('PUT', async (req, res, _settings, ctx) => {
  try {
    const body = parseBody(req)
    const id = req.params?.id || body?.id
    if (!id) return respond(res, 400, { error: 'ไม่พบรหัสผู้ใช้งาน' })
    const target = await getUserById(id)
    if (!ctx.isSuperAdmin && (target?.roleId === 'super-admin' || body?.roleId === 'super-admin')) return forbidden(res, 'เฉพาะ Super Admin เท่านั้นที่แก้บัญชีหรือกำหนดบทบาทนี้ได้')
    if (beyondOwnScope(ctx, body?.allowedCommunities)) return forbidden(res, 'กำหนดชุมชนกว้างกว่าสิทธิ์ของคุณเองไม่ได้')
    const user = await updateUser(id, body)
    return respond(res, 200, { ok: true, user })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'แก้ไขผู้ใช้งานไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })

export const deleteUserHandler = adminEndpoint('DELETE', async (req, res, _settings, ctx) => {
  try {
    const body = parseBody(req)
    const id = req.params?.id || req.query?.id || body?.id
    if (!id) return respond(res, 400, { error: 'ไม่พบรหัสผู้ใช้งาน' })
    if (!ctx.isSuperAdmin && (await getUserById(id))?.roleId === 'super-admin') return forbidden(res, 'เฉพาะ Super Admin เท่านั้นที่ลบบัญชีนี้ได้')
    await deleteUser(id, ctx.userId)
    return respond(res, 200, { ok: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อย' })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'ลบบัญชีผู้ใช้งานไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })

export const getRolesHandler = adminEndpoint('GET', async (_req, res) => {
  const roles = await listRoles().catch(() => DEFAULT_ROLES)
  return respond(res, 200, { ok: true, roles })
}, { page: 'users', level: 'view' })

export const createRoleHandler = adminEndpoint('POST', async (req, res, _settings, ctx) => {
  try {
    const body = parseBody(req)
    if (beyondOwnPermissions(ctx, body?.permissions)) return forbidden(res, 'กำหนดสิทธิ์สูงกว่าบทบาทของคุณเองไม่ได้')
    const role = await createRole(body)
    return respond(res, 201, { ok: true, role })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'สร้างบทบาทไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })

export const updateRoleHandler = adminEndpoint('PUT', async (req, res, _settings, ctx) => {
  try {
    const body = parseBody(req)
    const id = req.params?.id || body?.id
    if (!id) return respond(res, 400, { error: 'ไม่พบรหัสบทบาท' })
    if (!ctx.isSuperAdmin && id === 'super-admin') return forbidden(res, 'เฉพาะ Super Admin เท่านั้นที่แก้บทบาทนี้ได้')
    if (beyondOwnPermissions(ctx, body?.permissions)) return forbidden(res, 'กำหนดสิทธิ์สูงกว่าบทบาทของคุณเองไม่ได้')
    const role = await updateRole(id, body)
    return respond(res, 200, { ok: true, role })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'แก้ไขบทบาทไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })

export const deleteRoleHandler = adminEndpoint('DELETE', async (req, res) => {
  try {
    const body = parseBody(req)
    const id = req.params?.id || req.query?.id || body?.id
    if (!id) return respond(res, 400, { error: 'ไม่พบรหัสบทบาท' })
    await deleteRole(id)
    return respond(res, 200, { ok: true, message: 'ลบบทบาทเรียบร้อย' })
  } catch (error) {
    return respond(res, 400, { error: error?.message || 'ลบบทบาทไม่สำเร็จ' })
  }
}, { page: 'users', level: 'edit' })
