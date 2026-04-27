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
    let minutes = r / minute

    if years > 0 { return "\(years)y · \(months)mo · \(days)d" }
    if months > 0 { return "\(months)mo · \(days)d · \(hours)h" }
    if days > 0 { return "\(days)d · \(hours)h · \(minutes)m" }
    if hours > 0 { return "\(hours)h · \(minutes)m" }
    return "\(minutes)m"
  }
}

// MARK: - Timeline

struct QaharEntry: TimelineEntry {
  /// Anchor time the entry was generated for. SwiftUI uses this to schedule
  /// the next render against the entries we returned.
  let date: Date
  /// "Effective start" — startedAt + accumulatedPause. Letting SwiftUI's
  /// `Text(timerInterval:)` count up from this single anchor gives a free
  /// live tick on short timers.
  let effectiveStart: Date
  let label: String
  let isPaused: Bool
  /// Pre-computed magnitude string for medium-and-longer timers / paused state.
  let pausedSnapshot: String?
  let accent: Color
  /// True for timers under 1 hour — small enough that the OS-driven HH:MM:SS
  /// tick reads cleanly. Beyond that we fall back to the magnitude format,
  /// refreshed once per minute via timeline entries.
  let useLiveTick: Bool
}

@available(iOS 17.0, *)
struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> QaharEntry {
    QaharEntry(
      date: .now,
      effectiveStart: .now.addingTimeInterval(-3600 * 24),
      label: "Since",
      isPaused: false,
      pausedSnapshot: "1d · 0h · 0m",
      accent: Color(hex: "#B8826B"),
      useLiveTick: false
    )
  }

  func snapshot(for configuration: SelectTimerIntent, in context: Context) async -> QaharEntry {
    entry(for: configuration.timerId, at: .now)
  }

  /// We emit a window of entries spaced one minute apart, each with its own
  /// pre-computed magnitude string. This gives readable widget text without
  /// the OS having to wake us every second. After the window expires, the
  /// timeline policy schedules a refresh.
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
        pausedSnapshot: nil,
        accent: Color(hex: "#B8826B"),
        useLiveTick: false
      )
    }

    let started = Date(timeIntervalSince1970: timer.startedAt / 1000)
    let pauseAccum = timer.accumulatedPause / 1000
    let effective = started.addingTimeInterval(pauseAccum)

    let isPaused = timer.pausedAt != nil
    let snapshotSeconds: TimeInterval = {
      if let pausedMs = timer.pausedAt {
        let pausedDate = Date(timeIntervalSince1970: pausedMs / 1000)
        return max(0, pausedDate.timeIntervalSince(effective))
      }
      return max(0, at.timeIntervalSince(effective))
    }()

    let liveOk = !isPaused && snapshotSeconds < 3600 // live HH:MM:SS only under 1h

    return QaharEntry(
      date: at,
      effectiveStart: effective,
      label: timer.label,
      isPaused: isPaused,
      pausedSnapshot: liveOk ? nil : QaharFormat.compact(elapsedSeconds: snapshotSeconds),
      accent: Color(hex: timer.color),
      useLiveTick: liveOk
    )
  }
}

// MARK: - Views

@available(iOS 17.0, *)
struct QaharWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: QaharEntry

  var body: some View {
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
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(for: .widget) {
      Color(hex: "#FBF6EE")
    }
  }

  @ViewBuilder
  private var elapsedView: some View {
    let size: CGFloat = family == .systemMedium ? 30 : 22
    Group {
      if entry.useLiveTick {
        // Sub-1h timer: native OS tick via Text(timerInterval:). This is the
        // only widget API that updates per second without the timeline waking
        // the extension.
        Text(timerInterval: entry.effectiveStart...Date.distantFuture, countsDown: false)
      } else if let snap = entry.pausedSnapshot {
        Text(snap)
      } else {
        Text("—")
      }
    }
    .font(.custom("Fraunces", size: size))
    .foregroundColor(Color(hex: "#2A2520"))
    .monospacedDigit()
    .contentTransition(.numericText())
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
