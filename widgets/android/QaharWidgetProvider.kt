package com.qaharteam.qaharehijr.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.widget.RemoteViews
import com.qaharteam.qaharehijr.R
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Home-screen widget for Qahar-e-Hijr.
 *
 * Refresh strategy (two layers, both robust):
 *
 *   1. The seconds line is a `Chronometer` view. RemoteViews supports
 *      `setChronometer`, so the OS animates the clock every second without
 *      ever waking us. This is the only way to get sub-minute resolution on
 *      a stock Android home screen (`updatePeriodMillis` is clamped to 30 min).
 *
 *   2. The magnitude line ("12d · 4h · 23m") is plain text and only needs to
 *      tick once per minute. We schedule a self-targeting AlarmManager intent
 *      to re-render the views aligned to the next minute boundary. The alarm
 *      is opportunistic (`set`, not exact) so it costs nothing in Doze.
 *
 * Defensiveness contract: nothing in this file is allowed to throw across the
 * AppWidget host's binder boundary. Every public override and every helper
 * called from one wraps its body in try/catch — if anything goes wrong we log
 * and bail rather than crash the launcher (which is what surfaces in Samsung
 * One UI as the gray "Couldn't load widget" tile).
 */
class QaharWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    try {
      val views = buildRemoteViews(context)
      appWidgetIds.forEach { id ->
        try {
          appWidgetManager.updateAppWidget(id, views)
        } catch (t: Throwable) {
          Log.w(TAG, "updateAppWidget($id) failed", t)
        }
      }
    } catch (t: Throwable) {
      Log.w(TAG, "onUpdate failed", t)
    }
    // Alarm scheduling MUST NOT throw out of onUpdate — the host has already
    // received our views by this point and the widget should be visible.
    try { scheduleNextTick(context) } catch (t: Throwable) {
      Log.w(TAG, "scheduleNextTick failed", t)
    }
  }

  override fun onEnabled(context: Context) {
    super.onEnabled(context)
    try { scheduleNextTick(context) } catch (t: Throwable) {
      Log.w(TAG, "scheduleNextTick(onEnabled) failed", t)
    }
  }

  override fun onDisabled(context: Context) {
    super.onDisabled(context)
    try { cancelTick(context) } catch (t: Throwable) {
      Log.w(TAG, "cancelTick failed", t)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    try {
      super.onReceive(context, intent)
    } catch (t: Throwable) {
      Log.w(TAG, "super.onReceive failed", t)
    }
    if (intent.action == ACTION_TICK) {
      try {
        refreshAll(context)
        scheduleNextTick(context)
      } catch (t: Throwable) {
        Log.w(TAG, "tick refresh failed", t)
      }
    }
  }

  companion object {
    private const val TAG = "QaharWidget"
    const val PREFS_NAME = "qahar_shared"
    const val KEY_TIMERS = "qahar.timers"
    const val KEY_WIDGET_ID = "qahar.widgetTimerId"
    const val ACTION_TICK = "com.qaharteam.qaharehijr.widget.ACTION_TICK"
    private const val TICK_REQUEST_CODE = 0x71A4 // arbitrary, stable across rebuilds
    private const val DEFAULT_ACCENT_HEX = "#B8826B"
    private const val FALLBACK_ACCENT_INT = 0xFFB8826B.toInt()

    /** Lazy color parse — never blows up class loading even on bad inputs. */
    private fun defaultAccent(): Int = parseColorOrFallback(DEFAULT_ACCENT_HEX)

    /**
     * Called from the JS bridge after every mutation so the user sees changes
     * promptly instead of waiting for the next tick.
     */
    fun refreshAll(context: Context) {
      val mgr = try { AppWidgetManager.getInstance(context) } catch (_: Throwable) { null }
        ?: return
      val component = ComponentName(context, QaharWidgetProvider::class.java)
      val ids = try { mgr.getAppWidgetIds(component) } catch (_: Throwable) { return }
      if (ids.isEmpty()) return
      val views = try { buildRemoteViews(context) } catch (t: Throwable) {
        Log.w(TAG, "refreshAll buildRemoteViews failed", t); return
      }
      ids.forEach { id ->
        try { mgr.updateAppWidget(id, views) } catch (t: Throwable) {
          Log.w(TAG, "refreshAll updateAppWidget($id) failed", t)
        }
      }
    }

    private fun buildRemoteViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.qahar_widget_layout)
      val timer = readSelectedTimer(context)

      if (timer == null) {
        views.setTextViewText(R.id.widget_label_main, "Add a timer")
        views.setTextViewText(R.id.widget_elapsed, "—")
        views.setTextViewText(R.id.widget_label, "Tap to open")
        // Stop the chronometer at zero and hide it. View.GONE = 8.
        views.setChronometer(R.id.widget_seconds, SystemClock.elapsedRealtime(), null, false)
        views.setViewVisibility(R.id.widget_seconds, 8)
        views.setInt(R.id.widget_dot, "setColorFilter", defaultAccent())
      } else {
        val elapsed = elapsedMs(timer)
        val isPaused = timer.pausedAt != null

        views.setTextViewText(R.id.widget_label_main, timer.label.ifBlank { "Timer" })
        views.setTextViewText(R.id.widget_elapsed, formatCompact(elapsed))
        views.setTextViewText(
          R.id.widget_label,
          (if (isPaused) "paused · since " else "since ") +
            formatStartedLine(timer.startedAt),
        )

        // Anchor the Chronometer so it reads the timer's elapsed value.
        // base = elapsedRealtime() - elapsedMs ⇒ chronometer value === elapsedMs
        // and increments live every second when started. View.VISIBLE = 0.
        val base = SystemClock.elapsedRealtime() - elapsed
        views.setChronometer(R.id.widget_seconds, base, null, !isPaused)
        views.setViewVisibility(R.id.widget_seconds, 0)

        views.setInt(R.id.widget_dot, "setColorFilter", parseColorOrFallback(timer.color))
      }

      try {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launch != null) {
          val pi = PendingIntent.getActivity(context, 0, launch, pendingIntentFlags())
          views.setOnClickPendingIntent(R.id.widget_root, pi)
        }
      } catch (t: Throwable) {
        Log.w(TAG, "set click intent failed", t)
      }

      return views
    }

    private fun pendingIntentFlags(): Int {
      // FLAG_IMMUTABLE is required on Android 12+ when not using mutable extras.
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      else
        PendingIntent.FLAG_UPDATE_CURRENT
    }

    private fun tickPendingIntent(context: Context): PendingIntent {
      val intent = Intent(context, QaharWidgetProvider::class.java).apply {
        action = ACTION_TICK
        // Explicit intent (component set) — setPackage is belt-and-braces for
        // Android 14+'s strict broadcast targeting.
        setPackage(context.packageName)
      }
      return PendingIntent.getBroadcast(
        context,
        TICK_REQUEST_CODE,
        intent,
        pendingIntentFlags(),
      )
    }

    private fun scheduleNextTick(context: Context) {
      val mgr = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
      val pi = tickPendingIntent(context)
      // Align the next refresh to the upcoming minute boundary so the
      // magnitude string flips at the same moment the chronometer rolls
      // through 00 seconds.
      val nowMs = System.currentTimeMillis()
      val next = nowMs + (60_000L - (nowMs % 60_000L))
      try {
        // `set` (inexact) is fine — minute precision is the goal; we don't
        // want to burn the SCHEDULE_EXACT_ALARM permission for a widget.
        mgr.set(AlarmManager.RTC, next, pi)
      } catch (_: SecurityException) {
        // Some OEMs restrict background alarm scheduling. Live seconds still
        // work via the chronometer, so this is non-fatal.
      } catch (_: Throwable) {
      }
    }

    private fun cancelTick(context: Context) {
      val mgr = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
      try {
        mgr.cancel(tickPendingIntent(context))
      } catch (_: Throwable) {
      }
    }

    private data class TimerSnapshot(
      val id: String,
      val label: String,
      val startedAt: Long,
      val pausedAt: Long?,
      val accumulatedPause: Long,
      val color: String,
      val archived: Boolean,
    )

    private fun readSelectedTimer(context: Context): TimerSnapshot? {
      val prefs: SharedPreferences = try {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      } catch (_: Throwable) {
        // Direct-boot / locked-profile path can throw on older OEMs.
        return null
      }
      val raw = try { prefs.getString(KEY_TIMERS, null) } catch (_: Throwable) { null }
        ?: return null
      val selectedId = try { prefs.getString(KEY_WIDGET_ID, null) } catch (_: Throwable) { null }
      val arr = try { JSONArray(raw) } catch (_: Exception) { return null }
      if (arr.length() == 0) return null

      var match: TimerSnapshot? = null
      var fallback: TimerSnapshot? = null
      for (i in 0 until arr.length()) {
        val o = arr.optJSONObject(i) ?: continue
        val id = o.optString("id", "")
        if (id.isEmpty()) continue
        val startedAt = o.optDouble("startedAt", 0.0).toLong()
        if (startedAt <= 0L) continue

        val pausedAt = if (o.isNull("pausedAt")) null
          else o.optDouble("pausedAt", 0.0).toLong().takeIf { it > 0L }
        val snapshot = TimerSnapshot(
          id = id,
          label = o.optString("label", ""),
          startedAt = startedAt,
          pausedAt = pausedAt,
          accumulatedPause = o.optDouble("accumulatedPause", 0.0).toLong()
            .coerceAtLeast(0L),
          color = o.optString("color", DEFAULT_ACCENT_HEX),
          archived = o.optBoolean("archived", false),
        )
        if (snapshot.archived) continue
        if (snapshot.id == selectedId) {
          match = snapshot
          break
        }
        if (fallback == null) fallback = snapshot
      }
      return match ?: fallback
    }

    private fun elapsedMs(t: TimerSnapshot): Long {
      val ref = t.pausedAt ?: System.currentTimeMillis()
      return (ref - t.startedAt - t.accumulatedPause).coerceAtLeast(0L)
    }

    /**
     * Magnitude-aware compact format. Mirrors `QaharFormat.compact` in
     * QaharWidget.swift word-for-word so iOS and Android render identically.
     * Seconds segment is appended at <1h scale; the live Chronometer below
     * the magnitude line carries the seconds tick at every other scale.
     */
    private fun formatCompact(ms: Long): String {
      val sec = 1000L
      val min = 60 * sec
      val hour = 60 * min
      val day = 24 * hour
      val month = (30.4375 * day).toLong()
      val year = (365.25 * day).toLong()

      var r = ms
      val years = r / year; r -= years * year
      val months = r / month; r -= months * month
      val days = r / day; r -= days * day
      val hours = r / hour; r -= hours * hour
      val minutes = r / min; r -= minutes * min
      val seconds = r / sec
      return when {
        years > 0 -> "${years}y · ${months}mo · ${days}d"
        months > 0 -> "${months}mo · ${days}d · ${hours}h"
        days > 0 -> "${days}d · ${hours}h · ${minutes}m"
        hours > 0 -> "${hours}h · ${minutes}m · ${pad2(seconds)}s"
        else -> "${minutes}m · ${pad2(seconds)}s"
      }
    }

    private fun pad2(n: Long): String = if (n < 10) "0$n" else n.toString()

    private fun formatStartedLine(startedAt: Long): String {
      return try {
        SimpleDateFormat("d MMM yyyy", Locale.getDefault()).format(Date(startedAt))
      } catch (_: Throwable) {
        ""
      }
    }

    private fun parseColorOrFallback(hex: String): Int {
      return try { Color.parseColor(hex) } catch (_: Exception) { FALLBACK_ACCENT_INT }
    }
  }
}
