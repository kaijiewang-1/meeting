# 会议室预定系统后端设计文档

## 1. 设计目标
本文档描述会议室预定系统后端的详细技术设计，包括系统架构、服务模块、数据库设计、并发控制、接口规范、任务调度、日志监控与部署建议，重点解决“如何稳定且正确地支撑会议室预定业务”。

## 2. 总体架构设计
## 2.1 架构目标
- 支持会议室资源管理和预定管理
- 保证高并发下预定不冲突
- 提供清晰的权限边界
- 支持通知、统计、审批等后续扩展

## 2.2 架构风格
建议采用**分层单体优先、后续可拆分模块化服务**的设计：
- 初期：单体应用 + 清晰模块边界
- 中后期：按通知、统计、审批等非核心模块逐步拆分

### 推荐逻辑分层
```text
Controller / API 层
    ↓
Application 应用服务层
    ↓
Domain 领域规则层
    ↓
Repository 数据访问层
    ↓
MySQL / Redis / MQ
```

## 3. 模块设计
## 3.1 Auth 模块
### 职责
- 用户登录鉴权
- Token 校验
- 用户上下文注入
- 权限校验

### 输出
- 当前用户 ID
- 当前用户角色
- 权限集合

## 3.2 Room 模块
### 职责
- 会议室基础信息管理
- 设备与标签管理
- 可用时间段查询
- 会议室维护状态管理

### 关键服务
- RoomQueryService
- RoomCommandService
- RoomAvailabilityService

## 3.3 Booking 模块
### 职责
- 创建预定
- 修改预定
- 取消预定
- 签到签退
- 状态流转
- 冲突校验

### 关键服务
- BookingApplicationService
- BookingConflictService
- BookingRuleService
- BookingLifecycleService

## 3.4 Rule 模块
### 职责
- 统一管理组织级预定规则
- 支撑创建与修改时的规则校验

## 3.5 Notification 模块
### 职责
- 发送预定成功通知
- 发送变更通知
- 发送开始前提醒
- 发送释放通知

### 实现建议
异步处理，避免阻塞主交易链路。

## 3.6 Stats 模块
### 职责
- 汇总利用率
- 统计取消率
- 按楼宇/会议室/时间维度分析
- 为管理端提供图表数据

## 3.7 Scheduler 模块
### 职责
- 预定开始前提醒
- 未签到自动释放
- 已结束会议自动收尾
- 日统计任务

## 4. 核心时序设计
## 4.1 创建预定时序
```text
客户端提交预定请求
    → API 层参数校验
    → 获取用户上下文
    → 加载会议室信息
    → 加载预定规则
    → 执行规则校验
    → 执行时间冲突校验
    → 写入 bookings
    → 写入操作日志
    → 发布通知事件
    → 返回成功
```

## 4.2 取消预定时序
```text
客户端发起取消
    → 鉴权检查
    → 校验是否本人或管理员
    → 校验是否在允许取消时间内
    → 更新 booking 状态为 CANCELED
    → 写入操作日志
    → 发布取消通知事件
```

## 4.3 自动释放时序
```text
定时任务扫描待签到预定
    → 判断会议开始后是否超时未签到
    → 更新 booking 状态为 EXPIRED
    → 记录释放原因
    → 发送通知
```

## 5. 数据库设计
## 5.1 表关系说明
- 一个用户可创建多个预定
- 一个会议室可对应多个预定
- 一个会议室可配置多个设备标签
- 一个会议室可有多个维护时段
- 一个组织可有一套或多套预定规则

## 5.2 bookings 表设计建议
```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_no VARCHAR(32) NOT NULL UNIQUE,
  subject VARCHAR(200) NOT NULL,
  organizer_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  attendee_count INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL,
  remark VARCHAR(500) NULL,
  canceled_at DATETIME NULL,
  finished_at DATETIME NULL,
  version INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_room_time_status (room_id, start_time, end_time, status),
  INDEX idx_organizer_time (organizer_id, start_time)
);
```

### 设计说明
- `booking_no` 用于对外展示
- `version` 用于乐观锁扩展
- 状态字段使用字符串枚举，便于阅读和排查

## 5.3 rooms 表设计建议
```sql
CREATE TABLE rooms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  floor VARCHAR(50) NOT NULL,
  capacity INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

## 6. 冲突校验设计
## 6.1 冲突判断规则
目标会议室在有效状态预定中，只要满足以下条件之一即视为冲突：
```text
newStart < existEnd AND newEnd > existStart
```

## 6.2 SQL 示例
```sql
SELECT id
FROM bookings
WHERE room_id = ?
  AND status IN ('BOOKED', 'CHECKED_IN', 'IN_USE')
  AND start_time < :newEnd
  AND end_time > :newStart
LIMIT 1;
```

## 6.3 并发一致性策略
推荐分三层保障：

### 第一层：事务
创建预定必须放入数据库事务中。

### 第二层：悲观锁或分布式锁
针对“同一会议室 + 时间段”的创建动作，可使用：
- 数据库行锁（按会议室维度锁）
- Redis 分布式锁（按 room_id 粒度）

### 第三层：唯一业务约束与重试
无法直接用普通唯一索引覆盖时间区间冲突，因此推荐：
- 先加锁
- 再做冲突查询
- 再写入
- 失败时明确返回冲突错误码

## 7. 可用性查询设计
## 7.1 查询思路
根据用户输入的日期、时间、人数、设备条件，先筛选候选会议室，再排除冲突与维护中的会议室。

### 查询步骤
1. 查询满足楼宇、容量、设备条件的候选会议室  
2. 查询这些会议室在目标时段的冲突预定  
3. 查询这些会议室在目标时段的维护记录  
4. 返回可用会议室清单  

## 7.2 性能优化建议
- 对热门时间段结果做短时缓存
- 对楼宇、楼层、设备等字典做缓存
- 候选会议室数量大时使用分页或分批查询

## 8. 状态机设计
## 8.1 预定状态
```text
BOOKED → CHECKED_IN → IN_USE → FINISHED
BOOKED → CANCELED
BOOKED → EXPIRED
CHECKED_IN → CANCELED（如允许）
```

## 8.2 状态流转约束
- 仅 BOOKED 状态可执行签到
- 仅 BOOKED / CHECKED_IN 状态可取消（按规则控制）
- 已结束状态不可修改

## 9. 规则引擎设计
## 9.1 规则类型
- 最大提前预定天数
- 最短预定时长
- 最大预定时长
- 最晚取消时限
- 自动释放时长
- 营业时间范围

## 9.2 实现建议
采用可组合校验器模式：
```text
AdvanceDaysValidator
DurationValidator
BusinessHoursValidator
CapacityValidator
MaintenanceValidator
ConflictValidator
```

每个校验器只负责一个规则，便于维护和测试。

## 10. 接口设计
## 10.1 RESTful 路径建议
```text
GET    /api/rooms/available
GET    /api/rooms/{id}
GET    /api/rooms/{id}/schedule
POST   /api/bookings
PUT    /api/bookings/{id}
POST   /api/bookings/{id}/cancel
POST   /api/bookings/{id}/check-in
GET    /api/bookings/my
GET    /api/admin/rooms
POST   /api/admin/rooms
PUT    /api/admin/rooms/{id}
PUT    /api/admin/rules
GET    /api/admin/stats/utilization
```

## 10.2 幂等设计
对于创建预定接口，建议支持幂等键：
- Header：`Idempotency-Key`
- 若重复提交相同请求，在一定时间窗口内返回同一结果

## 10.3 参数校验
建议在 API 层完成：
- 必填校验
- 时间格式校验
- 时间先后关系校验
- 枚举值校验
- 数据长度校验

## 11. 缓存设计
## 11.1 可缓存数据
- 会议室基础信息
- 楼宇楼层字典
- 规则配置
- 热门查询结果（短缓存）

## 11.2 不建议长期缓存的数据
- 预定结果明细
- 会议室实时占用状态

## 11.3 缓存更新策略
- 会议室信息变更后删除对应缓存
- 规则变更后删除规则缓存
- 预定创建/取消后删除对应会议室可用性缓存

## 12. 消息与异步设计
## 12.1 事件类型
- BOOKING_CREATED
- BOOKING_UPDATED
- BOOKING_CANCELED
- BOOKING_EXPIRED
- BOOKING_REMINDER

## 12.2 异步使用场景
- 邮件/短信/IM 通知
- 数据统计累计
- 审计日志扩展写入
- 第三方日历同步

## 13. 审计与日志设计
## 13.1 审计日志
记录：
- 谁
- 在什么时间
- 对哪个对象
- 做了什么操作
- 操作结果如何

## 13.2 应用日志
分级建议：
- INFO：主流程日志
- WARN：规则异常、重试
- ERROR：系统错误、外部调用失败

## 13.3 Trace 设计
接口请求建议附带 traceId，便于跨服务排查。

## 14. 安全设计
- JWT / Session 鉴权
- RBAC 权限控制
- 所有写接口做鉴权
- 防重放与限流
- 操作审计
- SQL 注入与 XSS 基础防护
- 关键配置变更仅管理员可操作

## 15. 部署设计
## 15.1 环境规划
- dev
- test
- staging
- prod

## 15.2 部署建议
- Docker 容器化部署
- Nginx 反向代理
- 应用实例可水平扩展
- MySQL 主从或高可用
- Redis 哨兵或集群
- 日志与监控独立部署

## 15.3 容灾建议
- 数据库定期备份
- 关键表 binlog 保留
- 配置中心统一管理
- 消息队列支持失败重试与死信队列

## 16. 测试设计
## 16.1 单元测试
- 冲突判断
- 状态机流转
- 规则校验器
- 权限控制

## 16.2 集成测试
- 会议室查询
- 创建预定
- 修改预定
- 取消预定
- 自动释放

## 16.3 压测场景
- 热门会议室抢占
- 每分钟大量查询
- 定时任务批量释放
- 管理端统计接口高负载访问

## 17. 扩展设计
### 17.1 与企业组织架构同步
同步员工、部门、楼宇信息。

### 17.2 与企业 IM 集成
支持预定通知、会议提醒、快捷取消。

### 17.3 与门口屏/二维码集成
支持现场签到、临时占用、快速续时。

### 17.4 智能推荐
根据历史使用、设备匹配、楼层位置推荐最佳会议室。

## 18. 设计结论
后端设计的重点不只是提供 CRUD 接口，而是围绕“可用性计算 + 冲突控制 + 规则治理 + 异步扩展 + 数据统计”建立稳定系统。建议优先采用单体分层架构快速落地，在业务稳定后逐步引入消息、统计、审批和设备联动能力。
