![alt text](https://github.com/JoshWalki/FarmDashboard/blob/main/assests/img/logo.png "Logo")

### <code>API release late August.</code>

## 📦 Features (next release)

- 📁 **Realtime Data streaming**: Loaded directly from your game, using our API.
- 🐄 **Farm Overview**:

  - Detailed stats for each animal (health, age, reproduction, genetics, etc.)
  - Pastures and notices related to those pastures (low food, water, reproduction information, storage estimates)
  - Crops and related information, including notices (harvast time, requirements, etc)
  - View vehicles purchased with their information
  - Notification history with important information

- 📊 **Statistics & Health Tracking**:

  - Summary cards for herd insights (pregnant, lactating, average health).
  - Health bar visualizations and genetic data (if available).

- 🔜 **Much, much more to come**

## 🐮 Installation

#### Prerequisites

- Node.js (https://nodejs.org/en/download)
- RealisticLivestock (https://github.com/Arrow-kb/FS25_RealisticLivestock)

#### Install steps

1. Copy the `FS25_FarmDashboard` folder to your Farming Simulator 25 mods directory:

   - Default: `C:\Users\[username]\Documents\My Games\FarmingSimulator2025\mods\`
   - MS Store/xbox app: `C:\Users\[username]\AppData\Local\Packages\GIANTSSoftware.FarmingSimulator25PC_fa8jxm5fj0esw\LocalCache\Local\mods\`

2. Run setup.bat. Ensure there are no errors.

3. Run start-dashboard.bat.

   - Dashboard runs at http://localhost:8766/

4. Start your game, load your save with the mod enabled.

## 💡 How It Works

The mod runs in the background and collects data from various game systems:

- Data Collector runs every second to find updated data
- Written data is fed through our API to the dashboard
- Direct API for various game-providing data
  - Some data is not exposed to the API. These values use manual calculations and might not be accurate.

### Local File Fallback

- All data exports to: `[FS25 directory]\modSettings\FS25_FarmDashboard\data.json`
- Can be loaded when offline though changes are not live.

## 📌 Important Notices

- This is untested in multiplayer
- I suggest not opening the dashboard to the public
- This can be used across all devices on your local network (mobile, laptop, etc)
- RealisticLivestock is highly recommended for better data

---

**JoshWalki**
Built with ❤️ for FS25 players.

## Credits

- Based on game data structures from FS25
- Compatible with RealisticLivestock by Arrow and is highly recommended for better data insights
  - https://github.com/Arrow-kb/FS25_RealisticLivestock
