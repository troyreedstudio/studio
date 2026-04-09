import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pineapple/feature/chat_tab/ui/chat_message.dart';

/// Example Integration Guide
///
/// এই file টা একটা complete example যেটা দেখাবে কিভাবে
/// chat system integrate করতে হবে তোমার existing app এ

class ChatIntegrationExample extends StatelessWidget {
  const ChatIntegrationExample({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat Integration Example')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSection(
            title: '1️⃣ Setup WebSocket (Do this ONCE in main.dart)',
            code: '''
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Register WebSocket service
  await ChatWebSocketHelper.registerWebSocketService();
  
  runApp(MyApp());
}
''',
          ),
          const SizedBox(height: 24),
          _buildSection(
            title: '2️⃣ Connect After Login',
            code: '''
// In your LoginController
Future<void> onLoginSuccess(String token, String userId) async {
  final localService = LocalService();
  
  // Save credentials
  await localService.setValue(PreferenceKey.token, token);
  await localService.setValue(PreferenceKey.userId, userId);
  
  // Connect WebSocket
  await ChatWebSocketHelper.initializeWebSocket();
  
  // Navigate to home
  Get.offAllNamed('/home');
}
''',
          ),
          const SizedBox(height: 24),
          _buildActionButton(
            context,
            title: '3️⃣ Open Messages Page',
            subtitle: 'Tap to see the messages list',
            onTap: () {
              Get.to(() => const MessagesPage());
            },
          ),
          const SizedBox(height: 24),
          _buildSection(
            title: '4️⃣ Disconnect on Logout',
            code: '''
// In your LogoutController
Future<void> logout() async {
  // Disconnect WebSocket
  ChatWebSocketHelper.disconnectWebSocket();
  
  // Clear local data
  final localService = LocalService();
  await localService.clearAll();
  
  // Navigate to login
  Get.offAllNamed('/login');
}
''',
          ),
          const SizedBox(height: 24),
          _buildInfoCard(
            title: '📡 WebSocket Events',
            items: [
              'authenticate - Login to WebSocket',
              'messageList - Get all conversations',
              'fetchChats - Get messages with user',
              'message - Send/receive messages',
              'userStatus - Online/offline status',
            ],
          ),
          const SizedBox(height: 24),
          _buildInfoCard(
            title: '✨ Features',
            items: [
              'Real-time messaging',
              'Online status indicator',
              'Unread message count',
              'Auto-scroll to latest',
              'Pull to refresh',
              'Beautiful UI',
            ],
          ),
          const SizedBox(height: 24),
          _buildWarningCard(),
        ],
      ),
    );
  }

  Widget _buildSection({required String title, required String code}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SelectableText(
              code,
              style: const TextStyle(
                color: Colors.greenAccent,
                fontFamily: 'monospace',
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    BuildContext context, {
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.black87,
          child: Icon(Icons.chat, color: Colors.white),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: onTap,
      ),
    );
  }

  Widget _buildInfoCard({required String title, required List<String> items}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
          const SizedBox(height: 12),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontSize: 16)),
                  Expanded(child: Text(item)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarningCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Colors.orange),
              SizedBox(width: 8),
              Text(
                '⚠️ Important',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            '1. WebSocket service অবশ্যই main.dart এ register করতে হবে\n'
            '2. Login করার পর token এবং userId save করতে হবে\n'
            '3. WebSocket connect করার আগে token থাকতে হবে\n'
            '4. Logout করার সময় WebSocket disconnect করতে হবে',
            style: TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }
}

/// Test করার জন্য এই page টা open করো:
///
/// ```dart
/// Get.to(() => const ChatIntegrationExample());
/// ```
