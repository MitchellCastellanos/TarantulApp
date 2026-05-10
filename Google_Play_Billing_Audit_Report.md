# Google Play Billing Audit Report

**Author:** Manus AI
**Date:** May 10, 2026

## Executive Summary

An audit of the TarantulApp Android repository was conducted to verify the integration of Google Play Billing and to diagnose why the Google Play Console still prompts to "Upload a new APK" instead of allowing the creation of subscriptions. 

The investigation reveals that **Google Play Billing is not actually integrated into the Android client application**. The current implementation relies entirely on a backend "stub" or placeholder flow, where the Android app sends manual test tokens to a backend endpoint rather than utilizing the native Google Play Billing Library. Consequently, the Play Console correctly detects that the uploaded APKs do not contain the required billing permissions or libraries, preventing the configuration of subscription products.

## Detailed Findings

### 1. Missing Billing Dependencies in `build.gradle`

A review of the Android build configuration files confirms the absence of the Google Play Billing Library.

*   **`app/build.gradle`**: The dependencies block includes Firebase, AndroidX libraries, and Capacitor plugins, but it **does not** include `com.android.billingclient:billing-ktx` or any related billing dependency.
*   **Project-wide Search**: A global search across all `.gradle` files for `billing-ktx` and `com.android.billingclient` yielded no results.

Without this dependency, the billing classes are not bundled into the release build, which is a primary requirement for the Play Console to recognize the app as billing-capable.

### 2. Absence of `com.android.vending.BILLING` Permission

The Android manifest file (`frontend/android/app/src/main/AndroidManifest.xml`) was inspected for required permissions.

*   The manifest includes permissions for `INTERNET` and `CAMERA`.
*   It **does not** declare the `<uses-permission android:name="com.android.vending.BILLING" />` permission.

The Play Console scans the manifest of uploaded APKs/App Bundles for this specific permission. Its absence is a definitive reason why the console does not enable the subscriptions UI.

### 3. No Native `BillingClient` Initialization

A comprehensive search of the entire codebase for `BillingClient` returned zero matches. 

*   The main Android entry point (`MainActivity.java`) is a standard Capacitor `BridgeActivity` with no custom billing logic.
*   There are no custom Capacitor plugins or native Android modules implemented to handle in-app purchases.

### 4. Placeholder "Stub" Implementation Confirmed

The codebase contains explicit documentation and code indicating that the current Google Play Billing setup is a temporary placeholder.

*   **`PLAY_BILLING_SETUP.md`**: This document explicitly states: "Android native app shows a temporary 'sync purchase' flow in `Pro` page" and "Backend endpoint `POST /api/billing/google-play/verify` accepts test tokens in stub mode." It also provides a checklist for "Real Google Play integration," which includes implementing real verification and setting `GOOGLE_PLAY_BILLING_MODE=real`.
*   **Frontend (`ProPage.jsx`)**: The React frontend for Android users displays a message: "In-app Pro purchases are temporarily unavailable on Android while we finish Google Play Billing integration." It provides a UI to manually enter a test token (e.g., `test_first_android_purchase_001`) and calls `billingService.verifyGooglePlayPurchase`.
*   **Backend (`BillingService.java`)**: The Spring Boot backend contains a method `verifyGooglePlaySubscription` that explicitly checks for a "stub" mode. If `googlePlayMode` is not "stub", it throws an exception: `GOOGLE_PLAY_REAL_MODE_NOT_IMPLEMENTED`.

## Conclusion and Recommendations

The Google Play Console is functioning as expected. It requires an uploaded APK or App Bundle to contain the `com.android.vending.BILLING` permission (which is automatically merged when the `com.android.billingclient` dependency is included) to unlock the in-app products and subscriptions configuration sections.

Because TarantulApp currently uses a manual, backend-only stub flow for Android purchases, the native Android build lacks the necessary components.

### Required Steps to Enable Subscriptions in Play Console

To resolve this issue and proceed with real Google Play Billing, the following steps must be implemented in the Android client:

1.  **Add the Billing Dependency**: Update `frontend/android/app/build.gradle` to include the Google Play Billing Library:
    ```gradle
    dependencies {
        // ... other dependencies
        implementation 'com.android.billingclient:billing-ktx:6.2.1' // Use the latest version
    }
    ```
    *(Note: If using Capacitor, it is highly recommended to use an existing, maintained Capacitor plugin for Google Play Billing rather than writing custom native code, e.g., `@revenuecat/purchases-capacitor` or a community billing plugin. These plugins will automatically handle the gradle dependencies and manifest permissions).*

2.  **Ensure Manifest Permission**: If implementing natively, ensure the billing permission is present (the library usually merges this automatically, but it's good to verify).

3.  **Implement Native Billing Logic**: The frontend must be updated to interact with the native BillingClient (via a Capacitor plugin) to fetch products, launch the purchase flow, and retrieve real purchase tokens from Google Play, replacing the manual text input in `ProPage.jsx`.

4.  **Upload a New Release**: After making these changes, build a new signed release APK or App Bundle and upload it to the closed testing track in the Play Console. Once processed, the Play Console will detect the billing library and enable the subscriptions creation UI.

5.  **Update Backend**: Follow the checklist in `PLAY_BILLING_SETUP.md` to implement real token verification against the Google Play Developer API in `BillingService.java`.
