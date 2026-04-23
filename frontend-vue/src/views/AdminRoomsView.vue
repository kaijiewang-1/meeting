<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const PRESET_FACILITIES = ['projector', 'whiteboard', 'video_conf', 'tv', 'audio']

const rooms = ref<any[]>([])
const approvers = ref<any[]>([])
const modalVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<any>({
  name: '',
  building: '',
  floor: '',
  capacity: 10,
  description: '',
  image: '🏢',
  status: 'AVAILABLE',
  weekdayOpenHours: '08:00-18:00',
  weekendOpenHours: '09:00-17:00',
  requiresApproval: false,
  approverUserId: '',
  visibilityScope: 'ALL',
  visibleColleges: '',
  facilities: [] as string[],
})

const modalTitle = computed(() => (editingId.value ? '编辑会议室' : '新增会议室'))

async function loadRooms() {
  const res = await api.getAdminRooms()
  rooms.value = res.data || []
}

async function loadApprovers() {
  try {
    const res = await api.getAdminApprovers()
    approvers.value = res.data || []
  } catch {
    approvers.value = []
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    building: '',
    floor: '',
    capacity: 10,
    description: '',
    image: '🏢',
    status: 'AVAILABLE',
    weekdayOpenHours: '08:00-18:00',
    weekendOpenHours: '09:00-17:00',
    requiresApproval: false,
    approverUserId: '',
    visibilityScope: 'ALL',
    visibleColleges: '',
    facilities: [],
  })
}

function openCreate() {
  resetForm()
  modalVisible.value = true
}

function openEdit(room: any) {
  editingId.value = room.id
  Object.assign(form, {
    name: room.name,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    description: room.description,
    image: room.image,
    status: room.status,
    weekdayOpenHours: room.weekdayOpenHours || room.openHours,
    weekendOpenHours: room.weekendOpenHours || '',
    requiresApproval: room.requiresApproval,
    approverUserId: room.approverUserId ?? '',
    visibilityScope: room.visibilityScope,
    visibleColleges: (room.visibleColleges || []).join(','),
    facilities: [...(room.facilities || [])],
  })
  modalVisible.value = true
}

async function save() {
  try {
    const payload = {
      ...form,
      visibleColleges: String(form.visibleColleges || '')
        .split(/[,，\s]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    }
    if (editingId.value) {
      await api.updateRoom(editingId.value, payload)
      toast.success('修改成功')
    } else {
      await api.createRoom(payload)
      toast.success('创建成功')
    }
    modalVisible.value = false
    await loadRooms()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

async function changeStatus(id: number, status: string) {
  try {
    await api.updateRoom(id, { status })
    toast.success('状态已更新')
    await loadRooms()
  } catch (error: any) {
    toast.error(error.message || '更新失败')
  }
}

async function deleteRoom(id: number, name: string) {
  if (!window.confirm(`确定要删除会议室"${name}"吗？此操作不可恢复。`)) return
  try {
    await api.deleteRoom(id)
    toast.success('删除成功')
    await loadRooms()
  } catch (error: any) {
    toast.error(error.message || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([loadRooms(), loadApprovers()])
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-toolbar">
        <div class="page-header-titles">
          <h1 class="page-title">会议室管理</h1>
          <p class="page-subtitle">新增、编辑、停用会议室基础信息，设置可见学院和审批规则</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" type="button" @click="openCreate">新增会议室</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>会议室</th>
                <th>位置</th>
                <th>容量</th>
                <th>设备</th>
                <th>开放时间</th>
                <th>审批</th>
                <th>可见性</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in rooms" :key="room.id">
                <td><code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">#{{ room.id }}</code></td>
                <td><strong>{{ room.name }}</strong></td>
                <td>{{ room.building }} · {{ room.floor }}</td>
                <td>{{ room.capacity }}人</td>
                <td>{{ (room.facilities || []).map((item:string) => utils.facilityLabel(item)).join('、') || '-' }}</td>
                <td>工作日: {{ room.weekdayOpenHours || room.openHours }}<br />周末: {{ room.weekendOpenHours || '不开放' }}</td>
                <td>{{ room.requiresApproval ? `需审批${room.approverName ? `（${room.approverName}）` : ''}` : '即时' }}</td>
                <td>{{ room.visibilityScope === 'COLLEGES' ? (room.visibleColleges || []).join(',') : '全部' }}</td>
                <td>
                  <select class="form-select" style="width:120px;padding:4px 8px;font-size:12px" :value="room.status" @change="changeStatus(room.id, ($event.target as HTMLSelectElement).value)">
                    <option value="AVAILABLE">空闲</option>
                    <option value="BUSY">使用中</option>
                    <option value="MAINTENANCE">维护中</option>
                  </select>
                </td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-secondary btn-sm" type="button" @click="openEdit(room)">编辑</button>
                    <button class="btn btn-danger btn-sm" type="button" @click="deleteRoom(room.id, room.name)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="modalVisible" class="modal-overlay" @click.self="modalVisible = false">
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <span class="modal-title">{{ modalTitle }}</span>
          <button class="modal-close" type="button" @click="modalVisible = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="form.name" class="form-input" type="text" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">楼宇</label>
              <input v-model="form.building" class="form-input" type="text" />
            </div>
            <div class="form-group">
              <label class="form-label">楼层</label>
              <input v-model="form.floor" class="form-input" type="text" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">容量</label>
              <input v-model="form.capacity" class="form-input" type="number" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select">
                <option value="AVAILABLE">空闲</option>
                <option value="BUSY">使用中</option>
                <option value="MAINTENANCE">维护中</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">工作日开放时间</label>
              <input v-model="form.weekdayOpenHours" class="form-input" type="text" />
            </div>
            <div class="form-group">
              <label class="form-label">周末开放时间</label>
              <input v-model="form.weekendOpenHours" class="form-input" type="text" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">图标</label>
            <input v-model="form.image" class="form-input" type="text" />
          </div>
          <div class="form-group">
            <label class="form-label">设备设施</label>
            <div style="display:flex;flex-wrap:wrap;gap:10px;padding:12px;border:1px solid var(--color-border);border-radius:8px">
              <label v-for="item in PRESET_FACILITIES" :key="item" class="checkbox-group" style="font-size:13px">
                <input v-model="form.facilities" type="checkbox" :value="item" />
                <span>{{ utils.facilityLabel(item) }}</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-group">
              <input v-model="form.requiresApproval" type="checkbox" />
              <span>预定需审批</span>
            </label>
          </div>
          <div v-if="form.requiresApproval" class="form-group">
            <label class="form-label">审批人</label>
            <select v-model="form.approverUserId" class="form-select">
              <option value="">任意管理员可审批</option>
              <option v-for="user in approvers" :key="user.id" :value="String(user.id)">{{ user.name || user.username }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">可见范围</label>
            <select v-model="form.visibilityScope" class="form-select">
              <option value="ALL">全部用户可见</option>
              <option value="COLLEGES">仅指定学院可见</option>
            </select>
            <input v-model="form.visibleColleges" class="form-input" type="text" style="margin-top:8px" placeholder="多个学院用逗号分隔，如：CS,EE" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="form.description" class="form-input" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" @click="modalVisible = false">取消</button>
          <button class="btn btn-primary" type="button" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
