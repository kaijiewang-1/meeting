# 会议室预定系统 - 后端

基于 Flask + SQLite 的会议室预定系统后端，实现前后端数据互通。

## 技术栈

- **Web 框架**：Flask
- **数据库**：SQLite（零配置，无需安装数据库服务）
- **认证**：PyJWT（Token 签发与校验）
- **跨域**：Flask-CORS
- **依赖**：Flask, Flask-CORS, PyJWT, Werkzeug

## 快速启动

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

**Windows：**
```bash
start.bat
```

**Linux/macOS：**
```bash
chmod +x run.sh
./run.sh
```

后端地址：`http://127.0.0.1:5000`  
前端地址：`http://127.0.0.1:5500/front/index.html`

> 前端需用浏览器手动打开（或安装 VS Code Live Server 打开 `front/index.html`）

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | `user` | `123456` |
| 管理员 | `admin` | `123456` |

## API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |

### 会议室
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/rooms` | 获取所有会议室 |
| GET | `/api/rooms/available` | 查询可用会议室 |
| GET | `/api/rooms/:id` | 获取会议室详情 |
| GET | `/api/rooms/:id/schedule` | 获取会议室排期 |

### 预定
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bookings` | 创建预定 |
| GET | `/api/bookings/my` | 获取我的预定 |
| POST | `/api/bookings/:id/cancel` | 取消预定 |
| POST | `/api/bookings/:id/check-in` | 签到 |

### 管理端
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/rooms` | 会议室列表 |
| POST | `/api/admin/rooms` | 新增会议室 |
| PUT | `/api/admin/rooms/:id` | 更新会议室 |
| DELETE | `/api/admin/rooms/:id` | 删除会议室 |
| GET | `/api/admin/bookings` | 所有预定记录 |
| GET | `/api/admin/stats` | 统计数据 |

## 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

错误码：
- `0` - 成功
- `40001` - 参数错误
- `40101` - 未登录
- `40301` - 无权限
- `40401` - 资源不存在
- `40901` - 会议室时间冲突
- `40902` - 会议室不可用
- `40903` - 参会人数超限

## 项目结构

```
backend/
├── app.py              # Flask 入口
├── config.py           # 配置文件
├── database.py        # 数据库初始化
├── requirements.txt   # Python 依赖
├── start.bat          # Windows 启动脚本
├── run.sh             # Linux/macOS 启动脚本
├── auth.py            # 认证模块（JWT）
├── routes/
│   ├── auth_routes.py     # 认证路由
│   ├── room_routes.py    # 会议室路由
│   ├── booking_routes.py # 预定路由
│   └── admin_routes.py   # 管理端路由
└── services/
    ├── room_service.py    # 会议室服务
    ├── booking_service.py # 预定服务（冲突检测、规则校验）
    └── stats_service.py   # 统计服务
```

## 核心功能

- **冲突检测**：同一会议室同一时段不支持重复预定（SQL 唯一性 + 事务保证）
- **规则校验**：预定时长限制、营业时间限制、容量检查、提前天数限制
- **JWT 鉴权**：所有业务接口需要 Bearer Token
- **RBAC 权限**：普通用户 / 管理员权限分离
- **操作日志**：关键操作记录可追溯
