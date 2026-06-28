package com.rgdbet.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.SystemClock
import android.util.AttributeSet
import android.view.View
import kotlin.math.cos
import kotlin.random.Random

/**
 * View that simulates a Confetti Celebration effect.
 * Replaced the old Floodlight beam implementation.
 */
class StadiumFloodlightView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val random = Random.Default
    private val burstDuration = 4000L // 4 seconds
    private var startTime = 0L
    
    private val confettiList = Array(160) { index -> 
        Confetti(isBurst = index >= 80) 
    }
    
    private val colors = intArrayOf(
        Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN, 
        Color.MAGENTA, Color.CYAN, Color.rgb(255, 165, 0), // Orange
        Color.WHITE // Added White
    )

    private inner class Confetti(val isBurst: Boolean) {
        var x = 0f
        var y = 0f
        var size = 0f
        var speedY = 0f
        var speedX = 0f
        var rotation = 0f
        var rotationSpeed = 0f
        var flipAngle = 0f
        var flipSpeed = 0f
        var color = Color.WHITE
        var isCircle = false
        var isDead = false
        private val gravity = 0.3f

        fun reset(width: Float, height: Float, isInitial: Boolean = false) {
            isDead = false
            if (isBurst) {
                // Cannon effect from bottom corners
                val fromLeft = random.nextBoolean()
                x = if (fromLeft) -20f else width + 20f
                y = height + 20f
                speedY = -12f - random.nextFloat() * 18f
                speedX = if (fromLeft) 4f + random.nextFloat() * 12f else -4f - random.nextFloat() * 12f
                
                // If we are past the duration, don't respawn burst particles
                if (!isInitial && SystemClock.uptimeMillis() - startTime > burstDuration) {
                    isDead = true
                }
            } else {
                // Normal falling effect
                x = random.nextFloat() * width
                y = if (isInitial) random.nextFloat() * height else -random.nextFloat() * height
                speedY = 3f + random.nextFloat() * 6f
                speedX = -1.5f + random.nextFloat() * 3f
            }

            size = 12f + random.nextFloat() * 18f
            rotation = random.nextFloat() * 360f
            rotationSpeed = -5f + random.nextFloat() * 10f
            flipAngle = random.nextFloat() * Math.PI.toFloat()
            flipSpeed = 0.1f + random.nextFloat() * 0.2f
            color = colors[random.nextInt(colors.size)]
            isCircle = random.nextBoolean()
        }

        fun update(width: Float, height: Float, currentTime: Long) {
            if (isDead) return

            if (isBurst) {
                speedY += gravity
                // If duration passed, don't reset burst ones anymore
                if (currentTime - startTime > burstDuration && y > height + 100f) {
                    isDead = true
                    return
                }
            }
            
            y += speedY
            x += speedX
            rotation += rotationSpeed
            flipAngle += flipSpeed

            // Reset if it goes off screen bottom
            if (y > height + 100f) {
                reset(width, height)
            }
            
            // Wrap horizontally only for falling confetti
            if (!isBurst) {
                if (x < -size) x = width + size
                if (x > width + size) x = -size
            }
        }
    }

    private var initialized = false

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return

        val currentTime = SystemClock.uptimeMillis()

        if (!initialized) {
            startTime = currentTime
            confettiList.forEach { it.reset(w, h, isInitial = true) }
            initialized = true
        }

        confettiList.forEach { c ->
            c.update(w, h, currentTime)
            
            if (c.isDead) return@forEach
            
            val flipScale = cos(c.flipAngle.toDouble()).toFloat()
            
            // Shading: darken the color based on the flip (simulating back side or tilt)
            val colorFactor = 0.7f + 0.3f * Math.abs(flipScale)
            val r = (Color.red(c.color) * colorFactor).toInt()
            val g = (Color.green(c.color) * colorFactor).toInt()
            val b = (Color.blue(c.color) * colorFactor).toInt()
            paint.color = Color.rgb(r, g, b)
            
            canvas.save()
            canvas.translate(c.x, c.y)
            canvas.rotate(c.rotation)
            canvas.scale(1f, flipScale) // This creates the 3D flip effect
            
            if (c.isCircle) {
                canvas.drawCircle(0f, 0f, c.size / 2, paint)
            } else {
                // Draw a rectangle centered at 0,0
                canvas.drawRect(-c.size / 2, -c.size / 3, c.size / 2, c.size / 3, paint)
            }
            
            canvas.restore()
        }

        invalidate()
    }

    // Keep the old method signature if it was used elsewhere, but make it a no-op
    fun setTargetPosition(yDp: Float) {
        invalidate()
    }
}
