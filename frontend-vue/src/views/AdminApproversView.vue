<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'

const users = ref<any[]>([])
const loading = ref(false)

function roleLabel(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN') return '管理员'
  if (normalized === 'APPROVER') return '审批员'
  return '普通用户'
}

function roleTagClass(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ADMIN') return 'tag-primary'
  if (normalized === 'APPROVER') return 'tag-warning'
  return 'tag-neutral'
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await api.getAdminUsers()
    users.value = Array.isArray(res.data) ? res.data : []
  } catch (error: any) {
    users.value = []
    toast.error(error.message || '加载账号列表失败')
  } finally {
    loading.value = false
  }
}

async function updateRole(user: any, role: 'USER' | 'APPROVER') {
  const actionLabel = role === 'APPROVER' ? '设为审批员' : '取消审批员'
  if (!window.confirm(`确定要${actionLabel}吗？`)) return
  try {
    await api.updateAdminUserRole(user.id, role)
    toast.success('角色更新成功')
    await loadUsers()
  } catch (error: any) {
    toast.error(error.message || '角色更新失败')
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-toolbar">
        <div class="page-header-titles">
          <h1 class="page-title">审批员管理</h1>
          <p class="page-subtitle">管理员可将普通用户设为审批员，或取消审批员身份。管理员账号本身不可在此修改。</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="empty-state">加载中...</div>
        <div v-else-if="users.length === 0" class="empty-state">暂无可管理账号</div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>学院</th>
                <th>当前角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in users" :key="item.id">
                <td>{{ item.name || '-' }}</td>
                <td>
                  <code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">
                    {{ item.username || '-' }}
                  </code>
                </td>
                <td>{{ item.email || '-' }}</td>
                <td>{{ item.college_code || '-' }}</td>
                <td>
                  <span class="tag" :class="roleTagClass(item.role)">{{ roleLabel(item.role) }}</span>
                </td>
                <td>
                  <span v-if="String(item.role || '').toUpperCase() === 'ADMIN'" class="tag tag-primary">系统管理员</span>
                  <button
                    v-else-if="String(item.role || '').toUpperCase() === 'APPROVER'"
                    type="button"
                    class="btn btn-secondary btn-sm"
                    @click="updateRole(item, 'USER')"
                  >
                    取消审批员
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn btn-primary btn-sm"
                    @click="updateRole(item, 'APPROVER')"
                  >
                    设为审批员
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
