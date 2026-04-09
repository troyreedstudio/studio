// import 'package:flutter/material.dart';
// import 'package:flutter_screenutil/flutter_screenutil.dart';
// import 'package:font_awesome_flutter/font_awesome_flutter.dart';
// import 'package:get/get.dart';
// import 'package:pineapple/core/const/app_colors.dart';
// import 'package:pineapple/core/const/user_info/user_info_controller.dart';
// import 'package:pineapple/core/global_widgets/app_network_image.dart';
// import 'package:pineapple/core/global_widgets/bg_screen_widget.dart';
// import 'package:pineapple/core/global_widgets/custom_text.dart';
// import 'package:pineapple/feature/profile_tab/subflow/profile/controller/user_controller.dart';
//
// import '../../../../../core/global_widgets/app_snackbar.dart';
// import '../../profile_edit/ui/profile_edit_ui.dart';
//
// class UserProfilePage extends StatefulWidget {
//   const UserProfilePage({super.key});
//
//   @override
//   State<UserProfilePage> createState() => _UserProfilePageState();
// }
//
// class _UserProfilePageState extends State<UserProfilePage> {
//   final controller = Get.put(UserProfileController());
//   final userInfo = Get.find<UserInfoController>();
//
//   @override
//   Widget build(BuildContext context) {
//     return BackgroundScreen(
//       child: CustomScrollView(
//         physics: const BouncingScrollPhysics(),
//         slivers: [
//           // ===== Cover =====
//           SliverAppBar(
//             expandedHeight: 100.h,
//             pinned: true,
//             backgroundColor: Colors.transparent,
//             elevation: 0,
//             automaticallyImplyLeading: false,
//             leadingWidth: 60.w,
//             leading: Padding(
//               padding: EdgeInsets.all(8.w),
//               child: GestureDetector(
//                 onTap: Get.back,
//                 child: Container(
//                   decoration: BoxDecoration(
//                     color: Colors.black.withOpacity(0.22),
//                     shape: BoxShape.circle,
//                     border: Border.all(color: Colors.white.withOpacity(0.7)),
//                   ),
//                   child: Icon(
//                     Icons.arrow_back_ios_new,
//                     color: Colors.white,
//                     size: 18.sp,
//                   ),
//                 ),
//               ),
//             ),
//             title: Text(
//               userInfo.userInfo.value?.userProfile?.fullName ?? "no name",
//               style: TextStyle(
//                 color: Colors.white,
//                 fontSize: 16.sp,
//                 fontWeight: FontWeight.w600,
//                 shadows: [
//                   Shadow(color: Colors.black.withOpacity(0.35), blurRadius: 6),
//                 ],
//               ),
//             ),
//             flexibleSpace: FlexibleSpaceBar(
//               background: Stack(
//                 fit: StackFit.expand,
//                 children: [
//                   ResponsiveNetworkImage(
//                     imageUrl:
//                         userInfo.userInfo.value?.userProfile?.profileImage ??
//                         "",
//                     fit: BoxFit.cover,
//                     borderRadius: 0,
//                   ),
//
//                   Container(
//                     decoration: BoxDecoration(
//                       gradient: LinearGradient(
//                         begin: Alignment.topCenter,
//                         end: Alignment.bottomCenter,
//                         colors: [
//                           Colors.black.withOpacity(0.35),
//                           Colors.transparent,
//                           Colors.black.withOpacity(0.35),
//                         ],
//                       ),
//                     ),
//                   ),
//                 ],
//               ),
//             ),
//           ),
//
//           // ===== Body =====
//           SliverToBoxAdapter(
//             child: Container(
//               decoration: BoxDecoration(
//                 // image: DecorationImage(image: AssetImage(ImagePath.bg_screen)),
//                 color: const Color(0xFFF2E6DC), // warm beige like screenshot
//               ),
//               child: Obx(() {
//                 return Column(
//                   crossAxisAlignment: CrossAxisAlignment.center,
//                   mainAxisAlignment: MainAxisAlignment.start,
//                   children: [
//                     // avatar overlap
//                     Transform.translate(
//                       offset: Offset(-130.w, 5.h),
//                       child: Container(
//                         height: 60.h,
//                         width: 60.h,
//                         decoration: BoxDecoration(
//                           borderRadius: BorderRadius.circular(10.r),
//                           border: Border.all(color: Colors.white, width: 4.w),
//                         ),
//                         child: ClipRRect(
//                           child: ResponsiveNetworkImage(
//                             // borderRadius: 20.r,
//                             imageUrl:
//                                 userInfo
//                                     .userInfo
//                                     .value
//                                     ?.userProfile
//                                     ?.profileImage ??
//                                 "",
//                           ),
//                         ),
//                       ),
//                     ),
//                     SizedBox(height: 10.h),
//                     // name & handle row + follow & more
//                     Padding(
//                       padding: EdgeInsets.symmetric(horizontal: 16.w),
//                       child: Stack(
//                         clipBehavior: Clip.none,
//                         children: [
//                           // Left side: name & handle
//                           Row(
//                             crossAxisAlignment: CrossAxisAlignment.start,
//                             children: [
//                               Expanded(
//                                 child: Column(
//                                   crossAxisAlignment: CrossAxisAlignment.start,
//                                   children: [
//                                     normalText(
//                                       text:
//                                           userInfo
//                                               .userInfo
//                                               .value
//                                               ?.userProfile
//                                               ?.fullName ??
//                                           "no name",
//                                       color: Colors.black87,
//                                       fontWeight: FontWeight.bold,
//                                     ),
//                                     SizedBox(height: 4.h),
//                                     smallerText(
//                                       text:
//                                           "@${userInfo.userInfo.value?.userProfile?.username ?? "no username"}",
//                                       color: Colors.black54,
//                                     ),
//                                   ],
//                                 ),
//                               ),
//                               SizedBox(width: 120.w),
//                               // reserve some space for the button
//                             ],
//                           ),
//
//                           // Edit button anchored to top-right
//                           Positioned(
//                             right: 0,
//                             top: -20.h, // lift it visually if you want overlap
//                             child: Material(
//                               color: Colors.transparent,
//                               child: InkWell(
//                                 onTap: () {
//                                   Get.to(() => ProfileEditScreen());
//
//                                 },
//                                 borderRadius: BorderRadius.circular(12.r),
//                                 child: Container(
//                                   padding: EdgeInsets.symmetric(
//                                     horizontal: 12.w,
//                                     vertical: 8.h,
//                                   ),
//                                   decoration: BoxDecoration(
//                                     color: const Color(0xFFB08968),
//                                     borderRadius: BorderRadius.circular(12.r),
//                                     boxShadow: [
//                                       BoxShadow(
//                                         color: Colors.black.withOpacity(0.08),
//                                         blurRadius: 8,
//                                         offset: const Offset(0, 2),
//                                       ),
//                                     ],
//                                   ),
//                                   child: Row(
//                                     children: [
//                                       Icon(
//                                         Icons.edit,
//                                         size: 15.sp,
//                                         color: Colors.white,
//                                       ),
//                                       SizedBox(width: 6.w),
//                                       smallText(
//                                         text: 'Edit',
//                                         color: Colors.white,
//                                         fontWeight: FontWeight.w600,
//                                       ),
//                                     ],
//                                   ),
//                                 ),
//                               ),
//                             ),
//                           ),
//                         ],
//                       ),
//                     ),
//
//                     SizedBox(height: 10.h),
//
//                     // location
//                     Row(
//                       mainAxisAlignment: MainAxisAlignment.start,
//                       children: [
//                         SizedBox(width: 16.w),
//                         Icon(
//                           Icons.location_on,
//                           size: 16.sp,
//                           color: Colors.black54,
//                         ),
//                         SizedBox(width: 6.w),
//                         smallerText(
//                           text:
//                               userInfo
//                                   .userInfo
//                                   .value
//                                   ?.userProfile
//                                   ?.fullAddress ??
//                               'Birmingham, UK',
//                           color: Colors.black54,
//                         ),
//                       ],
//                     ),
//                     SizedBox(height: 10.h),
//
//                     // bio with "See more"
//                     Padding(
//                       padding: EdgeInsets.symmetric(horizontal: 16.w),
//                       child: GestureDetector(
//                         onTap: () => controller.toggleBioExpand(),
//                         child: smallText(
//                           text:
//                               userInfo.userInfo.value?.userProfile?.bio ??
//                               "no bio",
//                           color: Colors.black87,
//                           maxLines: controller.isBioExpanded.value ? 10 : 2,
//                           overflow: controller.isBioExpanded.value
//                               ? TextOverflow.visible
//                               : TextOverflow.ellipsis,
//                         ),
//                       ),
//                     ),
//                     userInfo.userInfo.value!.userProfile!.bio!.isEmpty
//                         ? SizedBox.shrink()
//                         : Align(
//                             alignment: Alignment.centerLeft,
//                             child: Padding(
//                               padding: EdgeInsets.symmetric(
//                                 horizontal: 16.w,
//                                 vertical: 6.h,
//                               ),
//                               child: GestureDetector(
//                                 onTap: () => controller.toggleBioExpand(),
//                                 child: smallText(
//                                   text: controller.isBioExpanded.value
//                                       ? 'See Less'
//                                       : '...See More',
//                                   color: AppColors.primaryColor,
//                                   fontWeight: FontWeight.w600,
//                                 ),
//                               ),
//                             ),
//                           ),
//
//                     SizedBox(height: 8.h),
//
//                     // stats row
//                     Padding(
//                       padding: EdgeInsets.symmetric(horizontal: 16.w),
//                       child: _StatsRow(
//                         items: [
//                           _StatItem(
//                             count: "${userInfo.userInfo.value?.post ?? '0'}",
//                             label: 'Posts',
//                           ),
//                           _StatItem(
//                             count:
//                                 "${userInfo.userInfo.value?.follower ?? '0'}",
//                             label: 'Followers',
//                           ),
//                           _StatItem(
//                             count:
//                                 "${userInfo.userInfo.value?.following ?? '0'}",
//                             label: 'Followings',
//                           ),
//                         ],
//                       ),
//                     ),
//                     SizedBox(height: 18.h),
//
//                     // tabs
//                     Padding(
//                       padding: EdgeInsets.symmetric(horizontal: 16.w),
//                       child: Container(
//                         decoration: BoxDecoration(
//                           color: Colors.white.withOpacity(0.65),
//                           borderRadius: BorderRadius.circular(14.r),
//                         ),
//                         child: Row(
//                           children: [
//                             _TabChip(
//                               selected: controller.selectedTab.value == 0,
//                               icon: Icons.grid_on,
//                               onTap: () => controller.changeTab(0),
//                             ),
//                             _TabChip(
//                               selected: controller.selectedTab.value == 1,
//                               icon: Icons.play_circle_outline,
//                               onTap: () => controller.changeTab(1),
//                             ),
//                           ],
//                         ),
//                       ),
//                     ),
//
//                     SizedBox(height: 16.h),
//
//                     // grid
//                     Padding(
//                       padding: EdgeInsets.symmetric(horizontal: 16.w),
//                       child: GridView.builder(
//                         shrinkWrap: true,
//                         physics: const NeverScrollableScrollPhysics(),
//                         gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
//                           crossAxisCount: 3,
//                           crossAxisSpacing: 8.w,
//                           mainAxisSpacing: 8.h,
//                           childAspectRatio: 0.75,
//                         ),
//                         itemCount: 9,
//                         itemBuilder: (_, i) => _PostThumb(index: i),
//                       ),
//                     ),
//
//                     SizedBox(height: 24.h),
//                   ],
//                 );
//               }),
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }
//
// /// ===== widgets
//
// class _StatsRow extends StatelessWidget {
//   const _StatsRow({required this.items});
//
//   final List<_StatItem> items;
//
//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: EdgeInsets.symmetric(vertical: 10.h),
//       decoration: BoxDecoration(
//         color: Colors.white.withOpacity(0.75),
//         borderRadius: BorderRadius.circular(14.r),
//       ),
//       child: Row(
//         children: [
//           for (int i = 0; i < items.length; i++) ...[
//             Expanded(
//               child: Column(
//                 children: [
//                   normalText(
//                     text: items[i].count,
//                     color: Colors.black87,
//                     fontWeight: FontWeight.bold,
//                   ),
//                   SizedBox(height: 2.h),
//                   smallerText(text: items[i].label, color: Colors.black54),
//                 ],
//               ),
//             ),
//             if (i != items.length - 1)
//               Container(
//                 height: 34.h,
//                 width: 1,
//                 color: Colors.black26.withOpacity(0.25),
//               ),
//           ],
//         ],
//       ),
//     );
//   }
// }
//
// class _StatItem {
//   final String count;
//   final String label;
//
//   const _StatItem({required this.count, required this.label});
// }
//
// class _TabChip extends StatelessWidget {
//   const _TabChip({
//     required this.selected,
//     required this.icon,
//     required this.onTap,
//   });
//
//   final bool selected;
//   final IconData icon;
//   final VoidCallback onTap;
//
//   @override
//   Widget build(BuildContext context) {
//     final base = const Color(0xFFB08968);
//     return Expanded(
//       child: InkWell(
//         borderRadius: BorderRadius.circular(14.r),
//         onTap: onTap,
//         child: AnimatedContainer(
//           duration: const Duration(milliseconds: 180),
//           padding: EdgeInsets.symmetric(vertical: 12.h),
//           decoration: BoxDecoration(
//             border: selected
//                 ? Border(
//                     bottom: BorderSide(color: base, width: 2.w),
//                   )
//                 : null,
//             color: selected ? Colors.white : Colors.transparent,
//             borderRadius: BorderRadius.circular(14.r),
//           ),
//           child: Icon(
//             icon,
//             color: selected ? base : Colors.black38,
//             size: 22.sp,
//           ),
//         ),
//       ),
//     );
//   }
// }
//
// class _PostThumb extends StatelessWidget {
//   const _PostThumb({required this.index});
//
//   final int index;
//
//   @override
//   Widget build(BuildContext context) {
//     final images = [
//       'https://images.unsplash.com/photo-1611162617474-5b21e879e113',
//       'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
//       'https://images.unsplash.com/photo-1517841905240-472988babdf9',
//       'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
//       'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5',
//       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
//       'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
//       'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c',
//       'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c',
//     ];
//
//     return Stack(
//       children: [
//         ClipRRect(
//           borderRadius: BorderRadius.circular(12.r),
//           child: ResponsiveNetworkImage(
//             imageUrl: images[index % images.length],
//             fit: BoxFit.cover,
//             borderRadius: 12.r,
//           ),
//         ),
//         Positioned(
//           bottom: 6.h,
//           left: 6.w,
//           child: Row(
//             children: [
//               Icon(Icons.favorite_border, color: Colors.white, size: 14.sp),
//               SizedBox(width: 4.w),
//               smallerText(
//                 text: '${(index + 1) * 12}',
//                 color: Colors.white,
//                 fontWeight: FontWeight.w600,
//               ),
//             ],
//           ),
//         ),
//         Positioned(
//           bottom: 6.h,
//           right: 6.w,
//           child: Row(
//             children: [
//               Icon(Icons.chat_bubble_outline, color: Colors.white, size: 14.sp),
//               SizedBox(width: 4.w),
//               smallerText(
//                 text: '${(index + 1) * 3}',
//                 color: Colors.white,
//                 fontWeight: FontWeight.w600,
//               ),
//             ],
//           ),
//         ),
//       ],
//     );
//   }
// }
