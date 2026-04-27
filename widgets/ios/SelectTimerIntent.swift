import AppIntents
import WidgetKit

/// User-configurable "which timer should this widget show?" intent.
///
/// We don't enumerate timers as dynamic options here — that would require a
/// separate IntentExtension target. Instead, the user picks the widget's
/// timer from inside the app (Settings → Widget). The widget falls back to
/// `qahar.widgetTimerId` from the shared store.
struct SelectTimerIntent: AppIntent, WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose Timer"
  static var description = IntentDescription("Pick which timer the widget shows.")

  /// Optional id override. When nil, the widget reads the app-side selection.
  @Parameter(title: "Timer ID")
  var timerId: String?

  init(timerId: String? = nil) {
    self.timerId = timerId
  }

  init() {}
}
