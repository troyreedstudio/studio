import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
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
    return result
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
