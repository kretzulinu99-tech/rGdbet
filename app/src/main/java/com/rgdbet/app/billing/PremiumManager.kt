package com.rgdbet.app.billing

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

class PremiumManager {
    private val TAG = "PremiumManager"
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private val _isPremium = MutableStateFlow(false)
    val isPremium = _isPremium.asStateFlow()

    init {
        auth.addAuthStateListener {
            checkStatus()
        }
        checkStatus()
    }

    fun checkStatus() {
        val user = auth.currentUser ?: return
        db.collection("users").document(user.uid).get()
            .addOnSuccessListener { document ->
                if (document != null && document.exists()) {
                    val premium = document.getBoolean("isPremium") ?: false
                    _isPremium.value = premium
                    Log.d(TAG, "Premium status from Firestore: $premium")
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error fetching premium status", e)
            }
    }

    suspend fun updatePremiumStatus(isPremium: Boolean) {
        val user = auth.currentUser ?: return
        try {
            val data = mapOf(
                "isPremium" to isPremium,
                "premiumUpdatedAt" to System.currentTimeMillis()
            )
            db.collection("users").document(user.uid).update(data).await()
            _isPremium.value = isPremium
            Log.d(TAG, "Premium status updated in Firestore to: $isPremium")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating premium status", e)
        }
    }
}
