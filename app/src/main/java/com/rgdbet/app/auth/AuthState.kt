package com.rgdbet.app.auth

sealed class AuthState {
    object Loading : AuthState()
    object SignedOut : AuthState()
    data class SignedIn(
        val uid: String,
        val email: String?,
        val displayName: String?,
        val isEmailVerified: Boolean
    ) : AuthState()
}

sealed class AuthResult {
    object Success : AuthResult()
    data class Error(val message: String) : AuthResult()
}
