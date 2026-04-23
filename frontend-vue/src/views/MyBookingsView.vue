<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const router = useRouter()
const bookings = ref<any[]>([])
const currentFilter = ref('')

async function loadBookings(status = currentFilter.value) {
  currentFilter.value = status
  const res = await api.getMyBookings({ status })
  bookings.value = res.data || []
}

async function checkIn(id: number) {
  try {
    await api.checkIn(id)
    toast.success('签到成功')
    await loadBookings()
  } catch (error: any) {
    toast.error(error.message || '签到失败')
  }
}

async function cancelBooking(id: number) {
  if (!window.confirm('确定取消该预定？')) return
  try {
    await api.cancelBooking(id)
    toast.success('已取消')
    await loadBookings()
  } catch (error: any) {
    toast.error(error.message || '取消失败')
  }
}

onMounted(() => {
  void loadBookings('')
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-toolbar bookings-my-header">
        <div class="page-header-titles">
          <h1 class="page-title">我的预定</h1>
          <p class="page-subtitle">查看和管理您的所有会议预定</p>
        </div>
        <div class="page-header-actions">
          <RouterLink to="/bookings/new" class="btn btn-primary">新建预约</RouterLink>
        </div>
      </div>
    </div>

    <div class="card bookings-my-card" style="margin-bottom:20px">
      <div class="tabs-wrap tabs-wrap--scroll">
        <div class="tabs tabs--bookings">
          <button type="button" class="tab-item" :class="{ active: currentFilter === '' }" @click="loadBookings('')">全部</button>
          <button type="button" class="tab-item" :class="{ active: currentFilter === 'active' }" @click="loadBookings('active')">待开始</button>
          <button type="button" class="tab-item" :class="{ active: currentFilter === 'FINISHED' }" @click="loadBookings('FINISHED')">已结束</button>
          <button type="button" class="tab-item" :class="{ active: currentFilter === 'CANCELED' }" @click="loadBookings('CANCELED')">已取消</button>
        </div>
      </div>

      <div class="card-body">
        <div v-if="bookings.length === 0" class="empty-state">
          <div class="empty-state-title">暂无预定记录</div>
          <div class="empty-state-desc">开始预定您的第一个会议室吧</div>
          <RouterLink to="/bookings/new" class="btn btn-primary">立即预定</RouterLink>
        </div>
        <div v-else class="table-wrapper bookings-list-wrap">
          <table class="bookings-my-table">
            <thead>
              <tr>
                <th>预定编号</th>
                <th>会议主题</th>
                <th>会议室</th>
                <th>时间</th>
                <th>状态</th>
                <th>签到状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in bookings" :key="item.id">
                <td data-label="预定编号"><code style="font-family:var(--font-mono);font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">{{ item.bookingNo }}</code></td>
                <td data-label="会议主题">
                  <div class="bookings-my-subject-line">{{ item.subject }}</div>
                  <div v-if="item.attendeeCount" style="font-size:12px;color:var(--color-text-tertiary)">{{ item.attendeeCount }}人参会</div>
                  <div v-if="item.status === 'REJECTED' && item.approvalRemark" style="font-size:12px;color:var(--color-danger);margin-top:4px">驳回说明：{{ item.approvalRemark }}</div>
                </td>
                <td data-label="会议室">{{ item.roomName }}</td>
                <td data-label="时间">
                  <div style="font-size:13px">{{ utils.formatDate(item.startTime) }}</div>
                  <div style="font-size:12px;color:var(--color-text-tertiary)">{{ utils.formatTime(item.startTime) }} - {{ utils.formatTime(item.endTime) }}</div>
                </td>
                <td data-label="状态"><span :class="['tag', utils.statusTag(item.status)]">{{ utils.statusLabel(item.status) }}</span></td>
                <td data-label="签到状态">
                  <span v-if="item.status === 'BOOKED'" class="tag tag-neutral">待签到</span>
                  <span v-else-if="item.status === 'CHECKED_IN'" class="tag tag-success">已签到</span>
                  <span v-else class="tag tag-neutral">{{ utils.statusLabel(item.status) }}</span>
                </td>
                <td class="actions-cell" data-label="操作">
                  <div class="bookings-actions-row">
                    <button v-if="item.status === 'BOOKED'" class="btn btn-success btn-sm" type="button" @click="checkIn(item.id)">签到</button>
                    <button v-if="item.status === 'BOOKED'" class="btn btn-ghost btn-sm" type="button" @click="router.push(`/rooms/${item.roomId}`)">查看会议室</button>
                    <button v-if="['BOOKED','CHECKED_IN','PENDING_APPROVAL'].includes(item.status)" class="btn btn-danger btn-sm" type="button" @click="cancelBooking(item.id)">取消</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
