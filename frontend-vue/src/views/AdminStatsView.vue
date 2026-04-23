<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { utils } from '@/lib/utils'

const stats = ref<any | null>(null)

async function loadStats() {
  try {
    const res = await api.getStats()
    stats.value = res.data
  } catch (error: any) {
    toast.error(error.message || '统计数据加载失败')
  }
}

onMounted(() => {
  void loadStats()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">数据统计</h1>
      <p class="page-subtitle">会议室使用情况与预定数据分析</p>
    </div>

    <div v-if="stats" class="grid-4" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.totalRooms }}</div>
        <div class="stat-card-label">会议室总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.availableRooms }}</div>
        <div class="stat-card-label">当前空闲</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.todayBookings }}</div>
        <div class="stat-card-label">今日预定数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">{{ stats.utilizationRate }}%</div>
        <div class="stat-card-label">平均利用率</div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px;margin-bottom:20px" v-if="stats">
      <div class="card">
        <div class="card-header"><span class="card-title">本周预定趋势</span></div>
        <div class="card-body">
          <div style="display:flex;align-items:flex-end;justify-content:space-around;height:180px;gap:8px;padding:0 8px">
            <div v-for="item in stats.weeklyData" :key="item.day" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="font-size:12px;font-weight:600;color:var(--color-primary)">{{ item.bookings }}</div>
              <div :style="{ width: '100%', height: `${Math.max(4, item.bookings * 12)}px`, background: 'var(--color-primary)', borderRadius: '4px 4px 0 0' }"></div>
              <div style="font-size:11px;color:var(--color-text-tertiary)">{{ item.day }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">楼宇使用对比</span></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:16px">
            <div v-for="item in stats.buildingData" :key="item.building">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:13px;font-weight:500">{{ item.building }}</span>
                <span style="font-size:13px;color:var(--color-text-secondary)"><strong>{{ item.bookings }}</strong> 次预定 · <strong style="color:var(--color-primary)">{{ item.rate }}%</strong> 利用率</span>
              </div>
              <div style="height:8px;background:var(--color-bg);border-radius:var(--radius-full);overflow:hidden">
                <div :style="{ height: '100%', width: `${item.rate}%`, background: 'linear-gradient(90deg,var(--color-primary),var(--color-booked))' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" v-if="stats">
      <div class="card-header"><span class="card-title">会议室使用排行</span></div>
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>会议室</th>
                <th>位置</th>
                <th>容量</th>
                <th>预定次数</th>
                <th>使用时长</th>
                <th>利用率</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in stats.roomsUsage" :key="room.id">
                <td>{{ room.name }}</td>
                <td>{{ room.building }} · {{ room.floor }}</td>
                <td>{{ room.capacity }}人</td>
                <td>{{ room.bookings }}</td>
                <td>{{ room.hours }} 小时</td>
                <td>{{ room.rate }}%</td>
                <td><span :class="['tag', utils.roomStatusTag(room.status)]">{{ utils.statusLabel(room.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
