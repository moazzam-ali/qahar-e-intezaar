package com.qaharteam.qaharehijr.widget

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * JS → native bridge. Writes timer payloads to SharedPreferences so the widget
 * provider can pick them up on its next refresh, and pokes the widget so the
 * user sees the change immediately rather than after the 60-second tick.
 */
class QaharWidgetBridgeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "QaharWidgetBridge"

  @ReactMethod
  fun setTimers(json: String, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        QaharWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE,
      )
      prefs.edit().putString(QaharWidgetProvider.KEY_TIMERS, json).apply()
      QaharWidgetProvider.refreshAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("write_failed", e)
    }
  }

  @ReactMethod
  fun setWidgetTimerId(id: String?, promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences(
        QaharWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE,
      )
      val editor = prefs.edit()
      if (id == null) editor.remove(QaharWidgetProvider.KEY_WIDGET_ID)
      else editor.putString(QaharWidgetProvider.KEY_WIDGET_ID, id)
      editor.apply()
      QaharWidgetProvider.refreshAll(reactApplicationContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("write_failed", e)
    }
  }
}
