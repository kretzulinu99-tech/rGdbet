package com.rgdbet.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import java.util.Random

class ParticleSystemView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val particles = mutableListOf<Particle>()
    private val random = Random()
    private val paint = Paint().apply {
        isAntiAlias = true
    }

    private var particleColor: Int = Color.parseColor("#39FF14") // Default neon green

    fun setParticleColor(color: Int) {
        particleColor = color
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        particles.clear()
        for (i in 0 until 50) {
            particles.add(createParticle(w, h))
        }
    }

    private fun createParticle(w: Int, h: Int): Particle {
        return Particle(
            x = random.nextFloat() * w,
            y = random.nextFloat() * h,
            vx = (random.nextFloat() - 0.5f) * 2f,
            vy = (random.nextFloat() - 0.5f) * 2f,
            radius = random.nextFloat() * 4f + 2f,
            alpha = random.nextInt(100) + 50
        )
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        particles.forEach { p ->
            paint.color = particleColor
            paint.alpha = p.alpha
            canvas.drawCircle(p.x, p.y, p.radius, paint)

            // Update position
            p.x += p.vx
            p.y += p.vy

            // Boundary check
            if (p.x < 0 || p.x > width) p.vx *= -1
            if (p.y < 0 || p.y > height) p.vy *= -1
        }
        invalidate()
    }

    data class Particle(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        val radius: Float,
        val alpha: Int
    )
}
