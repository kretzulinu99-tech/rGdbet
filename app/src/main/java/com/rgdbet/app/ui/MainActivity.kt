package com.rgdbet.app.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.rgdbet.app.RgdbetApplication
import com.rgdbet.app.auth.AuthState
import com.rgdbet.app.databinding.ActivityMainBinding
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    private val getFileLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (filePathCallback != null) {
            val results = if (uri != null) arrayOf(uri) else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    private val scanTicketLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { processImageForOCR(it) }
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
            val uid = currentUser.uid
            
            val js = """
                (function() {
                    window.nativeUID = "$uid";
                    const existingUser = JSON.parse(localStorage.getItem('rgb_user') || '{}');
                    const user = {
                        username: "$username",
                        email: "$email",
                        uid: "$uid",
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
                    localStorage.setItem('rgd_users', JSON.stringify(users));
                    
                    const session = {
                        username: "$username",
                        email: "$email",
                        loginAt: new Date().toISOString()
                    };
                    localStorage.setItem('rgd_session', JSON.stringify(session));
                    localStorage.setItem('rgb_session', JSON.stringify(session));
                    
                    localStorage.setItem('rgb_user', JSON.stringify(user));
                    localStorage.setItem('rgd_user', JSON.stringify(user));

                    if (typeof authUpdateTopBar === 'function') {
                        authUpdateTopBar(user);
                    }

                    const authScreen = document.getElementById('auth-screen');
                    if (authScreen) authScreen.style.display = 'none';
                    const ageGate = document.getElementById('age-gate');
                    if (ageGate) ageGate.style.display = 'none';
                    
                    if (typeof buildProfileUI === 'function') {
                        buildProfileUI(user);
                    } else if (typeof buildProfilePage === 'function') {
                        buildProfilePage();
                    }
                    
                    const topBtn = document.getElementById('topUserBtn');
                    if (topBtn) topBtn.style.display = 'flex';
                    const nameEl = document.getElementById('topUsername');
                    if (nameEl) nameEl.textContent = "$username".toUpperCase().substring(0, 12);

                    const notifBtn = document.getElementById('topNotifBtn');
                    if (notifBtn) notifBtn.style.display = 'flex';
                    
                    if (typeof render === 'function') render();
                    
                    // Declanșăm descărcarea datelor din Cloud (v11.4)
                    if (typeof window.cloudPullData === 'function') {
                        window.cloudPullData();
                    }
                })();
            """.trimIndent()
            
            binding.webView.evaluateJavascript(js, null)
        }
    }

    private fun processImageForOCR(uri: Uri) {
        try {
            val image = InputImage.fromFilePath(this, uri)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val result = parseTicketText(visionText.text)
                    binding.webView.evaluateJavascript("if(window.onOCRResult) window.onOCRResult(${result.toString()});", null)
                }
                .addOnFailureListener { e ->
                    Toast.makeText(this, "Eroare scanare: ${e.message}", Toast.LENGTH_SHORT).show()
                }
        } catch (e: IOException) {
            e.printStackTrace()
        }
    }

    private fun parseTicketText(text: String): JSONObject {
        val json = JSONObject()
        val lines = text.split("\n")
        
        var totalOdds = 1.0
        var stake = 0.0
        var win = 0.0
        val events = JSONArray()

        // Regex simple pentru detecție (Superbet, Casa, etc.)
        val oddsRegex = Regex("""\b(\d+[\.,]\d{2})\b""")
        val moneyRegex = Regex("""(\d+[\.,]\d{2})\s*(RON|LEI|Lei)""", RegexOption.IGNORE_CASE)
        
        lines.forEach { line ->
            // Detecție meciuri (Linii care conțin " - " sau " v ")
            if (line.contains(" - ") || line.contains(" v ")) {
                val event = JSONObject()
                event.put("name", line.trim())
                event.put("odds", 1.85) // Default if not found on same line
                events.put(event)
            }
            
            // Căutăm miza
            if (line.contains("Miza", true) || line.contains("Suma", true)) {
                moneyRegex.find(line)?.let { 
                    stake = it.groupValues[1].replace(",", ".").toDoubleOrNull() ?: 0.0
                }
            }
            
            // Căutăm câștig potențial
            if (line.contains("Castig", true) || line.contains("Potential", true)) {
                moneyRegex.find(line)?.let {
                    win = it.groupValues[1].replace(",", ".").toDoubleOrNull() ?: 0.0
                }
            }
        }

        // Dacă nu am găsit miza prin cuvinte cheie, căutăm ultima sumă mare
        if (stake == 0.0) stake = 10.0 // Default fallback

        json.put("events", events)
        json.put("stake", stake)
        json.put("totalWon", win)
        json.put("rawText", text) // Pentru debug sau rafinare in JS
        
        return json
    }

    /** Interfață pentru a fi apelată din JavaScript (WebView) */
    inner class WebAppInterface(private val mContext: Context) {
        
        @JavascriptInterface
        fun saveToCloud(json: String) {
            val app = mContext.applicationContext as RgdbetApplication
            val currentUser = app.authManager.authState.value
            
            if (currentUser is AuthState.SignedIn) {
                try {
                    val payload = JSONObject(json)
                    val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                    db.collection("user_data").document(currentUser.uid)
                        .set(payload, com.google.firebase.firestore.SetOptions.merge())
                        .addOnSuccessListener {
                            // Trimitem confirmarea înapoi în JS
                            (mContext as MainActivity).runOnUiThread {
                                mContext.binding.webView.evaluateJavascript("console.log('[NativeSync] Salvare reușită');", null)
                            }
                        }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        @JavascriptInterface
        fun logout() {
            val app = mContext.applicationContext as RgdbetApplication
            app.authManager.logout()
            
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
        fun startOCRScan() {
            runOnUiThread {
                scanTicketLauncher.launch("image/*")
            }
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
