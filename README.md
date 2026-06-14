# CareConnect Mobile App

The **CareConnect Mobile App** is a dual-role React Native application serving both Doctors and Caregivers. Built with the powerful Expo framework and Expo Router, it features a dynamic multi-tenant styling engine that adapts the UI branding (colors, typography, and logos) based on the hospital the user is affiliated with. The app facilitates seamless telehealth consultations using LiveKit and WebRTC, and provides doctors with AI-powered, bilingual clinical summaries generated automatically after each call. 

**Tech Stack**: React Native, Expo, LiveKit, WebRTC, React Navigation, FlashList, and standard React Native StyleSheet.

## Quick Start & Development

To run the application locally in development mode:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Backend Connection:**
   The mobile app cannot reach `localhost` directly when running on a physical device or emulator. You must create an `.env.local` file (copying `.env.example`) and set the `EXPO_PUBLIC_API_URL` to your backend's **ngrok tunnel URL** or your machine's LAN IP.
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your ngrok URL
   ```

3. **Start the Metro Bundler:**
   ```bash
   npx expo start
   ```

4. **Run a Native Build (Recommended for Video Calling/WebRTC):**
   Because this app relies heavily on native modules for camera, microphone, and LiveKit interactions, you must run development builds rather than using Expo Go.

   *For Android:*
   ```bash
   npx expo run:android
   ```

   *For iOS (Requires macOS):*
   ```bash
   npx expo run:ios
   ```
