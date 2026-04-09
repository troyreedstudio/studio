import 'package:get/get.dart';

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // Get.put<ChallengeController>(ChallengeController());
    // Get.put<FriendController>(FriendController());
    // Get.put<SearchControllerV>(SearchControllerV());
    // Get.put<ProfileController>(ProfileController());

    // App-wide services that should be available everywhere
    // Get.put<ApiService>(ApiService(), permanent: true);
    // Get.put<StorageService>(StorageService(), permanent: true);
    // Get.put<ThemeController>(ThemeController(), permanent: true);
  }
}
