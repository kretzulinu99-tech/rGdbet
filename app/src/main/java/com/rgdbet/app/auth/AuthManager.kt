package com.rgdbet.app.auth

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.AggregateSource
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

class AuthManager {

    private val TAG = "AuthManager"
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()

    private val _state = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _state.asStateFlow()

    init {
        updateState()
        auth.addAuthStateListener { updateState() }
    }

    private fun updateState() {
        val user = auth.currentUser
        _state.value = if (user != null) {
            AuthState.SignedIn(
                uid            = user.uid,
                email          = user.email,
                displayName    = user.displayName,
                isEmailVerified = user.isEmailVerified
            )
        } else {
            AuthState.SignedOut
        }
    }

    fun observeUserCount(onUpdate: (Int) -> Unit) {
        db.collection("users").addSnapshotListener { snapshot, e ->
            if (e != null) {
                Log.e(TAG, "Listen failed.", e)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                onUpdate(snapshot.size())
            }
        }
    }

    suspend fun getUserCount(): Int = try {
        // Folosim o metodă mai robustă pentru a obține numărul de documente
        val snapshot = db.collection("users").get().await()
        snapshot.size()
    } catch (e: Exception) {
        Log.e(TAG, "Error getting user count", e)
        // Dacă e prima dată și colecția nu există, sau eroare de permisiuni
        0
    }

    suspend fun register(
        email: String,
        password: String,
        displayName: String
    ): AuthResult = try {
        Log.d(TAG, "Attempting to register: $email")
        val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
        val user = result.user
        Log.d(TAG, "User created successfully: ${user?.uid}")
        
        if (displayName.isNotBlank()) {
            val req = UserProfileChangeRequest.Builder()
                .setDisplayName(displayName.trim())
                .build()
            user?.updateProfile(req)?.await()
            Log.d(TAG, "Profile updated with displayName: $displayName")
        }

        // Salvează utilizatorul în Firestore pentru numărătoare reală
        user?.let {
            val userData = hashMapOf(
                "uid" to it.uid,
                "email" to it.email,
                "displayName" to displayName,
                "createdAt" to System.currentTimeMillis()
            )
            db.collection("users").document(it.uid).set(userData).await()
        }
        
        updateState()
        AuthResult.Success
    } catch (e: Exception) {
        Log.e(TAG, "Registration error: ${e.message}", e)
        AuthResult.Error(friendlyError(e))
    }

    suspend fun login(email: String, password: String): AuthResult = try {
        val result = auth.signInWithEmailAndPassword(email.trim(), password).await()
        val user = result.user
        
        // Sincronizează utilizatorul existent cu Firestore dacă lipsește (pentru numărătoare reală)
        user?.let {
            val userData = hashMapOf(
                "uid" to it.uid,
                "email" to it.email,
                "displayName" to (it.displayName ?: ""),
                "lastLogin" to System.currentTimeMillis()
            )
            db.collection("users").document(it.uid).set(userData).await()
        }

        updateState()
        AuthResult.Success
    } catch (e: Exception) {
        AuthResult.Error(friendlyError(e))
    }

    suspend fun sendPasswordReset(email: String): AuthResult = try {
        auth.sendPasswordResetEmail(email.trim()).await()
        AuthResult.Success
    } catch (e: Exception) {
        AuthResult.Error(friendlyError(e))
    }

    fun logout() {
        auth.signOut()
        updateState()
    }

    fun currentUserId(): String? = auth.currentUser?.uid

    suspend fun resendVerificationEmail(): AuthResult = try {
        Log.d(TAG, "Resending verification email for: ${auth.currentUser?.email}")
        auth.currentUser?.sendEmailVerification()?.await()
        Log.d(TAG, "Resend verification email request successful.")
        AuthResult.Success
    } catch (e: Exception) {
        Log.e(TAG, "Resend verification error: ${e.message}", e)
        // Verificăm dacă eroarea este legată de template sau configurare
        val msg = when {
            e.message?.contains("DYNAMIC_LINK_NOT_ACTIVATED", ignoreCase = true) == true ->
                "Eroare Firebase: Dynamic Links nu sunt activate în consolă."
            e.message?.contains("auth/invalid-email-template", ignoreCase = true) == true ->
                "Eroare Firebase: Șablonul de email este invalid sau șters."
            else -> friendlyError(e)
        }
        AuthResult.Error(msg)
    }

    suspend fun reloadUser(): AuthResult = try {
        auth.currentUser?.reload()?.await()
        updateState()
        AuthResult.Success
    } catch (e: Exception) {
        AuthResult.Error(friendlyError(e))
    }

    private fun friendlyError(e: Exception): String = when (e) {
        is FirebaseAuthWeakPasswordException ->
            "Parola este prea slabă. Folosește cel puțin 6 caractere."
        is FirebaseAuthInvalidCredentialsException ->
            "Email sau parolă incorectă."
        is FirebaseAuthUserCollisionException ->
            "Există deja un cont cu această adresă de email."
        is FirebaseAuthInvalidUserException ->
            "Nu există niciun cont asociat acestei adrese."
        else ->
            e.localizedMessage ?: "A apărut o eroare. Încearcă din nou."
    }
}
