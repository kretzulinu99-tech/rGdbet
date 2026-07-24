package com.rgdbet.app

import android.app.Application
import com.rgdbet.app.auth.AuthManager
import com.rgdbet.app.billing.BillingManager
import com.rgdbet.app.billing.PremiumManager

class RgdbetApplication : Application() {
    lateinit var authManager: AuthManager
        private set
    lateinit var billingManager: BillingManager
        private set
    lateinit var premiumManager: PremiumManager
        private set

    override fun onCreate() {
        super.onCreate()
        authManager = AuthManager()
        billingManager = BillingManager(this)
        premiumManager = PremiumManager()
    }
}
