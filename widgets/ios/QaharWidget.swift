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

// MARK: - Format

/// Magnitude-aware compact format. Matches the Android widget word-for-word
/// (formatCompact in QaharWidgetProvider.kt) so iOS and Android render the
/// same string given the same elapsed time.
enum QaharFormat {
  static func compact(elapsedSeconds: TimeInterval) -> String {
    let total = max(0, Int64(elapsedSeconds))
    let minute: Int64 = 60
    let hour = minute * 60
    let day = hour * 24
    let month = Int64(30.4375 * Double(day))
    let year = Int64(365.25 * Double(day))

    var r = total
    let years = r / year; r -= years * year
    let months = r / month; r -= months * month
    let days = r / day; r -= days * day
    let hours = r / hour; r -= hours * hour
    let minutes = r / minute; r -= minutes * minute
    let seconds = r

    if years > 0 { return "\(years)y · \(months)mo · \(days)d" }
    if months > 0 { return "\(months)mo · \(days)d · \(hours)h" }
    if days > 0 { return "\(days)d · \(hours)h · \(minutes)m" }
    if hours > 0 { return "\(hours)h · \(minutes)m · \(pad2(seconds))s" }
    return "\(minutes)m · \(pad2(seconds))s"
  }

  private static func pad2(_ n: Int64) -> String {
    return n < 10 ? "0\(n)" : "\(n)"
  }

  /// HH:MM:SS-style frozen readout used while the timer is paused (when we
  /// can't lean on Text(timerInterval:) for live ticking).
  static func clock(elapsedSeconds: TimeInterval) -> String {
    let total = max(0, Int64(elapsedSeconds))
    let h = total / 3600
    let m = (total % 3600) / 60
    let s = total % 60
    if h > 0 { return "\(h):\(pad2(m)):\(pad2(s))" }
    return "\(pad2(m)):\(pad2(s))"
  }
}

// MARK: - Timeline

struct QaharEntry: TimelineEntry {
  /// Anchor time the entry was generated for. SwiftUI uses this to schedule
  /// the next render against the entries we returned.
  let date: Date
  /// "Effective start" — startedAt + accumulatedPause. Letting SwiftUI's
  /// `Text(timerInterval:)` count up from this single anchor gives a free
  /// live tick.
  let effectiveStart: Date
  let label: String
  let isPaused: Bool
  /// Pre-computed magnitude string. Always present — refreshed once per
  /// minute via timeline entries. The magnitude line never carries seconds,
  /// because the live Text(timerInterval:) below it provides the tick.
  let magnitude: String
  let accent: Color
  /// When false (paused), we render the frozen magnitude only — no live tick.
  let showLiveTick: Bool
  /// Frozen "MM:SS" / "H:MM:SS" snapshot used while paused.
  let pausedClock: String?
}

@available(iOS 17.0, *)
struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> QaharEntry {
    QaharEntry(
      date: .now,
      effectiveStart: .now.addingTimeInterval(-3600 * 24),
      label: "Since",
      isPaused: false,
      magnitude: "1d · 0h · 0m",
      accent: Color(hex: "#B8826B"),
      showLiveTick: true,
      pausedClock: nil
    )
  }

  func snapshot(for configuration: SelectTimerIntent, in context: Context) async -> QaharEntry {
    entry(for: configuration.timerId, at: .now)
  }

  /// We emit a window of entries spaced one minute apart, each with its own
  /// pre-computed magnitude string. The seconds tick is rendered by SwiftUI's
  /// own `Text(timerInterval:)` so the OS animates the seconds for free —
  /// our timeline only carries minute-grained magnitude updates.
  func timeline(for configuration: SelectTimerIntent, in context: Context) async -> Timeline<QaharEntry> {
    let now = Date()
    let entries: [QaharEntry] = (0..<60).map { i in
      let at = now.addingTimeInterval(TimeInterval(i * 60))
      return entry(for: configuration.timerId, at: at)
    }
    let nextRefresh = now.addingTimeInterval(60 * 60) // hourly re-plan
    return Timeline(entries: entries, policy: .after(nextRefresh))
  }

  private func entry(for configId: String?, at: Date) -> QaharEntry {
    guard let timer = QaharStore.selectedTimer(for: configId) else {
      return QaharEntry(
        date: at,
        effectiveStart: at,
        label: "Add a timer",
        isPaused: true,
        magnitude: "—",
        accent: Color(hex: "#B8826B"),
        showLiveTick: false,
        pausedClock: nil
      )
    }

    let started = Date(timeIntervalSince1970: timer.startedAt / 1000)
    let pauseAccum = timer.accumulatedPause / 1000
    let effective = started.addingTimeInterval(pauseAccum)

    let isPaused = timer.pausedAt != nil
    let elapsedSeconds: TimeInterval = {
      if let pausedMs = timer.pausedAt {
        let pausedDate = Date(timeIntervalSince1970: pausedMs / 1000)
        return max(0, pausedDate.timeIntervalSince(effective))
      }
      return max(0, at.timeIntervalSince(effective))
    }()

    return QaharEntry(
      date: at,
      effectiveStart: effective,
      label: timer.label.isEmpty ? "Timer" : timer.label,
      isPaused: isPaused,
      magnitude: QaharFormat.compact(elapsedSeconds: elapsedSeconds),
      accent: Color(hex: timer.color),
      showLiveTick: !isPaused,
      pausedClock: isPaused ? QaharFormat.clock(elapsedSeconds: elapsedSeconds) : nil
    )
  }
}

// MARK: - Views

@available(iOS 17.0, *)
struct QaharWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: QaharEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
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
      magnitudeView
      secondsTickView
      if family == .systemMedium {
        Text(startedSubtitle)
          .font(.system(size: 11))
          .foregroundColor(Color(hex: "#A89F90"))
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(for: .widget) {
      Color(hex: "#FBF6EE")
    }
  }

  @ViewBuilder
  private var magnitudeView: some View {
    let size: CGFloat = family == .systemMedium ? 28 : 20
    Text(entry.magnitude)
      .font(.custom("Fraunces", size: size))
      .foregroundColor(Color(hex: "#2A2520"))
      .monospacedDigit()
      .contentTransition(.numericText())
      .lineLimit(1)
      .minimumScaleFactor(0.7)
  }

  @ViewBuilder
  private var secondsTickView: some View {
    Group {
      if entry.showLiveTick {
        // OS-driven per-second tick. Independent of timeline entries — this
        // is the only widget API that updates every second without waking
        // the extension.
        Text(timerInterval: entry.effectiveStart...Date.distantFuture,
             countsDown: false)
      } else if let frozen = entry.pausedClock {
        Text(frozen)
      } else {
        Text("")
      }
    }
    .font(.system(size: 13, weight: .medium))
    .foregroundColor(Color(hex: "#6B6358"))
    .monospacedDigit()
    .lineLimit(1)
  }

  private var startedSubtitle: String {
    let f = DateFormatter()
    f.dateFormat = "'since' d MMM yyyy"
    return f.string(from: entry.effectiveStart)
  }
}

// MARK: - Widget

@available(iOS 17.0, *)
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
