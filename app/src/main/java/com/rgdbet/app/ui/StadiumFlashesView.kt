package com.rgdbet.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.SystemClock
import android.util.AttributeSet
import android.view.View
import kotlin.random.Random

class StadiumFlashesView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val flashes = Array(20) { Flash() }
    private val random = Random.Default

    // Configuration
    private val flashDuration = 400L // milliseconds
    private val spawnChance = 0.15f   // chance per frame to spawn a new flash

    class Flash {
        var x: Float = 0f
        var y: Float = 0f
        var size: Float = 0f
        var startTime: Long = 0L
        var color: Int = Color.WHITE
        var isActive: Boolean = false

        fun activate(x: Float, y: Float, size: Float, time: Long, color: Int) {
            this.x = x
            this.y = y
            this.size = size
            this.startTime = time
            this.color = color
            this.isActive = true
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return

        val currentTime = SystemClock.uptimeMillis()

        // 1. Update and Randomly spawn new flashes
        var activeCount = 0
        flashes.forEach { if (it.isActive) activeCount++ }

        if (activeCount < flashes.size && random.nextFloat() < spawnChance) {
            val inactiveFlash = flashes.find { !it.isActive }
            inactiveFlash?.activate(
                x = random.nextFloat() * w,
                y = random.nextFloat() * h,
                size = 3f + random.nextFloat() * 10f,
                time = currentTime,
                color = if (random.nextBoolean()) Color.WHITE else Color.rgb(220, 230, 255)
            )
        }

        // 2. Draw flashes
        flashes.forEach { flash ->
            if (!flash.isActive) return@forEach

            val elapsed = currentTime - flash.startTime
            if (elapsed > flashDuration) {
                flash.isActive = false
                return@forEach
            }

            val progress = elapsed.toFloat() / flashDuration
            
            // Flash intensity curve: quick peak then fade
            val alpha = if (progress < 0.15f) {
                (progress / 0.15f) * 255
            } else {
                (1f - (progress - 0.15f) / 0.85f) * 255
            }.toInt().coerceIn(0, 255)

            paint.color = flash.color
            paint.alpha = alpha
            
            // Main dot
            canvas.drawCircle(flash.x, flash.y, flash.size, paint)
            
            // Small star effect (horizontal/vertical lines)
            paint.alpha = alpha / 2
            val strokeWidth = 2f
            canvas.drawRect(flash.x - flash.size * 2, flash.y - strokeWidth/2, flash.x + flash.size * 2, flash.y + strokeWidth/2, paint)
            canvas.drawRect(flash.x - strokeWidth/2, flash.y - flash.size * 2, flash.x + strokeWidth/2, flash.y + flash.size * 2, paint)
        }

        // Keep animating
        invalidate()
    }
}
