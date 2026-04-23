# 会议室系统迁移接口契约

本文件用于 `Vue 3 + Spring Boot` 迁移时冻结现有系统行为，以 `front/scripts/api.js`、`docs/API.md`、`backend/routes/*.py`、`backend/services/*.py` 为准。

## 全局约定

- API 前缀：`/api`
- 认证方式：`Authorization: Bearer <JWT>`
- 响应结构：`{ code, message, data }`
- 列表接口通常附带：`total`
- 失败判定：优先看 `code`，很多业务失败仍返回 HTTP `200`
- 关键错误码：
  - `0`：成功
  - `40001`：参数或业务校验失败
  - `40101`：未登录、登录过期、用户名密码错误
  - `40301`：无权限
  - `40400`：接口不存在
  - `40401`：资源不存在
  - `40901`：时间冲突
  - `40902`：会议室不可用或维护中
  - `40903`：超过容量

## 角色模型

- `USER`：普通用户，只能进入用户端
- `APPROVER`：审批人，可进入管理端，但不可访问会议室管理
- `ADMIN`：管理员，可访问全部管理端能力

## 登录与跳转

- 登录接口：`POST /api/auth/login`
- 请求体：
  - `username`
  - `password`
- 成功 `data`：
  - `user`
  - `token`
  - `role`
- 跳转规则：
  - `ADMIN` -> `/admin#/admin/rooms`
  - `APPROVER` -> `/admin#/admin/bookings`
  - 其他 -> `/#/home`

## 字段映射

前端显示层统一使用 camelCase，后端数据库和多数响应使用 snake_case。

### room

- `requires_approval` -> `requiresApproval`
- `approver_user_id` -> `approverUserId`
- `approver_name` -> `approverName`
- `visibility_scope` -> `visibilityScope`
- `visible_colleges` -> `visibleColleges`
- `open_hours` -> `openHours`
- `weekday_open_hours` -> `weekdayOpenHours`
- `weekend_open_hours` -> `weekendOpenHours`

### booking

- `booking_no` -> `bookingNo`
- `room_id` -> `roomId`
- `room_name` -> `roomName`
- `organizer_id` -> `organizerId`
- `organizer_name` -> `organizerName`
- `start_time` -> `startTime`
- `end_time` -> `endTime`
- `attendee_count` -> `attendeeCount`
- `check_in_status` -> `checkInStatus`
- `approval_remark` -> `approvalRemark`
- `approver_name` -> `approverName`
- `approved_at` -> `approvedAt`
- `canceled_at` -> `canceledAt`
- `finished_at` -> `finishedAt`
- `created_at` -> `createdAt`
- `updated_at` -> `updatedAt`

## 接口清单

### 健康检查

- `GET /api/health`

### 认证

- `POST /api/auth/login`

### 用户端会议室

- `GET /api/rooms`
  - 查询参数：`building` `floor` `capacity` `status` `date` `startTime` `endTime` `facilities[]`
- `GET /api/rooms/available`
  - 查询参数：`date` `startTime` `endTime` `capacity` `building` `floor` `facilities[]`
- `GET /api/rooms/{roomId}`
- `GET /api/rooms/{roomId}/schedule`
  - 查询参数：`date`

### 用户端预定

- `POST /api/bookings`
  - 请求体使用 camelCase：
    - `subject`
    - `roomId`
    - `startTime`
    - `endTime`
    - `attendeeCount`
    - `remark`
- `GET /api/bookings/my`
  - 查询参数：`status`
- `POST /api/bookings/{bookingId}/cancel`
- `POST /api/bookings/{bookingId}/check-in`

### 管理端

- `GET /api/admin/approvers`
  - 仅 `ADMIN`
- `GET /api/admin/rooms`
  - 仅 `ADMIN`
- `POST /api/admin/rooms`
  - 仅 `ADMIN`
  - 写入以 snake_case 为主，兼容部分 camelCase
- `PUT /api/admin/rooms/{roomId}`
  - 仅 `ADMIN`
- `DELETE /api/admin/rooms/{roomId}`
  - 仅 `ADMIN`
- `GET /api/admin/colleges`
  - 仅 `ADMIN`
- `GET /api/admin/bookings`
  - `ADMIN` / `APPROVER`
  - 查询参数：`status` `date_from` `date_to` `room_id`
- `POST /api/admin/bookings/{bookingId}/approve`
  - `ADMIN` / `APPROVER`
- `POST /api/admin/bookings/{bookingId}/reject`
  - `ADMIN` / `APPROVER`
  - 请求体：`reason` 或 `remark`
- `GET /api/admin/stats`
  - `ADMIN` / `APPROVER`

### 审批接口

- `GET /api/approvals/pending`
- `POST /api/approvals/{bookingId}/approve`
- `POST /api/approvals/{bookingId}/reject`
- `GET /api/approvals/statistics`

说明：管理端页面当前主要走 `/api/admin/bookings/*` 这一组审批接口，但旧项目也保留了 `/api/approvals/*`，迁移时建议一并兼容。

### 通知

- `GET /api/notifications`
  - 查询参数：`limit` `offset` `unread_only`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/{notificationId}/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/{notificationId}`

## 关键业务规则

- 预定时间必须晚于当前时间，且结束时间大于开始时间
- 预定需满足最短/最长时长与营业时间规则
- 会议室状态必须为 `AVAILABLE`
- 占用状态集合冲突检查：`PENDING_APPROVAL`、`BOOKED`、`CHECKED_IN`、`IN_USE`
- `requires_approval=1` 的会议室，创建预定后状态为 `PENDING_APPROVAL`
- 审批通过后变为 `BOOKED`
- 审批驳回后变为 `REJECTED`
- 只有预定人本人可以取消和签到
- `APPROVER` 访问管理端时，若会议室存在指定审批人，则只能审批自己被指定的会议室预定

## 数据库与密码兼容

- 现有数据库：`backend/meeting.db`
- 现有密码哈希：Werkzeug `generate_password_hash`
- Spring Boot 迁移需要兼容旧哈希或提供迁移策略
