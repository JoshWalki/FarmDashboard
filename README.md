# 🚜 About the FS25 Farm Management Dashboard

Welcome to the **FS25 Farm Management Dashboard**! This project was built to be the ultimate, professional-grade companion application for Farming Simulator 25. 

Instead of pausing the game and digging through cumbersome in-game menus, this dashboard runs on a second monitor (or remotely) to act as a real-time agricultural command center. Whether running a solo local save or managing a massive dedicated multiplayer server, this app tracks livestock health, vehicle maintenance, market fluctuations, and precision farming data instantly.

---

### 🌟 Special Acknowledgments
A massive thank you to **JoshWalki**, who built the original foundation for this project. The core Lua Data Collectors and the base mod structure were his creation. We took that incredible groundwork, restructured it, and heavily expanded it into the fully-fledged, multi-server application you see today!

---

### ⚙️ How It Works Under the Hood
This isn't just a simple stat tracker; it’s a fully integrated, three-part software ecosystem:

1. **The In-Game Mod (Lua):** Built upon JoshWalki's foundational data collectors, the custom FS25 mod has been restructured to run silently in the background of the game. It scrapes the live game memory and seamlessly injects that data into a cleanly formatted file on the local hard drive or dedicated server.
2. **The Backend Engine (Node.js & Electron):** The desktop application acts as the brain. It actively monitors local save files or connects remotely via FTP to a dedicated server, beaming any changes instantly to the dashboard via a real-time WebSocket connection.
3. **The Front-End UI:** A sleek, Bootstrap-powered interface designed for dark-mode. It catches the live data and dynamically updates charts, tables, and notifications without ever needing to hit a refresh button.

---

### 🚀 Massive Recent Updates (The Last 2 Weeks of Development)

Over the last two weeks, this project has evolved from a basic data reader into a commercial-quality, deployment-ready application. Here is what has just been added:

#### 🌾 Precision Farming & Deep Field Management
The way the dashboard handles field data has been completely overhauled. It no longer just lists field numbers; it taps directly into the game’s core mechanics to track:
* **Crop Status:** See exactly what is planted, current growth stages, and harvest readiness.
* **Soil & Yield Data:** Full tracking for fertilization levels, weed growth, plowing status, and yield bonuses. 
* **Actionable Insights:** Get a clear overview of exactly which fields need immediate attention (like lime, rolling, or weeding) to maximize harvest output.

#### 🌐 Multi-Server Infrastructure
* **Local & FTP Support:** Monitor local single-player saves *and* remote dedicated multiplayer servers simultaneously.
* **Auto-Detect Scanner:** A "magic" background scanner was built to physically read FS25 save folders, extract the actual in-game Map Name, and automatically populate the dashboard setup screen.
* **Server Tabs:** A sleek new navigation bar allows users to jump seamlessly between different savegames with a single click.

#### 🧑‍🌾 The Multi-Farm Ecosystem
* **Multiplayer Economy Fix:** Fixed the classic FS25 issue where dedicated servers report "$0" global balances. The app now digs into the game's Farm Manager array to find the real player money!
* **Farm Dropdown:** A dynamic selector detects every individual player farm on a server (Farm 1, Farm 2, etc.).
* **Isolated Data:** When a specific farm is selected, the dashboard perfectly recalculates the bank balance, outstanding loans, and vehicle fleet values specifically for *that* farm.

#### ✨ Premium UI/UX Polish
* **Memory Management:** A background memory-wipe system was engineered to stop "ghost data" and prevent false notifications from triggering when switching between saves.
* **Cinematic Transitions:** Custom 150ms fade-in/fade-out animations were added so that switching servers and farms feels buttery smooth and premium.
* **Custom Themes:** A full color-theme editor has been integrated so the dashboard can be personalized exactly to the user's liking.

#### 📦 Ready for Deployment
* **The Windows Installer:** The entire web app has been packaged into a single, professional `.exe` installer.
* **Custom Branding:** Fully integrated custom icons for the executable, desktop shortcuts, and the main app window.

---

A ton of collaborative work has been poured into making this the most powerful companion tool available for FS25. Download the latest release, hook it up to a save, and take total control of the farm!


## 🚀 Installation Guide (Read Carefully!)

To ensure the Dashboard can find your data, you must follow these steps in order:

### 1. Install the In-Game Mod
* Download the `FS25_FarmDashboard.zip` mod.
* Place it in your Farming Simulator 25 `mods` folder.
* **Crucial Step:** Launch your game, enable the mod on every savegame you wish to track, and **Save the Game**.
  * *Why?* This creates the unique folder structure (e.g., `savegame1`, `savegame2`) and data files the dashboard needs to read.

### 2. Install the Desktop Dashboard
* Download the latest `FS25.Farm.Dashboard.Setup.exe` from the Releases section.
* Run the installer. A shortcut will be created on your desktop automatically.
* Open the app.

### 3. Connection & Setup
* Click the **✨ Auto-Detect Local Saves** button.
* The dashboard will scan your folders and list your found maps (e.g., "Elmcreek (savegame1)").
* Click **Launch Dashboard**.

---

## 📊 How to Use

### Switching Servers
Use the tabs at the top of the screen to swap between different local saves or configured FTP servers. The screen will smoothly fade and reload the data for that specific world.

### Selecting Your Farm (Multiplayer)
If you are playing on a server with multiple farms, use the **Farm Dropdown** next to the server tabs. Selecting your farm will filter the Economy and Equipment tabs to show only *your* bank account and *your* tractors.

### Managing Livestock & Vehicles
* **Livestock:** Track age, health, and breeding status across all pens.
* **Vehicles:** Monitor operating hours and damage levels to stay ahead of maintenance.
* **Fields:** *(Coming Soon)* View crop growth stages and fertilization levels.

---

## 🛠 Troubleshooting

* **"No Saves Found":** Ensure you have saved your game at least once with the mod active. The dashboard looks for files in:
  `Documents/My Games/FarmingSimulator2025/modSettings/FS25_FarmDashboard/`
* **Money shows as $0:** On dedicated servers, make sure you have selected the correct Farm ID from the dropdown menu.

---

## 🌐 Dedicated Server (FTP) Setup

If you are a member of a dedicated server or hosting your own via a provider like GPortal or Nitrado, you can track your farm data remotely!

### 1. Enabling the Mod on the Server
* Upload the `FS25_FarmDashboard.zip` mod to your server's `mods` folder.
* Activate the mod in the server web interface and restart the server.
* Log in to the game on the server and **Save the Game** at least once to generate the data files.

### 2. Configuring the Dashboard
* In the Dashboard Setup screen, select the **FTP (Dedicated)** radio button.
* Enter your FTP credentials (usually found in your server's "FTP Access" or "Settings" panel):
  * **Host/IP:** The server address.
  * **Port:** Usually `21`.
  * **Username & Password:** Your FTP login details.
  * **Base Profile Path:** Usually `profile` (check with your host if data is not found).

---

## 🏗 Developer Roadmap (Stage 1 Complete)

The project has just successfully moved through Stage 1 of Development, focusing on core infrastructure and multi-server stability.

### ✅ Stage 1: Infrastructure
* Multi-server tab system.
* Multi-farm dropdown support.
* Auto-detection of local saves.
* Real-time data synchronization with Precision Farming 3.0.

### 🚧 Stage 2: Advanced Filtering
* Linking Farm ID to the Fields tab to show only owned land.
* Linking Farm ID to the Vehicles tab to filter fleet by owner.
* Live map integration.
