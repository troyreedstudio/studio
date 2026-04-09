import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/event_details/model/event_details_model_saon.dart';

import '../../event_details/model/event_details_model.dart';
import '../../event_details_table/ui/event_details_table.dart';

class TableOptionsController extends GetxController {
  var event = Rx<EventDetailsModel?>(null);
  var isLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
    // event.value = Get.arguments ;
  }

  void onTableSelected(TableOption table) {
    // Get.toNamed('/table-details', arguments: table);
    Get.to(
      TableDetailsPage(),
      arguments: {
        'eventID': event.value?.id,
        'tableID': table.id,
        'table': table,
      },
    );
  }

  void onBackPressed() {
    Navigator.pop(Get.context!);
  }
}
