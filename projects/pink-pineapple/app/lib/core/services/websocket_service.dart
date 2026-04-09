import 'dart:async';
import 'dart:convert';

import 'package:get/get.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;

class WebSocketService extends GetxService {
  WebSocketChannel? _channel;

  final isConnected = false.obs;

  // Server -> Client events
  final _eventCtrl = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get events => _eventCtrl.stream;

  // Reconnect
  Timer? _reconnectTimer;
  int _retry = 0;

  Uri? _url;
  Map<String, String>? _headers;

  // Keep token to re-auth after reconnect
  String? _token;

  // ---------- CONNECT / DISCONNECT ----------
  Future<void> connect({
    required Uri url,
    Map<String, String>? headers,
    String? token, // optional: auto-auth on connect
  }) async {
    _url = url;
    _headers = headers;
    _token = token ?? _token;

    // already connected
    if (_channel != null) return;

    try {
      _channel = IOWebSocketChannel.connect(url, headers: headers);

      isConnected.value = true;
      _retry = 0;

      // Auto-auth if token exists
      if (_token != null) {
        authenticate(_token!);
      }

      _channel!.stream.listen(
        (data) {
          final ev = _parseEvent(data);
          if (ev != null) _eventCtrl.add(ev);
        },
        onError: (e) => _handleDisconnect(e.toString()),
        onDone: () => _handleDisconnect("closed"),
        cancelOnError: true,
      );
    } catch (e) {
      _handleDisconnect(e.toString());
    }
  }

  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    final ch = _channel;
    _channel = null;
    isConnected.value = false;

    await ch?.sink.close(status.normalClosure);
  }

  // ---------- SEND CORE ----------
  void send(Map<String, dynamic> payload) {
    final ch = _channel;
    if (ch == null) return;
    ch.sink.add(jsonEncode(payload));
  }

  // ---------- YOUR BACKEND EVENTS ----------
  void authenticate(String token) {
    _token = token;
    send({"event": "authenticate", "token": token});
  }

  void sendMessage({required String receiverId, required String message}) {
    send({"event": "message", "receiverId": receiverId, "message": message});
  }

  void fetchChats(String receiverId) {
    send({"event": "fetchChats", "receiverId": receiverId});
  }

  void messageList() {
    send({"event": "messageList"});
  }

  // ---------- INTERNAL HELPERS ----------
  Map<String, dynamic>? _parseEvent(dynamic data) {
    if (data is! String) return null;

    try {
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic>) return decoded;
      return {"event": "raw", "data": decoded};
    } catch (_) {
      return {"event": "raw", "data": data};
    }
  }

  void _handleDisconnect(String reason) {
    isConnected.value = false;

    // notify app
    _eventCtrl.add({"event": "socketError", "data": reason});

    _cleanupChannel();
    _scheduleReconnect();
  }

  void _cleanupChannel() {
    try {
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }

  void _scheduleReconnect() {
    // backoff: 1s, 2s, 4s, 8s... max 20s
    _reconnectTimer?.cancel();
    final delaySeconds = (1 << _retry).clamp(1, 20);
    _retry = (_retry + 1).clamp(0, 6);

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (_url != null) {
        connect(url: _url!, headers: _headers, token: _token);
      }
    });
  }

  @override
  void onClose() {
    _eventCtrl.close();
    super.onClose();
  }
}
