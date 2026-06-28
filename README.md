# rGdbet — Social Betting Network

rGdbet is a premium Android application designed for sports betting enthusiasts. It combines statistical analysis, match simulation, and social networking features into a single, futuristic interface.

## 🚀 Key Features

*   **Social Betting Network**: Share your tickets, follow expert bettors, and communicate with the community.
*   **3D Biometric Engine**: Advanced player and environment visualization using SceneView/Filament.
*   **Match Simulator (DSS Engine)**: Simulate soccer matches with professional tactics and real-time narrative.
*   **Statistical Lab**: Professional tools for bankroll management, ROI/Yield calculation, and EV analysis.
*   **Premium UI**: Multiple dynamic themes (Neon, Aurora, Gold, etc.) with high-quality tactical backgrounds.
*   **Google Play Billing**: Integrated subscription system for premium features.

## 🛠 Tech Stack

*   **Platform**: Android (Kotlin)
*   **UI**: Native Android Views + WebView (SPA System)
*   **Graphics**: SceneView / Google Filament for 3D components.
*   **Backend**: Firebase (Auth, Firestore, Storage).
*   **Architecture**: ViewBinding, Modern Android Development (MAD) practices.

## 📦 How to Build

1. Clone the repository.
2. Open in **Android Studio Ladybug (or newer)**.
3. Sync Gradle and ensure you have a valid `google-services.json` in the `app/` folder.
4. Build and run on a physical device or emulator.

---

## 🔒 Google Play Billing Setup (Mandatory for Premium)

1. Create the app in **Play Console**.
2. Create a subscription with ID `rgdbet_premium`.
3. Add two Base Plans: `monthly` and `yearly`.
4. Activate both plans and add your email to "License testing".

## 📄 License

Proprietary. All rights reserved.
