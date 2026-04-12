import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/user_info/user_info_controller.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/feature/auth/ui/9.change_password_page.dart';
import 'package:pineapple/feature/blocked_user/ui/blocked_user_ui.dart';
import 'package:pineapple/feature/free_user/ui/free_user_home_page.dart';

import '../../favorites/ui/favorite_event_screen.dart';
import '../ui/privacy_policy_page.dart';
import '../ui/terms_conditions_page.dart';

class ProfileTabController extends GetxController {
  // Observable variables
  final RxString userName = 'John Doe'.obs;
  final RxString userEmail = 'johndoe@gmail.com'.obs;
  final RxString userImageUrl =
      'https://images.unsplash.com/photo-1633332755192-727a05c4013d?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D'
          .obs;
  final RxInt followingCount = 177.obs;
  final RxInt followersCount = 199.obs;
  final local = LocalService();

  // Menu items
  final List<ProfileMenuItem> menuItems = [
    ProfileMenuItem(
      title: 'Favorites',
      iconPath: 'assets/icons/fav.png',
      onTap: () => _onFavTap(),
    ),
    ProfileMenuItem(
      title: 'Change Password',
      iconPath: 'assets/icons/lock.png',
      onTap: () => _onChangePasswordTap(),
    ),
    ProfileMenuItem(
      title: 'Blocked Users',
      iconPath: 'assets/icons/block.png',
      onTap: () => _onBlockedUsersTap(),
    ),
  ];

  final List<ProfileMenuItem> preferencesItems = [
    ProfileMenuItem(
      title: 'Help And Support',
      iconPath: 'assets/icons/help.png',
      onTap: () => {},
    ),
    ProfileMenuItem(
      title: 'Privacy Policy',
      iconPath: 'assets/icons/privacy.png',
      onTap: () => _onPrivacyPolicyTap(),
    ),
    ProfileMenuItem(
      title: 'Terms & Conditions',
      iconPath: 'assets/icons/terms.png',
      onTap: () => _onTermsConditionsTap(),
    ),
  ];

  @override
  void onInit() {
    super.onInit();
    // Initialize any data here
  }

  // Menu item tap handlers
  static void _onFavTap() {
    Get.to(
      // () => UnifiedPostsPage(postType: PostType.favourites),
      () => FavoriteEventScreen(),
    ); // Add navigation logic here
  }

  static void _onBlockedUsersTap() {
    Get.to(() => BlockedUsersPage()); // Add navigation logic here
  }

  static void _onChangePasswordTap() {
    Get.to(() => ChangePasswordPage());
  }

  static void _onTermsConditionsTap() {
    Get.to(() => const TermsConditionsPage());
  }

  static void _onPrivacyPolicyTap() {
    Get.to(() => const PrivacyPolicyPage());
  }

  void onLogoutTap() async {
    try {
      final local = LocalService();
      await local.clearUserData();

      // Clear user info
      if (Get.isRegistered<UserInfoController>()) {
        Get.find<UserInfoController>().userInfo.value = null;
      }

      // Navigate to free user home (allow browsing without login)
      Get.offAll(() => FreeUserHomePage(), predicate: (route) => false);
    } catch (e) {
      print('Logout error: $e');
    }
  }

  // Methods to update data
  void updateFollowingCount(int count) {
    followingCount.value = count;
  }

  void updateFollowersCount(int count) {
    followersCount.value = count;
  }

  void updateUserInfo({String? name, String? email, String? imageUrl}) {
    if (name != null) userName.value = name;
    if (email != null) userEmail.value = email;
    if (imageUrl != null) userImageUrl.value = imageUrl;
  }
}

class ProfileMenuItem {
  final String title;
  final String iconPath;
  final VoidCallback onTap;

  ProfileMenuItem({
    required this.title,
    required this.iconPath,
    required this.onTap,
  });
}
