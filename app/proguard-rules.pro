# --- rGdbet Proguard Rules ---

# Păstrăm interfața JavaScript pentru WebView (CRITIC!)
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Păstrăm clasele de model folosite de JSON (pentru a preveni redenumirea câmpurilor)
-keepclassmembers class ** {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Firebase & Google Play Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# ML Kit Text Recognition
-keep class com.google.mlkit.vision.** { *; }

# Prevent shrinking of the app name and resources used by the native side
-keep class com.rgdbet.app.ui.** { *; }
-keep class com.rgdbet.app.auth.** { *; }
-keep class com.rgdbet.app.billing.** { *; }
