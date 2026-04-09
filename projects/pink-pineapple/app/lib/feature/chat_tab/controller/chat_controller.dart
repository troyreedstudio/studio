import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/chat_tab/model/chat_model.dart';
import 'package:pineapple/core/services/websocket_service.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/feature/chat_tab/ui/chat_detail_page.dart';
import 'package:pineapple/feature/chat_tab/helper/user_id_fixer.dart';

class MessagesController extends GetxController {
  final RxList<MessageModel> personalMessages = <MessageModel>[].obs;
  final RxBool isLoading = false.obs;

  final WebSocketService ws = Get.find<WebSocketService>();
  final LocalService localService = LocalService();

  String? myUserId;
  StreamSubscription? _wsSub;

  @override
  void onInit() {
    super.onInit();
    _initializeChat();
  }

  @override
  void onClose() {
    _wsSub?.cancel();
    super.onClose();
  }

  /// Initialize chat - fix userId if needed, then start
  Future<void> _initializeChat() async {
    print('🚀 Initializing chat system...');

    // Fix userId and connect WebSocket
    final success = await UserIdFixer.fixUserIdAndConnectWebSocket();

    if (success) {
      print('✅ Chat initialization successful');
      await _loadMyUserId();
      _listenWebSocket();
      loadMessagesData();
    } else {
      print('❌ Chat initialization failed');
      isLoading.value = false;
    }
  }

  Future<void> _loadMyUserId() async {
    myUserId = await localService.getValue<String>(PreferenceKey.userId);
    print('👤 My User ID loaded: $myUserId');
  }

  void _listenWebSocket() {
    print('👂 Starting WebSocket listener...');
    _wsSub = ws.events.listen((packet) {
      final event = packet["event"];
      final data = packet["data"];

      print('📩 WebSocket event received: $event');

      // Listen for messageList event (list of conversations)
      if (event == "messageList") {
        print(
          '📋 Received messageList with ${data is List ? data.length : 0} items',
        );

        // Print first item to see structure
        if (data is List && data.isNotEmpty) {
          print('🔍 First message structure: ${data[0]}');
        }

        if (data is List) {
          try {
            final parsed = data
                .whereType<Map<String, dynamic>>()
                .map((json) {
                  try {
                    return MessageModel.fromJson(json);
                  } catch (e) {
                    print('❌ Error parsing message: $e');
                    print('❌ Problematic JSON: $json');
                    return null;
                  }
                })
                .whereType<MessageModel>() // Filter out nulls
                .toList();
            personalMessages.assignAll(parsed);
            print('✅ Loaded ${parsed.length} conversations');
          } catch (e) {
            print('❌ Error parsing messageList: $e');
          }
        }
        isLoading.value = false;
      }

      // Listen for new incoming message (update conversation list)
      if (event == "message") {
        print('💬 New message received');
        if (data is Map<String, dynamic>) {
          _updateConversationFromNewMessage(data);
        }
      }

      // Listen for user online/offline status
      if (event == "userStatus") {
        print('👤 User status update');
        if (data is Map<String, dynamic>) {
          final userId = data['userId'];
          final isOnline = data['isOnline'] == true;
          _updateUserOnlineStatus(userId, isOnline);
        }
      }
    });
  }

  void _updateConversationFromNewMessage(Map<String, dynamic> data) {
    // Extract sender info from the message
    final senderId = data['senderId'] ?? '';
    final message = data['message'] ?? '';

    // Don't increment unread count if the message is from me
    final isMyMessage = senderId == myUserId;

    // Find existing conversation
    final idx = personalMessages.indexWhere((m) => m.senderId == senderId);

    if (idx != -1) {
      // Update existing conversation
      final existing = personalMessages[idx];
      personalMessages[idx] = MessageModel(
        id: existing.id,
        senderId: existing.senderId,
        senderName: existing.senderName,
        senderEmail: existing.senderEmail,
        senderProfileImage: existing.senderProfileImage,
        lastMessage: message,
        lastMessageTime: DateTime.now(),
        // Only increment unread count if message is NOT from me
        unreadCount: isMyMessage
            ? existing.unreadCount
            : existing.unreadCount + 1,
        isOnline: existing.isOnline,
        isVerified: existing.isVerified,
      );

      // Move to top
      final updated = personalMessages.removeAt(idx);
      personalMessages.insert(0, updated);
    }
  }

  void _updateUserOnlineStatus(String? userId, bool isOnline) {
    if (userId == null) return;

    print('🟢 Updating online status for $userId: $isOnline');

    // Find and update the user's online status in conversation list
    final idx = personalMessages.indexWhere((m) => m.senderId == userId);

    if (idx != -1) {
      final existing = personalMessages[idx];
      personalMessages[idx] = MessageModel(
        id: existing.id,
        senderId: existing.senderId,
        senderName: existing.senderName,
        senderEmail: existing.senderEmail,
        senderProfileImage: existing.senderProfileImage,
        lastMessage: existing.lastMessage,
        lastMessageTime: existing.lastMessageTime,
        unreadCount: existing.unreadCount,
        isOnline: isOnline,
        isVerified: existing.isVerified,
      );
    }
  }

  void loadMessagesData() {
    isLoading.value = true;
    print('🔵 Loading messages data...');
    print('🔌 WebSocket connected: ${ws.isConnected.value}');

    // Request message list through WebSocket
    if (ws.isConnected.value) {
      print('✅ WebSocket connected, requesting messageList...');
      ws.messageList();

      // Add timeout in case server doesn't respond
      Future.delayed(const Duration(seconds: 5), () {
        if (isLoading.value) {
          print('⚠️ Timeout waiting for messageList response');
          isLoading.value = false;
          if (personalMessages.isEmpty) {
            Get.snackbar(
              'Info',
              'No messages yet. Start a conversation!',
              snackPosition: SnackPosition.BOTTOM,
              backgroundColor: Colors.blue.withOpacity(0.8),
              colorText: Colors.white,
            );
          }
        }
      });
    } else {
      // If not connected, show error
      print('❌ WebSocket not connected');
      isLoading.value = false;
      Get.snackbar(
        'Connection Error',
        'Chat service not connected. Please restart the app.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange.withOpacity(0.8),
        colorText: Colors.white,
        duration: const Duration(seconds: 4),
      );
    }
  }

  void onMessageTap(MessageModel message) async {
    print('💬 Chat tapped - Opening chat with: ${message.senderName}');

    // Ensure we have myUserId
    if (myUserId == null) {
      await _loadMyUserId();
    }

    if (myUserId == null) {
      print('❌ User ID not found');
      Get.snackbar(
        'Error',
        'User ID not found. Please login again.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red.withOpacity(0.8),
        colorText: Colors.white,
      );
      return;
    }

    print('✅ Navigating to chat detail...');
    print('   My ID: $myUserId');
    print('   Receiver ID: ${message.senderId}');
    print('   Receiver Name: ${message.senderName}');

    // Navigate to chat detail page
    Get.to(
      () => const ChatDetailPage(),
      arguments: {
        "myUserId": myUserId,
        "receiverId": message.senderId,
        "receiverName": message.senderName,
        "receiverImage": message.senderProfileImage,
      },
    );

    // Mark as read
    markMessageAsRead(message.id);
  }

  void onMessageLongPress(MessageModel message) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('Delete Chat'),
              onTap: () {
                deleteMessage(message.id);
                Get.back();
              },
            ),
            ListTile(
              leading: const Icon(Icons.volume_off_outlined),
              title: const Text('Mute Chat'),
              onTap: () {
                muteMessage(message.id);
                Get.back();
              },
            ),
            ListTile(
              leading: const Icon(Icons.mark_chat_read_outlined),
              title: const Text('Mark as Read'),
              onTap: () {
                markMessageAsRead(message.id);
                Get.back();
              },
            ),
          ],
        ),
      ),
    );
  }

  void onBackPressed() => Get.back();

  void markMessageAsRead(String messageId) {
    final idx = personalMessages.indexWhere((m) => m.id == messageId);
    if (idx != -1) {
      personalMessages[idx] = personalMessages[idx].copyWith(unreadCount: 0);
    }
  }

  void deleteMessage(String messageId) {
    personalMessages.removeWhere((m) => m.id == messageId);
    Get.snackbar('Deleted', 'Chat has been deleted');
  }

  void muteMessage(String messageId) {
    Get.snackbar('Muted', 'Chat has been muted');
  }

  void refreshData() => loadMessagesData();

  int get totalUnreadCount =>
      personalMessages.fold<int>(0, (sum, msg) => sum + msg.unreadCount);
}

// -------- Model (same as before, only personal needed) --------
