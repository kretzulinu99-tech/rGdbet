package com.rgdbet.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.rgdbet.app.RgdbetApplication
import com.rgdbet.app.auth.AuthState
import com.rgdbet.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val getFileLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (filePathCallback != null) {
            val results = if (uri != null) arrayOf(uri) else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView()
        setupBackNavigation()
    }

    override fun onResume() {
        super.onResume()
        syncUserToWebView()
    }

    private fun setupWebView() {
        binding.webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    syncUserToWebView()
                }
            }
            
            // Adăugăm interfața pentru JavaScript
            addJavascriptInterface(WebAppInterface(this@MainActivity), "Android")

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.filePathCallback = filePathCallback
                    getFileLauncher.launch("image/*")
                    return true
                }
            }

            loadUrl("file:///android_asset/index.html")
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun syncUserToWebView() {
        val authManager = (application as RgdbetApplication).authManager
        val currentUser = authManager.authState.value
        
        if (currentUser is AuthState.SignedIn) {
            val email = currentUser.email ?: ""
            val username = currentUser.displayName ?: email.substringBefore("@")
            
            val js = """
                (function() {
                    const existingUser = JSON.parse(localStorage.getItem('rgb_user') || '{}');
                    const user = {
                        username: "$username",
                        displayName: existingUser.displayName || "$username",
                        email: "$email",
                        passwordHash: "firebase_auth",
                        createdAt: "${System.currentTimeMillis()}",
                        avatar: existingUser.avatar || "👤",
                        theme: "neon",
                        language: "ro"
                    };
                    
                    // Salvăm în toate locațiile posibile folosite de scripturile web
                    const users = JSON.parse(localStorage.getItem('rgb_users_db') || '{}');
                    users["${username.lowercase()}"] = user;
                    localStorage.setItem('rgb_users_db', JSON.stringify(users));
                    localStorage.setItem('rgd_users', JSON.stringify(users)); // Compatibilitate auth.js
                    
                    const session = {
                        username: "$username",
                        email: "$email",
                        loginAt: new Date().toISOString()
                    };
                    localStorage.setItem('rgd_session', JSON.stringify(session));
                    localStorage.setItem('rgb_session', JSON.stringify(session));
                    
                    // Marcăm și cheia v3 dacă există
                    localStorage.setItem('rgb_user', JSON.stringify(user));
                    localStorage.setItem('rgd_user', JSON.stringify(user));

                    // Actualizăm bara de sus
                    if (typeof authUpdateTopBar === 'function') {
                        authUpdateTopBar(user);
                    }

                    // Ascundem ecranele de login/age gate locale
                    const authScreen = document.getElementById('auth-screen');
                    if (authScreen) authScreen.style.display = 'none';
                    const ageGate = document.getElementById('age-gate');
                    if (ageGate) ageGate.style.display = 'none';
                    
                    // Forțăm reconstrucția profilului
                    if (typeof buildProfileUI === 'function') {
                        buildProfileUI(user);
                    } else if (typeof buildProfilePage === 'function') {
                        buildProfilePage();
                    }
                    
                    // Afișăm butonul de profil și numele
                    const topBtn = document.getElementById('topUserBtn');
                    if (topBtn) topBtn.style.display = 'flex';
                    const nameEl = document.getElementById('topUsername');
                    if (nameEl) nameEl.textContent = "$username".toUpperCase().substring(0, 12);

                    const notifBtn = document.getElementById('topNotifBtn');
                    if (notifBtn) notifBtn.style.display = 'flex';
                    
                    // Sincronizăm UI-ul general
                    if (typeof render === 'function') render();
                })();
            """.trimIndent()
            
            binding.webView.evaluateJavascript(js, null)
        }
    }

    /** Interfață pentru a fi apelată din JavaScript (WebView) */
    class WebAppInterface(private val mContext: Context) {
        
        @JavascriptInterface
        fun logout() {
            val app = mContext.applicationContext as RgdbetApplication
            app.authManager.logout()
            
            // Curățăm cheile de sesiune din WebView
            if (mContext is MainActivity) {
                mContext.runOnUiThread {
                    mContext.binding.webView.evaluateJavascript(
                        "(function() { " +
                                "localStorage.removeItem('rgd_session'); " +
                                "localStorage.removeItem('rgb_session'); " +
                                "localStorage.removeItem('rgb_user'); " +
                                "})();",
                        null
                    )
                }
            }

            val intent = Intent(mContext, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            mContext.startActivity(intent)
        }

        @JavascriptInterface
        fun vibrate(milliseconds: Long) {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = mContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                mContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(milliseconds)
            }
        }
    }
}
