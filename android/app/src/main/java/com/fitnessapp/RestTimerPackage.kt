package com.fitnessapp

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RestTimerPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == RestTimerModule.NAME) RestTimerModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      RestTimerModule.NAME to ReactModuleInfo(
        RestTimerModule.NAME,
        RestTimerModule::class.java.name,
        false,
        false,
        false,
        false,
      ),
    )
  }
}
