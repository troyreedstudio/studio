import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';

import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../model/bookings_model.dart';

class BookingsListController extends GetxController
    with GetSingleTickerProviderStateMixin {
  // Tab Controller
  late TabController tabController;

  // Observable variables
  final RxBool isLoading = false.obs;
  final RxInt currentTabIndex = 0.obs;
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
    tabController.addListener(_handleTabSelection);
    fetchAllBookings();
  }

  @override
  void onClose() {
    tabController.dispose();
    super.onClose();
  }

  void _handleTabSelection() {
    currentTabIndex.value = tabController.index;
  }

  /// 🎯 community profile fetching api call
  final RxList<BookingsListModel> pendingBookingList =
      <BookingsListModel>[].obs;
  final RxList<BookingsListModel> acceptedBookingList =
      <BookingsListModel>[].obs;

  Future<void> fetchAllBookings() async {
    try {
      isLoading.value = true;

      final responses = await Future.wait([
        netConfig.ApiRequestHandler(
          RequestMethod.GET,
          "${Urls.bookingList}ACCEPTED",
          jsonEncode({}),
          is_auth: true,
        ),
        netConfig.ApiRequestHandler(
          RequestMethod.GET,
          "${Urls.bookingList}PENDING",
          jsonEncode({}),
          is_auth: true,
        ),
      ]);

      final acceptedResponse = responses[0];
      final pendingResponse = responses[1];

      if (acceptedResponse != null && acceptedResponse['success'] == true) {
        acceptedBookingList.assignAll(
          (acceptedResponse['data'] as List)
              .map((e) => BookingsListModel.fromJson(e))
              .toList(),
        );
      }
      logger.d('Accepted Booking Length: ${acceptedBookingList.length}');

      if (pendingResponse != null && pendingResponse['success'] == true) {
        pendingBookingList.assignAll(
          (pendingResponse['data'] as List)
              .map((e) => BookingsListModel.fromJson(e))
              .toList(),
        );
      }
      logger.d('Accepted Booking Length: ${pendingBookingList.length}');

      logger.d('Bookings (Accepted + Pending) fetched successfully');
    } catch (e) {
      logger.e('Booking fetching failed: $e');
    } finally {
      isLoading.value = false;
    }
  }

  void refreshData() {
    fetchAllBookings();
  }

  // Get current list based on selected tab
  // List<BookingsModel> get currentList {
  //   return currentTabIndex.value == 0 ? personalMessages : communityMessages;
  // }
}
