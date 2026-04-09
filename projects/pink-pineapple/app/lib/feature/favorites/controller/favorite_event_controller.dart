import 'dart:convert';

import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/network_caller/network_config.dart';

import '../../../core/network_caller/endpoints.dart';
import '../model/favorite_model.dart';

class FavoriteEventController extends GetxController {
  final isLoading = false.obs;
  final favoriteEventList = <FavoriteEventModel>[].obs;
  final logger = Logger();
  final netConfig = NetworkConfigV1();

  @override
  void onInit() {
    super.onInit();
    fetchFavoriteEvent();
  }

  void refreshData(){
    fetchFavoriteEvent();
  }


  Future<void> fetchFavoriteEvent() async {
    isLoading.value = true;
    try {
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        Urls.getAllFavoriteEvent,
        jsonEncode({}),
        is_auth: true,
      );

      if (response == null || response['success'] != true) return;

      final data = response['data'];
      if (data is! List) return;

      final parsed = <FavoriteEventModel>[];
      for (final item in data) {
        final ev = (item is Map<String, dynamic>) ? item['event'] : null;
        if (ev is Map<String, dynamic>) {
          parsed.add(FavoriteEventModel.fromJson(ev));
        }
      }

      favoriteEventList.assignAll(parsed);
    } catch (e) {
      logger.e('fetchFavoriteEvent error: $e');
    } finally {
      isLoading.value = false;
    }
  }
}
