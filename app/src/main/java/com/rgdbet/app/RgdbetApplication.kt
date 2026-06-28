package com.rgdbet.app

import android.app.Application
import com.rgdbet.app.auth.AuthManager

class RgdbetApplication : Application() {
    lateinit var authManager: AuthManager
        private set

    override fun onCreate() {
        super.onCreate()
        authManager = AuthManager()
    }
}
