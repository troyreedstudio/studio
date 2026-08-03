import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  // v1.3.3+35: direct tap wire, take two. Device syslog for build 34
  // proved didReceive fires, but the channel stored at engine-init time
  // was a dud (no Dart print, no invoke). Now the channel is built
  // LAZILY at tap time from the live FlutterViewController's messenger,
  // with retries for cold starts, and NSLog breadcrumbs at every step.

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    // v1.3.3+30: with the implicit-engine AppDelegate pattern, plugins
    // register AFTER didFinishLaunching, so firebase_messaging's
    // automatic APNs registration hook never fires — device syslog
    // showed zero apsd activity and "application without push
    // registration". Register with APNs explicitly; FIRMessaging's
    // swizzled callback still receives the token automatically.
    application.registerForRemoteNotifications()
    // v1.3.3+33: appoint a UNUserNotificationCenter delegate so
    // notification TAPS reach the app. Device syslog showed taps
    // arriving as UINotificationResponseAction and dying with
    // "Reply (error: response-not-possible)" because no delegate was
    // ever set (the implicit-engine template doesn't do it, and the
    // firebase_messaging swizzle only hooks a delegate that exists).
    // FlutterAppDelegate conforms and forwards to plugins, which is
    // how didReceiveNotificationResponse becomes onMessageOpenedApp
    // in Dart.
    UNUserNotificationCenter.current().delegate = self
    return result
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }

  // v1.3.3+35: ring Dart over a channel built fresh from the live
  // FlutterViewController. Retries cover cold starts where the tap
  // arrives before the Flutter view exists.
  private func ringTapWire(attempt: Int = 0) {
    if let controller = window?.rootViewController as? FlutterViewController {
      NSLog("[pp-push] tap wire: invoking (attempt %d)", attempt)
      FlutterMethodChannel(
        name: "pp/push_taps", binaryMessenger: controller.binaryMessenger
      ).invokeMethod("tapped", arguments: nil)
    } else if attempt < 6 {
      NSLog("[pp-push] tap wire: no FlutterViewController yet (attempt %d), retrying", attempt)
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
        self?.ringTapWire(attempt: attempt + 1)
      }
    } else {
      NSLog("[pp-push] tap wire: gave up, no FlutterViewController")
    }
  }

  // The doorbell. Build-34 syslog proved this fires; it also warned the
  // completion handler was never called (super shirks it when no plugin
  // claims the event), so we call it ourselves and skip super entirely.
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    NSLog("[pp-push] didReceive notification tap")
    ringTapWire()
    completionHandler()
  }
}
