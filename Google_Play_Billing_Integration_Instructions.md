# Google Play Billing Integration Instructions

**Author:** Manus AI
**Date:** May 10, 2026

This document outlines the steps you need to take to finalize the Google Play Billing integration for your TarantulApp Android project, following the code changes I have implemented.

## Code Changes Implemented

I have made the following modifications to your project:

1.  **Added Google Play Billing Library Dependency**: The `com.android.billingclient:billing-ktx:7.1.1` dependency has been added to `frontend/android/app/build.gradle`.
2.  **Added Billing Permission**: The `<uses-permission android:name="com.android.vending.BILLING" />` has been explicitly added to `frontend/android/app/src/main/AndroidManifest.xml`.
3.  **Integrated `cordova-plugin-purchase`**: I have installed `cordova-plugin-purchase` and updated `frontend/src/pages/ProPage.jsx` to use this plugin for handling Google Play purchases. The previous placeholder UI for manual token entry has been replaced with logic to initiate a native purchase flow.

## Your Action Items

To fully enable Google Play Billing and allow subscription creation in the Play Console, please follow these critical steps:

### 1. Build and Upload a New Android Release

After these code changes, you must build a new version of your Android application and upload it to the Google Play Console.

*   **Generate a Signed APK/AAB**: Create a new signed release build of your Android application. Ensure you increment the `versionCode` and `versionName` in `app/build.gradle`.
*   **Upload to Play Console**: Upload this new APK or App Bundle to an internal or closed testing track in your Google Play Console. The Play Console will then scan this new build, detect the presence of the Google Play Billing Library and permission, and enable the subscription management features.

### 2. Configure Subscriptions in Google Play Console

Once your new build is processed and recognized by the Play Console, you will be able to create and manage your subscription products.

*   **Create Subscription Product**: Create a new subscription product with the Product ID: `tarantulapp_pro_monthly`. This ID must exactly match the one used in your backend configuration and the `VITE_ANDROID_PLAY_PRODUCT_ID` environment variable (if set).
*   **Configure Product Details**: Set up the pricing, trial periods (if any), and other details for your subscription product.

### 3. Set Up Google Cloud Service Account for Backend Verification

Your backend currently uses a "stub" mode for verifying Google Play purchases. To enable real-time, secure verification, you need to set up a Google Cloud Service Account.

*   **Create Service Account**: In the Google Cloud Console, create a new Service Account.
*   **Grant API Access**: Grant this Service Account access to the "Google Play Android Developer API".
*   **Generate JSON Key**: Generate a JSON key file for this Service Account. This file contains the credentials your backend will use to communicate with the Google Play Developer API.
*   **Securely Provide Credentials to Backend**: Provide these credentials to your backend environment. Typically, this involves setting environment variables or mounting the JSON key file securely in your backend deployment.

### 4. Update Backend Configuration

Finally, you need to switch your backend from "stub" mode to "real" mode for Google Play Billing.

*   **Change Environment Variable**: Update your backend environment variable `GOOGLE_PLAY_BILLING_MODE` from `stub` to `real`.
*   **Disable Test Tokens**: For production, you should also set `GOOGLE_PLAY_BILLING_ALLOW_TEST_TOKENS` to `false`.
*   **Implement Real Verification**: Ensure your `BillingService.java` (specifically the `verifyGooglePlaySubscription` method) is updated to use the Google Play Developer API for real purchase token validation, replacing the current stub logic. This is mentioned in your `PLAY_BILLING_SETUP.md` under "Real Google Play integration checklist".

By following these steps, you will successfully integrate Google Play Billing into your TarantulApp, allowing you to manage and offer subscriptions through the Google Play Store.
