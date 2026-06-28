package com.rgdbet.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import java.util.Random
import kotlin.math.sqrt

class NeuralMatrixView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val nodes = mutableListOf<Node>()
    private val random = Random()
    private val nodePaint = Paint().apply {
        isAntiAlias = true
        style = Paint.Style.FILL
    }
    private val linePaint = Paint().apply {
        isAntiAlias = true
        strokeWidth = 2f
    }

    private var accentColor = Color.parseColor("#39FF14") // Default neon green

    fun setAccentColor(color: Int) {
        accentColor = color
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        nodes.clear()
        val nodeCount = (w * h / 15000).coerceIn(40, 100)
        for (i in 0 until nodeCount) {
            nodes.add(createNode(w, h))
        }
    }

    private fun createNode(w: Int, h: Int): Node {
        return Node(
            x = random.nextFloat() * w,
            y = random.nextFloat() * h,
            vx = (random.nextFloat() - 0.5f) * 1.5f,
            vy = (random.nextFloat() - 0.5f) * 1.5f,
            radius = random.nextFloat() * 3f + 1.5f
        )
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.parseColor("#02050A")) // Deep Space Black

        // Update positions
        nodes.forEach { n ->
            n.x += n.vx
            n.y += n.vy
            if (n.x < 0 || n.x > width) n.vx *= -1
            if (n.y < 0 || n.y > height) n.vy *= -1
        }

        // Draw connections
        for (i in nodes.indices) {
            for (j in i + 1 until nodes.size) {
                val dx = nodes[i].x - nodes[j].x
                val dy = nodes[i].y - nodes[j].y
                val dist = sqrt(dx * dx + dy * dy)
                val threshold = width / 4f

                if (dist < threshold) {
                    val alpha = ((1f - dist / threshold) * 80).toInt()
                    linePaint.color = accentColor
                    linePaint.alpha = alpha
                    canvas.drawLine(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, linePaint)
                }
            }
        }

        // Draw nodes with glow
        nodes.forEach { n ->
            nodePaint.color = accentColor
            nodePaint.alpha = 200
            canvas.drawCircle(n.x, n.y, n.radius, nodePaint)
        }

        invalidate()
    }

    data class Node(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        val radius: Float
    )
}
