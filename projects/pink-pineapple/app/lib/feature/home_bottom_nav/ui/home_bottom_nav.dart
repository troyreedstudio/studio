import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/core/const/app_colors.dart';
import 'package:pineapple/feature/home/ui/home.dart';
import 'package:pineapple/feature/profile_tab/ui/profile_tab.dart';
import '../../bookings/ui/bookings_list_page.dart';
import '../controller/home_nav_controller.dart';

class HomeBottomNav extends StatelessWidget {
  HomeBottomNav({super.key});

  final HomeNavController navigationController = Get.put(HomeNavController());

  final List<Widget> pages = [
    HomeScreen(),       // Home
    BookingsListPage(), // Bookings
    ProfileTabPage(),   // Profile
  ];

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: navigationController.onWillPop,
      child: Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: Obx(
          () => IndexedStack(
            index: navigationController.currentIndex.value,
            children: pages,
          ),
        ),
        bottomNavigationBar: _PinkPineappleNavBar(
          navigationController: navigationController,
        ),
      ),
    );
  }
}

class _PinkPineappleNavBar extends StatelessWidget {
  final HomeNavController navigationController;

  const _PinkPineappleNavBar({required this.navigationController});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        border: Border(
          top: BorderSide(
            color: AppColors.borderSubtle,
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            blurRadius: 24,
            color: Colors.black.withOpacity(0.4),
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Obx(
          () => Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  label: 'Home',
                  index: 0,
                  currentIndex: navigationController.currentIndex.value,
                  onTap: navigationController.changeIndex,
                ),
                _NavItem(
                  icon: Icons.confirmation_number_outlined,
                  activeIcon: Icons.confirmation_number,
                  label: 'Bookings',
                  index: 1,
                  currentIndex: navigationController.currentIndex.value,
                  onTap: navigationController.changeIndex,
                ),
                _NavItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
                  index: 2,
                  currentIndex: navigationController.currentIndex.value,
                  onTap: navigationController.changeIndex,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int index;
  final int currentIndex;
  final Function(int) onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.index,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool isActive = index == currentIndex;

    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: isActive
            ? BoxDecoration(
                gradient: AppColors.gradientPrimary,
                borderRadius: BorderRadius.circular(24),
              )
            : null,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              size: 22,
              color: isActive ? AppColors.backgroundDark : AppColors.textMuted,
            ),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.backgroundDark,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
