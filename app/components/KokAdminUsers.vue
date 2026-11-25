<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Ban,
  Check,
  Edit3,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import { adminFetch } from '../utils/admin-session'
import { formatErrorWithReason } from '../utils/map-data-admin'
import { actionButtonClass, adminCardClass, fieldClass, fieldLabelClass, primaryButtonClass } from '../utils/admin-ui'
import {
  ADMIN_PAGES,
  makePermissions,
  type AdminPageKey,
  type AdminPermissions,
  type AdminRole,
  type AdminUser,
  type PermissionLevel,
} from '../../src/lib/admin-rbac'
import KokModalShell from './KokModalShell.vue'
import KokPagination from './KokPagination.vue'

const props = defineProps<{
  readOnly?: boolean
  currentUserId?: string | null
}>()

const emit = defineEmits<{ (e: 'rolesChanged'): void }>()

const subTab = ref<'users' | 'roles'>('users')
const loading = ref(false)
const saving = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const users = ref<AdminUser[]>([])
const roles = ref<AdminRole[]>([])
const userPage = ref(1)
const userPageSize = ref(10)
const pagedUsers = computed(() => {
  const start = (userPage.value - 1) * userPageSize.value
  return users.value.slice(start, start + userPageSize.value)
})

watch(userPageSize, () => {
  userPage.value = 1
})

watch(() => users.value.length, (len) => {
  const maxPage = Math.max(1, Math.ceil(len / userPageSize.value))
  if (userPage.value > maxPage) userPage.value = maxPage
})

const pageGroups = computed(() => {
  const groups: { name: string; pages: typeof ADMIN_PAGES[number][] }[] = []
  for (const page of ADMIN_PAGES) {
    if (page.key === 'reporters' || page.key === 'research' || page.key === 'reports') continue
    let grp = groups.find((g) => g.name === page.group)
    if (!grp) {
      grp = { name: page.group, pages: [] }
      groups.push(grp)
    }
    grp.pages.push(page)
  }
  return groups
})

async function fetchData(manual = false) {
  loading.value = true
  if (manual) feedback.value = null
  try {
    const [uRes, rRes] = await Promise.all([
      adminFetch('/api/admin/users'),
      adminFetch('/api/admin/roles'),
    ])
    const uData = await uRes.json().catch(() => ({}))
    const rData = await rRes.json().catch(() => ({}))
    if (rRes.ok) {
      roles.value = rData.roles || []
      if (roles.value.length > 0 && !selectedRoleId.value) {
        selectRole(roles.value[0]!)
      } else if (selectedRoleId.value) {
        const match = roles.value.find((r) => r.id === selectedRoleId.value)
        if (match) selectRole(match)
      }
    }
    if (uRes.ok) {
      users.value = uData.users || []
    }
    if (!uRes.ok) throw new Error(uData.error || `โหลดข้อมูลผู้ใช้งานไม่สำเร็จ (HTTP ${uRes.status})`)
    if (!rRes.ok) throw new Error(rData.error || `โหลดข้อมูลบทบาทไม่สำเร็จ (HTTP ${rRes.status})`)
    if (manual) {
      feedback.value = { type: 'success', message: `รีเฟรชข้อมูลผู้ใช้งาน (${users.value.length} บัญชี) และบทบาท (${roles.value.length} บทบาท) เรียบร้อยแล้ว` }
    }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('โหลดข้อมูลผู้ใช้งานและบทบาทไม่สำเร็จ', error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'),
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchData(false)
})

// ---- User Modal State ----
const userModalOpen = ref(false)
const editingUser = ref<AdminUser | null>(null)
const deleteConfirmUser = ref<AdminUser | null>(null)

const userForm = ref({
  displayName: '',
  username: '',
  password: '',
  roleId: 'reviewer',
})

function openCreateUser() {
  editingUser.value = null
  userForm.value = {
    displayName: '',
    username: '',
    password: '',
    roleId: roles.value.find((r) => r.id === 'reviewer')?.id || roles.value[0]?.id || 'super-admin',
  }
  userModalOpen.value = true
}

function openEditUser(user: AdminUser) {
  editingUser.value = user
  userForm.value = {
    displayName: user.displayName,
    username: user.username,
    password: '',
    roleId: user.roleId,
  }
  userModalOpen.value = true
}

async function saveUser() {
  saving.value = true
  feedback.value = null
  try {
    if (!userForm.value.displayName.trim()) throw new Error('กรุณาระบุชื่อที่แสดงของผู้ใช้งาน')
    if (!editingUser.value && !userForm.value.username.trim()) throw new Error('กรุณาระบุชื่อผู้ใช้ (Username)')
    if (!editingUser.value && userForm.value.password.length < 8) throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')

    const payload: Record<string, unknown> = {
      displayName: userForm.value.displayName,
      username: userForm.value.username,
      roleId: userForm.value.roleId,
      allowedCommunities: ['all'],
      active: true,
    }
    if (userForm.value.password) payload.password = userForm.value.password

    const url = editingUser.value ? `/api/admin/users/${encodeURIComponent(editingUser.value.id)}` : '/api/admin/users'
    const res = await adminFetch(url, {
      method: editingUser.value ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
    const wasEdit = Boolean(editingUser.value)
    userModalOpen.value = false
    await fetchData(false)
    feedback.value = { type: 'success', message: wasEdit ? 'อัปเดตบัญชีผู้ใช้งานเรียบร้อยแล้ว' : 'เพิ่มบัญชีผู้ใช้งานใหม่เรียบร้อยแล้ว' }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('บันทึกบัญชีผู้ใช้งานไม่สำเร็จ', error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง'),
    }
  } finally {
    saving.value = false
  }
}

async function confirmDeleteUser() {
  if (!deleteConfirmUser.value) return
  saving.value = true
  feedback.value = null
  try {
    const res = await adminFetch(`/api/admin/users/${encodeURIComponent(deleteConfirmUser.value.id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
    deleteConfirmUser.value = null
    await fetchData(false)
    feedback.value = { type: 'success', message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('ลบบัญชีผู้ใช้งานไม่สำเร็จ', error instanceof Error ? error.message : 'ไม่สามารถลบบัญชีนี้ได้'),
    }
  } finally {
    saving.value = false
  }
}

// ---- Role Editor State ----
const selectedRoleId = ref<string | null>(null)
const isCreatingRole = ref(false)
const roleForm = ref<{
  name: string
  description: string
  isSystem: boolean
  permissions: AdminPermissions
}>({
  name: '',
  description: '',
  isSystem: false,
  permissions: makePermissions('none'),
})

function selectRole(role: AdminRole) {
  isCreatingRole.value = false
  selectedRoleId.value = role.id
  roleForm.value = {
    name: role.name,
    description: role.description || '',
    isSystem: role.isSystem,
    permissions: { ...role.permissions },
  }
}

function startCreateRole() {
  isCreatingRole.value = true
  selectedRoleId.value = null
  roleForm.value = {
    name: '',
    description: '',
    isSystem: false,
    permissions: makePermissions('view', { settings: 'none', users: 'none' }),
  }
}

function setAllPermissions(level: PermissionLevel) {
  roleForm.value.permissions = makePermissions(level)
}

function setPagePermission(key: AdminPageKey, level: PermissionLevel) {
  if (selectedRoleId.value === 'super-admin' && (key === 'users' || key === 'settings')) return
  roleForm.value.permissions[key] = level
}

async function saveRole() {
  saving.value = true
  feedback.value = null
  try {
    if (!roleForm.value.name.trim()) throw new Error('กรุณาระบุชื่อบทบาท')
    const isNew = isCreatingRole.value || !selectedRoleId.value
    const url = isNew ? '/api/admin/roles' : `/api/admin/roles/${encodeURIComponent(selectedRoleId.value!)}`
    const res = await adminFetch(url, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify({
        name: roleForm.value.name,
        description: roleForm.value.description,
        permissions: roleForm.value.permissions,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
    if (data.role?.id) selectedRoleId.value = data.role.id
    isCreatingRole.value = false
    await fetchData(false)
    emit('rolesChanged')
    feedback.value = { type: 'success', message: isNew ? 'สร้างบทบาทใหม่เรียบร้อยแล้ว' : 'บันทึกการกำหนดสิทธิ์บทบาทเรียบร้อยแล้ว' }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('บันทึกบทบาทไม่สำเร็จ', error instanceof Error ? error.message : 'ข้อมูลบทบาทไม่ถูกต้อง'),
    }
  } finally {
    saving.value = false
  }
}

async function removeRole() {
  if (!selectedRoleId.value || roleForm.value.isSystem) return
  saving.value = true
  feedback.value = null
  try {
    const res = await adminFetch(`/api/admin/roles/${encodeURIComponent(selectedRoleId.value)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `เซิร์ฟเวอร์ปฏิเสธคำขอ (HTTP ${res.status})`)
    selectedRoleId.value = null
    await fetchData(false)
    emit('rolesChanged')
    feedback.value = { type: 'success', message: 'ลบบทบาทเรียบร้อยแล้ว' }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: formatErrorWithReason('ลบบทบาทไม่สำเร็จ', error instanceof Error ? error.message : 'ไม่สามารถลบบทบาทนี้ได้'),
    }
  } finally {
    saving.value = false
  }
}

function countAccess(perms: AdminPermissions) {
  const values = Object.values(perms)
  return {
    edit: values.filter((v) => v === 'edit').length,
    view: values.filter((v) => v === 'view').length,
    none: values.filter((v) => v === 'none').length,
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top Sub-tab Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-[#2C2C2E] dark:bg-[#1E1E1E]">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer"
          :class="subTab === 'users' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'"
          @click="subTab = 'users'"
        >
          <Users class="h-4 w-4" />
          <span>ผู้ใช้งาน ({{ users.length }})</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer"
          :class="subTab === 'roles' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'"
          @click="subTab = 'roles'"
        >
          <ShieldCheck class="h-4 w-4" />
          <span>กำหนดบทบาทและสิทธิ์ ({{ roles.length }})</span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" :class="actionButtonClass" :disabled="loading" @click="fetchData(true)">
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          <span>รีเฟรช</span>
        </button>
        <button v-if="!readOnly && subTab === 'users'" type="button" :class="primaryButtonClass" @click="openCreateUser">
          <UserPlus class="h-4 w-4" />
          <span>เพิ่มผู้ใช้งาน</span>
        </button>
        <button v-if="!readOnly && subTab === 'roles'" type="button" :class="primaryButtonClass" @click="startCreateRole">
          <Plus class="h-4 w-4" />
          <span>สร้างบทบาทใหม่</span>
        </button>
      </div>
    </div>

    <!-- Feedback Alert (Floating Bottom-Right) -->
    <KokAlertToast :feedback="feedback" @close="feedback = null" />

    <!-- TAB 1: USERS -->
    <div v-if="subTab === 'users'" :class="[adminCardClass, 'overflow-hidden']">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-[#2C2C2E]">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">บัญชีผู้ใช้งานระบบหลังบ้าน</h3>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">
          กำหนดบทบาท (Role) และสิทธิ์การใช้งานเมนูแต่ละหน้าของผู้ใช้งานหลังบ้าน
        </p>
      </div>

      <div v-if="users.length === 0" class="px-6 py-12 text-center">
        <Users class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p class="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">ยังไม่มีบัญชีผู้ใช้งานในฐานข้อมูล</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-[#98A2A8]">กดปุ่ม “เพิ่มผู้ใช้งาน” เพื่อสร้างบัญชีแรกพร้อมกำหนดบทบาทและสิทธิ์</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8]">
            <tr>
              <th class="px-5 py-3">ผู้ใช้งาน</th>
              <th class="px-4 py-3">บทบาท (Role)</th>
              <th class="px-4 py-3">เข้าใช้งานล่าสุด</th>
              <th v-if="!readOnly" class="px-5 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
            <tr v-for="user in pagedUsers" :key="user.id" class="hover:bg-slate-50/70 dark:hover:bg-[#252525]/50">
              <td class="px-5 py-3.5">
                <div class="font-bold text-slate-900 dark:text-white">{{ user.displayName }}</div>
                <div class="text-[11px] font-mono text-slate-500 dark:text-[#98A2A8]">@{{ user.username }}</div>
              </td>
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                  <Shield class="h-3 w-3" />
                  {{ user.roleName || user.roleId }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-slate-500 dark:text-[#98A2A8]">
                {{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('th-TH') : 'ยังไม่เคยเข้าสู่ระบบ' }}
              </td>
              <td v-if="!readOnly" class="px-5 py-3.5 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button type="button" :class="actionButtonClass" @click="openEditUser(user)">
                    <Edit3 class="h-3.5 w-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    v-if="user.id !== currentUserId"
                    type="button"
                    class="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer"
                    @click="deleteConfirmUser = user"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <KokPagination v-if="users.length > 0" v-model:page="userPage" v-model:page-size="userPageSize" :total="users.length" />
    </div>

    <!-- TAB 2: ROLES & PERMISSIONS MATRIX -->
    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Role List -->
      <div class="lg:col-span-4 space-y-2">
        <div :class="[adminCardClass, 'p-3 space-y-2']">
          <div class="px-2 py-1 text-xs font-bold text-slate-500 dark:text-[#98A2A8]">รายการบทบาทในระบบ</div>
          <button
            v-for="role in roles"
            :key="role.id"
            type="button"
            class="w-full rounded-xl border p-3 text-left transition cursor-pointer"
            :class="!isCreatingRole && selectedRoleId === role.id
              ? 'border-sky-500 bg-sky-50/70 dark:border-sky-500/70 dark:bg-sky-950/30'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-[#2C2C2E] dark:bg-[#141416] dark:hover:bg-[#252525]'"
            @click="selectRole(role)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-900 dark:text-white">{{ role.name }}</span>
              <span v-if="role.isSystem" class="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">มาตรฐาน</span>
            </div>
            <p v-if="role.description" class="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-[#98A2A8]">{{ role.description }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
              <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">แก้ไข {{ countAccess(role.permissions).edit }}</span>
              <span class="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">ดูอย่างเดียว {{ countAccess(role.permissions).view }}</span>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">ซ่อน {{ countAccess(role.permissions).none }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Role Matrix Editor -->
      <div class="lg:col-span-8">
        <div :class="[adminCardClass, 'p-5 space-y-5']">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-[#2C2C2E]">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                {{ isCreatingRole ? 'สร้างบทบาทใหม่' : `กำหนดสิทธิ์ของบทบาท: ${roleForm.name}` }}
              </h3>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-[#98A2A8]">
                เลือกปลดล็อกแถบข้างแต่ละหน้าว่าบทบาทนี้ ดูไม่ได้เลย / ดูได้เฉย ๆ / แก้ไขได้
              </p>
            </div>
            <div v-if="!readOnly && !isCreatingRole && !roleForm.isSystem" class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer"
                :disabled="saving"
                @click="removeRole"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>ลบบทบาท</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label :class="fieldLabelClass">ชื่อบทบาท *</label>
              <input v-model="roleForm.name" type="text" maxlength="80" :class="fieldClass" placeholder="เช่น เจ้าหน้าที่ประจำจุดตรวจ" :disabled="readOnly || saving">
            </div>
            <div>
              <label :class="fieldLabelClass">คำอธิบายบทบาท</label>
              <input v-model="roleForm.description" type="text" maxlength="240" :class="fieldClass" placeholder="สรุปหน้าที่รับผิดชอบ..." :disabled="readOnly || saving">
            </div>
          </div>

          <!-- Quick bulk actions -->
          <div v-if="!readOnly && selectedRoleId !== 'super-admin'" class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-[#2C2C2E] dark:bg-[#141416]">
            <span class="font-bold text-slate-600 dark:text-slate-300">ตั้งค่าด่วนทั้งหมด:</span>
            <button type="button" :class="actionButtonClass" @click="setAllPermissions('edit')">ปลดล็อกแก้ไขทุกหน้า</button>
            <button type="button" :class="actionButtonClass" @click="setAllPermissions('view')">ดูได้อย่างเดียวทุกหน้า</button>
            <button type="button" :class="actionButtonClass" @click="setAllPermissions('none')">ล็อกทุกหน้า</button>
          </div>

          <!-- Grouped Permission Rows -->
          <div class="space-y-4">
            <div v-for="group in pageGroups" :key="group.name" class="rounded-xl border border-slate-200 dark:border-[#2C2C2E] overflow-hidden">
              <div class="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[#2C2C2E] dark:bg-[#141416] dark:text-[#98A2A8]">
                {{ group.name }}
              </div>
              <div class="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
                <div
                  v-for="page in group.pages"
                  :key="page.key"
                  class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-white">{{ page.label }}</div>
                    <div class="text-[11px] text-slate-500 dark:text-[#98A2A8]">{{ page.subtitle }}</div>
                  </div>
                  <div class="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-[#2C2C2E] dark:bg-[#141416]">
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      :class="roleForm.permissions[page.key] === 'none'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                      :disabled="readOnly || saving || (selectedRoleId === 'super-admin' && (page.key === 'users' || page.key === 'settings'))"
                      @click="setPagePermission(page.key, 'none')"
                    >
                      <Ban class="h-3 w-3" />
                      <span>ดูไม่ได้เลย</span>
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      :class="roleForm.permissions[page.key] === 'view'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                      :disabled="readOnly || saving || (selectedRoleId === 'super-admin' && (page.key === 'users' || page.key === 'settings'))"
                      @click="setPagePermission(page.key, 'view')"
                    >
                      <Eye class="h-3 w-3" />
                      <span>ดูได้เฉย ๆ</span>
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      :class="roleForm.permissions[page.key] === 'edit'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                      :disabled="readOnly || saving"
                      @click="setPagePermission(page.key, 'edit')"
                    >
                      <Check class="h-3 w-3" />
                      <span>แก้ไขได้</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!readOnly" class="flex justify-end gap-2 pt-2">
            <button type="button" :class="primaryButtonClass" :disabled="saving || !roleForm.name.trim()" @click="saveRole">
              <Lock class="h-4 w-4" />
              <span>{{ saving ? 'กำลังบันทึก...' : (isCreatingRole ? 'สร้างบทบาท' : 'บันทึกสิทธิ์บทบาท') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Add/Edit Modal -->
    <KokModalShell
      v-if="userModalOpen"
      width-class="max-w-lg"
      @close="userModalOpen = false"
    >
      <h3 class="text-base font-bold text-slate-900 dark:text-white px-5 pt-5">
        {{ editingUser ? `แก้ไขบัญชี: ${editingUser.username}` : 'เพิ่มบัญชีผู้ใช้งานใหม่' }}
      </h3>
      <form class="space-y-4 p-5" @submit.prevent="saveUser">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="fieldLabelClass">ชื่อ-นามสกุล *</label>
            <input v-model="userForm.displayName" type="text" required maxlength="80" :class="fieldClass" placeholder="เช่น อ.สมชาย วิจัย">
          </div>
          <div>
            <label :class="fieldLabelClass">ชื่อผู้ใช้ (Username) *</label>
            <input v-model="userForm.username" type="text" required maxlength="40" :class="fieldClass" placeholder="a-z, 0-9, ., _, -" :disabled="Boolean(editingUser)">
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="fieldLabelClass">{{ editingUser ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *' }}</label>
            <input v-model="userForm.password" type="password" :required="!editingUser" minlength="4" maxlength="120" :class="fieldClass" placeholder="อย่างน้อย 4 ตัวอักษร">
          </div>
          <div>
            <label :class="fieldLabelClass">บทบาท (Role) *</label>
            <select v-model="userForm.roleId" :class="fieldClass">
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2C2C2E]">
          <button type="button" :class="actionButtonClass" :disabled="saving" @click="userModalOpen = false">ยกเลิก</button>
          <button type="submit" :class="primaryButtonClass" :disabled="saving">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกบัญชีผู้ใช้' }}
          </button>
        </div>
      </form>
    </KokModalShell>

    <!-- Delete User Confirm Modal -->
    <KokModalShell
      v-if="deleteConfirmUser"
      width-class="max-w-md"
      @close="deleteConfirmUser = null"
    >
      <div class="space-y-4 p-5 text-xs">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบบัญชีผู้ใช้งาน</h3>
        <p class="text-slate-700 dark:text-slate-200">
          ต้องการลบบัญชี <strong>{{ deleteConfirmUser?.displayName }}</strong> (@{{ deleteConfirmUser?.username }}) ออกจากระบบใช่หรือไม่?
        </p>
        <div class="flex justify-end gap-2">
          <button type="button" :class="actionButtonClass" :disabled="saving" @click="deleteConfirmUser = null">ยกเลิก</button>
          <button
            type="button"
            class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            :disabled="saving"
            @click="confirmDeleteUser"
          >
            {{ saving ? 'กำลังลบ...' : 'ยืนยันลบบัญชี' }}
          </button>
        </div>
      </div>
    </KokModalShell>
  </div>
</template>
