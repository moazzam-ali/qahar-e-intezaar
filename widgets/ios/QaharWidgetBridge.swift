import Foundation
import WidgetKit

/// Native module added to the main app target (not the widget). Writes the
/// JS-supplied JSON blob into the App Group's UserDefaults so the widget
/// extension can read it on its next refresh, then nudges WidgetKit to refresh
/// timelines so the user sees the change quickly.
@objc(QaharWidgetBridge)
class QaharWidgetBridge: NSObject {
  static let appGroup = "group.com.qaharteam.qaharehijr"
  static let timersKey = "qahar.timers"
  static let widgetIdKey = "qahar.widgetTimerId"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func setTimers(_ json: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
      reject("no_app_group", "App Group \(Self.appGroup) is unavailable", nil)
      return
    }
    defaults.set(json, forKey: Self.timersKey)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(nil)
  }

  @objc func setWidgetTimerId(_ id: NSString?,
                              resolver resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
      reject("no_app_group", "App Group \(Self.appGroup) is unavailable", nil)
      return
    }
    if let id = id as String? {
      defaults.set(id, forKey: Self.widgetIdKey)
    } else {
      defaults.removeObject(forKey: Self.widgetIdKey)
    }
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(nil)
  }
}
