#!/usr/bin/env python3
"""
会议室后端 — 多并发 HTTP 压测（标准库，无需 pip install requests）

用法（先启动 backend: python app.py）:
  python backend/scripts/load_test_concurrent.py
  python backend/scripts/load_test_concurrent.py --workers 50 --total 500 --scenario rooms
  python backend/scripts/load_test_concurrent.py --base-url http://127.0.0.1:5000 --username admin

说明:
  - SQLite + Flask 开发服务器并非为高并发设计；本脚本用于观察延迟分布、错误率与瓶颈体感。
  - 生产环境请使用 gunicorn/uwsgi + 连接池数据库后再做同类测试。
"""
from __future__ import annotations

import argparse
import json
import ssl
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

# 仓库根目录下执行 或 从任意路径执行均可
DEFAULT_BASE = "http://127.0.0.1:5000"


def _json_request(
    method: str,
    url: str,
    *,
    data: dict | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 60.0,
) -> tuple[bool, int | str, float, Any]:
    t0 = time.perf_counter()
    h = dict(headers or {})
    body_bytes = None
    if data is not None:
        body_bytes = json.dumps(data).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body_bytes, method=method, headers=h)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read()
            elapsed = time.perf_counter() - t0
            try:
                parsed = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                parsed = raw[:500]
            return True, resp.status, elapsed, parsed
    except urllib.error.HTTPError as e:
        elapsed = time.perf_counter() - t0
        try:
            parsed = json.loads(e.read().decode("utf-8"))
        except Exception:
            parsed = e.reason
        return False, e.code, elapsed, parsed
    except Exception as e:
        elapsed = time.perf_counter() - t0
        return False, str(e), elapsed, None


def login(base: str, username: str, password: str) -> str | None:
    url = f"{base.rstrip('/')}/api/auth/login"
    ok, code, elapsed, body = _json_request("POST", url, data={"username": username, "password": password})
    if not ok or not isinstance(body, dict):
        print(f"[登录失败] HTTP {code} {body} ({elapsed*1000:.1f} ms)")
        return None
    if body.get("code") != 0:
        print(f"[登录失败] 业务码 {body.get('code')} {body.get('message')}")
        return None
    token = (body.get("data") or {}).get("token")
    if not token:
        print("[登录失败] 响应无 token")
        return None
    print(f"[登录成功] user={username} ({elapsed*1000:.1f} ms)")
    return token


def percentile(sorted_ms: list[float], p: float) -> float:
    if not sorted_ms:
        return 0.0
    k = (len(sorted_ms) - 1) * p / 100.0
    f = int(k)
    c = min(f + 1, len(sorted_ms) - 1)
    if f == c:
        return sorted_ms[f]
    return sorted_ms[f] + (sorted_ms[c] - sorted_ms[f]) * (k - f)


def run_health(base: str, _: str | None) -> tuple[bool, int | str, float, Any]:
    url = f"{base.rstrip('/')}/api/health"
    return _json_request("GET", url)


def run_rooms(base: str, token: str | None) -> tuple[bool, int | str, float, Any]:
    url = f"{base.rstrip('/')}/api/rooms"
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return _json_request("GET", url, headers=h)


def run_rooms_available(base: str, token: str | None) -> tuple[bool, int | str, float, Any]:
    url = f"{base.rstrip('/')}/api/rooms/available?date=2099-01-01&startTime=10:00&endTime=11:00"
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return _json_request("GET", url, headers=h)


def run_my_bookings(base: str, token: str | None) -> tuple[bool, int | str, float, Any]:
    url = f"{base.rstrip('/')}/api/bookings/my"
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return _json_request("GET", url, headers=h)


SCENARIOS = {
    "health": run_health,
    "rooms": run_rooms,
    "available": run_rooms_available,
    "my": run_my_bookings,
}


def mixed_fn(base: str, token: str | None, i: int):
    fn = (run_health, run_rooms, run_rooms_available)[i % 3]
    return fn(base, token)


def main() -> int:
    p = argparse.ArgumentParser(description="Flask API 并发压测")
    p.add_argument("--base-url", default=DEFAULT_BASE, help="服务根 URL，无尾斜杠")
    p.add_argument("--workers", type=int, default=30, help="并发线程数")
    p.add_argument("--total", type=int, default=300, help="总请求数")
    p.add_argument(
        "--scenario",
        choices=list(SCENARIOS.keys()) + ["mixed"],
        default="rooms",
        help="health=无需登录; rooms/available/my 需登录; mixed=三种读请求轮换",
    )
    p.add_argument("--username", default="user", help="登录用户名")
    p.add_argument("--password", default="123456", help="登录密码")
    args = p.parse_args()
    base = args.base_url.rstrip("/")

    token: str | None = None
    if args.scenario != "health":
        token = login(base, args.username, args.password)
        if not token:
            return 1

    if args.scenario == "mixed":

        def task(i: int):
            return mixed_fn(base, token, i)
    else:
        fn = SCENARIOS[args.scenario]

        def task(_: int):
            return fn(base, token)

    print(
        f"\n压测: base={base} scenario={args.scenario} workers={args.workers} total={args.total}\n"
    )
    t_wall0 = time.perf_counter()
    latencies_ms: list[float] = []
    ok_count = 0
    fail_count = 0
    err_samples: dict[str, int] = {}

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(task, i) for i in range(args.total)]
        for fut in as_completed(futures):
            ok, code, elapsed, body = fut.result()
            ms = elapsed * 1000.0
            latencies_ms.append(ms)
            if ok:
                if isinstance(body, dict) and body.get("code") == 0:
                    ok_count += 1
                else:
                    fail_count += 1
                    key = f"HTTP业务异常 code={body.get('code') if isinstance(body, dict) else body}"
                    err_samples[key] = err_samples.get(key, 0) + 1
            else:
                fail_count += 1
                key = f"fail HTTP/异常 {code}"
                err_samples[key] = err_samples.get(key, 0) + 1

    wall = time.perf_counter() - t_wall0
    latencies_ms.sort()
    n = len(latencies_ms)

    def pct(q: float) -> float:
        return percentile(latencies_ms, q)

    rps = args.total / wall if wall > 0 else 0

    print("—— 结果 ——")
    print(f"   wall 时间:     {wall:.3f} s")
    print(f"  吞吐:          {rps:.1f} req/s")
    print(f"  成功(业务code=0): {ok_count}")
    print(f"  失败:          {fail_count}")
    if n:
        print(f"  延迟 ms — min / p50 / p95 / p99 / max: {latencies_ms[0]:.1f} / {pct(50):.1f} / {pct(95):.1f} / {pct(99):.1f} / {latencies_ms[-1]:.1f}")
        if n > 1:
            try:
                print(f"  延迟 ms — mean / stdev: {statistics.mean(latencies_ms):.1f} / {statistics.stdev(latencies_ms):.1f}")
            except statistics.StatisticsError:
                pass
    if err_samples:
        print("  错误样本统计:")
        for k, v in sorted(err_samples.items(), key=lambda x: -x[1])[:12]:
            print(f"    {v}x  {k}")

    if fail_count > args.total * 0.01:
        print("\n[提示] 失败率较高时常见原因: SQLite 锁、开发服务器单进程、超时过短。")
    return 0 if fail_count == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
