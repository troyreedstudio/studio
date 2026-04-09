import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:logger/logger.dart';

import '../../../core/const/app_colors.dart';
import '../../../core/network_caller/endpoints.dart';
import '../../../core/network_caller/network_config.dart';
import '../../home/model/event_model.dart';

class ExploreController extends GetxController {
  final logger = Logger();
  final netConfig = NetworkConfigV1();

  final textController = TextEditingController();
  final scrollController = ScrollController();

  // Search & Filter
  final query = ''.obs;
  final isLoading = false.obs;
  final results = <AllEventModel>[].obs;
  final recent = <String>[].obs;
  final selectedFilters = <String>{}.obs;

  // Pagination
  final currentPage = 1.obs;
  final totalPages = 1.obs;
  final isLoadingMore = false.obs;
  final hasMoreData = true.obs;
  final limit = 10; // Items per page

  Timer? _debouncer;

  @override
  void onInit() {
    super.onInit();

    // Load initial events
    fetchEvents();

    // Setup search listener
    textController.addListener(() {
      final q = textController.text.trim();
      if (q != query.value) {
        query.value = q;
        _debounceSearch();
      }
    });

    // Setup pagination listener
    scrollController.addListener(_onScroll);
  }

  /// 📜 PAGINATION SCROLL LISTENER
  void _onScroll() {
    if (scrollController.position.pixels >=
        scrollController.position.maxScrollExtent - 200) {
      // User is near bottom, load more
      if (!isLoadingMore.value && hasMoreData.value) {
        loadMore();
      }
    }
  }

  /// 🔄 FETCH EVENTS (Initial or Refresh)
  Future<void> fetchEvents({bool refresh = false}) async {
    if (refresh) {
      currentPage.value = 1;
      hasMoreData.value = true;
    }

    try {
      isLoading.value = true;

      final response = await netConfig.ApiRequestHandler(
        RequestMethod.GET,
        '${Urls.allEvents}?page=${currentPage.value}&limit=$limit',
        jsonEncode({}),
        is_auth: true,
      );

      if (response != null && response['success'] == true) {
        final meta = response['data']?['meta'];
        final eventsData = response['data']?['data'];

        if (meta != null) {
          final total = meta['total'] ?? 0;
          totalPages.value = (total / limit).ceil();
          hasMoreData.value = currentPage.value < totalPages.value;
        }

        if (eventsData is List) {
          final List<AllEventModel> validEvents = [];

          for (var eventJson in eventsData) {
            try {
              final event = AllEventModel.fromJson(
                eventJson as Map<String, dynamic>,
              );
              if (event.eventName != null) {
                validEvents.add(event);
              }
            } catch (e) {
              logger.e('Failed to parse event: $e');
            }
          }

          if (refresh) {
            results.assignAll(validEvents);
          } else {
            results.addAll(validEvents);
          }

          logger.d(
            'Loaded ${validEvents.length} events. Total: ${results.length}',
          );
        }
      }
    } catch (e) {
      logger.e('Event Fetching Failed: $e');
      Get.snackbar(
        'Error',
        'Failed to load events',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isLoading.value = false;
    }
  }

  /// 📥 LOAD MORE (Pagination)
  Future<void> loadMore() async {
    if (isLoadingMore.value || !hasMoreData.value) return;

    try {
      isLoadingMore.value = true;
      currentPage.value++;

      await fetchEvents();
    } catch (e) {
      logger.e('Load more failed: $e');
      currentPage.value--; // Revert page on error
    } finally {
      isLoadingMore.value = false;
    }
  }

  /// 🔍 SEARCH WITH DEBOUNCE
  void _debounceSearch() {
    _debouncer?.cancel();
    _debouncer = Timer(const Duration(milliseconds: 350), () {
      search(query.value);
    });
  }

  /// 🔎 SEARCH FUNCTION
  Future<void> search(String q) async {
    if (q.isEmpty) {
      // Reset to show all events
      currentPage.value = 1;
      await fetchEvents(refresh: true);
      return;
    }

    isLoading.value = true;

    try {
      // TODO: If your API supports search, use it here
      // For now, we'll filter locally
      await Future.delayed(const Duration(milliseconds: 200));

      // Filter from all results
      final filtered = results.where((event) {
        final eventName = event.eventName?.toLowerCase() ?? '';
        final location = event.user?.fullAddress?.toLowerCase() ?? '';
        final description = event.descriptions?.toLowerCase() ?? '';
        final searchTerm = q.toLowerCase();

        return eventName.contains(searchTerm) ||
            location.contains(searchTerm) ||
            description.contains(searchTerm);
      }).toList();

      // Temporarily show filtered results
      // (This won't affect the main list)
      results.assignAll(filtered);
    } catch (e) {
      logger.e('Search failed: $e');
    } finally {
      isLoading.value = false;
    }
  }

  /// ✅ SUBMIT SEARCH
  void submit() {
    final q = query.value;
    if (q.isEmpty) return;

    // Add to recent searches
    if (!recent.contains(q)) {
      recent.insert(0, q);
      if (recent.length > 8) recent.removeLast();
    }

    search(q);
  }

  /// ❌ CLEAR SEARCH
  void clearQuery() {
    textController.clear();
    query.value = '';
    currentPage.value = 1;
    fetchEvents(refresh: true);
  }

  /// 🔄 REFRESH (Pull to Refresh)
  Future<void> refresh() async {
    await fetchEvents(refresh: true);
  }

  /// 🎛️ FILTERS
  Future<void> openFilters(BuildContext context) async {
    final temp = {...selectedFilters};
    await showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Filters',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  'Today',
                  'This Week',
                  'This Month',
                  'Upcoming',
                  'Free Entry',
                ].map((label) {
                  final selected = temp.contains(label);
                  return FilterChip(
                    label: Text(label),
                    selected: selected,
                    onSelected: (v) {
                      if (v) {
                        temp.add(label);
                      } else {
                        temp.remove(label);
                      }
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.buttonColor,
                    padding: EdgeInsets.symmetric(
                      horizontal: 20.w,
                      vertical: 8.h,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20.r),
                    ),
                    elevation: 2,
                  ),
                  onPressed: () {
                    selectedFilters
                      ..clear()
                      ..addAll(temp);
                    Navigator.pop(context);
                    // TODO: Apply filters
                    refresh();
                  },
                  child: const Text(
                    'Apply',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  void onClose() {
    _debouncer?.cancel();
    textController.dispose();
    scrollController.dispose();
    super.onClose();
  }
}