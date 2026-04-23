package com.meeting.backend.service;

import com.meeting.backend.common.RequestUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class RoomService {
    private static final List<String> OCCUPYING_STATUSES = List.of("PENDING_APPROVAL", "BOOKED", "CHECKED_IN", "IN_USE");

    private final JdbcTemplate jdbcTemplate;

    public RoomService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> getAllRooms(Map<String, Object> filters, RequestUser user) {
        StringBuilder sql = new StringBuilder("""
                SELECT r.*, GROUP_CONCAT(rf.facility_code) AS facilities,
                       MAX(ap.name) AS approver_name
                FROM rooms r
                LEFT JOIN room_facilities rf ON r.id = rf.room_id
                LEFT JOIN users ap ON r.approver_user_id = ap.id
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();
        if (filters != null) {
            if (filters.get("building") != null && !String.valueOf(filters.get("building")).isBlank()) {
                sql.append(" AND r.building = ?");
                params.add(filters.get("building"));
            }
            if (filters.get("floor") != null && !String.valueOf(filters.get("floor")).isBlank()) {
                sql.append(" AND r.floor = ?");
                params.add(filters.get("floor"));
            }
            if (filters.get("capacity") != null && !String.valueOf(filters.get("capacity")).isBlank()) {
                sql.append(" AND r.capacity >= ?");
                params.add(Integer.parseInt(String.valueOf(filters.get("capacity"))));
            }
            if (filters.get("status") != null && !String.valueOf(filters.get("status")).isBlank()) {
                sql.append(" AND r.status = ?");
                params.add(filters.get("status"));
            }
            if (filters.get("facilities") instanceof List<?> facilities) {
                for (Object facility : facilities) {
                    sql.append(" AND r.id IN (SELECT room_id FROM room_facilities WHERE facility_code = ?)");
                    params.add(facility);
                }
            }
        }
        sql.append(" GROUP BY r.id ORDER BY r.building, r.floor, r.name");
        List<Map<String, Object>> rooms = jdbcTemplate.queryForList(sql.toString(), params.toArray()).stream()
                .map(this::normalizeRoom)
                .toList();
        List<Map<String, Object>> visible = user != null && !user.isAdmin()
                ? rooms.stream().filter(room -> userMayAccessRoom(user, room)).toList()
                : rooms;
        if (filters != null && filters.get("date") != null && filters.get("start") != null && filters.get("end") != null) {
            return visible.stream()
                    .filter(room -> !isRoomConflicted(((Number) room.get("id")).longValue(), String.valueOf(filters.get("date")), String.valueOf(filters.get("start")), String.valueOf(filters.get("end"))))
                    .filter(room -> !isRoomInMaintenance(((Number) room.get("id")).longValue(), String.valueOf(filters.get("date")), String.valueOf(filters.get("start")), String.valueOf(filters.get("end"))))
                    .toList();
        }
        return visible;
    }

    public Map<String, Object> getRoomById(long roomId, RequestUser user) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT r.*, GROUP_CONCAT(rf.facility_code) AS facilities,
                       MAX(ap.name) AS approver_name
                FROM rooms r
                LEFT JOIN room_facilities rf ON r.id = rf.room_id
                LEFT JOIN users ap ON r.approver_user_id = ap.id
                WHERE r.id = ?
                GROUP BY r.id
                """, roomId);
        if (rows.isEmpty()) {
            return null;
        }
        Map<String, Object> room = normalizeRoom(rows.get(0));
        if (user != null && !userMayAccessRoom(user, room)) {
            return null;
        }
        return room;
    }

    public List<Map<String, Object>> getAvailableRooms(Map<String, Object> filters, RequestUser user) {
        Map<String, Object> merged = new HashMap<>(Objects.requireNonNullElse(filters, Map.of()));
        merged.put("status", "AVAILABLE");
        return getAllRooms(merged, user);
    }

    public List<Map<String, Object>> getRoomSchedule(long roomId, String date) {
        return jdbcTemplate.queryForList("""
                SELECT b.*, u.name AS organizer_name
                FROM bookings b
                LEFT JOIN users u ON b.organizer_id = u.id
                WHERE b.room_id = ?
                  AND DATE(b.start_time) = ?
                  AND b.status NOT IN ('CANCELED', 'EXPIRED', 'REJECTED')
                ORDER BY b.start_time
                """, roomId, date);
    }

    public boolean userMayAccessRoom(RequestUser user, Map<String, Object> room) {
        if (user == null || room == null) {
            return false;
        }
        if (user.isAdmin()) {
            return true;
        }
        String scope = String.valueOf(room.getOrDefault("visibility_scope", "ALL"));
        if (!"COLLEGES".equalsIgnoreCase(scope)) {
            return true;
        }
        List<String> colleges = getVisibleCollegeCodes(((Number) room.get("id")).longValue());
        if (colleges.isEmpty()) {
            return false;
        }
        return colleges.contains(user.collegeCode());
    }

    public List<String> getVisibleCollegeCodes(long roomId) {
        return jdbcTemplate.queryForList(
                "SELECT college_code FROM room_visible_colleges WHERE room_id = ? ORDER BY college_code",
                String.class,
                roomId
        );
    }

    public Map<String, Object> createRoom(Map<String, Object> data) {
        jdbcTemplate.update("""
                INSERT INTO rooms (name, building, floor, capacity, status, description, open_hours,
                                   weekday_open_hours, weekend_open_hours, image, requires_approval,
                                   approver_user_id, visibility_scope)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                data.get("name"),
                data.get("building"),
                data.get("floor"),
                Integer.parseInt(String.valueOf(data.get("capacity"))),
                data.getOrDefault("status", "AVAILABLE"),
                data.getOrDefault("description", ""),
                data.getOrDefault("open_hours", "08:00-22:00"),
                data.getOrDefault("weekday_open_hours", "08:00-18:00"),
                data.getOrDefault("weekend_open_hours", "09:00-17:00"),
                data.getOrDefault("image", "🏢"),
                asFlag(data.get("requires_approval")),
                data.get("approver_user_id"),
                data.getOrDefault("visibility_scope", "ALL")
        );
        long roomId = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);
        replaceFacilities(roomId, (List<?>) data.get("facilities"));
        replaceVisibleColleges(roomId, data.get("visibility_scope"), (List<?>) data.get("visible_colleges"));
        return getRoomById(roomId, null);
    }

    public Map<String, Object> updateRoom(long roomId, Map<String, Object> data) {
        if (getRoomById(roomId, null) == null) {
            return null;
        }
        List<String> sets = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        for (String field : List.of("name", "building", "floor", "capacity", "status", "description", "open_hours", "weekday_open_hours", "weekend_open_hours", "image", "visibility_scope")) {
            if (data.containsKey(field)) {
                sets.add(field + " = ?");
                params.add(data.get(field));
            }
        }
        if (data.containsKey("requires_approval")) {
            sets.add("requires_approval = ?");
            params.add(asFlag(data.get("requires_approval")));
        }
        if (data.containsKey("approver_user_id")) {
            sets.add("approver_user_id = ?");
            params.add(data.get("approver_user_id"));
        }
        if (!sets.isEmpty()) {
            sets.add("updated_at = datetime('now')");
            params.add(roomId);
            jdbcTemplate.update("UPDATE rooms SET " + String.join(", ", sets) + " WHERE id = ?", params.toArray());
        }
        if (data.containsKey("facilities")) {
            replaceFacilities(roomId, (List<?>) data.get("facilities"));
        }
        if (data.containsKey("visible_colleges") || data.containsKey("visibility_scope")) {
            replaceVisibleColleges(roomId, data.getOrDefault("visibility_scope", getRoomById(roomId, null).get("visibility_scope")), (List<?>) data.get("visible_colleges"));
        }
        return getRoomById(roomId, null);
    }

    public void deleteRoom(long roomId) {
        jdbcTemplate.update("DELETE FROM rooms WHERE id = ?", roomId);
    }

    public boolean isRoomConflicted(long roomId, String date, String start, String end) {
        return isBookingConflict(roomId, date + "T" + start + ":00", date + "T" + end + ":00", null);
    }

    public boolean isBookingConflict(long roomId, String startTime, String endTime, Long excludeBookingId) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*) FROM bookings
                WHERE room_id = ?
                  AND status IN ('PENDING_APPROVAL', 'BOOKED', 'CHECKED_IN', 'IN_USE')
                  AND start_time < ?
                  AND end_time > ?
                """);
        List<Object> params = new ArrayList<>(List.of(roomId, endTime, startTime));
        if (excludeBookingId != null) {
            sql.append(" AND id != ?");
            params.add(excludeBookingId);
        }
        Integer count = jdbcTemplate.queryForObject(sql.toString(), Integer.class, params.toArray());
        return count != null && count > 0;
    }

    public boolean isRoomInMaintenance(long roomId, String date, String start, String end) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM room_maintenance
                WHERE room_id = ?
                  AND start_time < ?
                  AND end_time > ?
                """, Integer.class, roomId, date + "T" + end + ":00", date + "T" + start + ":00");
        return count != null && count > 0;
    }

    private Map<String, Object> normalizeRoom(Map<String, Object> row) {
        Map<String, Object> room = new HashMap<>(row);
        String facilities = row.get("facilities") == null ? "" : String.valueOf(row.get("facilities"));
        room.put("facilities", facilities.isBlank() ? List.of() : List.of(facilities.split(",")));
        room.put("visible_colleges", getVisibleCollegeCodes(((Number) row.get("id")).longValue()));
        return room;
    }

    private void replaceFacilities(long roomId, List<?> facilities) {
        jdbcTemplate.update("DELETE FROM room_facilities WHERE room_id = ?", roomId);
        if (facilities == null) {
            return;
        }
        for (Object facility : facilities) {
            jdbcTemplate.update("INSERT INTO room_facilities (room_id, facility_code) VALUES (?, ?)", roomId, facility);
        }
    }

    private void replaceVisibleColleges(long roomId, Object visibilityScope, List<?> colleges) {
        jdbcTemplate.update("DELETE FROM room_visible_colleges WHERE room_id = ?", roomId);
        if (!"COLLEGES".equalsIgnoreCase(String.valueOf(visibilityScope)) || colleges == null) {
            return;
        }
        for (Object college : colleges) {
            String code = String.valueOf(college).trim();
            if (!code.isBlank()) {
                jdbcTemplate.update(
                        "INSERT OR IGNORE INTO room_visible_colleges (room_id, college_code) VALUES (?, ?)",
                        roomId, code
                );
            }
        }
    }

    private int asFlag(Object value) {
        return Boolean.parseBoolean(String.valueOf(value)) || "1".equals(String.valueOf(value)) ? 1 : 0;
    }
}
