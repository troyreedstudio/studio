class MessageModel {
  final String id;
  final String senderId;
  final String senderName;
  final String senderEmail;
  final String senderProfileImage;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final bool isOnline;
  final bool? isVerified;

  MessageModel({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderEmail,
    required this.senderProfileImage,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.isOnline = false,
    this.isVerified = false,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    // 🔥 Actual API response structure:
    // {
    //   "user": { "id", "email", "fullName", "profileImage", "role" },
    //   "lastMessage": { "id", "senderId", "receiverId", "message", "createdAt", "isRead" }
    // }

    final user = json['user'] as Map<String, dynamic>?;
    final lastMsg = json['lastMessage'] as Map<String, dynamic>?;

    // Only count as unread if:
    // 1. Message is not read (isRead == false)
    // 2. The user in the conversation is the SENDER (meaning I'm the receiver)
    // Because API returns the OTHER user's info, not mine
    final isUnread = lastMsg?['isRead'] == false;

    return MessageModel(
      id: user?['id'] ?? '',
      senderId: user?['id'] ?? '',
      senderName: user?['fullName'] ?? 'Unknown',
      senderEmail: user?['email'] ?? '',
      senderProfileImage: user?['profileImage'] ?? '',
      lastMessage: lastMsg?['message'] ?? '',
      lastMessageTime: lastMsg?['createdAt'] != null
          ? DateTime.parse(lastMsg!['createdAt'])
          : DateTime.now(),
      unreadCount: isUnread ? 1 : 0,
      isOnline: false, // Will be updated via userStatus event
      isVerified: user?['role'] == 'VERIFIED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'senderId': senderId,
      'senderName': senderName,
      'senderEmail': senderEmail,
      'senderProfileImage': senderProfileImage,
      'lastMessage': lastMessage,
      'lastMessageTime': lastMessageTime.toIso8601String(),
      'unreadCount': unreadCount,
      'isOnline': isOnline,
      'isVerified': isVerified,
    };
  }

  MessageModel copyWith({int? unreadCount}) {
    return MessageModel(
      id: id,
      senderId: senderId,
      senderName: senderName,
      senderEmail: senderEmail,
      senderProfileImage: senderProfileImage,
      lastMessage: lastMessage,
      lastMessageTime: lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
      isOnline: isOnline,
      isVerified: isVerified,
    );
  }

  String get formattedTime {
    final now = DateTime.now();
    final difference = now.difference(lastMessageTime);

    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m';
    if (difference.inHours < 24) return '${difference.inHours}h';
    if (difference.inDays < 7) return '${difference.inDays}d';
    return '${(difference.inDays / 7).floor()}w';
  }
}

class ChatMessage {
  final String id;
  final String senderId;
  final String receiverId;
  final String message;
  final String roomId;
  final DateTime createdAt;
  final bool isRead;
  final String? messageType;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.message,
    required this.roomId,
    required this.createdAt,
    this.isRead = false,
    this.messageType = 'text',
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['_id'] ?? json['id'] ?? '',
      senderId: json['senderId'] ?? '',
      receiverId: json['receiverId'] ?? '',
      message: json['message'] ?? '',
      roomId: json['roomId'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      isRead: json['isRead'] ?? false,
      messageType: json['messageType'] ?? 'text',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'senderId': senderId,
      'receiverId': receiverId,
      'message': message,
      'roomId': roomId,
      'createdAt': createdAt.toIso8601String(),
      'isRead': isRead,
      'messageType': messageType,
    };
  }
}
