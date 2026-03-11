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

const store = new Store();
let mainWindow;
let serverStates = {}; 

const expressApp = express();
const server = http.createServer(expressApp);
const wss = new WebSocket.Server({ server });
const PORT = 8766;
const clients = new Set();

expressApp.use(cors());
expressApp.use(express.json());
expressApp.use(express.static(path.join(__dirname, "web")));

expressApp.get("/", (req, res) => res.sendFile(path.join(__dirname, "web", "index.html")));

expressApp.get("/api/servers", (req, res) => {
    const config = store.get('config');
    if (!config || !config.servers) return res.json([]);
    const safeServers = config.servers.map(s => ({ id: s.id, name: s.name }));
    res.json(safeServers);
});

function getDataForServer(req) {
    const serverId = req.query.serverId;
    if (!serverId || !serverStates[serverId]) return null;
    return serverStates[serverId].data;
}

expressApp.get("/api/data", (req, res) => {
    const data = getDataForServer(req);
    res.json(data ? { ...data, timestamp: new Date().toISOString() } : { error: "Waiting for data..." });
});
expressApp.get("/api/animals", (req, res) => res.json(getDataForServer(req)?.animals || []));
expressApp.get("/api/vehicles", (req, res) => res.json(getDataForServer(req)?.vehicles || []));
expressApp.get("/api/fields", (req, res) => res.json(getDataForServer(req)?.fields || []));
expressApp.get("/api/production", (req, res) => res.json(getDataForServer(req)?.production || { chains: [], husbandryTotals: {} }));
expressApp.get("/api/finance", (req, res) => res.json(getDataForServer(req)?.finance || { balance: 0, loan: 0 }));
expressApp.get("/api/weather", (req, res) => res.json(getDataForServer(req)?.weather || {}));
expressApp.get("/api/economy", (req, res) => res.json(getDataForServer(req)?.economy || {}));
expressApp.get("/api/status", (req, res) => res.json({ status: "online" }));

wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
});

function broadcastData(serverId, data) {
    const msg = JSON.stringify({ type: "data", serverId: serverId, data: data, timestamp: new Date().toISOString() });
    clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function processRawData(serverId, rawData) {
    try {
        const gameData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        let production = gameData.production || { chains: [], husbandryTotals: {} };

        serverStates[serverId].data = {
            ...gameData,
            vehicles: gameData.vehicles || [],
            production,
            lastUpdated: new Date().toISOString()
        };

        console.log(`[${new Date().toISOString()}] Server [${serverId}] data updated!`);
        broadcastData(serverId, serverStates[serverId].data);
    } catch (error) {}
}

async function safeDownload(client, remotePath, localTempPath, localFinalPath) {
    try {
        await client.downloadTo(localTempPath, remotePath);
        if (fs.existsSync(localTempPath) && fs.statSync(localTempPath).size > 0) {
            if (fs.existsSync(localFinalPath)) fs.unlinkSync(localFinalPath);
            fs.renameSync(localTempPath, localFinalPath);
            return true;
        }
    } catch (e) {}
    return false;
}

async function pollFtp(srv) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    const userDataPath = app.getPath('userData');
    
    try {
        await client.access({
            host: srv.ftpHost, port: parseInt(srv.ftpPort) || 21,
            user: srv.ftpUser, password: srv.ftpPass, secure: false
        });

        const basePath = srv.ftpBasePath || 'profile';
        const remoteJsonPath = `${basePath}/modSettings/FS25_FarmDashboard/data.json`;
        const tempJsonPath = path.join(userDataPath, `data_${srv.id}.json.tmp`);
        const finalJsonPath = path.join(userDataPath, `data_${srv.id}.json`);
        
        if (await safeDownload(client, remoteJsonPath, tempJsonPath, finalJsonPath)) {
            processRawData(srv.id, fs.readFileSync(finalJsonPath, 'utf8'));
        }
    } catch (err) {
        console.error(`[FTP Mode - ${srv.name}] Waiting for connection/files...`);
    } finally {
        client.close();
    }
}

function startFtpPolling(srv) {
    pollFtp(srv); 
    serverStates[srv.id].interval = setInterval(() => pollFtp(srv), 15000); 
}

function startLocalWatching(srv) {
    let targetPath = srv.localPath;
    if (!targetPath) {
        const userHome = os.homedir();
        targetPath = path.join(userHome, "Documents", "My Games", "FarmingSimulator2025", "modSettings", "FS25_FarmDashboard");
    }

    // Use the exact auto-detected savegame folder (like savegame1), or fallback to the manual name
    const folderName = srv.localSubFolder || srv.name.replace(/[<>:"/\\|?*]/g, '').trim();
    targetPath = path.join(targetPath, folderName, 'data.json');

    if (!fs.existsSync(targetPath)) {
        console.log(`[Local Mode - ${srv.name}] Waiting for file to be created: ${targetPath}`);
        serverStates[srv.id].interval = setTimeout(() => startLocalWatching(srv), 5000);
        return;
    }

    console.log(`[Local Mode - ${srv.name}] Actively watching: ${targetPath}`);
    serverStates[srv.id].watcher = chokidar.watch(targetPath, { usePolling: true, interval: 1000 });
    
    const readLocalFile = () => {
        if (fs.existsSync(targetPath)) processRawData(srv.id, fs.readFileSync(targetPath, 'utf8'));
    };

    serverStates[srv.id].watcher.on("add", readLocalFile);
    serverStates[srv.id].watcher.on("change", readLocalFile);
}

function stopAllWatchers() {
    Object.values(serverStates).forEach(state => {
        if (state.watcher) state.watcher.close();
        if (state.interval) {
            clearTimeout(state.interval);
            clearInterval(state.interval);
        }
    });
    serverStates = {};
}

function bootServer(config) {
    stopAllWatchers(); 
    let serversToLoad = config.servers || [];
    if (!config.servers && config.mode) {
        serversToLoad = [{ id: 'srv_legacy', name: 'My Server', ...config }];
    }

    serversToLoad.forEach(srv => {
        serverStates[srv.id] = { data: {}, watcher: null, interval: null };
        if (srv.mode === 'local') startLocalWatching(srv);
        else if (srv.mode === 'ftp') startFtpPolling(srv);
    });

    if (!server.listening) {
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`Server listening on http://0.0.0.0:${PORT}`);
            if (mainWindow) mainWindow.loadURL(`http://localhost:${PORT}`);
        });
    } else {
        if (mainWindow) mainWindow.loadURL(`http://localhost:${PORT}`);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, title: "FS25 Farm Dashboard", autoHideMenuBar: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
    });

    const config = store.get('config');
    if (config && config.isConfigured) bootServer(config);
    else mainWindow.loadFile(path.join(__dirname, 'setup.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopAllWatchers();
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('save-settings', (event, newConfig) => {
    store.set('config', newConfig);
    bootServer(newConfig);
});

ipcMain.handle('get-current-config', () => store.get('config'));

ipcMain.on('reset-settings', () => {
    store.delete('config');
    app.relaunch();
    app.exit();
});

// ========================================================
// NEW: AUTO-DETECT LOCAL SAVES SCANNER
// ========================================================
ipcMain.handle('scan-local-saves', async () => {
    const userHome = os.homedir();
    const basePath = path.join(userHome, "Documents", "My Games", "FarmingSimulator2025", "modSettings", "FS25_FarmDashboard");
    
    if (!fs.existsSync(basePath)) return [];

    const foundSaves = [];
    const folders = fs.readdirSync(basePath, { withFileTypes: true });

    for (const dirent of folders) {
        if (dirent.isDirectory()) {
            const jsonPath = path.join(basePath, dirent.name, 'data.json');
            if (fs.existsSync(jsonPath)) {
                try {
                    const rawData = fs.readFileSync(jsonPath, 'utf8');
                    const parsed = JSON.parse(rawData);
                    
                    // Grab the mapName injected by the Lua Mod!
                    let mapName = "Unknown Map";
                    if (parsed.serverInfo && parsed.serverInfo.mapName) {
                        mapName = parsed.serverInfo.mapName;
                    }

                    // Format the name nicely (e.g., "Elmcreek (savegame1)")
                    const displayName = `${mapName} (${dirent.name})`;

                    foundSaves.push({
                        id: 'srv_' + Date.now() + Math.floor(Math.random() * 1000),
                        name: displayName,
                        mode: 'local',
                        localPath: basePath,
                        localSubFolder: dirent.name // This locks it to the exact save slot folder!
                    });
                } catch (e) {
                    console.error(`Error parsing save file in ${dirent.name}:`, e);
                }
            }
        }
    }
    return foundSaves;
});