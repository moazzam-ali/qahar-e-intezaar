import WidgetKit
import SwiftUI

// MARK: - Shared types

/// Mirrors the JS-side compact timer payload written by `lib/shared-storage.ts`.
struct QaharTimer: Codable {
  let id: String
  let label: String
  let startedAt: Double // unix ms
  let pausedAt: Double?
  let accumulatedPause: Double
  let color: String
}

/// Reads timers + the user-selected widget id from the App Group's
/// UserDefaults. Returns `nil` if there are no usable timers.
enum QaharStore {
  static let appGroup = "group.com.qaharteam.qaharehijr"
  static let timersKey = "qahar.timers"
  static let widgetIdKey = "qahar.widgetTimerId"

  static func selectedTimer(for configId: String?) -> QaharTimer? {
    let defaults = UserDefaults(suiteName: appGroup)
    guard let raw = defaults?.string(forKey: timersKey),
          let data = raw.data(using: .utf8) else { return nil }
    let timers = (try? JSONDecoder().decode([QaharTimer].self, from: data)) ?? []
    if timers.isEmpty { return nil }
    let preferredId = configId ?? defaults?.string(forKey: widgetIdKey)
    if let id = preferredId, let match = timers.first(where: { $0.id == id }) {
      return match
    }
    return timers.first
  }
}

// MARK: - Timeline

struct QaharEntry: TimelineEntry {
  let date: Date
  /// "Effective start" — startedAt + accumulatedPause + (paused-extra). Letting
  /// SwiftUI's `Text(timerInterval:)` count up from this single anchor gives
  /// us the live tick for free.
  let effectiveStart: Date
  let label: String
  let isPaused: Bool
  let pausedSnapshot: TimeInterval?
  let accent: Color
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> QaharEntry {
    QaharEntry(
      date: .now,
      effectiveStart: .now.addingTimeInterval(-3600 * 24),
      label: "Since",
      isPaused: false,
      pausedSnapshot: nil,
      accent: Color(hex: "#B8826B")
    )
  }

  func snapshot(for configuration: SelectTimerIntent, in context: Context) async -> QaharEntry {
    entry(for: configuration.timerId)
  }

  func timeline(for configuration: SelectTimerIntent, in context: Context) async -> Timeline<QaharEntry> {
    let e = entry(for: configuration.timerId)
    // Single entry — SwiftUI handles ticking via Text(timerInterval:). We
    // refresh once an hour so the unit (h / d / mo / y) re-rolls cleanly.
    let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now.addingTimeInterval(3600)
    return Timeline(entries: [e], policy: .after(refresh))
  }

  private func entry(for configId: String?) -> QaharEntry {
    let now = Date()
    guard let timer = QaharStore.selectedTimer(for: configId) else {
      return QaharEntry(
        date: now,
        effectiveStart: now,
        label: "Add a timer",
        isPaused: true,
        pausedSnapshot: 0,
        accent: Color(hex: "#B8826B")
      )
    }

    let started = Date(timeIntervalSince1970: timer.startedAt / 1000)
    let pauseAccum = timer.accumulatedPause / 1000
    let effective = started.addingTimeInterval(pauseAccum)

    let isPaused = timer.pausedAt != nil
    let snapshot: TimeInterval? = timer.pausedAt.map { paused in
      let pausedDate = Date(timeIntervalSince1970: paused / 1000)
      return pausedDate.timeIntervalSince(effective)
    }

    return QaharEntry(
      date: now,
      effectiveStart: effective,
      label: timer.label,
      isPaused: isPaused,
      pausedSnapshot: snapshot,
      accent: Color(hex: timer.color)
    )
  }
}

// MARK: - Views

struct QaharWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: QaharEntry

  var body: some View {
    ZStack(alignment: .topLeading) {
      // Warm cream tint over the system material — fakes a glass panel.
      Color(hex: "#FBF6EE").opacity(0.72)
      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 8) {
          Circle()
            .fill(entry.accent)
            .frame(width: 6, height: 6)
          Text(entry.label)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Color(hex: "#6B6358"))
            .lineLimit(1)
        }
        Spacer(minLength: 0)
        elapsedView
        if family == .systemMedium {
          Text(startedSubtitle)
            .font(.system(size: 11))
            .foregroundColor(Color(hex: "#A89F90"))
        }
      }
      .padding(16)
    }
    .containerBackground(for: .widget) {
      Color(hex: "#FBF6EE")
    }
  }

  @ViewBuilder
  private var elapsedView: some View {
    if entry.isPaused, let snapshot = entry.pausedSnapshot {
      Text(formatCompact(seconds: snapshot))
        .font(.custom("Fraunces", size: family == .systemMedium ? 30 : 22))
        .foregroundColor(Color(hex: "#2A2520"))
        .monospacedDigit()
        .contentTransition(.numericText())
    } else {
      // The native count-up: Text(timerInterval:) ticks every second on the
      // OS side without burning power. .contentTransition gives smooth digit
      // changes; keep this view's life cycle minimal.
      Text(timerInterval: entry.effectiveStart...Date.distantFuture, countsDown: false)
        .font(.custom("Fraunces", size: family == .systemMedium ? 30 : 22))
        .foregroundColor(Color(hex: "#2A2520"))
        .monospacedDigit()
        .contentTransition(.numericText())
    }
  }

  private var startedSubtitle: String {
    let f = DateFormatter()
    f.dateFormat = "'since' d MMM yyyy"
    return f.string(from: entry.effectiveStart)
  }

  private func formatCompact(seconds: TimeInterval) -> String {
    let total = Int(seconds)
    let d = total / 86400
    let h = (total % 86400) / 3600
    let m = (total % 3600) / 60
    if d > 0 { return "\(d)d · \(h)h · \(m)m" }
    if h > 0 { return "\(h)h · \(m)m" }
    return "\(m)m"
  }
}

// MARK: - Widget

struct QaharWidget: Widget {
  let kind: String = "QaharWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: SelectTimerIntent.self,
      provider: Provider()
    ) { entry in
      QaharWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Qahar-e-Hijr")
    .description("Show how long it's been.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}

// MARK: - Color helpers

extension Color {
  init(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    let r = Double((v >> 16) & 0xFF) / 255.0
    let g = Double((v >> 8) & 0xFF) / 255.0
    let b = Double(v & 0xFF) / 255.0
    self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
  }
}
