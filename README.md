# Volt App (Mobile & Web)

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://voltvault-web.vercel.app/login)
[![Download APK](https://img.shields.io/badge/Download_APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/pauljustin26/volt-app/releases/download/v1.0.0/voltvault.apk)
Volt is a cross-platform application designed for seamless rental and wallet management. Built with **React Native** and **Expo**, it runs natively on iOS/Android and on the web, utilizing **Expo Router** for navigation and **Firebase** for backend integration.

## 🔗 Live Demo
Access the web version here: **[https://voltvault-web.vercel.app/login](https://voltvault-web.vercel.app/login)**

## 📱 Features
- **Cross-Platform Support:** Runs on Android, iOS, and Web.
- **User Authentication:** Login, Signup, and Password Reset flows.
- **Wallet System:** In-app wallet recharge and status tracking.
- **Rental System:** QR-based renting and returning of "Volts" (Power banks/Units).
- **Transaction History:** Detailed logs of user activities.
- **Profile Management:** User settings and personal details.

## 🛠 Tech Stack
- **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (SDK 54)
- **Web Support:** React Native Web (Deployed on Vercel)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Language:** TypeScript
- **Styling:** React Native Paper & Custom Themed Components
- **Backend Service:** Firebase (Auth & Data)

## 📂 Project Directory

```text
volt-app/
├── app/                        # Expo Router pages
│   ├── (auth)/                 # Authentication routes (login, signup)
│   ├── (tabs)/                 # Main tab navigation (home, transaction, volts)
│   ├── rent/                   # Rental flow screens
│   ├── return/                 # Return flow screens
│   ├── wallet/                 # Wallet & recharge screens
│   ├── +not-found.tsx          # 404 fallback
│   └── _layout.tsx             # Root layout configuration
├── assets/                     # Images, icons, and fonts
├── components/                 # Reusable UI components
├── config/                     # Configuration files
│   └── firebaseConfig.ts       # Firebase initialization
├── constants/                  # App constants (Colors, etc.)
├── hooks/                      # Custom React hooks
├── theme/                      # Theme context and definitions
├── utils/                      # Helper functions (validation)
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build configuration
├── vercel.json                 # Vercel deployment configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
🚀 Getting Started
Prerequisites
Node.js (Latest LTS recommended)

npm or yarn

Expo Go app (for mobile testing)

Installation
Clone the repository:

Bash

git clone <repository-url>
cd volt-app
Install dependencies:

Bash

npm install
Running the App
For Web (Development):

Bash

npx expo start --web
For Mobile (iOS/Android):

Bash

npx expo start
Scan the QR code with the Expo Go app.

Press a for Android Emulator or i for iOS Simulator.

☁️ Deployment
This project is configured for deployment on Vercel.

The vercel.json file handles the build configuration for Expo Web.

Push changes to the main branch to trigger a redeploy (if connected to Git).

🧪 Scripts
npm start: Starts the Expo development server.

npm run web: Starts the app in web mode.

npm run android / npm run ios: Builds/runs the native apps.

npm run lint: Runs eslint to check code quality.