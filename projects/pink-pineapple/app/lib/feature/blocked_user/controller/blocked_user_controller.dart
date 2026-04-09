import 'dart:convert';
import 'package:get/get.dart';
import 'package:logger/logger.dart';
import 'package:pineapple/core/global_widgets/app_snackbar.dart';
import 'package:pineapple/core/network_caller/endpoints.dart';
import 'package:pineapple/core/network_caller/network_config.dart';
import '../model/blocked_user_model.dart';

class BlockedUserController extends GetxController {
  final _log = Logger();
  final net = NetworkConfigV1();

  // State
  final RxBool isLoading = false.obs;
  final RxList<BlockedUserModel> blockedUsers = <BlockedUserModel>[].obs;

  // Search
  final RxString _query = ''.obs;
  bool get isSearching => _query.value.isNotEmpty;

  // Derived
  bool get hasBlockedUsers => blockedUsers.isNotEmpty;
  int get blockedUsersCount => blockedUsers.length;

  // Filtered list (by name/email/address)
  List<BlockedUserModel> get filteredBlockedUsers {
    final q = _query.value.trim().toLowerCase();
    if (q.isEmpty) return blockedUsers;
    return blockedUsers.where((u) {
      final name = (u.fullName ?? '').toLowerCase();
      final email = (u.email ?? '').toLowerCase();
      final addr = (u.fullAddress ?? '').toLowerCase();
      return name.contains(q) || email.contains(q) || addr.contains(q);
    }).toList();
  }

  @override
  void onInit() {
    super.onInit();
    fetchBlockedUsers();
  }

  Future<void> fetchBlockedUsers() async {
    try {
      isLoading.value = true;

      final res = await net.ApiRequestHandler(
        RequestMethod.GET,
        Urls.getAllBlockUser, // "getAllBlockUser"
        jsonEncode({}),
        is_auth: true,
      );

      if (res != null && res['success'] == true) {
        final data = (res['data'] as List?) ?? const [];

        // Map each envelope to a flat BlockedUserModel (the "blocked" user)
        final users = data
            .whereType<Map<String, dynamic>>()
            .map((e) => BlockedUserParsing.fromEnvelope(e))
            .toList();

        blockedUsers.assignAll(users);
        filteredBlockedUsers.assignAll(users); // important for first render
      } else {
        blockedUsers.clear();
        filteredBlockedUsers.clear();
      }
    } catch (e, st) {
      // This previously threw "type 'String' is not a subtype of type 'int' of 'index'"
      // which happens when trying to index a Map like a List; using the correct shape fixes it.
      _log.e('fetchBlockedUsers error: $e', stackTrace: st);
      blockedUsers.clear();
      filteredBlockedUsers.clear();
    } finally {
      isLoading.value = false;
    }
  }



  Future<void> refreshBlockedUsers() async => fetchBlockedUsers();

  // Toggle block/unblock (optimistic)
  Future<void> toggleBlock(String userId) async {
    try {
      final res = await net.ApiRequestHandler(
        RequestMethod.POST,
        Urls.toggleBlockUnblock, // "toggleBlockUnblock"
        jsonEncode({"targetUserId": userId}),
        is_auth: true,
      );

      if (res != null && res['success'] == true) {
        // remove from current lists since it's now unblocked
        blockedUsers.removeWhere((u) => u.id == userId);
        filteredBlockedUsers.removeWhere((u) => u.id == userId);
      } else {
        AppSnackbar.show(message: res?['message'] ?? 'Action failed', isSuccess: false);
      }
    } catch (e) {
      AppSnackbar.show(message: 'Action failed', isSuccess: false);
    }
  }


  // Search
  void searchUsers(String q) => _query.value = q;
  void clearSearch() => _query.value = '';
}
