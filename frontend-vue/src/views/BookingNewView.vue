<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const form = reactive({
  subject: '',
  date: String(route.query.date || utils.today()),
  attendeeCount: '4',
  startTime: utils.normalizeTime(String(route.query.start || '09:00')) || '09:00',
  endTime: utils.normalizeTime(String(route.query.end || '10:00')) || '10:00',
  remark: '',
  roomId: String(route.query.roomId || ''),
  facilities: [] as string[],
  loading: false,
})

const roomOptions = ref<any[]>([])
const selectedRoom = computed(() => roomOptions.value.find((item) => String(item.id) === form.roomId))

async function loadPrefilledRoom() {
  if (!form.roomId) return
  try {
    const res = await api.getRoom(form.roomId)
    roomOptions.value = [res.data]
  } catch {
    // ignore
  }
}

async function searchRooms() {
  if (!form.date || !form.startTime || !form.endTime) {
    toast.warning('请填写完整日期和时间')
    return
  }
  const res = await api.getAvailableRooms({
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    capacity: form.attendeeCount,
    facilities: form.facilities,
  })
  roomOptions.value = res.data || []
  if (roomOptions.value.length === 1 && !form.roomId) form.roomId = String(roomOptions.value[0].id)
}

async function submit() {
  if (!form.subject.trim()) {
    toast.error('请填写会议主题')
    return
  }
  if (!form.roomId) {
    toast.error('请选择会议室')
    return
  }
  form.loading = true
  try {
    const res = await api.createBooking({
      subject: form.subject.trim(),
      roomId: Number.parseInt(form.roomId, 10),
      startTime: `${form.date}T${form.startTime}:00`,
      endTime: `${form.date}T${form.endTime}:00`,
      attendeeCount: Number.parseInt(form.attendeeCount, 10),
      remark: form.remark.trim(),
    })
    toast.success(res.message || '预定成功')
    window.setTimeout(() => router.push('/bookings/my'), 600)
  } catch (error: any) {
    toast.error(error.message || '预定失败，请稍后重试')
  } finally {
    form.loading = false
  }
}

onMounted(() => {
  void loadPrefilledRoom()
})
</script>

<template>
  <div class="booking-new-page">
    <div class="booking-new-container">
      <div class="page-header">
        <h1 class="page-title">新建预约</h1>
        <p class="page-subtitle">填写会议信息并选择会议室</p>
      </div>

      <div class="booking-form-shell">
        <div class="card">
          <div class="card-header"><span class="card-title">会议信息</span></div>
          <div class="card-body">
            <form @submit.prevent="submit">
              <div class="form-group">
                <label class="form-label">会议主题 <span style="color:var(--color-danger)">*</span></label>
                <input v-model="form.subject" type="text" class="form-input" placeholder="请输入会议主题" maxlength="100" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">日期</label>
                  <input v-model="form.date" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">参会人数</label>
                  <input v-model="form.attendeeCount" type="number" class="form-input" min="1" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">开始时间</label>
                  <input v-model="form.startTime" type="time" class="form-input" step="60" />
                </div>
                <div class="form-group">
                  <label class="form-label">结束时间</label>
                  <input v-model="form.endTime" type="time" class="form-input" step="60" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">所需设备</label>
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">
                  <label v-for="item in ['projector','whiteboard','video_conf','tv','audio']" :key="item" class="checkbox-group">
                    <input v-model="form.facilities" type="checkbox" :value="item" />
                    <span>{{ utils.facilityLabel(item) }}</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">选择会议室</label>
                <div class="booking-room-search-row">
                  <button class="btn btn-secondary btn-sm" type="button" @click="searchRooms">查找空闲会议室</button>
                </div>
                <div v-if="selectedRoom" class="selected-room-banner">
                  <div class="selected-room-banner-icon">{{ selectedRoom.image }}</div>
                  <div class="selected-room-banner-body">
                    <div class="selected-room-banner-title">{{ selectedRoom.name }}</div>
                    <div class="selected-room-banner-meta">{{ selectedRoom.building }} · {{ selectedRoom.floor }} · {{ selectedRoom.capacity }}人</div>
                  </div>
                  <span class="tag tag-primary">已选择</span>
                </div>
                <div v-if="roomOptions.length" class="room-option-list">
                  <label
                    v-for="room in roomOptions"
                    :key="room.id"
                    class="room-card room-option-card"
                  >
                    <input v-model="form.roomId" type="radio" :value="String(room.id)" style="margin-right:8px" />
                    <div class="room-option-card-body">
                      <div class="room-option-card-title">{{ room.name }}</div>
                      <div class="room-option-card-meta">{{ room.building }} · {{ room.floor }} · {{ room.capacity }}人</div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">备注</label>
                <textarea v-model="form.remark" class="form-input" rows="3" placeholder="如有特殊需求请在此说明"></textarea>
              </div>

              <div class="booking-form-actions">
                <RouterLink to="/rooms" class="btn btn-secondary">取消</RouterLink>
                <button class="btn btn-primary" type="submit" :disabled="form.loading">{{ form.loading ? '提交中...' : '提交预定' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.booking-new-page {
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.booking-new-container {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.booking-form-shell {
  width: 100%;
}

.booking-room-search-row {
  margin-bottom: 12px;
}

.booking-form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.selected-room-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  margin-bottom: 12px;
}

.selected-room-banner-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.selected-room-banner-body {
  flex: 1;
}

.selected-room-banner-title {
  font-weight: 600;
  font-size: 13px;
}

.selected-room-banner-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.room-option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.room-option-card {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
}

.room-option-card-body {
  flex: 1;
}

.room-option-card-title {
  font-weight: 600;
  font-size: 13px;
}

.room-option-card-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>