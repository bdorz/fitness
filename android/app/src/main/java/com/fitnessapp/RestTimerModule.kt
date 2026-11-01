package com.fitnessapp

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.CountDownTimer
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.ceil

class RestTimerModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private var countDownTimer: CountDownTimer? = null
  private var timerId: String? = null
  private var exerciseName: String? = null
  private var endsAtMillis: Long = 0

  override fun getName() = NAME

  @ReactMethod
  fun startTimer(
    nextTimerId: String,
    nextExerciseName: String,
    durationSeconds: Double,
    promise: Promise,
  ) {
    val durationMillis = durationSeconds.toLong().coerceAtLeast(1L) * 1000L
    cancelCurrentTimer(false)

    timerId = nextTimerId
    exerciseName = nextExerciseName
    endsAtMillis = System.currentTimeMillis() + durationMillis

    countDownTimer = object : CountDownTimer(durationMillis, 250L) {
      override fun onTick(millisUntilFinished: Long) {
        emitTick(ceil(millisUntilFinished / 1000.0).toInt())
      }

      override fun onFinish() {
        val finishedId = timerId ?: nextTimerId
        val finishedName = exerciseName ?: nextExerciseName
        countDownTimer = null
        timerId = null
        exerciseName = null
        endsAtMillis = 0
        vibrate()
        showNotification(finishedName)
        emitFinished(finishedId, finishedName)
      }
    }.start()

    emitTick(durationSeconds.toInt())
    promise.resolve(null)
  }

  @ReactMethod
  fun cancelTimer(promise: Promise) {
    cancelCurrentTimer(true)
    promise.resolve(null)
  }

  @ReactMethod
  fun getTimerState(promise: Promise) {
    val activeTimerId = timerId
    val activeExerciseName = exerciseName
    val result = Arguments.createMap()
    val isActive = activeTimerId != null && endsAtMillis > System.currentTimeMillis()
    result.putBoolean("active", isActive)
    if (isActive && activeExerciseName != null) {
      result.putString("timerId", activeTimerId)
      result.putString("exerciseName", activeExerciseName)
      result.putInt(
        "remainingSeconds",
        ceil((endsAtMillis - System.currentTimeMillis()) / 1000.0).toInt(),
      )
    }
    promise.resolve(result)
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  private fun cancelCurrentTimer(emitCancellation: Boolean) {
    countDownTimer?.cancel()
    countDownTimer = null
    timerId = null
    exerciseName = null
    endsAtMillis = 0
    if (emitCancellation) {
      emit(EVENT_CANCELLED, null)
    }
  }

  private fun emitTick(remainingSeconds: Int) {
    val currentId = timerId ?: return
    val currentName = exerciseName ?: return
    val payload = Arguments.createMap().apply {
      putString("timerId", currentId)
      putString("exerciseName", currentName)
      putInt("remainingSeconds", remainingSeconds)
    }
    emit(EVENT_TICK, payload)
  }

  private fun emitFinished(finishedId: String, finishedName: String) {
    val payload = Arguments.createMap().apply {
      putString("timerId", finishedId)
      putString("exerciseName", finishedName)
    }
    emit(EVENT_FINISHED, payload)
  }

  private fun emit(eventName: String, payload: Any?) {
    if (!reactContext.hasActiveReactInstance()) return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  private fun vibrate() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      reactContext.getSystemService(VibratorManager::class.java).defaultVibrator
    } else {
      reactContext.getSystemService(Vibrator::class.java)
    }
    val pattern = longArrayOf(0L, 450L, 200L, 450L)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(pattern, -1)
    }
  }

  private fun showNotification(finishedExerciseName: String) {
    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      reactContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
        PackageManager.PERMISSION_GRANTED
    ) return

    val manager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "組間休息計時",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "組間休息倒數完成通知"
        enableVibration(true)
        vibrationPattern = longArrayOf(0L, 450L, 200L, 450L)
      }
      manager.createNotificationChannel(channel)
    }

    val launchIntent = Intent(reactContext, MainActivity::class.java)
    val pendingIntent = PendingIntent.getActivity(
      reactContext,
      NOTIFICATION_ID,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(reactContext, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(reactContext)
    }
    builder
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("組間休息結束")
      .setContentText("$finishedExerciseName 可以開始下一組了")
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_ALARM)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      builder.setPriority(Notification.PRIORITY_HIGH)
    }

    manager.notify(NOTIFICATION_ID, builder.build())
  }

  companion object {
    const val NAME = "RestTimer"
    private const val EVENT_TICK = "RestTimerTick"
    private const val EVENT_FINISHED = "RestTimerFinished"
    private const val EVENT_CANCELLED = "RestTimerCancelled"
    private const val CHANNEL_ID = "rest_timer"
    private const val NOTIFICATION_ID = 2107
  }
}
