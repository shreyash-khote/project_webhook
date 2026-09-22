# 🚀 Meta Lead Ads Real-Time Webhook Proof of Concept (PoC)

This Proof of Concept (PoC) demonstrates end-to-end real-time lead ingestion from Meta's **Lead Ads Testing Tool** to an **Expo React Native App** running on your physical device.

---

## 📁 Project Structure

```
metaWebhooks/
├── backend/
│   ├── server.js            # Express & Socket.io Webhook server
│   ├── simulate_lead.js     # Script to simulate lead webhook POST
│   ├── .env                 # Secret variables (VERIFY_TOKEN, PAGE_ACCESS_TOKEN, APP_SECRET)
│   ├── .env.example         # Template for environment variables
│   └── package.json
└── mobile/
    ├── App.js               # React Native (Expo) app with live socket feed
    ├── app.json
    └── package.json
```

---

## ⚡ Quick Start Guide

### Step 1: Configure Environment Secrets

Open `backend/.env` and paste your Meta parameters:

```env
PORT=5000
VERIFY_TOKEN=SHREYAShKhoteandShreyashkHoteandShreyAshkHOte
APP_SECRET=dabf920f97b732f208c793ea7b97d912
PAGE_ACCESS_TOKEN=EAAOYKHNgnl0BSTV9SHh...
```

---

### Step 2: Start the Backend Webhook Server

Open a terminal in the `backend` folder and run:

```bash
cd backend
npm start
```

You should see:
```
🚀 META LEAD WEBHOOK SERVER RUNNING ON PORT 5000
📍 Health Check:       http://localhost:5000/
📍 Webhook URL:        http://localhost:5000/webhook
```

---

### Step 3: Run your ngrok Command for Public Callback URL

Open your own terminal window and run:

```bash
ngrok http 5000
```

`ngrok` will provide your public HTTPS Forwarding URL (e.g. `https://a1b2c3d4.ngrok-free.app`).

> 📌 **Your Meta Callback URL will be:** `https://a1b2c3d4.ngrok-free.app/webhook`

---

### Step 4: Configure Meta Developer Webhook Dashboard

1. Go to **Meta Developer Portal** -> Select your App.
2. Under **Webhooks**, select **Page** (or **Leadgen**).
3. Click **Edit Subscription** or **Add Callback URL**:
   - **Callback URL**: `https://a1b2c3d4.ngrok-free.app/webhook`
   - **Verify Token**: `SHREYAShKhoteandShreyashkHoteandShreyAshkHOte`
4. Click **Verify and Save**. Your backend terminal will show:
   ```
   ✅ [VERIFICATION_SUCCESS] Token match! Responding with challenge code.
   ```
5. Subscribe to the `leadgen` field.

---

### Step 5: Start Expo App on your Physical Device

In another terminal window, start the Expo app:

```bash
cd mobile
npx expo start
```

1. Scan the displayed QR Code using **Expo Go** on your physical Android/iOS device.
2. Inside the mobile app top bar, if running over Wi-Fi, set the Server URL to your local computer IP or your `ngrok` URL:
   - Example (Local Wi-Fi IP): `http://192.168.1.10:5000`
   - Example (ngrok URL): `https://a1b2c3d4.ngrok-free.app`
3. Tap **Connect**. The badge will change to **LIVE 🟢**.

---

### Step 6: Test Real-Time Push with Meta Lead Ads Testing Tool

1. Open Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/).
2. Select your Facebook Page and Lead Form.
3. Click **Create Lead**.
4. **Watch your physical phone screen!** The test lead will appear instantly at the top of your app list without touching your device.

---

### 🧪 Alternative: Quick CLI Simulation

To test socket push without Meta's website:
```bash
cd backend
npm run simulate
```
This fires a mock webhook payload directly to your running server, broadcasting immediately to your physical phone screen!
