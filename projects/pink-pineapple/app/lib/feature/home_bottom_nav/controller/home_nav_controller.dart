import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

class HomeNavController extends GetxController {
  var currentIndex = 0.obs;

  // Page titles for AppBar
  final List<String> pageTitles = ['Home', 'Theme', 'Affirmations', 'Profile'];

  void changeIndex(int index) {
    currentIndex.value = index;
  }

  // Handle back button press
  Future<bool> onWillPop() async {
    if (currentIndex.value != 0) {
      // If not on home screen, navigate to home
      currentIndex.value = 0;
      return false;
    } else {
      // If on home screen, show exit dialog
      return await showExitDialog();
    }
  }

  Future<bool> showExitDialog() async {
    return await Get.dialog<bool>(
          AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(15),
            ),
            title: Text(
              'Exit App',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            content: Text(
              'Are you sure you want to exit the app?',
              style: TextStyle(fontSize: 16),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(Get.context!, false);
                },
                child: Text(
                  'Cancel',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF936944), Color(0xFF2D2015)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TextButton(
                  onPressed: () {
                    SystemNavigator.pop();
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    'Exit',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
          barrierDismissible: false,
        ) ??
        false;
  }
}
