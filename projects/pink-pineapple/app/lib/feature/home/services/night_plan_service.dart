import 'dart:convert';
import 'dart:developer';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

/// Client wrapper around the /night-plans API. Mirrors the backend
/// NightPlan model from backend/prisma/schema.prisma.
///
/// Failures are intentionally swallowed — Plan My Night still works
/// from local cache even if the server can't be reached. Network
/// errors are logged for debugging but never break the user flow.
class NightPlanService {
  static final _net = NetworkConfigV1();

  /// Persist a freshly built itinerary to the backend. Returns the
  /// server-side plan id on success, null on failure.
  ///
  /// Stops use the canonical backend shape — see NightPlan.service.ts.
  static Future<String?> createPlan({
    required String vibe,
    required DateTime eventDate,
    required List<Map<String, dynamic>> stops,
  }) async {
    try {
      final payload = {
        'vibe': vibe,
        'eventDate': eventDate.toIso8601String(),
        'stops': stops,
      };
      final response = await _net.ApiRequestHandler(
        RequestMethod.POST,
        Urls.nightPlans,
        json.encode(payload),
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final data = response['data'] as Map<String, dynamic>?;
        return data?['id']?.toString();
      }
    } catch (e) {
      log('NightPlanService.createPlan failed: $e');
    }
    return null;
  }

  /// Fetch the user's saved plans, most recent first. Server lazy-archives
  /// past plans, so the first ACTIVE entry whose eventDate is today is
  /// "tonight's plan".
  static Future<List<Map<String, dynamic>>> listMyPlans() async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.GET,
        '${Urls.nightPlans}/mine',
        null,
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        final data = response['data'];
        if (data is List) {
          return data
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      }
    } catch (e) {
      log('NightPlanService.listMyPlans failed: $e');
    }
    return [];
  }

  /// Returns just the currently-active plan whose eventDate is today,
  /// or null if no such plan exists. Powers the "Tonight's plan"
  /// pinned banner on the My Bookings screen.
  static Future<Map<String, dynamic>?> findTonightPlan() async {
    final plans = await listMyPlans();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    for (final plan in plans) {
      if (plan['status'] != 'ACTIVE') continue;
      final dateStr = plan['eventDate']?.toString() ?? '';
      final dt = DateTime.tryParse(dateStr);
      if (dt == null) continue;
      final planDay = DateTime(dt.year, dt.month, dt.day);
      if (planDay == today) return plan;
    }
    return null;
  }

  /// Update a plan — most commonly used to mark a stop's `booked` flag
  /// after the user actually commits at a venue.
  static Future<bool> updatePlan({
    required String id,
    Map<String, dynamic>? changes,
  }) async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.PATCH,
        '${Urls.nightPlans}/$id',
        json.encode(changes ?? const {}),
        is_auth: true,
      );
      return response != null && response['success'] == true;
    } catch (e) {
      log('NightPlanService.updatePlan failed: $e');
      return false;
    }
  }

  static Future<bool> deletePlan(String id) async {
    try {
      final response = await _net.ApiRequestHandler(
        RequestMethod.DELETE,
        '${Urls.nightPlans}/$id',
        null,
        is_auth: true,
      );
      return response != null && response['success'] == true;
    } catch (e) {
      log('NightPlanService.deletePlan failed: $e');
      return false;
    }
  }
}
