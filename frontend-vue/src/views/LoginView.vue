<script setup lang="ts">
import { reactive } from 'vue'

import { api } from '@/api/client'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const form = reactive({
  username: '',
  password: '',
  loading: false,
})

async function submit() {
  if (!form.username.trim() || !form.password) {
    toast.error('请输入用户名和密码')
    return
  }
  form.loading = true
  try {
    const res = await api.login(form.username.trim(), form.password)
    auth.login(res.data.user, res.data.token, res.data.role)
    toast.success('登录成功，正在跳转...')
    window.setTimeout(() => auth.redirectAfterLogin(), 300)
  } catch (error: any) {
    toast.error(error.message || '登录失败，请检查用户名和密码')
  } finally {
    form.loading = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div style="margin-bottom: 40px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:44px;height:44px;background:var(--color-primary);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 4px 12px rgba(106,6,7,0.3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;color:var(--color-text-primary)">深大会议室预定</div>
            <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">SZU Meeting Room Booking</div>
          </div>
        </div>
        <h1 style="font-size:28px;font-weight:800;margin-bottom:8px;color:var(--color-text-primary)">欢迎回来</h1>
        <p style="font-size:14px;color:var(--color-text-secondary)">请登录您的账号以继续使用会议室预定系统</p>
      </div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">用户名 <span style="color:var(--color-danger)">*</span></label>
          <input v-model="form.username" type="text" class="form-input" placeholder="请输入用户名" autocomplete="username" />
        </div>

        <div class="form-group">
          <label class="form-label">密码 <span style="color:var(--color-danger)">*</span></label>
          <input v-model="form.password" type="password" class="form-input" placeholder="请输入密码" autocomplete="current-password" />
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="form.loading" style="margin-bottom:20px;padding:12px 24px;font-size:16px;font-weight:600;border-radius:10px">
          {{ form.loading ? '登录中...' : '登录' }}
        </button>

        <div style="text-align:center;font-size:12px;color:var(--color-text-tertiary);padding-top:20px;border-top:1px solid var(--color-border)">
          <div style="margin-bottom:8px;font-weight:600;color:var(--color-text-secondary)">测试账号</div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px">
            <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">user</code>/123456</span>
            <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">approver</code>/123456</span>
            <span><code style="background:var(--color-bg);padding:2px 6px;border-radius:4px">admin</code>/123456</span>
          </div>
        </div>
      </form>
    </div>

    <div class="login-visual">
      <div class="login-visual-content">
        <h2 class="login-visual-title">深大<br />会议室预定</h2>
        <p class="login-visual-sub">深圳大学官方会议室预定平台<br />便捷 · 高效 · 智能</p>

        <div class="login-visual-features">
          <div class="login-visual-feature"><div>快速预定</div></div>
          <div class="login-visual-feature"><div>冲突检测</div></div>
          <div class="login-visual-feature"><div>日历视图</div></div>
          <div class="login-visual-feature"><div>数据分析</div></div>
        </div>
      </div>
    </div>
  </div>
</template>
