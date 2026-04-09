import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/home_bottom_nav/controller/home_nav_controller.dart';
import 'package:pineapple/feature/home_bottom_nav/ui/home_bottom_nav.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../event_details/model/event_details_model_saon.dart';
import '../../event_details/model/event_details_model.dart';

/// Simple view model for each fee row you show in the UI.
class ChargeLine {
  final String id;
  final String name;
  final double unitPrice;
  final int quantity;

  ChargeLine({
    required this.id,
    required this.name,
    required this.unitPrice,
    this.quantity = 1,
  });

  double get total => unitPrice * quantity;
}

class EventBookingCheckoutController extends GetxController {
  final logger = Logger();
  final netConfig = NetworkConfigV1();

  // Inputs
  final eventDetails = Rx<EventDetailsModel?>(null);

  /// If this is a table booking, we prefer to know WHICH table (id),
  /// and optionally its base (min spend) passed as `tableAmount`.
  final tableId = ''.obs;
  final tableName = "".obs;

  /// From previous page: total tickets (for both flows show the guest count)
  final totalTickets = 0.obs;

  /// Ticket flow base total (male/female admissions subtotal)
  final baseAmount = 0.0.obs;

  /// Table flow base total (often the minimum spend),
  /// we read it from args['tableAmount'] or derive from selected table’s min spend.
  final tableBaseAmount = 0.0.obs;

  /// Optional extra label you were using earlier
  final newBaseAmount = 0.0.obs;

  /// "TICKET" or "TABLE"
  final bookingType = "TICKET".obs;

  final numberOfMale = 0.obs;
  final numberOfFemale = 0.obs;

  /// Ticket identifiers
  final ticketID = "".obs;
  final eventID = "".obs;

  /// Selected charges as (Charge, qty). If empty we fallback to all charges (qty=1)
  final selectedCharges = <MapEntry<Charge, int>>[].obs;

  // Computed lines & totals (shared)
  final chargeLines = <ChargeLine>[].obs;
  final chargesTotal = 0.0.obs;

  // Final totals (separated for clarity)
  final finalTotal = 0.0.obs; // ticket path
  final tableFinalTotal = 0.0.obs; // table path

  // Formatting
  final _money = NumberFormat.currency(symbol: '\$');

  String fmt(double v) => _money.format(v);

  String get baseAmountText => fmt(baseAmount.value);

  String get tableBaseAmountText => fmt(tableBaseAmount.value);

  String get chargesTotalText => fmt(chargesTotal.value);

  String get finalTotalText =>
      fmt(isTableBooking ? tableFinalTotal.value : finalTotal.value);

  bool get isTableBooking => bookingType.value.toUpperCase() == 'TABLE';

  /// For your top summary card
  CheckoutBookingDetails? get bookingDetails {
    final e = eventDetails.value;
    if (e == null) return null;
    return CheckoutBookingDetails(
      bookingType: isTableBooking ? 'TABLE' : 'Event Tickets',
      guestCount: totalTickets.value,
      baseAmount: isTableBooking ? tableBaseAmount.value : baseAmount.value,
      isEarlyBird: true, // keep your own rule here
    );
  }

  @override
  void onInit() {
    super.onInit();

    final args = Get.arguments;
    if (args != null) {
      eventDetails.value = args['eventDetails'];
      // ticket flow money
      baseAmount.value = (args['totalAmount'] ?? 0.0) * 1.0;

      // table flow money (if passed)
      tableBaseAmount.value = (args['tableAmount'] ?? 0.0) * 1.0;

      newBaseAmount.value =
          (args['tableAmount'] ?? 0.0) * 1.0; // keep your label usage
      totalTickets.value = (args['totalGuest'] ?? 0) as int;
      bookingType.value = (args['bookingType'] ?? 'TICKET').toString();

      numberOfMale.value = args['maleTicket'] ?? 0;
      numberOfFemale.value = args['femaleTicket'] ?? 0;

      ticketID.value = args['ticketID'] ?? "";
      eventID.value = args['eventID'] ?? "";

      tableId.value = args['tableID'] ?? "";
      tableName.value = args['tableName'] ?? "";

      final sc = args['selectedCharges'];
      if (sc is List) {
        selectedCharges.value = List<MapEntry<Charge, int>>.from(sc);
      }
    }

    // If TABLE but no tableAmount was provided, try to fallback to selected table’s minimum spend
    _maybeSeedTableBaseFromModel();

    // Recompute when any input changes
    everAll([
      eventDetails,
      selectedCharges,
      baseAmount,
      tableBaseAmount,
      bookingType,
    ], (_) => _rebuild());
    _rebuild();
  }

  /// If TABLE and tableBaseAmount is 0, try to read it from the matching table’s `minimumSpentAmount`
  void _maybeSeedTableBaseFromModel() {
    if (!isTableBooking) return;
    if (tableBaseAmount.value > 0) return;

    final t = _currentTable;
    if (t?.minimumSpentAmount != null) {
      tableBaseAmount.value = (t!.minimumSpentAmount!).toDouble();
    }
  }

  EventTable? get _currentTable {
    final e = eventDetails.value;
    if (e == null) return null;
    // Prefer passed tableId if we have it
    if (tableId.value != null) {
      return e.eventTable?.firstWhereOrNull((tbl) => tbl.id == tableId.value);
    }
    // fallback: first table (matches your UI fallback)
    return (e.eventTable?.isNotEmpty ?? false) ? e.eventTable!.first : null;
  }

  /// Build charge lines for the **current** booking type
  List<ChargeLine> _buildChargeLines() {
    // 1) If user selected charges with quantities explicitly, use those (works in both flows)
    if (selectedCharges.isNotEmpty) {
      return selectedCharges.map((entry) {
        final c = entry.key;
        final qty = entry.value;
        final price = double.tryParse(c.feeAmount ?? '0') ?? 0.0;
        return ChargeLine(
          id: c.id ?? '',
          name: c.feeName ?? 'Charge',
          unitPrice: price,
          quantity: qty,
        );
      }).toList();
    }

    // 2) Otherwise fallback from model:
    final e = eventDetails.value;
    if (e == null) return const [];

    if (isTableBooking) {
      // TABLE: use current table’s tableCharges (qty=1 each)
      final tbl = _currentTable;
      final charges = tbl?.tableCharges ?? const [];
      return charges.map((c) {
        final price = double.tryParse(c.feeAmount ?? '0') ?? 0.0;
        return ChargeLine(
          id: c.id ?? '',
          name: c.feeName ?? 'Charge',
          unitPrice: price,
          quantity: 1,
        );
      }).toList();
    } else {
      // TICKET: use first ticket’s ticketCharges (qty=1 each) – matches your UI fallback
      final tickets = e.eventTickets ?? const [];
      if (tickets.isEmpty) return const [];
      final charges = tickets.first.ticketCharges ?? const [];
      return charges.map((c) {
        final price = double.tryParse(c.feeAmount ?? '0') ?? 0.0;
        return ChargeLine(
          id: c.id ?? '',
          name: c.feeName ?? 'Charge',
          unitPrice: price,
          quantity: 1,
        );
      }).toList();
    }
  }

  void _rebuild() {
    // 1) Build lines for current path
    chargeLines.assignAll(_buildChargeLines());

    // 2) Sum charge lines
    chargesTotal.value = chargeLines.fold<double>(
      0.0,
      (sum, l) => sum + l.total,
    );

    // 3) Compute totals per flow
    finalTotal.value = baseAmount.value + chargesTotal.value; // ticket
    tableFinalTotal.value = tableBaseAmount.value + chargesTotal.value; // table

    logger.d(
      '[${bookingType.value}] base(ticket)=${baseAmount.value}, '
      'base(table)=${tableBaseAmount.value}, charges=${chargesTotal.value}, '
      'final(tkt)=${finalTotal.value}, final(tbl)=${tableFinalTotal.value}',
    );
  }

  // Action
  final isLoading = false.obs;

  Future<void> onCheckout() async {
    if (isLoading.value) return;
    isLoading.value = true;

    try {
      // Basic guards
      if (eventID.value.isEmpty) {
        Get.snackbar('Missing', 'Event ID not found');
        return;
      }
      if (!isTableBooking && ticketID.value.isEmpty) {
        Get.snackbar('Missing', 'Ticket ID not found');
        return;
      }
      if (isTableBooking && (tableId.value.isEmpty)) {
        Get.snackbar('Missing', 'Table ID not found');
        return;
      }
      if (totalTickets.value <= 0) {
        Get.snackbar('Invalid', 'Please select at least one guest');
        return;
      }

      final payload = isTableBooking
          ? {
              "bookingType": "TABLE",
              "tableId": tableId.value,
              "eventId": eventID.value,
              "guest": totalTickets.value,
              "numberOfFemale": numberOfFemale.value,
              "numberOfMale": numberOfMale.value,
              "paidAmount": tableFinalTotal.value, // <- table total
            }
          : {
              "bookingType": "TICKET",
              "ticketId": ticketID.value,
              "eventId": eventID.value,
              "guest": totalTickets.value,
              "numberOfFemale": numberOfFemale.value,
              "numberOfMale": numberOfMale.value,
              "paidAmount": finalTotal.value, // <- ticket total
            };

      logger.i('Checkout payload => $payload');

      final response = await netConfig.ApiRequestHandler(
        RequestMethod.POST,
        Urls.createBooking,
        jsonEncode(payload),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        Get.snackbar(
          'Success',
          'Booking confirmed! Total: ${finalTotalText}',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: AppColors.primaryColor,
          colorText: Colors.white,
        );
        Get.find<HomeNavController>().changeIndex(2);
      }
    } finally {
      isLoading.value = false;
    }
  }

  void onBackPressed() => Navigator.pop(Get.context!);
}

class CheckoutBookingDetails {
  final String bookingType;
  final int guestCount;
  final double baseAmount;
  final bool isEarlyBird;

  CheckoutBookingDetails({
    required this.bookingType,
    required this.guestCount,
    required this.baseAmount,
    required this.isEarlyBird,
  });
}
