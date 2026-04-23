package com.meeting.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatsService {
    private static final List<String> EXCLUDED = List.of("CANCELED", "EXPIRED", "PENDING_APPROVAL", "REJECTED");
    private static final String EXCLUDED_SQL = "'CANCELED','EXPIRED','PENDING_APPROVAL','REJECTED'";

    private final JdbcTemplate jdbcTemplate;

    public StatsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getStats() {
        String today = LocalDate.now().toString();
        Integer totalRooms = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rooms", Integer.class);
        Integer availableRooms = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rooms WHERE status = 'AVAILABLE'", Integer.class);
        Integer todayBookings = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE DATE(start_time) = ? AND status NOT IN (" + EXCLUDED_SQL + ")",
                Integer.class,
                today
        );
        Double usedSlots = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM((julianday(end_time) - julianday(start_time)) * 24 * 2), 0) FROM bookings WHERE DATE(start_time) = ? AND status NOT IN (" + EXCLUDED_SQL + ")",
                Double.class,
                today
        );
        int roomCount = totalRooms == null ? 0 : totalRooms;
        double utilization = roomCount == 0 ? 0 : Math.round(((usedSlots == null ? 0 : usedSlots) / (roomCount * 14.0 * 2.0)) * 1000.0) / 10.0;
        Map<String, Object> data = new HashMap<>();
        data.put("totalRooms", totalRooms == null ? 0 : totalRooms);
        data.put("availableRooms", availableRooms == null ? 0 : availableRooms);
        data.put("todayBookings", todayBookings == null ? 0 : todayBookings);
        data.put("utilizationRate", utilization);
        data.put("weeklyData", getWeeklyStats());
        data.put("buildingData", getBuildingStats());
        data.put("roomsUsage", getRoomUsageRanking());
        return data;
    }

    public List<Map<String, Object>> getWeeklyStats() {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] dayNames = {"周一", "周二", "周三", "周四", "周五", "周六", "周日"};
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            Integer bookings = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM bookings WHERE DATE(start_time) = ? AND status NOT IN (" + EXCLUDED_SQL + ")",
                    Integer.class,
                    day.toString()
            );
            Integer roomCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rooms", Integer.class);
            Double used = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(SUM((julianday(end_time) - julianday(start_time)) * 24 * 2), 0) FROM bookings WHERE DATE(start_time) = ? AND status NOT IN (" + EXCLUDED_SQL + ")",
                    Double.class,
                    day.toString()
            );
            double util = roomCount == null || roomCount == 0 ? 0 : Math.round(((used == null ? 0 : used) / (roomCount * 14.0 * 2.0)) * 1000.0) / 10.0;
            result.add(Map.of(
                    "day", dayNames[(day.getDayOfWeek().getValue() - 1) % 7],
                    "bookings", bookings == null ? 0 : bookings,
                    "utilization", util
            ));
        }
        return result;
    }

    public List<Map<String, Object>> getBuildingStats() {
        return jdbcTemplate.queryForList("""
                SELECT r.building,
                       COUNT(b.id) AS bookings,
                       COALESCE(SUM((julianday(b.end_time) - julianday(b.start_time)) * 24 * 2), 0) AS used_slots
                FROM rooms r
                LEFT JOIN bookings b ON r.id = b.room_id AND b.status NOT IN ('CANCELED','EXPIRED','PENDING_APPROVAL','REJECTED')
                GROUP BY r.building
                """).stream().map(row -> Map.of(
                "building", row.get("building"),
                "bookings", row.get("bookings"),
                "rate", Math.round(((row.get("used_slots") == null ? 0.0 : ((Number) row.get("used_slots")).doubleValue()) / (14.0 * 2.0 * 7.0)) * 1000.0) / 10.0
        )).toList();
    }

    public List<Map<String, Object>> getRoomUsageRanking() {
        String weekAgo = LocalDate.now().minusDays(7).format(DateTimeFormatter.ISO_DATE);
        return jdbcTemplate.queryForList("""
                SELECT r.id, r.name, r.building, r.floor, r.capacity, r.status,
                       COUNT(b.id) AS bookings,
                       COALESCE(SUM((julianday(b.end_time) - julianday(b.start_time)) * 24), 0) AS hours
                FROM rooms r
                LEFT JOIN bookings b ON r.id = b.room_id
                  AND b.status NOT IN ('CANCELED','EXPIRED','PENDING_APPROVAL','REJECTED')
                  AND DATE(b.start_time) >= ?
                GROUP BY r.id
                ORDER BY bookings DESC
                """, weekAgo).stream().map(row -> {
            double hours = row.get("hours") == null ? 0.0 : ((Number) row.get("hours")).doubleValue();
            Map<String, Object> item = new HashMap<>(row);
            item.put("hours", Math.round(hours * 10.0) / 10.0);
            item.put("rate", Math.min(Math.round((hours / 40.0) * 1000.0) / 10.0, 100.0));
            return item;
        }).toList();
    }
}
