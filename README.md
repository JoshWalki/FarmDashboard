# 🐄 Farming Simulator 25 Dashboard

Thanks to FS25 comprehensive saving scheme, it makes reading data extremely easy, though the in-game UI seems to not be that, at all.
This application provides a comprehensive data explorer for your save file.

## 📦 Features

- 📁 **Folder Integration**: Load your FS25 save folder.
- 🐄 **Livestock Overview**:
  - View detailed stats for each animal (health, age, reproduction, genetics, etc.)
  - Filter by pregnant, lactating, or healthiest animals.
  - Grouped by building and farm.
- 📊 **Statistics & Health Tracking**:
  - Summary cards for herd insights (pregnant, lactating, average health).
  - Health bar visualizations and genetic data (if available).
- 📤 **Export Tools**:
  - Export your livestock data in **CSV**, **Excel**, **PDF**, or **printable** formats.
- 👨‍🌾 **Multi-Farm Support**:
  - Auto-detects and allows selection of multiple player-owned farms in a save.
- 📚 **Built with Modern Tools**:
  - Bootstrap 5, DataTables, localStorage for persistent save paths.
- 🔜 **Much, much more to come**

> 🔧 Other modules like vehicles, fields, economy, and properties are scaffolded and planned for future updates.

## 🐮 How to Use

1. Open the game and load your save.
2. Open the app in your browser by launching `index.html`.
3. Click **"Choose Save Folder"** and select your local FS25 save directory.
   ```
   Example path:
   C:\Users\[YourName]\AppData\Local\Packages\GIANTSSoftware.FarmingSimulator25PC_fa8jxm5fj0esw\LocalCache\Local\save
   ```
4. Your save data will be parsed and presented on the dashboard.

> ⚠️ **Info**: FS25 uses encrytped data. When your save is laoded, the files are moved to \Local\save. Thus, the data can only be parsed when your game is open with the save loaded.\*

## 📌 TODO / Planned Features

- ✅ Livestock Management
- 🔜 Crop management and insights
- 🔜 Vehicle Fleet Management
- 🔜 Field Tracking
- 🔜 Economy & Finances
- 🔜 Property Overview
- 🔜 Genetic Insights & Breeding Suggestions
- 🔜 Prevent reloading - Websocket mod\*

---

**JoshWalki**
Built with ❤️ for FS25 players.

> This is a community fan-made tool and is not affiliated with GIANTS Software or the official Farming Simulator team.
