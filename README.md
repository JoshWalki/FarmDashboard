🚜 FS25 Farm Management Dashboard
A high-performance, real-time companion app for Farming Simulator 25. Monitor your livestock, fleet, and finances across multiple local saves and dedicated servers from a single, professional interface.

🌟 Key Features
Multi-Server Tabs: Switch between different savegames or dedicated servers instantly.

Multi-Farm Support: Select individual player farms on multiplayer servers to see specific bank balances and equipment.

Auto-Detect Technology: Automatically scans your PC to find your saves and identifies them by their in-game Map Name.

Real-Time Data: Live updates for animal health, vehicle damage, and market prices via our custom Lua Mod.

Smooth UI: Snappy, cinematic transitions and a customizable dark-mode theme.

🚀 Installation Guide (Read Carefully!)
To ensure the Dashboard can find your data, you must follow these steps in order:

1. Install the In-Game Mod
Download the FS25_FarmDashboard.zip mod.

Place it in your Farming Simulator 25 mods folder.

Crucial Step: Launch your game, enable the mod on every savegame you wish to track, and Save the Game.

Why? This creates the unique folder structure (e.g., savegame1, savegame2) and data files the dashboard needs to read.

2. Install the Desktop Dashboard
Download the latest FS25.Farm.Dashboard.Setup.exe from the Releases section.

Run the installer. A shortcut will be created on your desktop automatically.

Open the app.

3. Connection & Setup
Click the ✨ Auto-Detect Local Saves button.

The dashboard will scan your folders and list your found maps (e.g., "Elmcreek (savegame1)").

Click Launch Dashboard.

📊 How to Use
Switching Servers
Use the tabs at the top of the screen to swap between different local saves or configured FTP servers. The screen will smoothly fade and reload the data for that specific world.

Selecting Your Farm (Multiplayer)
If you are playing on a server with multiple farms, use the Farm Dropdown next to the server tabs. Selecting your farm will filter the Economy and Equipment tabs to show only your bank account and your tractors.

Managing Livestock & Vehicles
Livestock: Track age, health, and breeding status across all pens.

Vehicles: Monitor operating hours and damage levels to stay ahead of maintenance.

Fields:  View crop growth stages and fertilization levels. Works With Precision Farming 3.0

🛠 Troubleshooting
"No Saves Found": Ensure you have saved your game at least once with the mod active. The dashboard looks for files in Documents/My Games/FarmingSimulator2025/modSettings/FS25_FarmDashboard/.

Money shows as $0: On dedicated servers, make sure you have selected the correct Farm ID from the dropdown menu.

📝 Credits & Development
Developed as a modern tool for the FS25 community.
Credit to JoshWalki for a lot of the work on the data collectors in the mod and the main work on the dash board

🌐 Dedicated Server (FTP) Setup
If you are a member of a dedicated server or hosting your own via a provider like GPortal or Nitrado, you can track your farm data remotely!

1. Enabling the Mod on the Server
Upload the FS25_FarmDashboard.zip mod to your server's mods folder.

Activate the mod in the server web interface and restart the server.

Log in to the game on the server and Save the Game at least once to generate the data files.

2. Configuring the Dashboard
In the Dashboard Setup screen, select the FTP (Dedicated) radio button.

Enter your FTP credentials (usually found in your server's "FTP Access" or "Settings" panel):

Host/IP: The server address.

Port: Usually 21.

Username & Password: Your FTP login details.

Base Profile Path: Usually profile (check with your host if data is not found).

🏗 Developer Roadmap (Stage 1 Complete)
The project has just successfully moved through Stage 1 of Development, focusing on core infrastructure and multi-server stability and Precision farming integrated.

✅ Stage 1: Infrastructure

Multi-server tab system.

Multi-farm dropdown support.

Auto-detection of local saves.

Real-time data synchronization.

🚧 Stage 2: Advanced Filtering

Linking Farm ID to the Fields tab to show only owned land.

Linking Farm ID to the Vehicles tab to filter fleet by owner.

Precsion Farming 3.0 integrated
