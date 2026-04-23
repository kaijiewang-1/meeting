<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const filters = reactive({
  dateFrom: '',
  status: '',
})
const bookings = ref<any[]>([])

async function loadBookings() {
  const res = await api.getAllBookings({
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateFrom || undefined,
    status: filters.status || undefined,
  })
  bookings.value = res.data || []
}

async function approve(id: number) {
  try {
    await api.approveBooking(id)
    toast.success('已通过审批')
    await loadBookings()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

async function reject(id: number) {
  const reason = window.prompt('驳回原因（可选，将展示给申请人）', '') || ''
  try {
    await api.rejectBooking(id, reason.trim())
    toast.success('已驳回')
    await loadBookings()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

onMounted(() => {
  void loadBookings()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">预定记录</h1>
      <p class="page-subtitle">查看全部预定；待审批项可通过或驳回</p>
    </div>

    <div class="filter-bar" style="margin-bottom:20px">
      <div class="filter-item">
        <span class="filter-label">日期范围</span>
        <input v-model="filters.dateFrom" type="date" class="form-input" style="min-width:150px" />
      </div>
      <div class="filter-item">
        <span class="filter-label">状态</span>
        <select v-model="filters.status" class="form-select" style="min-width:130px">
          <option value="">全部状态</option>
          <option value="PENDING_APPROVAL">待审批</option>
          <option value="BOOKED">已预定</option>
          <option value="CHECKED_IN">已签到</option>
          <option value="FINISHED">已完成</option>
          <option value="CANCELED">已取消</option>
          <option value="REJECTED">已驳回</option>
          <option value="EXPIRED">已过期</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" type="button" @click="loadBookings">查询</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>预定编号</th>
                <th>会议主题</th>
                <th>会议室</th>
                <th>预定人</th>
                <th>审批人</th>
                <th>时间</th>
                <th>人数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in bookings" :key="item.id">
                <td><code style="font-size:12px;background:var(--color-bg);padding:2px 6px;border-radius:4px">{{ item.bookingNo }}</code></td>
                <td>{{ item.subject }}</td>
                <td>{{ item.roomName }}</td>
                <td>{{ item.organizerName }}</td>
                <td>{{ item.approverName || '-' }}</td>
                <td>
                  <div style="font-size:12px">{{ utils.formatDate(item.startTime) }}</div>
                  <div style="font-size:12px;color:var(--color-text-tertiary)">{{ utils.formatTime(item.startTime) }} - {{ utils.formatTime(item.endTime) }}</div>
                </td>
                <td>{{ item.attendeeCount || 1 }}人</td>
                <td><span :class="['tag', utils.statusTag(item.status)]">{{ utils.statusLabel(item.status) }}</span></td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button v-if="item.status === 'PENDING_APPROVAL'" class="btn btn-primary btn-sm" type="button" @click="approve(item.id)">通过</button>
                    <button v-if="item.status === 'PENDING_APPROVAL'" class="btn btn-danger btn-sm" type="button" @click="reject(item.id)">驳回</button>
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
