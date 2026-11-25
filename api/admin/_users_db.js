import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDb as connect } from '../surveys/_db.js'
import { config } from '../surveys/_shared.js'
import {
  DEFAULT_ROLES,
  normalizeAllowedCommunities,
  normalizePermissions,
} from '../../src/lib/admin-rbac.js'

// The user store always uses the server's own database settings, like every other admin store.
const getDb = () => connect(config(false))

export const MIN_PASSWORD_LENGTH = 8

const ROLES_COLL = 'kok_admin_roles'
const USERS_COLL = 'kok_admin_users'

export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(plain), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false
  try {
    const actual = scryptSync(plain, salt, 64)
    const expected = Buffer.from(expectedHex, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function stripUser(doc) {
  if (!doc) return null
  const { _id, passwordHash, ...rest } = doc
  return {
    ...rest,
    allowedCommunities: normalizeAllowedCommunities(rest.allowedCommunities),
    active: rest.active !== false,
  }
}

function stripRole(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return {
    ...rest,
    permissions: normalizePermissions(rest.permissions),
  }
}

export async function ensureSeedRoles(db) {
  const existing = await db.collection(ROLES_COLL).find({}).toArray()
  if (existing.length > 0) return existing.map(stripRole)
  const now = new Date().toISOString()
  const docs = DEFAULT_ROLES.map((r) => ({
    ...r,
    created_at: now,
    updated_at: now,
  }))
  await db.collection(ROLES_COLL).insertMany(docs)
  return docs
}

export async function listRoles() {
  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  return roles.sort((a, b) => (a.isSystem === b.isSystem ? a.name.localeCompare(b.name) : a.isSystem ? -1 : 1))
}

export async function getRoleById(id) {
  if (!id) return null
  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  return roles.find((r) => r.id === id) || null
}

export async function createRole(input) {
  const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 80) : ''
  if (!name) throw new Error('กรุณาระบุชื่อบทบาท')
  const description = typeof input?.description === 'string' ? input.description.trim().slice(0, 240) : ''
  const permissions = normalizePermissions(input?.permissions)

  const db = await getDb()
  await ensureSeedRoles(db)
  const dup = await db.collection(ROLES_COLL).findOne({ name })
  if (dup) throw new Error('มีชื่อบทบาทนี้อยู่ในระบบแล้ว')

  const now = new Date().toISOString()
  const doc = {
    id: `role-${randomUUID().slice(0, 8)}`,
    name,
    description,
    isSystem: false,
    permissions,
    created_at: now,
    updated_at: now,
  }
  await db.collection(ROLES_COLL).insertOne(doc)
  return stripRole(doc)
}

export async function updateRole(id, input) {
  const db = await getDb()
  await ensureSeedRoles(db)
  const current = await db.collection(ROLES_COLL).findOne({ id })
  if (!current) throw new Error('ไม่พบบทบาทที่ต้องการแก้ไข')

  const name = typeof input?.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 80) : current.name
  const description = typeof input?.description === 'string' ? input.description.trim().slice(0, 240) : current.description
  const permissions = normalizePermissions(input?.permissions ?? current.permissions)
  if (id === 'super-admin') {
    permissions.users = 'edit'
    permissions.settings = 'edit'
  }

  const now = new Date().toISOString()
  await db.collection(ROLES_COLL).updateOne(
    { id },
    { $set: { name, description, permissions, updated_at: now } },
  )
  return stripRole(await db.collection(ROLES_COLL).findOne({ id }))
}

export async function deleteRole(id) {
  const db = await getDb()
  await ensureSeedRoles(db)
  const current = await db.collection(ROLES_COLL).findOne({ id })
  if (!current) throw new Error('ไม่พบบทบาทที่ต้องการลบ')
  if (current.isSystem) throw new Error('ไม่สามารถลบบทบาทมาตรฐานของระบบได้')

  const inUse = await db.collection(USERS_COLL).countDocuments({ roleId: id })
  if (inUse > 0) throw new Error(`ไม่สามารถลบได้ เนื่องจากยังมีผู้ใช้งาน ${inUse} บัญชีใช้บทบาทนี้อยู่`)

  await db.collection(ROLES_COLL).deleteOne({ id })
  return true
}

export async function listUsers() {
  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]))
  const docs = await db.collection(USERS_COLL).find({}).sort({ created_at: -1 }).toArray()
  return docs.map((doc) => {
    const user = stripUser(doc)
    return { ...user, roleName: roleMap[user.roleId] || user.roleId }
  })
}

export async function getUserByUsername(username) {
  if (typeof username !== 'string' || !username.trim()) return null
  const db = await getDb()
  await ensureSeedRoles(db)
  const normalized = username.trim().toLowerCase()
  return db.collection(USERS_COLL).findOne({ username: normalized })
}

export async function getUserById(id) {
  if (!id) return null
  const db = await getDb()
  return db.collection(USERS_COLL).findOne({ id })
}

export async function createUser(input) {
  const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : ''
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error('ชื่อผู้ใช้ต้องยาว 3–40 ตัวอักษร (ใช้ a-z, 0-9, ., _, - เท่านั้น)')
  }
  const password = typeof input?.password === 'string' ? input.password : ''
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 120) {
    throw new Error(`รหัสผ่านต้องมีความยาว ${MIN_PASSWORD_LENGTH}–120 ตัวอักษร`)
  }
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim().slice(0, 80) : ''
  if (!displayName) throw new Error('กรุณาระบุชื่อ-นามสกุลผู้ใช้งาน')

  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  const roleId = typeof input?.roleId === 'string' ? input.roleId.trim() : ''
  const role = roles.find((r) => r.id === roleId)
  if (!role) throw new Error('ไม่พบบทบาทที่เลือก')

  const exists = await db.collection(USERS_COLL).findOne({ username })
  if (exists) throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว')

  const allowedCommunities = normalizeAllowedCommunities(input?.allowedCommunities)
  if (allowedCommunities.length === 0) throw new Error('กรุณาเลือกชุมชนที่เข้าถึงได้อย่างน้อย 1 แห่ง')

  const now = new Date().toISOString()
  const doc = {
    id: `usr-${randomUUID().slice(0, 8)}`,
    username,
    displayName,
    passwordHash: hashPassword(password),
    roleId: role.id,
    allowedCommunities,
    active: input?.active !== false,
    lastLoginAt: null,
    created_at: now,
    updated_at: now,
  }
  await db.collection(USERS_COLL).insertOne(doc)
  return { ...stripUser(doc), roleName: role.name }
}

export async function updateUser(id, input) {
  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  const current = await db.collection(USERS_COLL).findOne({ id })
  if (!current) throw new Error('ไม่พบบัญชีผู้ใช้งาน')

  const displayName = typeof input?.displayName === 'string' && input.displayName.trim()
    ? input.displayName.trim().slice(0, 80)
    : current.displayName

  const roleId = typeof input?.roleId === 'string' && input.roleId.trim() ? input.roleId.trim() : current.roleId
  const role = roles.find((r) => r.id === roleId)
  if (!role) throw new Error('ไม่พบบทบาทที่เลือก')

  const allowedCommunities = input?.allowedCommunities !== undefined
    ? normalizeAllowedCommunities(input.allowedCommunities)
    : normalizeAllowedCommunities(current.allowedCommunities)
  if (allowedCommunities.length === 0) throw new Error('กรุณาเลือกชุมชนที่เข้าถึงได้อย่างน้อย 1 แห่ง')

  const updates = {
    displayName,
    roleId: role.id,
    allowedCommunities,
    active: input?.active !== undefined ? Boolean(input.active) : current.active !== false,
    updated_at: new Date().toISOString(),
  }

  if (typeof input?.password === 'string' && input.password.length > 0) {
    if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > 120) {
      throw new Error(`รหัสผ่านใหม่ต้องมีความยาว ${MIN_PASSWORD_LENGTH}–120 ตัวอักษร`)
    }
    updates.passwordHash = hashPassword(input.password)
  }

  await db.collection(USERS_COLL).updateOne({ id }, { $set: updates })
  const updated = await db.collection(USERS_COLL).findOne({ id })
  return { ...stripUser(updated), roleName: role.name }
}

export async function deleteUser(id, actorUserId = null) {
  if (actorUserId && id === actorUserId) {
    throw new Error('ไม่สามารถลบบัญชีของตัวเองที่กำลังใช้งานอยู่ได้')
  }
  const db = await getDb()
  const result = await db.collection(USERS_COLL).deleteOne({ id })
  if (result.deletedCount === 0) throw new Error('ไม่พบบัญชีผู้ใช้งาน')
  return true
}

export async function recordUserLogin(id) {
  const db = await getDb()
  await db.collection(USERS_COLL).updateOne(
    { id },
    { $set: { lastLoginAt: new Date().toISOString() } },
  )
}

export async function findOrUpsertOAuthUser({ email, displayName, isSuperAdmin = false }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalizedEmail) throw new Error('ไม่พบอีเมลจากบัญชี Google')

  const db = await getDb()
  const roles = await ensureSeedRoles(db)
  const existing = await db.collection(USERS_COLL).findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
  })

  const now = new Date().toISOString()
  if (existing) {
    if (!isSuperAdmin && existing.active === false) {
      throw new Error('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
    }
    const targetRoleId = isSuperAdmin ? 'super-admin' : existing.roleId
    const role = roles.find((r) => r.id === targetRoleId)
    if (!role) throw new Error('ไม่พบข้อมูลบทบาทของบัญชีนี้')

    const updates = {
      email: normalizedEmail,
      lastLoginAt: now,
      updated_at: now,
    }
    if (isSuperAdmin) {
      updates.roleId = 'super-admin'
      updates.allowedCommunities = ['all']
      updates.active = true
    }
    if (displayName && (!existing.displayName || existing.displayName === existing.username)) {
      updates.displayName = String(displayName).trim().slice(0, 80)
    }
    await db.collection(USERS_COLL).updateOne({ id: existing.id }, { $set: updates })
    const updated = await db.collection(USERS_COLL).findOne({ id: existing.id })
    return { user: { ...stripUser(updated), roleName: role.name }, role }
  }

  if (!isSuperAdmin) {
    throw new Error(`อีเมล ${normalizedEmail} ยังไม่ได้รับสิทธิ์ผู้ดูแลระบบ`)
  }

  const role = roles.find((r) => r.id === 'super-admin')
  if (!role) throw new Error('ไม่พบบทบาท Super Admin')
  const doc = {
    id: `usr-${randomUUID().slice(0, 8)}`,
    username: normalizedEmail,
    email: normalizedEmail,
    displayName: (typeof displayName === 'string' && displayName.trim() ? displayName.trim() : normalizedEmail).slice(0, 80),
    passwordHash: null,
    authProvider: 'google',
    roleId: 'super-admin',
    allowedCommunities: ['all'],
    active: true,
    lastLoginAt: now,
    created_at: now,
    updated_at: now,
  }
  await db.collection(USERS_COLL).insertOne(doc)
  return { user: { ...stripUser(doc), roleName: role.name }, role }
}
