package com.rgdbet.app.ui

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.rgdbet.app.RgdbetApplication
import com.rgdbet.app.auth.AuthState
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val authManager = (application as RgdbetApplication).authManager

        lifecycleScope.launch {
            Log.d("SplashActivity", "Checking auth state...")
            // Așteptăm starea, dar cu un timeout de 3 secunde pentru siguranță
            val state = withTimeoutOrNull(3000) {
                authManager.authState.first { it !is AuthState.Loading }
            }

            Log.d("SplashActivity", "State received: $state")

            val next = if (state is AuthState.SignedIn) {
                Intent(this@SplashActivity, MainActivity::class.java)
            } else {
                Intent(this@SplashActivity, LoginActivity::class.java)
            }
            startActivity(next)
            finish()
        }
    }
}
