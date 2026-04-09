import 'dart:convert';

import 'package:get/get.dart';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/feature/event_details/model/event_details_model_saon.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../../event_details_table_options/ui/table_options_page.dart';
import '../../event_details_ticket/ui/event_book_ticket_page.dart';
import '../model/event_details_model.dart';

class EventDetailsController extends GetxController {
  late PageController pageController;
  final netConfig = NetworkConfigV1();
  final logger = Logger();

  // Observable variables
  var currentImageIndex = 0.obs;
  var isLoading = false.obs;
  var event = Rx<EventModel?>(null);

  @override
  void onInit() {
    super.onInit();
    pageController = PageController();
    loadEventData();
    final eventID = Get.arguments;
    fetchCommunityProfile(eventID);
  }

  /// 🎯 community profile fetching api call
  final RxBool isEventLoading = false.obs;
  final Rxn<EventDetailsModel> eventDetails = Rxn<EventDetailsModel>();
  late Rx<String?>? eventDetailsEventID = eventDetails.value?.id.obs;

  Future<void> fetchCommunityProfile(String eventID) async {
    try {
      isLoading.value = true;
      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        "${Urls.eventDetails}/$eventID",
        jsonEncode({}),
        is_auth: true,
      );
      if (response != null && response['success'] == true) {
        logger.d('Event Fetching Successful');
        eventDetails.value = EventDetailsModel.fromJson(response['data']);
      }
    } catch (e) {
      logger.e('Event Fetching Failed');
    } finally {
      isLoading.value = false;
    }
  }

  @override
  void onClose() {
    pageController.dispose();
    super.onClose();
  }

  void loadEventData() {
    isLoading.value = true;

    // Sample data - replace with actual API call
    event.value = EventModel(
      id: '1',
      title: 'National Music Festival',
      location: 'Savora Hall',
      category: 'Garden Park, Bali',
      dateTime: DateTime(2024, 12, 24, 18, 0),
      description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      attendingCount: 129,
      imageUrls: [
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
      ],
      lastRegistrationDate: DateTime(2024, 12, 7, 18, 0),
      arriveBeforeDate: DateTime(2024, 12, 7, 18, 0),
      additionalGuests: 9,
      ticketOptions: [
        TicketOption(
          id: '1',
          title: 'Male General Admission',
          price: 35.93,
          includesFees: true,
        ),
        TicketOption(
          id: '2',
          title: 'Female General Admission',
          price: 35.93,
          includesFees: true,
        ),
      ],
      tableOptions: [
        TableOption(
          id: '1',
          title: 'Premium Terrace East',
          maxGuests: 10,
          minimumSpend: 500.00,
          description:
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        ),
        TableOption(
          id: '2',
          title: 'Premium Terrace West',
          maxGuests: 8,
          minimumSpend: 450.00,
          description:
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        ),
      ],
    );

    isLoading.value = false;
  }

  void onPageChanged(int index) {
    currentImageIndex.value = index;
  }

  void nextImage() {
    if (event.value != null && event.value!.imageUrls.isNotEmpty) {
      int nextIndex =
          (currentImageIndex.value + 1) % event.value!.imageUrls.length;
      pageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void previousImage() {
    if (event.value != null && event.value!.imageUrls.isNotEmpty) {
      int previousIndex = currentImageIndex.value == 0
          ? event.value!.imageUrls.length - 1
          : currentImageIndex.value - 1;
      pageController.animateToPage(
        previousIndex,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void onBookTickets() {
    Get.to(
      BookTicketsPage(),
      arguments: {
        'eventID': eventDetails.value?.id,
        'ticketID': eventDetails.value?.eventTickets?.first.id,
      },
    );
    logger.i({
      'eventID': eventDetails.value?.id,
      'ticketID': eventDetails.value?.eventTickets?.first.id,
    });
  }

  void onBookTables() {
    Get.to(TableOptionsPage(), arguments: {'eventID': eventDetails.value?.id});
    logger.i({'eventID': eventDetails.value?.id});
  }

  void onBackPressed() {
    Navigator.pop(Get.context!);
  }
}
