# 会议室预定系统 — HTTP API 说明

**Base URL**：与页面同源时为 `{origin}/api`（默认由 `front/scripts/api.js` 根据 `window.location.origin` 拼接）。仅启动 `backend/app.py` 时，本机为 `http://127.0.0.1:5000/api`。公网 HTTPS 见 [PUBLIC_HTTPS.md](./PUBLIC_HTTPS.md)。

**通用约定**

- 请求头：`Content-Type: application/json`（`POST`/`PUT` 且带 body 时）
- 需登录的接口：`Authorization: Bearer <JWT>`
- 响应体 JSON 字段：
  - `code`：`0` 表示成功；非 `0` 为业务错误码（HTTP 状态码可能仍为 200，请以 `code` 为准）
  - `message`：说明文案
  - `data`：载荷；列表类接口通常另有 `total`（条数）

**业务错误码（节选）**

| code   | 含义           |
|--------|----------------|
| 0      | 成功           |
| 40001  | 参数或业务校验失败 |
| 40101  | 未登录、登录过期或账号密码错误（登录接口） |
| 40301  | 无权限         |
| 40400  | 路径不存在     |
| 40401  | 资源不存在     |
| 40901  | 时间冲突       |
| 40902  | 会议室不可用/维护 |
| 40903  | 超过容量       |

---

## 1. 健康检查

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/health` |
| 鉴权   | 不需要 |

**成功示例**：`data.version` 为服务版本字符串。

---

## 2. 认证

### 2.1 登录

| 项目   | 说明 |
|--------|------|
| 方法路径 | `POST /api/auth/login` |
| 鉴权   | 不需要 |

**请求体（JSON）**

| 字段       | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| username   | string | 是   | 用户名   |
| password   | string | 是   | 密码     |

**成功 `data`**

| 字段   | 说明        |
|--------|-------------|
| user   | 用户信息（id, username, name, email, role） |
| token  | JWT         |
| role   | `USER` / `ADMIN` |

测试账号：`user` / `123456`（普通用户），`admin` / `123456`（管理员）。

> 前端登录请求不经过通用 `request()` 封装，避免将「密码错误」误判为 Token 失效并清空本地登录态。

---

## 3. 会议室（需登录）

### 3.1 会议室列表

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/rooms` |
| 鉴权   | 需要 |

**查询参数（均为可选）**

| 参数        | 说明 |
|-------------|------|
| building    | 楼宇 |
| floor       | 楼层 |
| capacity    | 最小容量（会议室容量 ≥ 该值） |
| status      | `AVAILABLE` / `BUSY` / `MAINTENANCE` |
| date        | 日期 `YYYY-MM-DD` |
| startTime   | 开始时间 `HH:MM`（与 `date`、`endTime` 同时传时，排除该时段已有预定或维护记录的会议室） |
| endTime     | 结束时间 `HH:MM` |
| facilities  | 可重复；会议室需**同时具备**所列设备代码（如 `projector`、`video_conf`） |

**成功**：`data` 为会议室数组（含 `facilities` 字符串数组等库表字段）。

### 3.2 空闲会议室（可预定）

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/rooms/available` |
| 鉴权   | 需要 |

**查询参数**

| 参数        | 说明 |
|-------------|------|
| date        | 日期 `YYYY-MM-DD`（与时段一起传时做冲突与维护检测） |
| startTime   | `HH:MM` |
| endTime     | `HH:MM` |
| capacity    | 最小容量 |
| building    | 楼宇 |
| floor       | 楼层 |
| facilities  | 可重复，需同时具备 |

仅返回状态为可用的会议室，且会排除时段冲突与维护冲突。

### 3.3 会议室详情

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/rooms/{room_id}` |
| 鉴权   | 需要 |

### 3.4 某日排期

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/rooms/{room_id}/schedule` |
| 鉴权   | 需要 |

**查询参数**：`date`（`YYYY-MM-DD`），缺省为当天。

---

## 4. 预定（需登录）

### 4.1 创建预定

| 项目   | 说明 |
|--------|------|
| 方法路径 | `POST /api/bookings` |
| 鉴权   | 需要 |

**请求体（JSON，字段名与前端一致，小驼峰）**

| 字段           | 必填 | 说明 |
|----------------|------|------|
| subject        | 是   | 会议主题 |
| roomId         | 是   | 会议室 ID |
| startTime      | 是   | ISO 本地时间，如 `2026-04-10T10:00:00` |
| endTime        | 是   | 同上 |
| attendeeCount  | 否   | 默认 1 |
| remark         | 否   | 备注 |

### 4.2 我的预定

| 项目   | 说明 |
|--------|------|
| 方法路径 | `GET /api/bookings/my` |
| 鉴权   | 需要 |

**查询参数**：`status` 可选；传 `active` 表示进行中状态集合（`BOOKED` / `CHECKED_IN` / `IN_USE`）。

### 4.3 取消预定

| 项目   | 说明 |
|--------|------|
| 方法路径 | `POST /api/bookings/{booking_id}/cancel` |
| 鉴权   | 需要 |

预定人可取消本人预定；管理员可取消任意预定（`role === ADMIN` 时后端 `is_admin=true`）。

### 4.4 签到

| 项目   | 说明 |
|--------|------|
| 方法路径 | `POST /api/bookings/{booking_id}/check-in` |
| 鉴权   | 需要 |

仅预定人且状态为 `BOOKED` 时可签到。

---

## 5. 管理端（需管理员）

### 5.1 会议室列表

`GET /api/admin/rooms`

### 5.2 新增会议室

`POST /api/admin/rooms`

**请求体（JSON）**：`name`, `building`, `floor`, `capacity` 必填；可选 `description`, `open_hours`, `image`, `facilities`（数组）, `status`。

### 5.3 更新会议室

`PUT /api/admin/rooms/{room_id}`

请求体为部分字段；设备列表传 `facilities` 时会整体替换。

### 5.4 删除会议室

`DELETE /api/admin/rooms/{room_id}`

### 5.5 全部预定

`GET /api/admin/bookings`

**查询参数（可选）**：`status`, `date_from`, `date_to`, `room_id`。

### 5.6 管理员取消预定

`POST /api/admin/bookings/{booking_id}/cancel`

### 5.7 统计数据

`GET /api/admin/stats`

**成功 `data`**：`totalRooms`, `availableRooms`, `todayBookings`, `utilizationRate`, `weeklyData`, `buildingData`, `roomsUsage`（与前端 `mapStats` 一致）。

---

## 6. 前端字段映射

列表与详情中的会议室、预定在后端多为 **snake_case**（如 `booking_no`, `room_id`），`api.js` 中 `mapRoom` / `mapBooking` 会转为前端使用的 **camelCase**（如 `bookingNo`, `roomId`）。管理端写会议室时，`openHours` 会在 `updateRoom` 中映射为 `open_hours`。

---

## 7. 自动化测试

在项目根目录执行：

```bash
python backend/scripts/test_api.py
```

脚本使用 Flask `test_client` 顺序调用上述接口并断言 `code` 与关键字段（无需单独启动服务进程）。
