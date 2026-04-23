<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const router = useRouter()
const bookings = ref<any[]>([])

async function loadPending() {
  const res = await api.getPendingApprovals()
  bookings.value = res.data || []
}

async function approve(id: number) {
  if (!window.confirm('确定通过该预定申请吗？')) return
  try {
    await api.approvePending(id)
    toast.success('审批通过')
    await loadPending()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

async function reject(id: number) {
  const reason = window.prompt('请输入拒绝原因：')
  if (reason === null) return
  try {
    await api.rejectPending(id, reason)
    toast.success('已拒绝')
    await loadPending()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

onMounted(() => {
  void loadPending()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">审批管理</h1>
      <p class="page-subtitle">审批会议室预定申请</p>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">待审批列表</span>
        <span class="badge badge-warning">{{ bookings.length }}</span>
      </div>
      <div class="card-body">
        <div v-if="bookings.length === 0" class="empty-state">
          <div class="empty-state-title">暂无待审批申请</div>
          <div class="empty-state-desc">所有预定申请已处理完毕</div>
        </div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>预定编号</th>
                <th>会议主题</th>
                <th>会议室</th>
                <th>预定人</th>
                <th>时间</th>
                <th>人数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in bookings" :key="item.id">
                <td><code>{{ item.bookingNo }}</code></td>
                <td>{{ item.subject }}</td>
                <td>{{ item.roomName }}</td>
                <td>{{ item.organizerName }}</td>
                <td>
                  <div>{{ utils.formatDate(item.startTime) }}</div>
                  <div class="text-xs text-tertiary">{{ utils.formatTime(item.startTime) }} - {{ utils.formatTime(item.endTime) }}</div>
                </td>
                <td>{{ item.attendeeCount }}人</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-success btn-sm" type="button" @click="approve(item.id)">通过</button>
                    <button class="btn btn-danger btn-sm" type="button" @click="reject(item.id)">拒绝</button>
                    <button class="btn btn-secondary btn-sm" type="button" @click="router.push(`/rooms/${item.roomId}`)">查看</button>
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
