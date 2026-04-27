package com.qaharteam.qaharehijr.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import com.qaharteam.qaharehijr.R
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Home-screen widget for Qahar-e-Hijr.
 *
 * Refresh strategy: AppWidgetManager wakes us once per minute via the
 * `updatePeriodMillis` declaration in `qahar_widget_info.xml`. Sub-minute
 * updates are not permitted by the OS — the elapsed string is rounded to
 * minute precision to match.
 */
class QaharWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    appWidgetIds.forEach { id ->
      appWidgetManager.updateAppWidget(id, buildRemoteViews(context))
    }
  }

  companion object {
    const val PREFS_NAME = "qahar_shared"
    const val KEY_TIMERS = "qahar.timers"
    const val KEY_WIDGET_ID = "qahar.widgetTimerId"

    /**
     * Called from the JS bridge after every mutation so the user sees changes
     * promptly instead of waiting for the next 1-minute refresh.
     */
    fun refreshAll(context: Context) {
      val mgr = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, QaharWidgetProvider::class.java)
      val ids = mgr.getAppWidgetIds(component)
      if (ids.isEmpty()) return
      ids.forEach { mgr.updateAppWidget(it, buildRemoteViews(context)) }
    }

    private fun buildRemoteViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.qahar_widget_layout)
      val timer = readSelectedTimer(context)

      if (timer == null) {
        views.setTextViewText(R.id.widget_label_main, "Add a timer")
        views.setTextViewText(R.id.widget_elapsed, "—")
        views.setTextViewText(R.id.widget_label, "")
        // Tint the dot via setColorFilter — it's an ImageView in the layout.
        views.setInt(
          R.id.widget_dot,
          "setColorFilter",
          Color.parseColor("#B8826B"),
        )
      } else {
        views.setTextViewText(R.id.widget_label_main, timer.label)
        views.setTextViewText(
          R.id.widget_elapsed,
          formatCompact(elapsedMs(timer)),
        )
        views.setTextViewText(
          R.id.widget_label,
          "since ${formatStartedLine(timer.startedAt)}",
        )
        views.setInt(
          R.id.widget_dot,
          "setColorFilter",
          parseColorOrFallback(timer.color),
        )
      }

      // Tap → open the app
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else
          PendingIntent.FLAG_UPDATE_CURRENT
        val pi = PendingIntent.getActivity(context, 0, launch, flags)
        views.setOnClickPendingIntent(R.id.widget_root, pi)
      }

      return views
    }

    private data class TimerSnapshot(
      val id: String,
      val label: String,
      val startedAt: Long,
      val pausedAt: Long?,
      val accumulatedPause: Long,
      val color: String
    )

    private fun readSelectedTimer(context: Context): TimerSnapshot? {
      val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_TIMERS, null) ?: return null
      val selectedId = prefs.getString(KEY_WIDGET_ID, null)
      val arr = try { JSONArray(raw) } catch (_: Exception) { return null }
      if (arr.length() == 0) return null

      var fallback: TimerSnapshot? = null
      for (i in 0 until arr.length()) {
        val o = arr.optJSONObject(i) ?: continue
        val snapshot = TimerSnapshot(
          id = o.optString("id"),
          label = o.optString("label", ""),
          startedAt = o.optDouble("startedAt", 0.0).toLong(),
          pausedAt = if (o.isNull("pausedAt")) null else o.optDouble("pausedAt").toLong(),
          accumulatedPause = o.optDouble("accumulatedPause", 0.0).toLong(),
          color = o.optString("color", "#B8826B")
        )
        if (snapshot.id == selectedId) return snapshot
        if (fallback == null) fallback = snapshot
      }
      return fallback
    }

    private fun elapsedMs(t: TimerSnapshot): Long {
      val ref = t.pausedAt ?: System.currentTimeMillis()
      return (ref - t.startedAt - t.accumulatedPause).coerceAtLeast(0L)
    }

    /**
     * Magnitude-aware compact format. Mirrors `QaharFormat.compact` in
     * QaharWidget.swift word-for-word so iOS and Android render identically.
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
      val minutes = r / min
      return when {
        years > 0 -> "${years}y · ${months}mo · ${days}d"
        months > 0 -> "${months}mo · ${days}d · ${hours}h"
        days > 0 -> "${days}d · ${hours}h · ${minutes}m"
        hours > 0 -> "${hours}h · ${minutes}m"
        else -> "${minutes}m"
      }
    }

    private fun formatStartedLine(startedAt: Long): String {
      return SimpleDateFormat("d MMM yyyy", Locale.getDefault())
        .format(Date(startedAt))
    }

    private fun parseColorOrFallback(hex: String): Int {
      return try { Color.parseColor(hex) } catch (_: Exception) { Color.parseColor("#B8826B") }
    }
  }
}
