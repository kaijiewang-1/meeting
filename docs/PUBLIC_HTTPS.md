# 公网 HTTPS 访问（一点即开前端）

本项目已支持 **Flask 单端口同时提供前端页面与 `/api`**。你只要把本机的 **5000 端口** 映射到一个带 **HTTPS** 的公网地址，浏览器打开该地址即可进入登录页（与本地 `http://127.0.0.1:5000` 等价）。

> **说明**：我无法替你生成一个永久固定的公网域名。下面的 **具体链接** 需要你在自己电脑上执行隧道命令后，从终端输出里复制（每次临时隧道域名可能不同；固定域名需购买域名并配置 Cloudflare Tunnel 命名隧道等）。

---

## 第一步：启动应用（仓库根目录或 backend 目录）

```powershell
cd e:\code\meeting\backend
$env:FLASK_DEBUG = '0'   # 暴露公网时建议关闭调试
python app.py
```

保持该窗口运行，本机可先访问：**http://127.0.0.1:5000** 确认正常。

---

## 方案 A：Cloudflare Tunnel（推荐，免费 HTTPS）

1. 安装 [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)（Windows 可下载 exe 并加入 PATH）。
2. **再开一个终端**，执行：

```powershell
cloudflared tunnel --url http://127.0.0.1:5000
```

3. 终端里会出现一行类似：

```text
https://random-words-here.trycloudflare.com
```

**这就是你要的「具体链接」**：用浏览器（含手机）打开它 → 直接进入前端登录页，API 自动走同域 `/api`（前端 `api.js` 已使用 `window.location.origin`）。

- 关闭 `cloudflared` 后该链接失效；下次运行会换新的子域名。
- 需要固定子域名：使用 Cloudflare 账号配置「命名隧道」并绑定自己的域名（见官方文档）。

---

## 方案 B：ngrok

1. 注册 [ngrok](https://ngrok.com/) 并安装 CLI，配置 authtoken。
2. 启动本应用后执行：

```powershell
ngrok http http://127.0.0.1:5000
```

3. 在 ngrok 控制台或终端输出里复制 **`https://xxxx.ngrok-free.app`**（以实际为准），在浏览器打开即可。

---

## 本地仍用「只开前端 + 单独后端」时

若你继续用 `front` 的 `python -m http.server` 且 API 在 `5000` 端口，可在浏览器控制台执行一次：

```javascript
localStorage.setItem('MEETING_API_BASE', 'http://127.0.0.1:5000/api');
location.reload();
```

清除覆盖：

```javascript
localStorage.removeItem('MEETING_API_BASE');
location.reload();
```

---

## 安全提示

- 公网暴露前务必将 **`FLASK_DEBUG` 设为 `0`**，不要使用生产环境弱口令与默认 JWT 密钥；正式环境请改 `config.py` 或环境变量中的密钥与数据库路径。
- `trycloudflare` / 免费 ngrok 链接可被他人猜中或扫描，仅适合演示；正式使用请加固鉴权、限流与 HTTPS 证书管理。
