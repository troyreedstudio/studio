/// 24-hour → 12-hour time formatting for venue schedules + Featured Events.
///
/// Tourists (our target user) read "1 AM" natively but stumble on "01:00".
/// Backend stores 24-hour strings ("18:00", "05:00") because that's how
/// Bali venues post on Google Places and Instagram. This converts at the
/// render boundary only — no schema change.
///
/// Pass-through behaviour: any string that isn't recognisable HH:MM is
/// returned unchanged. So Plan My Night, which already stores times as
/// "10:00 PM" / "12:00 AM" strings, won't get double-formatted.
library;

/// "HH:MM" → "h:mm AM/PM". Drops the ":00" minute for cleaner display.
/// "00:00" → "12 AM" (midnight). "12:00" → "12 PM" (noon).
String formatTimeAmPm(String? raw) {
  if (raw == null || raw.isEmpty) return "";
  final t = raw.trim();
  // Already AM/PM or unknown shape — leave it.
  if (t.toUpperCase().contains("AM") || t.toUpperCase().contains("PM")) {
    return t;
  }
  final m = RegExp(r"^(\d{1,2}):(\d{2})$").firstMatch(t);
  if (m == null) return t;
  final h24 = int.tryParse(m.group(1)!) ?? -1;
  final mins = int.tryParse(m.group(2)!) ?? -1;
  if (h24 < 0 || h24 > 23 || mins < 0 || mins > 59) return t;
  final period = h24 < 12 ? "AM" : "PM";
  final h12 = h24 % 12 == 0 ? 12 : h24 % 12;
  if (mins == 0) return "$h12 $period";
  return "$h12:${mins.toString().padLeft(2, '0')} $period";
}

/// "18:00" + "01:00" → "6 PM – 1 AM". Either side may already be AM/PM.
/// End-time optional/empty → returns just the formatted start.
String formatTimeRangeAmPm(String? start, String? end) {
  final s = formatTimeAmPm(start);
  final e = formatTimeAmPm(end);
  if (s.isEmpty) return e;
  if (e.isEmpty) return s;
  return "$s – $e";
}
