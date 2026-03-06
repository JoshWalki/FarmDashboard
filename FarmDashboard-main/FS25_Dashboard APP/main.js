const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const chokidar = require('chokidar');
const ftp = require('basic-ftp');
const Store = require('electron-store');

// Initialize Electron Store for settings
const store = new Store();

// App State Variables (Pre-filled so the UI doesn't panic)
let mainWindow;
let lastUpdateTime = null;
let fileWatcher = null;
let ftpInterval = null;
let latestFarmData = {
    animals: [], fields: [], vehicles: [], finance: { balance: 0, loan: 0 }, weather: {}, economy: {},
    production: { chains: [], husbandryTotals: {} }, lastUpdated: null, isFallbackMode: false
};

// --- EXPRESS & WEBSOCKET SERVER SETUP ---
const expressApp = express();
const server = http.createServer(expressApp);
const wss = new WebSocket.Server({ server });
const PORT = 8766;
const clients = new Set();

expressApp.use(cors());
expressApp.use(express.json());
expressApp.use(express.static(path.join(__dirname, "web")));

expressApp.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "web", "index.html"));
});

// Safe API Endpoints
expressApp.get("/api/data", (req, res) => res.json({ ...latestFarmData, timestamp: new Date().toISOString() }));
expressApp.get("/api/animals", (req, res) => res.json(latestFarmData.animals || []));
expressApp.get("/api/vehicles", (req, res) => res.json(latestFarmData.vehicles || []));
expressApp.get("/api/fields", (req, res) => res.json(latestFarmData.fields || []));
expressApp.get("/api/production", (req, res) => res.json(latestFarmData.production || { chains: [], husbandryTotals: {} }));
expressApp.get("/api/finance", (req, res) => res.json(latestFarmData.finance || { balance: 0, loan: 0 }));
expressApp.get("/api/weather", (req, res) => res.json(latestFarmData.weather || {}));
expressApp.get("/api/economy", (req, res) => res.json(latestFarmData.economy || {}));
expressApp.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        dataAvailable: true,
        lastUpdate: lastUpdateTime,
        dataPath: "FTP or Local Mode"
    });
});

wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "data", data: latestFarmData }));
    ws.on("close", () => clients.delete(ws));
});

function broadcastData(data) {
    const msg = JSON.stringify({ type: "data", data: data, timestamp: new Date().toISOString() });
    clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

// --- DATA PROCESSING FUNCTION ---
function processRawData(rawData) {
    try {
        const gameData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        lastUpdateTime = new Date();

        let production = gameData.production;
        if (!production || typeof production !== "object") production = { chains: [], husbandryTotals: {} };

        latestFarmData = {
            ...gameData,
            vehicles: gameData.vehicles || [],
            production,
            lastUpdated: new Date().toISOString(),
            isFallbackMode: false
        };

        console.log(`[${new Date().toISOString()}] Farm data updated successfully from Lua Mod!`);
        broadcastData(latestFarmData);
    } catch (error) {
        console.error("Error parsing game data:", error.message);
    }
}

async function safeDownload(client, remotePath, localTempPath, localFinalPath) {
    try {
        await client.downloadTo(localTempPath, remotePath);
        if (fs.existsSync(localTempPath) && fs.statSync(localTempPath).size > 0) {
            if (fs.existsSync(localFinalPath)) fs.unlinkSync(localFinalPath);
            fs.renameSync(localTempPath, localFinalPath);
            return true;
        }
    } catch (e) {
        // Silently catch - file likely doesn't exist yet
    }
    return false;
}

// --- STRICT LUA JSON POLLING ---
async function pollFtp(config) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    const userDataPath = app.getPath('userData');
    
    try {
        await client.access({
            host: config.ftpHost,
            port: parseInt(config.ftpPort) || 21,
            user: config.ftpUser,
            password: config.ftpPass,
            secure: false
        });

        const basePath = config.ftpBasePath || 'profile';
        const remoteJsonPath = `${basePath}/modSettings/FS25_FarmDashboard/data.json`;
        const tempJsonPath = path.join(userDataPath, 'data.json.tmp');
        const finalJsonPath = path.join(userDataPath, 'data.json');
        
        const jsonSuccess = await safeDownload(client, remoteJsonPath, tempJsonPath, finalJsonPath);
        
        if (jsonSuccess) {
            processRawData(fs.readFileSync(finalJsonPath, 'utf8'));
        } else {
            console.log("[FTP Mode] Waiting for Lua Mod to generate data.json...");
        }

    } catch (err) {
        console.error("[FTP Mode] Connection/Fetch error:", err.message);
    } finally {
        client.close();
    }
}

function startFtpPolling(config) {
    console.log(`[FTP Mode] Starting poll loop to ${config.ftpHost}...`);
    pollFtp(config); 
    ftpInterval = setInterval(() => pollFtp(config), 15000); 
}

function startLocalWatching(customPath) {
    let targetPath = customPath;
    if (!targetPath) {
        const userHome = os.homedir();
        const possiblePaths = [
            path.join(userHome, "Documents", "My Games", "FarmingSimulator2025", "modSettings", "FS25_FarmDashboard", "data.json"),
            path.join(userHome, "Documents", "My Games", "FarmingSimulator2025", "modSettings", "FS25_FarmDashboard", "farmdata.json")
        ];
        targetPath = possiblePaths.find(p => fs.existsSync(p));
    }

    if (!targetPath) {
        console.log("[Local Mode] Waiting for data.json to be created...");
        setTimeout(() => startLocalWatching(customPath), 5000);
        return;
    }

    console.log(`[Local Mode] Watching file: ${targetPath}`);
    fileWatcher = chokidar.watch(targetPath, { usePolling: true, interval: 1000 });
    
    const readLocalFile = () => {
        if (fs.existsSync(targetPath)) {
            processRawData(fs.readFileSync(targetPath, 'utf8'));
        }
    };

    fileWatcher.on("add", readLocalFile);
    fileWatcher.on("change", readLocalFile);
}

function bootServer(config) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        if (mainWindow) mainWindow.loadURL(`http://localhost:${PORT}`);
    });

    if (config.mode === 'local') startLocalWatching(config.localPath);
    else if (config.mode === 'ftp') startFtpPolling(config);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: "FS25 Farm Dashboard",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const config = store.get('config');
    if (config && config.isConfigured) {
        bootServer(config);
    } else {
        mainWindow.loadFile(path.join(__dirname, 'setup.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (fileWatcher) fileWatcher.close();
    if (ftpInterval) clearInterval(ftpInterval);
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('save-settings', (event, newConfig) => {
    newConfig.isConfigured = true;
    store.set('config', newConfig);
    bootServer(newConfig);
});

ipcMain.on('reset-settings', () => {
    store.delete('config');
    app.relaunch();
    app.exit();
});