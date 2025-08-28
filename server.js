const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
const cors = require("cors");
const os = require("os");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 8766;

// Function to get local network IP address
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if ("IPv4" !== interface.family || interface.internal !== false) {
        continue;
      }
      return interface.address;
    }
  }
  return "localhost";
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from web directory
app.use(express.static(path.join(__dirname, "web")));

// Serve the main dashboard page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

// State
let currentData = null;
let lastUpdateTime = null;
let fileWatcher = null;
let actualDataPath = null;

// In-memory storage for the latest farm data
let latestFarmData = {
  animals: [],
  fields: [],
  vehicles: [],
  finances: {},
  weather: {},
  productions: [],
  lastUpdated: null,
};

// Function to get all possible data paths for different FS25 installations
function findDataFile() {
  const userHome = os.homedir();

  const pathsToCheck = [
    // Standard installation paths
    {
      path: path.join(
        userHome,
        "Documents",
        "My Games",
        "FarmingSimulator2025",
        "modSettings",
        "FS25_FarmDashboard",
        "data.json"
      ),
      name: "Standard location (data.json)",
    },
    {
      path: path.join(
        userHome,
        "Documents",
        "My Games",
        "FarmingSimulator2025",
        "modSettings",
        "FS25_FarmDashboard",
        "farmdata.json"
      ),
      name: "Standard location (farmdata.json)",
    },
    // MS Store installation paths
    {
      path: path.join(
        userHome,
        "AppData",
        "Local",
        "Packages",
        "GIANTSSoftware.FarmingSimulator25PC_fa8jxm5fj0esw",
        "LocalCache",
        "Local",
        "modSettings",
        "FS25_FarmDashboard",
        "data.json"
      ),
      name: "MS Store FS25_FarmDashboard (data.json)",
    },
    {
      path: path.join(
        userHome,
        "AppData",
        "Local",
        "Packages",
        "GIANTSSoftware.FarmingSimulator25PC_fa8jxm5fj0esw",
        "LocalCache",
        "Local",
        "modSettings",
        "FS25_FarmDashboard",
        "farmdata.json"
      ),
      name: "MS Store FS25_FarmDashboard (farmdata.json)",
    },
    {
      path: path.join(
        userHome,
        "AppData",
        "Local",
        "Packages",
        "GIANTSSoftware.FarmingSimulator25PC_fa8jxm5fj0esw",
        "LocalCache",
        "Local",
        "modSettings",
        "FS25_FarmDashboard_Minimal",
        "farmdata.json"
      ),
      name: "MS Store FS25_FarmDashboard_Minimal",
    },
  ];

  for (const { path: filePath, name } of pathsToCheck) {
    if (fs.existsSync(filePath)) {
      console.log(`[Server] Found data file at ${name}: ${filePath}`);
      return filePath;
    }
  }

  console.log(
    "[Server] Data file not found yet. Waiting for FS25 mod to create it..."
  );
  pathsToCheck.forEach(({ path: filePath, name }) => {
    console.log(`[Server] Checking ${name}: ${filePath}`);
  });
  return null;
}

// Function to read and parse data from FS25 mod
function readGameData() {
  if (!actualDataPath) {
    actualDataPath = findDataFile();
    if (!actualDataPath) return null;
  }

  try {
    if (fs.existsSync(actualDataPath)) {
      const rawData = fs.readFileSync(actualDataPath, "utf8");
      const gameData = JSON.parse(rawData);
      lastUpdateTime = new Date();

      // Process the data similar to Bridge server
      let production = gameData.production;

      // If not present, assume the WHOLE file is the production object
      if (!production || typeof production !== "object") {
        production = gameData;
      }

      // Ensure keys exist
      if (!production.chains) production.chains = [];
      if (!production.husbandryTotals) production.husbandryTotals = {};

      // Only calculate as absolute fallback if husbandryTotals is completely empty
      if (Object.keys(production.husbandryTotals).length === 0) {
        console.log(
          "[Server] No husbandryTotals from Lua, calculating fallback"
        );
      } else {
        console.log(
          "[Server] Using Lua husbandryTotals:",
          production.husbandryTotals
        );
      }

      // Update our in-memory storage
      currentData = gameData;
      latestFarmData = {
        ...gameData,
        vehicles: gameData.vehicles || [],
        production,
        lastUpdated: new Date().toISOString(),
      };

      console.log(`[${new Date().toISOString()}] Game data updated`);

      // Broadcast to WebSocket clients
      broadcastData(latestFarmData);

      return latestFarmData;
    } else {
      console.log(`Data file not found: ${actualDataPath}`);
      return false;
    }
  } catch (error) {
    console.error("Error reading game data:", error);
    return false;
  }
}

// API endpoint to get current farm data
app.get("/api/data", (req, res) => {
  console.log(`[${new Date().toISOString()}] API request received`);

  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData) {
    // Use the processed data with husbandryTotals
    res.json({
      ...latestFarmData,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.log("No data available yet");
    res.status(503).json({
      error: "No data available yet",
      message: "Make sure FS25 is running with the FarmDashboard mod enabled",
      timestamp: new Date().toISOString(),
    });
  }
});

// Individual data endpoints
app.get("/api/animals", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.animals) {
    res.json(currentData.animals);
  } else {
    res.status(503).json({ error: "No animal data available" });
  }
});

app.get("/api/vehicles", (req, res) => {
  console.log(`[${new Date().toISOString()}] Vehicle API request received`);

  if (!currentData) {
    currentData = readGameData();
    console.log(
      "Read game data, vehicles found:",
      currentData && currentData.vehicles ? currentData.vehicles.length : 0
    );
  }

  if (currentData && currentData.vehicles) {
    console.log(`Returning ${currentData.vehicles.length} vehicles`);
    res.json(currentData.vehicles);
  } else {
    console.log("No vehicle data available in currentData");
    res.status(503).json({ error: "No vehicle data available" });
  }
});

app.get("/api/fields", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.fields) {
    res.json(currentData.fields);
  } else {
    res.status(503).json({ error: "No field data available" });
  }
});

app.get("/api/production", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData) {
    const productionData = {
      husbandryTotals: husbandryTotals,
      // Include any other production data if it exists
      ...(currentData.production || {}),
    };

    res.json(productionData);
  } else {
    res.status(503).json({ error: "No production data available" });
  }
});

app.get("/api/finance", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.finance) {
    res.json(currentData.finance);
  } else {
    res.status(503).json({ error: "No finance data available" });
  }
});

app.get("/api/weather", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.weather) {
    res.json(currentData.weather);
  } else {
    res.status(503).json({ error: "No weather data available" });
  }
});

app.get("/api/economy", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.economy) {
    res.json(currentData.economy);
  } else {
    res.status(503).json({ error: "No economy data available" });
  }
});

// Debug endpoint to show forced items
app.get("/api/economy/debug", (req, res) => {
  if (!currentData) {
    currentData = readGameData();
  }

  if (currentData && currentData.economy) {
    const economy = currentData.economy;
    const marketPrices = economy.marketPrices || {};
    const sellPoints = marketPrices.sellPoints || [];
    
    // Find Market Base Prices station
    const baseStation = sellPoints.find(station => station.name === "Market Base Prices");
    
    if (baseStation) {
      const allItems = Object.keys(baseStation.prices || {}).sort();
      const forcedItems = allItems.filter(item => 
        ["SLURRY", "BUFFALO_MILK", "GOAT_MILK", "SORGHUM", "STRAWBERRIES", 
         "LETTUCE", "HERBICIDE", "PESTICIDE"].includes(item)
      );
      
      res.json({
        totalItems: allItems.length,
        allItems: allItems,
        forcedItemsFound: forcedItems,
        debug: economy.debug || null,
        sampleItems: allItems.slice(0, 10)
      });
    } else {
      res.json({ 
        error: "Market Base Prices station not found", 
        sellPoints: sellPoints.map(s => s.name) 
      });
    }
  } else {
    res.status(503).json({ error: "No economy data available" });
  }
});

// API endpoint to check server status
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    dataAvailable: currentData !== null,
    lastUpdate: lastUpdateTime,
    dataPath: actualDataPath,
  });
});

// WebSocket connections
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");
  clients.add(ws);

  // Send current data to new client
  if (currentData) {
    ws.send(
      JSON.stringify({
        type: "data",
        data: latestFarmData,
      })
    );
  }

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

// Broadcast data to all connected WebSocket clients
function broadcastData(data) {
  const message = JSON.stringify({
    type: "data",
    data: data,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error("Error sending to client:", error);
        clients.delete(client);
      }
    }
  });
}

// Watch for changes in the FS25 data file
function setupFileWatcher() {
  // Check for file existence periodically until found
  const checkInterval = setInterval(() => {
    actualDataPath = findDataFile();
    if (actualDataPath) {
      clearInterval(checkInterval);
      startWatching();
    }
  }, 2000);
}

function startWatching() {
  console.log(`[Server] Starting file watcher for: ${actualDataPath}`);
  const dataDir = path.dirname(actualDataPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }

  console.log(`Watching for data file: ${actualDataPath}`);

  // Watch the data file for changes
  fileWatcher = chokidar.watch(actualDataPath, {
    ignored: /^\./,
    persistent: true,
    usePolling: true, // Use polling for better compatibility
    interval: 1000, // Check every second
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  fileWatcher.on("add", () => {
    console.log("Data file created");
    readGameData();
  });

  fileWatcher.on("change", () => {
    console.log("Data file changed");
    readGameData();
  });

  fileWatcher.on("error", (error) => {
    console.error("File watcher error:", error);
  });
}

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  const networkIP = getNetworkIP();
  console.log(`
╔════════════════════════════════════════════════════════╗
║           Farm Dashboard Server v1.0.0                ║
╠════════════════════════════════════════════════════════╣
║  Local Access:     http://localhost:${PORT}            ║
║  Network Access:   http://${networkIP}:${PORT}${" ".repeat(
    Math.max(0, 12 - networkIP.length)
  )}║
║  WebSocket:        ws://${networkIP}:${PORT}${" ".repeat(
    Math.max(0, 15 - networkIP.length)
  )}║
║                                                        ║
║  Status:           Running on all interfaces          ║
║  Waiting for:      FS25 with FarmDashboard mod        ║
╚════════════════════════════════════════════════════════╝

Available endpoints:
  GET /api/status     - Server status
  GET /api/data       - All game data
  GET /api/animals    - Animal data
  GET /api/vehicles   - Vehicle data
  GET /api/fields     - Field data
  GET /api/production - Production data
  GET /api/finance    - Finance data
  GET /api/weather    - Weather data

Access from other devices:
  • Use the Network Access URL above from phones, tablets, other PCs
  • Ensure this PC's firewall allows Node.js connections
  • All devices must be on the same local network

Press Ctrl+C to stop the server.
`);

  // Set up file watching
  setupFileWatcher();

  // Try to read existing data
  readGameData();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down...");

  if (fileWatcher) {
    fileWatcher.close();
  }

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
