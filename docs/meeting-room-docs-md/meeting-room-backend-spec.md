# 会议室预定系统后端说明文档

## 1. 文档目的
本文档说明会议室预定系统后端的建设目标、业务能力、模块边界、数据对象、接口能力、权限机制及非功能要求，为后端开发、架构设计、测试、运维及前后端联调提供统一依据。

## 2. 项目目标
会议室预定系统后端需提供稳定的会议室资源管理和预定管理能力，核心目标如下：

- 提供准确的空闲会议室查询能力
- 保证同一时间段同一会议室不被重复预定
- 支持预定创建、修改、取消、签到等业务动作
- 支持管理员维护会议室信息和预定规则
- 支持统计分析与消息通知扩展
- 具备高并发下的数据一致性和可追踪性

## 3. 业务范围
## 3.1 会议室管理
- 会议室基础信息维护
- 楼宇、楼层、容量、设备属性维护
- 会议室状态维护：空闲、占用、维护、停用

## 3.2 预定管理
- 创建预定
- 查询预定
- 修改预定
- 取消预定
- 签到 / 自动释放（可选）

## 3.3 权限与用户管理
- 用户身份识别
- 角色权限控制
- 管理员能力开放

## 3.4 规则管理
- 可提前预定天数
- 最短/最长预定时长
- 可取消时间限制
- 是否允许重复会议规则
- 是否需要审批（扩展）

## 3.5 统计分析
- 会议室利用率
- 取消率
- 超时未签到率
- 高峰时段统计

## 4. 系统角色
### 4.1 普通用户
- 查询可用会议室
- 创建/查看/取消自己的预定
- 进行签到或结束会议

### 4.2 管理员
- 管理会议室
- 管理规则
- 查询全量预定
- 查看统计报表

### 4.3 系统任务
- 自动发送提醒
- 自动取消超时未签到预定
- 自动释放结束后的占用状态
- 生成统计数据（批处理）

## 5. 后端模块划分
## 5.1 用户与认证模块
- 登录认证
- Token 签发与校验
- 用户角色获取
- 权限鉴权

## 5.2 会议室模块
- 会议室增删改查
- 可用时间段查询
- 会议室状态管理
- 会议室设备标签管理

## 5.3 预定模块
- 预定创建
- 冲突校验
- 预定修改
- 预定取消
- 预定签到/签退
- 预定记录查询

## 5.4 规则模块
- 组织级规则
- 楼宇级规则（可选）
- 会议室级特殊规则（可选）

## 5.5 通知模块
- 站内消息
- 邮件通知
- 短信 / 企业 IM 通知（扩展）
- 预定成功、变更、取消提醒

## 5.6 统计模块
- 预定趋势统计
- 会议室利用率汇总
- 用户使用统计
- 异常占用分析

## 5.7 定时任务模块
- 开始前提醒
- 未签到释放
- 数据归档
- 报表计算

## 6. 核心业务规则
## 6.1 会议室冲突规则
同一会议室在同一时间区间不能存在两个有效预定。

### 有效预定状态建议
- BOOKED：已预定
- CHECKED_IN：已签到
- IN_USE：使用中

### 无效或结束状态
- CANCELED：已取消
- EXPIRED：超时释放
- FINISHED：已结束

## 6.2 时间规则
- 开始时间必须小于结束时间
- 预定时长必须满足最短/最长限制
- 不允许预定过去时间
- 超出营业时间不可预定
- 维护时间段不可预定

## 6.3 用户规则
- 普通用户只能操作自己的预定
- 管理员可查看全部预定
- 可设置同一用户同一时段最多一个会议（可选）

## 6.4 容量规则
- 参会人数不能超过会议室容量
- 若设备需求与会议室能力不匹配则不可预定

## 6.5 签到规则（可选）
- 会议开始后 X 分钟未签到则自动释放
- 自动释放后通知相关用户
- 签到后预定状态进入使用中

## 7. 对外接口能力
## 7.1 用户侧接口
- 查询空闲会议室
- 获取会议室详情
- 查询会议室排期
- 创建预定
- 修改预定
- 取消预定
- 查看我的预定
- 签到 / 签退（可选）

## 7.2 管理侧接口
- 新增会议室
- 编辑会议室
- 停用/维护会议室
- 查询全部预定
- 配置业务规则
- 查询统计报表

## 8. 推荐技术栈
- 开发语言：Java / Go / Node.js（任选其一）
- 后端框架：Spring Boot / Gin / NestJS
- 数据库：MySQL / PostgreSQL
- 缓存：Redis
- 消息队列：RabbitMQ / Kafka（如需异步通知）
- 定时任务：XXL-JOB / Quartz / cron
- API 文档：OpenAPI / Swagger
- 日志：ELK / Loki
- 监控：Prometheus + Grafana

## 9. 数据对象说明
## 9.1 用户 User
```json
{
  "id": 1001,
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "USER",
  "status": "ACTIVE"
}
```

## 9.2 会议室 Room
```json
{
  "id": 101,
  "name": "A-101",
  "building": "总部大楼",
  "floor": "10F",
  "capacity": 12,
  "facilities": ["projector", "tv", "whiteboard"],
  "status": "AVAILABLE"
}
```

## 9.3 预定 Booking
```json
{
  "id": 9001,
  "subject": "周例会",
  "organizerId": 1001,
  "roomId": 101,
  "startTime": "2026-03-25T10:00:00+08:00",
  "endTime": "2026-03-25T11:00:00+08:00",
  "status": "BOOKED"
}
```

## 10. 统一返回规范
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 错误码建议
- 0：成功
- 40001：参数错误
- 40101：未登录或登录失效
- 40301：无权限
- 40401：会议室不存在
- 40901：会议室时间冲突
- 40902：会议室维护中
- 40903：参会人数超限
- 50001：系统异常

## 11. 非功能要求
### 11.1 一致性
在高并发情况下必须保证会议室不会被重复预定。

### 11.2 可用性
核心查询与预定接口应具备高可用能力，避免单点故障。

### 11.3 可扩展性
支持未来扩展审批流、门禁签到、第三方日历同步。

### 11.4 安全性
- 鉴权校验
- 参数校验
- 接口防重放
- 关键操作审计日志
- 敏感字段脱敏

### 11.5 可观测性
- 接口日志
- 业务日志
- 异常告警
- 定时任务执行监控

## 12. 数据库表建议
### 12.1 users
- id
- name
- email
- role
- status
- created_at
- updated_at

### 12.2 rooms
- id
- name
- building
- floor
- capacity
- status
- description
- created_at
- updated_at

### 12.3 room_facilities
- id
- room_id
- facility_code
- facility_name

### 12.4 bookings
- id
- booking_no
- subject
- organizer_id
- room_id
- start_time
- end_time
- attendee_count
- status
- remark
- canceled_at
- finished_at
- created_at
- updated_at

### 12.5 booking_participants（可选）
- id
- booking_id
- user_id
- user_name
- user_email

### 12.6 room_maintenance
- id
- room_id
- start_time
- end_time
- reason
- status

### 12.7 booking_rules
- id
- org_id
- max_advance_days
- min_duration_minutes
- max_duration_minutes
- cancel_limit_minutes
- auto_release_minutes
- updated_by
- updated_at

### 12.8 operation_logs
- id
- operator_id
- operator_role
- action
- target_type
- target_id
- detail
- created_at

## 13. 索引建议
- bookings(room_id, start_time, end_time, status)
- bookings(organizer_id, start_time)
- rooms(building, floor, status)
- room_maintenance(room_id, start_time, end_time)

## 14. 关键接口示例
### 查询空闲会议室
`GET /api/rooms/available`

请求参数：
- date
- startTime
- endTime
- capacity
- building
- floor
- facilities

返回：
符合条件的会议室列表及可用片段。

### 创建预定
`POST /api/bookings`

请求体：
```json
{
  "subject": "项目评审会",
  "roomId": 101,
  "startTime": "2026-03-25T10:00:00+08:00",
  "endTime": "2026-03-25T11:00:00+08:00",
  "attendeeCount": 8,
  "remark": "需要投影"
}
```

### 取消预定
`POST /api/bookings/{id}/cancel`

### 获取我的预定
`GET /api/bookings/my`

### 管理员新增会议室
`POST /api/admin/rooms`

## 15. 与成功案例的对应经验
参考成熟产品实践，后端应重点支持以下能力：
- Google Workspace 风格的资源属性管理：楼宇、楼层、容量、设备、资源日历。
- Microsoft Teams Panels 风格的即时预定与在场景下快速状态判断。
- Robin 风格的空间利用率分析与资源推荐。

因此，后端不应只实现“增删改查”，而应同时具备：
1. 实时可用性计算  
2. 冲突强校验  
3. 规则可配置  
4. 通知与任务驱动  
5. 统计可追溯  

## 16. 测试建议
### 16.1 单元测试
- 时间冲突校验
- 规则校验
- 状态流转
- 权限判断

### 16.2 集成测试
- 创建预定完整流程
- 修改预定流程
- 取消预定流程
- 维护时间不可预定流程

### 16.3 并发测试
- 同一会议室同一时段并发抢占
- 高并发查询空闲会议室
- 大量提醒任务同时执行

## 17. 迭代路线
### 第一阶段
- 会议室管理
- 查询空闲会议室
- 创建/取消预定
- 我的预定
- 基础权限

### 第二阶段
- 修改预定
- 签到释放
- 通知中心
- 统计报表

### 第三阶段
- 审批流
- 日历同步
- 智能推荐
- 设备联动
- 多园区多组织支持

## 18. 参考资料
1. Google Workspace Admin Help: Create buildings, features & Calendar resources  
2. Google Workspace Admin Help: Share room and resource calendars  
3. Google Workspace Admin Help: Set up Google Calendar room booking suggestions  
4. Microsoft Learn: Teams Panels / Reserve a room from a Teams Panel  
5. Robin 官方产品资料：Room Scheduling / Resource Booking
