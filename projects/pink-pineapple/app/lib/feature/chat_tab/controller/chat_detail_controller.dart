import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../model/chat_model.dart';
import '../../../core/services/websocket_service.dart';

class ChatDetailController extends GetxController {
  final WebSocketService ws = Get.find<WebSocketService>();

  final String myUserId;
  final String receiverId;
  final String receiverName;
  final String? receiverImage;

  ChatDetailController({
    required this.myUserId,
    required this.receiverId,
    required this.receiverName,
    this.receiverImage,
  });

  final RxList<ChatMessage> messages = <ChatMessage>[].obs;
  final RxBool isLoading = false.obs;

  // Online status (optional)
  final RxBool isReceiverOnline = false.obs;

  final TextEditingController inputCtrl = TextEditingController();
  final ScrollController scrollCtrl = ScrollController();

  StreamSubscription? _sub;

  @override
  void onInit() {
    super.onInit();

    print('🔷 ChatDetailController initialized');
    print('   My User ID: $myUserId');
    print('   Receiver ID: $receiverId');
    print('   Receiver Name: $receiverName');

    _sub = ws.events.listen((packet) {
      final event = packet["event"];
      final data = packet["data"];

      print('📨 Chat event received: $event');

      if (event == "fetchChats") {
        // data: [ {...}, {...} ]
        print(
          '📋 Received fetchChats with ${data is List ? data.length : 0} messages',
        );
        if (data is List) {
          final parsed = data
              .whereType<Map<String, dynamic>>()
              .map(ChatMessage.fromJson)
              .toList();

          messages.assignAll(parsed);
          print('✅ Loaded ${parsed.length} messages');
          _scrollToBottom();
        }
        isLoading.value = false;
      }

      if (event == "message") {
        // data: { ...message }
        print('💬 New message received');
        if (data is Map<String, dynamic>) {
          final msg = ChatMessage.fromJson(data);

          // Only add messages for THIS conversation
          final isThisChat =
              (msg.senderId == receiverId && msg.receiverId == myUserId) ||
              (msg.senderId == myUserId && msg.receiverId == receiverId);

          if (isThisChat) {
            // Avoid duplicates (optional)
            final exists = messages.any((m) => m.id == msg.id);
            if (!exists) {
              messages.add(msg);
              print('✅ Message added to list');
              _scrollToBottom();
            } else {
              print('⚠️ Duplicate message, skipped');
            }
          } else {
            print('⚠️ Message not for this chat, skipped');
          }
        }
      }

      if (event == "userStatus") {
        // { userId, isOnline }
        if (data is Map<String, dynamic>) {
          if (data["userId"] == receiverId) {
            isReceiverOnline.value = data["isOnline"] == true;
            print('👤 Receiver online status: ${isReceiverOnline.value}');
          }
        }
      }

      if (event == "socketError") {
        print('❌ Socket error received');
        isLoading.value = false;
      }
    });

    // Initial fetch
    loadChats();
  }

  @override
  void onClose() {
    _sub?.cancel();
    inputCtrl.dispose();
    scrollCtrl.dispose();
    super.onClose();
  }

  void loadChats() {
    print('📥 Loading chats for receiver: $receiverId');
    print('🔌 WebSocket connected: ${ws.isConnected.value}');

    if (!ws.isConnected.value) {
      print('❌ Cannot load chats - WebSocket not connected');
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    ws.fetchChats(receiverId);
    print('✅ fetchChats request sent');

    // Add timeout
    Future.delayed(const Duration(seconds: 5), () {
      if (isLoading.value) {
        print('⏱️ Timeout waiting for fetchChats response');
        isLoading.value = false;
      }
    });
  }

  void send() {
    final text = inputCtrl.text.trim();
    if (text.isEmpty) {
      print('⚠️ Cannot send empty message');
      return;
    }

    print('📤 Sending message: "$text"');
    print('   To: $receiverId');
    print('🔌 WebSocket connected: ${ws.isConnected.value}');

    if (!ws.isConnected.value) {
      print('❌ Cannot send - WebSocket not connected');
      return;
    }

    // Send to server
    ws.sendMessage(receiverId: receiverId, message: text);
    print('✅ Message sent to server');

    // Clear input (UI will update when server echoes event:"message")
    inputCtrl.clear();
  }

  void onBack() => Get.back();

  void _scrollToBottom() {
    // delay so list builds first
    Future.delayed(const Duration(milliseconds: 50), () {
      if (!scrollCtrl.hasClients) return;
      scrollCtrl.animateTo(
        scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  bool isMe(ChatMessage m) => m.senderId == myUserId;
}
