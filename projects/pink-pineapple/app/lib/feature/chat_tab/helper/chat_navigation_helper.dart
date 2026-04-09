import 'package:get/get.dart';
import 'package:pineapple/feature/chat_tab/ui/chat_message.dart';

/// Quick Navigation Helper
///
/// তোমার app এর যেকোনো জায়গা থেকে messages page open করতে পারবে
///
/// Usage:
/// ```dart
/// ChatNavigationHelper.openMessagesPage();
/// ```

class ChatNavigationHelper {
  /// Open messages page (conversation list)
  static void openMessagesPage() {
    Get.to(() => const MessagesPage());
  }

  /// Open specific chat with a user
  ///
  /// Parameters:
  /// - myUserId: Current logged in user ID
  /// - receiverId: User ID to chat with
  /// - receiverName: User name to display in header
  static void openChatDetail({
    required String myUserId,
    required String receiverId,
    required String receiverName,
  }) {
    // This will be called from MessagesPage when user taps on a conversation
    // No need to import ChatDetailPage here, it's handled by MessagesController
  }
}

/// Example: Add a button in your HomeScreen or Profile to open messages
/// 
/// ```dart
/// IconButton(
///   icon: Icon(Icons.chat),
///   onPressed: () => ChatNavigationHelper.openMessagesPage(),
/// )
/// ```
/// 
/// Or with FloatingActionButton:
/// ```dart
/// FloatingActionButton(
///   onPressed: () => ChatNavigationHelper.openMessagesPage(),
///   child: Icon(Icons.message),
/// )
/// ```
