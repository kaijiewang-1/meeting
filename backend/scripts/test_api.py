"""
会议室 API 集成测试（Flask test_client，无需起独立 HTTP 进程）。
用法：在仓库根目录执行  python backend/scripts/test_api.py
"""
import os
import sys
from datetime import datetime, timedelta

# 保证可导入 backend 包内模块（与 app.py 一致）
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app import app  # noqa: E402


def _json(res):
    return res.get_json(silent=True)


def _hdr(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def main():
    client = app.test_client()
    failures = []

    def step(name, cond, detail=''):
        if not cond:
            failures.append(f'{name}: {detail}')

    # health
    r = client.get('/api/health')
    j = _json(r)
    step('health', r.status_code == 200 and j and j.get('code') == 0, j)

    # rooms without auth
    r = client.get('/api/rooms')
    step('rooms_no_auth', r.status_code == 401, r.status_code)

    # login fail
    r = client.post('/api/auth/login', json={'username': 'user', 'password': 'wrong'})
    j = _json(r)
    step('login_fail', j and j.get('code') == 40101, j)

    # login user
    r = client.post('/api/auth/login', json={'username': 'user', 'password': '123456'})
    j = _json(r)
    step('login_user', j and j.get('code') == 0 and j.get('data', {}).get('token'), j)
    user_token = j['data']['token']

    # login admin
    r = client.post('/api/auth/login', json={'username': 'admin', 'password': '123456'})
    j = _json(r)
    step('login_admin', j and j.get('code') == 0, j)
    admin_token = j['data']['token']

    h_user = _hdr(user_token)
    h_admin = _hdr(admin_token)

    # user cannot admin stats
    r = client.get('/api/admin/stats', headers=h_user)
    step('admin_stats_forbidden', r.status_code == 403, r.status_code)

    # rooms list
    r = client.get('/api/rooms', headers=h_user)
    j = _json(r)
    step('rooms_list', j and j.get('code') == 0 and isinstance(j.get('data'), list), j)

    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    r = client.get(
        f'/api/rooms?date={tomorrow}&startTime=10:00&endTime=11:00&facilities=projector',
        headers=h_user,
    )
    j = _json(r)
    step('rooms_slot_filter', j and j.get('code') == 0, j)

    # available
    r = client.get(
        f'/api/rooms/available?date={tomorrow}&startTime=10:00&endTime=11:00&capacity=4',
        headers=h_user,
    )
    j = _json(r)
    step('rooms_available', j and j.get('code') == 0, j)

    # room detail
    r = client.get('/api/rooms/1', headers=h_user)
    j = _json(r)
    step('room_detail', j and j.get('code') == 0 and j.get('data', {}).get('id') == 1, j)

    r = client.get('/api/rooms/999999', headers=h_user)
    j = _json(r)
    step('room_not_found', j and j.get('code') == 40401, j)

    today = datetime.now().strftime('%Y-%m-%d')
    r = client.get(f'/api/rooms/1/schedule?date={today}', headers=h_user)
    j = _json(r)
    step('room_schedule', j and j.get('code') == 0, j)

    # create booking (tomorrow 15:00–16:00 inside business hours)
    start = f'{tomorrow}T15:00:00'
    end = f'{tomorrow}T16:00:00'
    r = client.post(
        '/api/bookings',
        headers=h_user,
        json={
            'subject': 'API 自动化测试会议',
            'roomId': 1,
            'startTime': start,
            'endTime': end,
            'attendeeCount': 2,
            'remark': 'test_api.py',
        },
    )
    j = _json(r)
    step('create_booking', j and j.get('code') == 0 and j.get('data', {}).get('id'), j)
    booking_id = j['data']['id'] if j and j.get('data') else None

    r = client.get('/api/bookings/my', headers=h_user)
    j = _json(r)
    step('my_bookings', j and j.get('code') == 0, j)

    if booking_id:
        r = client.post(f'/api/bookings/{booking_id}/check-in', headers=h_user)
        j = _json(r)
        step('check_in', j and j.get('code') == 0, j)

    # 另建一条仅用于取消流程
    start2 = f'{tomorrow}T17:00:00'
    end2 = f'{tomorrow}T18:00:00'
    r = client.post(
        '/api/bookings',
        headers=h_user,
        json={
            'subject': 'API 取消测试',
            'roomId': 2,
            'startTime': start2,
            'endTime': end2,
            'attendeeCount': 1,
        },
    )
    j = _json(r)
    bid2 = j['data']['id'] if j and j.get('code') == 0 and j.get('data') else None
    step('create_booking_for_cancel', bid2 is not None, j)

    if bid2:
        r = client.post(f'/api/bookings/{bid2}/cancel', headers=h_user)
        j = _json(r)
        step('cancel_booking', j and j.get('code') == 0, j)

    # admin stats
    r = client.get('/api/admin/stats', headers=h_admin)
    j = _json(r)
    d = j.get('data') if j else None
    step(
        'admin_stats',
        j and j.get('code') == 0 and d and 'weeklyData' in d and 'totalRooms' in d,
        j,
    )

    r = client.get('/api/admin/rooms', headers=h_admin)
    j = _json(r)
    step('admin_rooms', j and j.get('code') == 0, j)

    r = client.get('/api/admin/bookings', headers=h_admin)
    j = _json(r)
    step('admin_bookings', j and j.get('code') == 0, j)

    r = client.post(
        '/api/admin/rooms',
        headers=h_admin,
        json={
            'name': '_api_test_room',
            'building': '总部大楼',
            'floor': '99F',
            'capacity': 4,
            'description': '自动化测试',
            'facilities': ['tv'],
            'status': 'AVAILABLE',
        },
    )
    j = _json(r)
    step('admin_create_room', j and j.get('code') == 0, j)
    new_room_id = j['data']['id'] if j and j.get('data') else None

    if new_room_id:
        r = client.put(
            f'/api/admin/rooms/{new_room_id}',
            headers=h_admin,
            json={'description': '自动化测试已更新', 'open_hours': '09:00-18:00'},
        )
        j = _json(r)
        step('admin_update_room', j and j.get('code') == 0, j)

        r = client.delete(f'/api/admin/rooms/{new_room_id}', headers=h_admin)
        j = _json(r)
        step('admin_delete_room', j and j.get('code') == 0, j)

    if failures:
        print('FAILED:')
        for f in failures:
            print(' -', f)
        sys.exit(1)
    print('OK: all API checks passed.')


if __name__ == '__main__':
    main()
