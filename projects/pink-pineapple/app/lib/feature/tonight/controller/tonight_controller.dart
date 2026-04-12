import 'dart:convert';

import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import 'package:pineapple/feature/home/model/event_model.dart';

class TonightController extends GetxController {
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  final RxBool isLoading = false.obs;
  final RxList<AllEventModel> tonightEvents = <AllEventModel>[].obs;

  @override
  void onInit() {
    super.onInit();
    fetchTonightEvents();
  }

  Future<void> fetchTonightEvents() async {
    try {
      isLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.tonightEvent,
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        logger.d('Tonight Event Fetching Successful');

        final eventsData = response['data'];
        if (eventsData is List) {
          final List<AllEventModel> validEvents = [];

          for (int i = 0; i < eventsData.length; i++) {
            try {
              final event = AllEventModel.fromJson(
                eventsData[i] as Map<String, dynamic>,
              );
              if (event.eventName != null) {
                validEvents.add(event);
              }
            } catch (e) {
              logger.e('Failed to parse Tonight event at index $i: $e');
            }
          }

          tonightEvents.assignAll(validEvents);
          logger.d(
            'Successfully parsed ${validEvents.length} Tonight events out of ${eventsData.length}',
          );
        }
      }
    } catch (e, stackTrace) {
      logger.e(
        'Tonight Event Fetching Failed: $e',
        error: e,
        stackTrace: stackTrace,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshEvents() async {
    await fetchTonightEvents();
  }
}
