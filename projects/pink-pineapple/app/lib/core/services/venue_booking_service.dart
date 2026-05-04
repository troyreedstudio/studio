import 'dart:convert';

import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

/// Records a "Book" tap and returns the attributed redirect URL.
///
/// The backend logs every click in venue_booking_clicks (with venueId,
/// userId if signed in, source, provider, deviceId, timestamp) and
/// appends Pink Pineapple attribution to the destination URL so the
/// venue's own analytics show "pinkpineapple" as the traffic source.
///
/// Use the returned [redirectUrl] for the actual user redirect — NOT
/// the raw venue.bookingUrl — so we get attribution + click tracking.
class VenueBookingService {
  VenueBookingService._();

  static final Logger _logger = Logger();
  static final NetworkConfigV1 _net = NetworkConfigV1();

  /// Returns the attributed redirect URL, or `null` if the call failed.
  /// Falls back to caller logic in that case (open the raw bookingUrl).
  ///
  /// [dayKey] — short day name like 'mon' for venues with per-day URL
  /// routing (Mesa). Optional; the backend will use the main bookingUrl
  /// when no daily override matches.
  ///
  /// [source] — defaults to 'MOBILE_APP'. Other values: 'DASHBOARD'.
  static Future<String?> recordClick({
    required String venueId,
    String? dayKey,
    String source = 'MOBILE_APP',
    String deviceId = '',
  }) async {
    try {
      final url = '${Urls.venueBookingClick}/$venueId/booking-click';
      final body = jsonEncode({
        'source': source,
        if (dayKey != null && dayKey.isNotEmpty) 'dayKey': dayKey,
        if (deviceId.isNotEmpty) 'deviceId': deviceId,
      });
      final response = await _net.ApiRequestHandler(
        RequestMethod.POST,
        url,
        body,
        is_auth: true, // sends auth header if signed in; backend uses optionalAuth
      );

      if (response != null && response['success'] == true) {
        final data = response['data'];
        if (data is Map && data['redirectUrl'] is String) {
          final r = data['redirectUrl'] as String;
          _logger.d('Booking click tracked → $r');
          return r;
        }
      }
      _logger.w('Booking click endpoint returned non-success: $response');
    } catch (e, st) {
      _logger.e('Booking click tracking failed: $e', error: e, stackTrace: st);
    }
    return null;
  }

  /// Map server-side day-of-week (0=Sunday) into the short keys the
  /// backend uses ('mon', 'tue', ...). Pass DateTime.now().weekday for
  /// "today's URL" routing on venues like Mesa.
  static String dayKeyFromWeekday(int weekday) {
    // DateTime.weekday: Monday=1 ... Sunday=7
    const map = {1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun'};
    return map[weekday] ?? 'mon';
  }
}
