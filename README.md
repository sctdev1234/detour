# Detour App

This project consists of a Node.js/Express backend and a React Native (Expo) frontend.

## 🚀 Getting Started

### 1. Installation

First, install the dependencies for both the backend and frontend.

```bash
# In the root directory
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Running the Project

You can run the backend and frontend in separate terminals as requested.

#### Terminal 1: Backend
Start the backend server (connects to MongoDB).

```bash
# From the root directory
npm run backend
```
*Port: 5000*

#### Terminal 2: Frontend
Start the Expo development server.

```bash
# From the root directory
npm run frontend
```

### 📱 Testing on your Phone

1.  Make sure your **Phone** and **Computer** are on the **Same WiFi Network**.
2.  Scan the QR code shown in the Frontend terminal using the **Expo Go** app (Android) or Camera app (iOS).
3.  The app will automatically detect your computer's IP address and connect to the backend.

### 🔧 Troubleshooting
*   **Registration Failed?** Ensure you are on the same WiFi. The app uses your local LAN IP to connect.
*   **Tunnel Mode:** If you need to use a tunnel (e.g., different networks), edit `frontend/.env` and uncomment the `EXPO_PUBLIC_API_URL` line.
