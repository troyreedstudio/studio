import 'package:get/get.dart';
import 'package:pineapple/core/local/local_data.dart';
import 'package:pineapple/feature/auth/ui/1.login_ui.dart';

/// Checks whether the user is logged in (has a token).
/// If not, navigates to the login page and returns `false`.
/// If yes, returns `true` so the caller can proceed with the action.
///
/// Usage:
/// ```dart
/// if (!await AuthGuard.requireAuth()) return;
/// // ...proceed with booking / favourite / protected action
/// ```
class AuthGuard {
  static final _local = LocalService();

  /// Returns `true` when the user has a valid token.
  static Future<bool> isLoggedIn() async {
    final token = await _local.getValue<String>(PreferenceKey.token);
    return token != null && token.isNotEmpty;
  }

  /// Gate-keeps a protected action. Shows the login page when
  /// unauthenticated and returns `false`; returns `true` otherwise.
  static Future<bool> requireAuth() async {
    if (await isLoggedIn()) return true;
    Get.to(() => LoginPage());
    return false;
  }
}
