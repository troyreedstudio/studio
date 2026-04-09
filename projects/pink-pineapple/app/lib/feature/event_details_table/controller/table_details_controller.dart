import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/const/app_colors.dart';
import '../../event_details/model/event_details_model.dart';

class TableDetailsController extends GetxController {
  var table = Rx<TableOption?>(null);
  var selectedFemales = 0.obs;
  var selectedMales = 0.obs;
  var includeFoodAndBeverage = false.obs;
  var isLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
    table.value = Get.arguments as TableOption?;
  }

  void incrementFemales() {
    if (totalGuests < (table.value?.maxGuests ?? 0)) {
      selectedFemales.value++;
    }
  }

  void decrementFemales() {
    if (selectedFemales.value > 0) {
      selectedFemales.value--;
    }
  }

  void incrementMales() {
    if (totalGuests < (table.value?.maxGuests ?? 0)) {
      selectedMales.value++;
    }
  }

  void decrementMales() {
    if (selectedMales.value > 0) {
      selectedMales.value--;
    }
  }

  int get totalGuests => selectedFemales.value + selectedMales.value;

  bool get canProceed => totalGuests > 0;

  void toggleFoodAndBeverage(bool value) {
    includeFoodAndBeverage.value = value;
  }

  void onContinue() {
    if (canProceed) {
      BookingDetails booking = BookingDetails(
        tableId: table.value!.id,
        tableName: table.value!.title,
        maxGuests: table.value!.maxGuests,
        minimumSpend: table.value!.minimumSpend,
        selectedFemales: selectedFemales.value,
        selectedMales: selectedMales.value,
        includeFoodAndBeverage: includeFoodAndBeverage.value,
      );

      Get.snackbar(
        'Booking Confirmed',
        'Table: ${booking.tableName}, Guests: ${booking.totalGuests}',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppColors.primaryColor,
        colorText: Colors.white,
      );
    }
  }

  void onBackPressed() {
    Navigator.pop(Get.context!);
  }
}
