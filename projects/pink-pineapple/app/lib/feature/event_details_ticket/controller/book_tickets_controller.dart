import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/feature/event_details/controller/event_details_controller.dart';

import '../../event_details/model/event_details_model_saon.dart';
import '../../event_details_checkout/ui/event_checkout_page.dart';

class BookTicketsController extends GetxController {
  var event = Rx<EventDetailsModel?>(null);
  final eventDetailsController = Get.find<EventDetailsController>();
  final RxString eventID = ''.obs;

  var selectedTable = Rx<EventTable?>(null); // Add this for table booking
  // Add this for table booking
  var selectedCharges = <String, int>{}.obs;
  var isLoading = false.obs;
  final logger = Logger();

  final _totalAmount = 0.0.obs;

  double get totalAmount => _totalAmount.value;

  // Check if this is table booking or ticket booking
  bool get isTableBooking => selectedTable.value != null;

  // Get max guests for table booking
  int get maxGuests => selectedTable.value?.maxAdditionGuest ?? 999;

  // Get minimum spend for table booking
  int get minimumSpent => selectedTable.value?.minimumSpentAmount ?? 0;

  // Total number of guests/tickets selected
  int get totalTickets {
    // return selectedCharges.values.fold(0, (sum, count) => sum + count);
    return maleTicketCount.value + femaleTicketCount.value;
  }

  // Validation for table booking
  bool get canProceed {
    if (!isTableBooking) {
      return totalTickets > 0; // For tickets, just need at least 1
    }

    // For tables, check max guests and minimum spend
    return totalTickets > 0 &&
        totalTickets <= maxGuests &&
        totalAmount >= minimumSpent;
  }

  String? get validationMessage {
    if (!isTableBooking) return null;

    if (totalTickets == 0) {
      return 'Please select at least one guest';
    }

    if (totalTickets > maxGuests) {
      return 'Maximum $maxGuests guests allowed for this table';
    }

    // if (totalAmount < minimumSpent) {
    //   final remaining = minimumSpent - totalAmount;
    //   return 'Minimum spend \$$minimumSpent required. Add \$${remaining.toStringAsFixed(2)} more';
    // }

    return null;
  }

  final ticketID = "".obs;

  // final eventID = "".obs;

  @override
  void onInit() {
    super.onInit();
    eventID.value = eventDetailsController.eventDetailsEventID!.value!;

    // Check if we received a table in arguments
    final args = Get.arguments;
    if (args != null && args is EventTable) {
      selectedTable.value = args;
      logger.d('Table booking mode: ${selectedTable.value?.tableName}');
      logger.d('Table booking fee: ${selectedTable.value?.minimumSpentAmount}');
    }

    if (args != null && args is Map) {
      ticketID.value = args['ticketID'] ?? "";
      // eventID.value = args['eventID'];
    }

    ever(selectedCharges, (_) => _updateTotal());
    ever(event, (_) => _updateTotal());
    ever(selectedTable, (_) => _updateTotal());
  }

  void _updateTotal() {
    double total = 0;

    if (isTableBooking) {
      // Calculate total for table charges
      for (var charge in selectedTable.value!.tableCharges ?? []) {
        int count = selectedCharges[charge.id] ?? 0;
        if (count > 0) {
          final price = double.tryParse(charge.feeAmount ?? '0') ?? 0;
          total += price * count;
        }
      }
    } else {
      // Calculate total for ticket charges
      if (event.value != null) {
        for (var ticket in event.value!.eventTickets ?? []) {
          for (var charge in ticket.ticketCharges ?? []) {
            int count = selectedCharges[charge.id] ?? 0;
            if (count > 0) {
              final price = double.tryParse(charge.feeAmount ?? '0') ?? 0;
              total += price * count;
            }
          }
        }
      }
    }

    _totalAmount.value = total;
    logger.d('Total updated: $total');
    logger.d('Total guests/tickets: $totalTickets');
    logger.d('Can proceed: $canProceed');
  }

  List<MapEntry<Charge, int>> getSelectedChargesWithQuantity() {
    List<MapEntry<Charge, int>> selected = [];

    if (isTableBooking) {
      // Get selected table charges
      for (var charge in selectedTable.value!.tableCharges ?? []) {
        int count = selectedCharges[charge.id] ?? 0;
        if (count > 0) {
          selected.add(MapEntry(charge, count));
        }
      }
    } else {
      // Get selected ticket charges
      if (event.value != null) {
        for (var ticket in event.value!.eventTickets ?? []) {
          for (var charge in ticket.ticketCharges ?? []) {
            int count = selectedCharges[charge.id] ?? 0;
            if (count > 0) {
              selected.add(MapEntry(charge, count));
            }
          }
        }
      }
    }

    return selected;
  }

  void incrementCharge(String chargeId) {
    // Check max guests for table booking
    if (isTableBooking && totalTickets >= maxGuests) {
      Get.snackbar(
        'Maximum Guests Reached',
        'This table allows maximum $maxGuests guests',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    selectedCharges[chargeId] = (selectedCharges[chargeId] ?? 0) + 1;
    logger.d("$selectedCharges");
  }

  final RxInt maleTicketCount = 0.obs;
  final RxInt femaleTicketCount = 0.obs;

  double get _malePrice =>
      (event.value?.eventTickets?.first.maleAdmission ?? 0).toDouble();

  double get _femalePrice =>
      (event.value?.eventTickets?.first.femaleAdmission ?? 0).toDouble();

  void decrementMale() {
    if (maleTicketCount.value > 0) {
      maleTicketCount.value = maleTicketCount.value - 1;
    }
  }

  void decrementFemale() {
    if (femaleTicketCount.value > 0) {
      femaleTicketCount.value = femaleTicketCount.value - 1;
    }
  }

  void incrementMale() {
    maleTicketCount.value = maleTicketCount.value + 1;
  }

  void incrementFemale() {
    femaleTicketCount.value = femaleTicketCount.value + 1;
  }

  int get newTotalTickets => maleTicketCount.value + femaleTicketCount.value;

  double get subtotal =>
      maleTicketCount.value * _malePrice +
      femaleTicketCount.value * _femalePrice;

  double get newTotalAmount => subtotal; // + fees;
  final _currency = NumberFormat.currency(symbol: '\$');

  String get subtotalText => _currency.format(subtotal);

  String get totalAmountText => _currency.format(newTotalAmount);

  String get malePriceText => _currency.format(_malePrice);

  String get femalePriceText => _currency.format(_femalePrice);

  bool get canGoToCheckout => newTotalTickets > 0 && totalTickets <= maxGuests;

  void decrementCharge(String chargeId) {
    if ((selectedCharges[chargeId] ?? 0) > 0) {
      selectedCharges[chargeId] = selectedCharges[chargeId]! - 1;
    }
  }

  // final RxDouble newTotalAmount = 0.0.obs;
  // double get newFinalTotalAmount  {
  //   return newTotalAmount.value + maleTicketCount.value + femaleTicketCount.value;
  // }

  // bool get canGoToCheckout {
  //   return maleTicketCount.value > 0 || femaleTicketCount.value > 0;
  // }

  void onCheckout() {
    if (!canGoToCheckout) {
      Get.snackbar(
        'Cannot Proceed',
        validationMessage ?? 'Select at least one ticket',
      );
      return;
    }

    if (totalTickets > maxGuests) {
      Get.snackbar(
        'Cannot Proceed',
        'You cannot book more than $maxGuests guests',
      );
      return;
    }

    final selectedTicketsData = getSelectedChargesWithQuantity();
    Get.to(
      () => EventBookingCheckoutPage(),
      arguments: {
        'selectedCharges': selectedTicketsData,
        'totalAmount': newTotalAmount.toDouble(),
        // base tickets total
        'tableAmount': minimumSpent,
        'tableTotalAmount': newTotalAmount,
        // (optional same)
        'totalGuest': newTotalTickets,
        'eventDetails': event.value,
        'bookingType': isTableBooking ? 'TABLE' : 'TICKET',
        'tableName': selectedTable.value?.tableName,
        'maxGuests': maxGuests,
        'minimumSpent': minimumSpent,
        'maleTicket': maleTicketCount.value,
        'femaleTicket': femaleTicketCount.value,
        'ticketID': ticketID.value,
        'eventID': eventID.value,
        'tableID': selectedTable.value?.id,
      },
    );
    logger.i({
      'selectedCharges': selectedTicketsData,
      'totalAmount': newTotalAmount.toDouble(),
      // base tickets total
      'tableAmount': minimumSpent,
      'tableTotalAmount': newTotalAmount,
      // (optional same)
      'totalGuest': newTotalTickets,
      'eventDetails': event.value,
      'bookingType': isTableBooking ? 'TABLE' : 'TICKET',
      'tableName': selectedTable.value?.tableName,
      'maxGuests': maxGuests,
      'minimumSpent': minimumSpent,
      'maleTicket': maleTicketCount.value,
      'femaleTicket': femaleTicketCount.value,
      'ticketID': ticketID.value,
      'eventID': eventID.value,
      'tableID': selectedTable.value?.id,
    });
  }

  void onBackPressed() {
    Get.back();
  }
}
