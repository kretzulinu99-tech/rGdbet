package com.rgdbet.app.auth

import android.util.Patterns

object AuthValidator {
    fun email(v: String): String? = when {
        v.isBlank()                                             -> "Emailul este obligatoriu."
        !Patterns.EMAIL_ADDRESS.matcher(v.trim()).matches()     -> "Adresă de email invalidă."
        else                                                    -> null
    }

    fun password(v: String): String? = when {
        v.isBlank()     -> "Parola este obligatorie."
        v.length < 6    -> "Parola trebuie să aibă minim 6 caractere."
        else            -> null
    }

    fun confirmPassword(p: String, c: String): String? =
        if (p != c) "Parolele nu coincid." else null

    fun displayName(v: String): String? = when {
        v.isBlank()         -> "Numele de utilizator este obligatoriu."
        v.trim().length < 3 -> "Numele trebuie să aibă minim 3 caractere."
        else                -> null
    }
}
