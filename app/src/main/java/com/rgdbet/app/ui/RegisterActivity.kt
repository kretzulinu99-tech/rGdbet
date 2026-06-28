package com.rgdbet.app.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import com.rgdbet.app.RgdbetApplication
import com.rgdbet.app.auth.AuthResult
import com.rgdbet.app.auth.AuthValidator
import com.rgdbet.app.databinding.ActivityRegisterBinding
import kotlinx.coroutines.launch
import java.util.Random

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val random = Random()
    private val letterViews = mutableListOf<TextView>()
    private var whistleView: android.widget.ImageView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupInteractiveLogo()
        startAnimations()

        binding.btnRegister.setOnClickListener { doRegister() }
        binding.tvGoLogin.setOnClickListener { finish() }

        setupValidation()
    }

    private fun setupInteractiveLogo() {
        val text = "rGdbet"
        binding.letterContainer.removeAllViews()
        letterViews.clear()

        val goldColor = Color.parseColor("#FFD700")

        for (char in text) {
            val tv = TextView(this).apply {
                this.text = char.toString()
                this.setTextColor(goldColor)
                this.textSize = 56f
                this.typeface = binding.tvTitle.typeface
                // Add a slight shadow for depth
                this.setShadowLayer(10f, 0f, 0f, Color.parseColor("#80FFD700"))
            }
            binding.letterContainer.addView(tv)
            letterViews.add(tv)
        }

        startGoldShineAnimation()
    }

    private fun startGoldShineAnimation() {
        lifecycleScope.launch {
            while (true) {
                kotlinx.coroutines.delay(3000)
                letterViews.forEachIndexed { index, tv ->
                    val shine = ObjectAnimator.ofFloat(tv, View.ALPHA, 1f, 0.6f, 1f).apply {
                        duration = 400
                        startDelay = index * 50L
                    }
                    val scale = ObjectAnimator.ofPropertyValuesHolder(
                        tv,
                        PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.1f, 1f),
                        PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.1f, 1f)
                    ).apply {
                        duration = 400
                        startDelay = index * 50L
                    }
                    shine.start()
                    scale.start()
                }
            }
        }
    }

    private fun startAnimations() {
        binding.matrixView.setAccentColor(Color.parseColor("#39FF14"))

        // Spotlight intensity pulse
        ObjectAnimator.ofFloat(binding.floodlightView, "alpha", 0.6f, 1f).apply {
            duration = 3000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            start()
        }

        binding.floodlightView.setTargetPosition(195f)

        val views = listOf(binding.logoWrapper, binding.titleUnderline, binding.glassCard, binding.tvGoLogin)
        views.forEachIndexed { i, view ->
            view.alpha = 0f
            view.translationX = -100f
            view.animate()
                .alpha(1f)
                .translationX(0f)
                .setDuration(1000)
                .setStartDelay(200L * i)
                .setInterpolator(AccelerateDecelerateInterpolator())
                .start()
        }

        binding.root.post { startBallPhysicsEngine() }
    }

    private fun startBallPhysicsEngine() {
        val ball = binding.jugglingBall
        ball.visibility = View.VISIBLE

        fun juggleNext() {
            if (letterViews.isEmpty()) return
            val targetIndex = random.nextInt(letterViews.size)
            val targetLetter = letterViews[targetIndex]

            val targetX = binding.letterContainer.x + targetLetter.x + (targetLetter.width / 2f) - (ball.width / 2f)
            val baselineY = binding.letterContainer.y - (ball.height / 2f)

            val moveX = ObjectAnimator.ofFloat(ball, "x", ball.x, targetX).apply {
                duration = 750
                interpolator = AccelerateDecelerateInterpolator()
            }

            val jumpUp = ObjectAnimator.ofFloat(ball, "y", baselineY, baselineY - 160f).apply {
                duration = 375
                interpolator = DecelerateInterpolator()
            }
            val fallDown = ObjectAnimator.ofFloat(ball, "y", baselineY - 160f, baselineY).apply {
                duration = 375
                interpolator = android.view.animation.AccelerateInterpolator()
            }

            val spin = ObjectAnimator.ofFloat(ball, "rotation", ball.rotation, ball.rotation + 360f).apply {
                duration = 750
                interpolator = LinearInterpolator()
            }

            val verticalSequence = AnimatorSet().apply {
                playSequentially(jumpUp, fallDown)
            }

            AnimatorSet().apply {
                playTogether(moveX, verticalSequence, spin)
                addListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        // Advanced physics: Squash and stretch for letter impact
                        val scaleX = PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.3f, 1f)
                        val scaleY = PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 0.7f, 1f)
                        val translationY = PropertyValuesHolder.ofFloat(View.TRANSLATION_Y, 0f, -40f, 0f)

                        ObjectAnimator.ofPropertyValuesHolder(targetLetter, scaleX, scaleY, translationY).apply {
                            duration = 400
                            interpolator = OvershootInterpolator()
                            start()
                        }
                        juggleNext()
                    }
                })
                start()
            }
        }

        juggleNext()
    }

    private fun setupValidation() {
        binding.etName.doAfterTextChanged { binding.tilName.error = null }
        binding.etEmail.doAfterTextChanged { binding.tilEmail.error = null }
        binding.etPassword.doAfterTextChanged { binding.tilPassword.error = null }
        binding.etConfirmPassword.doAfterTextChanged { binding.tilConfirmPassword.error = null }
    }

    private fun doRegister() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val confirm = binding.etConfirmPassword.text.toString()

        val nameErr = AuthValidator.displayName(name)
        val emailErr = AuthValidator.email(email)
        val passErr = AuthValidator.password(password)
        val confirmErr = AuthValidator.confirmPassword(password, confirm)

        binding.tilName.error = nameErr
        binding.tilEmail.error = emailErr
        binding.tilPassword.error = passErr
        binding.tilConfirmPassword.error = confirmErr

        if (listOf(nameErr, emailErr, passErr, confirmErr).any { it != null }) {
            playWhistleEffect()
            return
        }

        if (!binding.cbTerms.isChecked) {
            showError("PROTOCOL_AGREEMENT_REQUIRED")
            return
        }

        setLoading(true)
        val authManager = (application as RgdbetApplication).authManager

        lifecycleScope.launch {
            when (val result = authManager.register(email, password, name)) {
                is AuthResult.Success -> {
                    startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                    finish()
                }
                is AuthResult.Error -> {
                    setLoading(false)
                    showError(result.message)
                }
            }
        }
    }

    private fun setLoading(on: Boolean) {
        binding.btnRegister.isEnabled = !on
        binding.progressBar.visibility = if (on) View.VISIBLE else View.GONE
        binding.tvError.visibility = View.GONE
    }

    private fun showError(msg: String) {
        binding.tvError.text = "> SYS_ERR: $msg"
        binding.tvError.visibility = View.VISIBLE
        
        playWhistleEffect()

        ObjectAnimator.ofFloat(binding.glassCard, "translationY", 0f, 15f, -15f, 15f, -15f, 0f).apply {
            duration = 400
            start()
        }
    }

    private fun playWhistleEffect() {
        if (letterViews.size < 2) return
        val letterG = letterViews[1]

        if (whistleView == null) {
            whistleView = android.widget.ImageView(this).apply {
                setImageResource(com.rgdbet.app.R.drawable.ic_referee_whistle)
                layoutParams = android.view.ViewGroup.LayoutParams(
                    (42 * resources.displayMetrics.density).toInt(),
                    (42 * resources.displayMetrics.density).toInt()
                )
                visibility = View.GONE
                elevation = 40f
                binding.logoWrapper.addView(this)
            }
        }

        val whistle = whistleView!!
        whistle.visibility = View.VISIBLE
        whistle.alpha = 0f
        whistle.scaleX = 0f
        whistle.scaleY = 0f
        
        // Initial position: Deep "Inside" the G's opening for emergence effect
        val startX = binding.letterContainer.x + letterG.x + letterG.width * 0.45f
        val finalX = binding.letterContainer.x + letterG.x + letterG.width * 0.85f
        val posY = binding.letterContainer.y + letterG.y + letterG.height * 0.1f

        whistle.x = startX
        whistle.y = posY
        whistle.rotation = -45f // Start rotated inside the "mouth"

        // --- "ULTRA MOUTH EMERGENCE" ANIMATION SEQUENCE ---
        
        // Phase 1: G "takes a deep breath" (leans back and masively expands)
        val gInhaleX = ObjectAnimator.ofFloat(letterG, View.SCALE_X, 1f, 1.7f).setDuration(350)
        val gInhaleY = ObjectAnimator.ofFloat(letterG, View.SCALE_Y, 1f, 1.7f).setDuration(350)
        val gLeanBack = ObjectAnimator.ofFloat(letterG, View.ROTATION, 0f, -30f).setDuration(350)
        
        // Phase 2: Whistle SHOOTS OUT of the mouth with a spin
        val whistleSlideOut = ObjectAnimator.ofFloat(whistle, View.X, startX, finalX).setDuration(400)
        val whistlePopX = ObjectAnimator.ofFloat(whistle, View.SCALE_X, 0f, 1.5f).setDuration(400)
        val whistlePopY = ObjectAnimator.ofFloat(whistle, View.SCALE_Y, 0f, 1.5f).setDuration(400)
        val whistleFade = ObjectAnimator.ofFloat(whistle, View.ALPHA, 0f, 1f).setDuration(400)
        val whistleSpin = ObjectAnimator.ofFloat(whistle, View.ROTATION, -45f, 0f).setDuration(400)
        
        whistlePopX.interpolator = OvershootInterpolator(2.5f)
        whistlePopY.interpolator = OvershootInterpolator(2.5f)

        // Phase 3: G "BLOWS" with extreme energy (rotates forward, shakes violently)
        val gBlowRotate = ObjectAnimator.ofFloat(letterG, View.ROTATION, -30f, 20f).setDuration(150)
        val gViolentShake = ObjectAnimator.ofFloat(letterG, View.TRANSLATION_X, 0f, 35f, -35f, 35f, -35f, 35f, -35f, 0f).setDuration(1000)
        val whistleVibrate = ObjectAnimator.ofFloat(whistle, View.TRANSLATION_Y, 0f, -12f, 12f, -12f, 12f, 0f).setDuration(1000)
        
        val inhaleSet = AnimatorSet().apply {
            playTogether(gInhaleX, gInhaleY, gLeanBack)
        }

        val blowSet = AnimatorSet().apply {
            playTogether(whistleSlideOut, whistlePopX, whistlePopY, whistleFade, whistleSpin, gBlowRotate, gViolentShake, whistleVibrate)
            startDelay = 350
        }

        AnimatorSet().apply {
            playSequentially(inhaleSet, blowSet)
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationStart(animation: Animator) {
                    // Precision sync for the whistle sound
                    binding.root.postDelayed({
                        playRefereeSound()
                        triggerVibration() 
                    }, 400) 
                }
                override fun onAnimationEnd(animation: Animator) {
                    lifecycleScope.launch {
                        kotlinx.coroutines.delay(3000)
                        // SPECTACULAR EXIT
                        whistle.animate()
                            .alpha(0f)
                            .scaleX(0f)
                            .scaleY(0f)
                            .rotation(180f)
                            .translationXBy(-30f)
                            .setDuration(600)
                            .withEndAction { whistle.visibility = View.GONE }
                            .start()
                        letterG.animate().scaleX(1f).scaleY(1f).rotation(0f).setDuration(600).start()
                    }
                }
            })
            start()
        }
    }

    private fun playRefereeSound() {
        try {
            val resId = resources.getIdentifier("referee_whistle", "raw", packageName)
            if (resId != 0) {
                MediaPlayer.create(this, resId).apply {
                    setVolume(1.0f, 1.0f) // Max volume
                    setOnCompletionListener { it.release() }
                    start()
                }
            } else {
                // System notification sound fallback
                android.media.RingtoneManager.getRingtone(this, android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION))?.play()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun triggerVibration() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 200), -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(500)
            }
        } catch (e: Exception) {}
    }
}
