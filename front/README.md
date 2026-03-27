# 会议室预定系统 - 前端

基于 HTML/CSS/JavaScript 的会议室预定系统前端，采用纯前端 SPA 架构，无需构建工具即可运行。

## 功能概览

### 用户端
- **登录页** - 账号密码认证，支持普通用户和管理员两种角色
- **首页工作台** - 统计数据、今日会议、空闲会议室推荐、系统公告
- **会议室列表** - 多条件筛选（日期、时间、楼宇、人数、设备、状态）
- **会议室详情** - 会议室信息、今日排期时间轴、点击空闲时段快速预定
- **新建预定** - 会议信息填写、会议室搜索、冲突检测
- **我的预定** - 预定列表、状态筛选、签到、取消、再次预定
- **日历视图** - 按周查看所有会议室占用情况

### 管理端
- **会议室管理** - 新增、编辑、删除会议室，修改状态
- **预定记录** - 查看所有用户的预定记录
- **数据统计** - 预定趋势、楼宇使用对比、会议室使用排行

## 快速启动

### 方法一：VS Code Live Server（推荐）

1. 在 VS Code 中安装 **Live Server** 扩展
2. 右键点击 `index.html` → **"Open with Live Server"**
3. 浏览器自动打开，访问 `http://localhost:5500`

### 方法二：Python HTTP Server

```bash
cd front
python -m http.server 8000
# 访问 http://localhost:8000
```

### 方法三：Node.js Serve

```bash
npx serve .
```

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | `user` | `123456` |
| 管理员 | `admin` | `123456` |

> 输入任意用户名/密码（非空）也可登录。

## 技术方案

- **架构**：纯前端 SPA，使用 ES Module 动态导入
- **路由**：基于 `window.location.hash` 的哈希路由
- **样式**：CSS 变量 + BEM 命名，响应式布局
- **数据**：Mock API（内存数据），无后端依赖
- **状态**：轻量级响应式 Store + localStorage 持久化

## 目录结构

```
front/
  index.html          # 入口页面
  styles/
    variables.css     # CSS 变量（颜色、阴影、字体等）
    reset.css         # 样式重置
    layout.css        # 布局组件（侧边栏、卡片、表格等）
    components.css    # UI 组件（按钮、表单、弹窗等）
  scripts/
    store.js          # 状态管理
    api.js            # Mock API
    router.js         # 路由
    utils.js          # 工具函数
    toast.js          # Toast 通知
    app.js            # 主应用（布局+路由注册）
    pages/
      login.js        # 登录页
      home.js         # 首页工作台
      rooms.js        # 会议室列表
      room-detail.js  # 会议室详情
      booking-new.js  # 新建预定
      bookings-my.js   # 我的预定
      calendar.js     # 日历视图
      admin-rooms.js  # 管理端 - 会议室管理
      admin-bookings.js # 管理端 - 预定记录
      admin-stats.js  # 管理端 - 数据统计
```

## 对接后端 API

当前使用 Mock 数据。如需对接真实后端：

1. 修改 `scripts/api.js` 中的 `API_BASE` 常量
2. 将各 API 方法中的 Mock 数据替换为真实的 `fetch` 请求
3. 统一响应格式：`{ code: 0, message: 'success', data: ... }`

### 主要 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/rooms` | GET | 获取会议室列表 |
| `/api/rooms/available` | GET | 获取空闲会议室 |
| `/api/rooms/:id` | GET | 获取会议室详情 |
| `/api/rooms/:id/schedule` | GET | 获取会议室排期 |
| `/api/bookings` | POST | 创建预定 |
| `/api/bookings/my` | GET | 获取我的预定 |
| `/api/bookings/:id/cancel` | POST | 取消预定 |
| `/api/admin/rooms` | GET/POST | 管理会议室 |
| `/api/admin/stats` | GET | 统计数据 |
