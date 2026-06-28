package com.rgdbet.app.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.rgdbet.app.R
import com.rgdbet.app.RgdbetApplication
import com.rgdbet.app.auth.AuthResult
import com.rgdbet.app.databinding.ActivityAuthBinding
import kotlinx.coroutines.launch

class AuthActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAuthBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAuthBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupVideoBackground()

        // Navigare către Înregistrare
        binding.tvGoToRegister.setOnClickListener {
            switchForm(binding.cardLogin, binding.cardRegister)
        }

        // Navigare înapoi către Login
        binding.tvGoToLogin.setOnClickListener {
            switchForm(binding.cardRegister, binding.cardLogin)
        }

        // Logică de Login
        binding.btnLoginSubmit.setOnClickListener {
            doLogin()
        }

        // Logică de Înregistrare
        binding.btnRegisterSubmit.setOnClickListener {
            doRegister()
        }
    }

    private fun doLogin() {
        val email = binding.etLoginUser.text.toString().trim()
        val pass = binding.etLoginPass.text.toString()

        if (email.isEmpty() || pass.isEmpty()) {
            Toast.makeText(this, "Introduceți email-ul și parola", Toast.LENGTH_SHORT).show()
            return
        }

        val authManager = (application as RgdbetApplication).authManager
        lifecycleScope.launch {
            binding.btnLoginSubmit.isEnabled = false
            when (val result = authManager.login(email, pass)) {
                is AuthResult.Success -> {
                    startActivity(Intent(this@AuthActivity, MainActivity::class.java))
                    finish()
                }
                is AuthResult.Error -> {
                    binding.btnLoginSubmit.isEnabled = true
                    Toast.makeText(this@AuthActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun doRegister() {
        val name = binding.etRegUser.text.toString().trim()
        val email = binding.etRegEmail.text.toString().trim()
        val pass = binding.etRegPass.text.toString()

        if (name.isEmpty() || email.isEmpty() || pass.isEmpty()) {
            Toast.makeText(this, "Completați toate câmpurile", Toast.LENGTH_SHORT).show()
            return
        }

        val authManager = (application as RgdbetApplication).authManager
        lifecycleScope.launch {
            binding.btnRegisterSubmit.isEnabled = false
            when (val result = authManager.register(email, pass, name)) {
                is AuthResult.Success -> {
                    startActivity(Intent(this@AuthActivity, MainActivity::class.java))
                    finish()
                }
                is AuthResult.Error -> {
                    binding.btnRegisterSubmit.isEnabled = true
                    Toast.makeText(this@AuthActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun setupVideoBackground() {
        // Încarcă animația video 4D din folderul 'res/raw' folosind identifier pentru a evita erorile de compilare dacă fișierul lipsește
        val resId = resources.getIdentifier("bg_4d_football", "raw", packageName)
        
        if (resId != 0) {
            val videoPath = "android.resource://" + packageName + "/" + resId
            val uri = Uri.parse(videoPath)
            binding.videoBackground.setVideoURI(uri)

            // Pornește video-ul automat când este pregătit
            binding.videoBackground.setOnPreparedListener { mediaPlayer ->
                mediaPlayer.isLooping = true // Buclă infinită
                
                // Ajustare aspect ratio pentru a umple ecranul complet (Full Screen)
                val videoRatio = mediaPlayer.videoWidth.toFloat() / mediaPlayer.videoHeight.toFloat()
                val screenRatio = binding.videoBackground.width.toFloat() / binding.videoBackground.height.toFloat()
                val scale = videoRatio / screenRatio
                if (scale >= 1f) {
                    binding.videoBackground.scaleX = scale
                } else {
                    binding.videoBackground.scaleY = 1f / scale
                }
                mediaPlayer.start()
            }
        } else {
            // Fallback: Dacă video-ul lipsește, folosim un background static futuristic
            binding.videoBackground.isVisible = false
            binding.root.setBackgroundResource(R.drawable.cyber_stadium_bg)
        }
    }

    private fun switchForm(fromCard: CardView, toCard: CardView) {
        // Animație fluidă de tranziție între panouri
        fromCard.animate().alpha(0f).translationX(-100f).setDuration(300).withEndAction {
            fromCard.visibility = View.GONE
            toCard.visibility = View.VISIBLE
            toCard.alpha = 0f
            toCard.translationX = 100f
            toCard.animate().alpha(1f).translationX(0f).setDuration(300).start()
        }.start()
    }

    override fun onResume() {
        super.onResume()
        if (binding.videoBackground.isVisible) {
            binding.videoBackground.start() // Reluare video când utilizatorul revine în aplicație
        }
    }
}
