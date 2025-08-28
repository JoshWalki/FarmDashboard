FarmDashboard = {}
FarmDashboard.MOD_NAME = "FS25_FarmDashboard"
FarmDashboard.MOD_DIR = _G.g_currentModDirectory
FarmDashboard.VERSION = "1.0.0.0"
FarmDashboard.UPDATE_INTERVAL = 10000
FarmDashboard.PORT = 8766
FarmDashboard.readyAt = nil  -- Delay collection until mission is fully ready

local hasLoaded = false

function FarmDashboard:loadMap()
    if hasLoaded then
        return
    end
    
    hasLoaded = true
    
    
    -- FarmDashboardServer.lua doesn't exist, so don't try to load it
    -- source(FarmDashboard.MOD_DIR .. "src/FarmDashboardServer.lua")
    source(FarmDashboard.MOD_DIR .. "src/FarmDashboardDataCollector.lua")
    -- Don't load HTTP/WebSocket servers - they require socket library not available in FS
    -- source(FarmDashboard.MOD_DIR .. "src/FarmDashboardHTTPServer.lua")
    -- source(FarmDashboard.MOD_DIR .. "src/FarmDashboardWebSocketServer.lua")
    
    source(FarmDashboard.MOD_DIR .. "src/collectors/AnimalDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/VehicleDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/FieldDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/ProductionDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/FinanceDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/WeatherDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/EconomyDataCollector.lua")
    
    -- FarmDashboardServer:init() -- Don't call this since FarmDashboardServer doesn't exist
    FarmDashboardDataCollector:init()
    -- Don't initialize HTTP/WebSocket servers
    -- FarmDashboardHTTPServer:init(FarmDashboard.PORT)
    -- FarmDashboardWebSocketServer:init(8765)
    
    -- Register as updateable immediately
    if _G.g_currentMission then
        _G.g_currentMission:addUpdateable(FarmDashboard)
        FarmDashboard.isRegistered = true
        local currentTime = _G.g_time or 0
        if type(currentTime) == "number" then
            FarmDashboard.readyAt = currentTime + 2000
        else
            FarmDashboard.readyAt = 2000
        end
        -- Logging.info("[FarmDash] Registered in loadMap, readyAt=%d", FarmDashboard.readyAt)
    end
    
    -- Auto-start dashboard after a short delay
    FarmDashboard:startDashboard()
end

function FarmDashboard:onStartMission()
    -- Called when mission actually starts
    if _G.g_currentMission and not self.isRegistered then
        _G.g_currentMission:addUpdateable(FarmDashboard)
        self.isRegistered = true
        
        -- Set delay to allow placeables to fully initialize (2 seconds)
        local currentTime = _G.g_time or 0
        if type(currentTime) == "number" then
            FarmDashboard.readyAt = currentTime + 2000
        else
            FarmDashboard.readyAt = 2000
        end
        
        -- Logging.info("[FarmDash] onStartMission isServer=%s isClient=%s, readyAt=%d",
        --     tostring(_G.g_currentMission and _G.g_currentMission.isServer),
        --     tostring(_G.g_currentMission and _G.g_currentMission.isClient),
        --     FarmDashboard.readyAt)
        
        -- Don't collect immediately - let update() handle it after readyAt delay
    end
end

function FarmDashboard:deleteMap()
    -- Unregister from updates
    if _G.g_currentMission and self.isRegistered then
        _G.g_currentMission:removeUpdateable(FarmDashboard)
        self.isRegistered = false
    end
    
    if FarmDashboardDataCollector then
        FarmDashboardDataCollector:shutdown()
    end
    
    -- HTTP/WebSocket servers are not used anymore
end

function FarmDashboard:update(dt)
    -- Skip updates until mission is fully ready
    if not _G.g_currentMission then 
        return 
    end
    
    if not FarmDashboard.readyAt or not _G.g_time or type(_G.g_time) ~= "number" or type(FarmDashboard.readyAt) ~= "number" or _G.g_time < FarmDashboard.readyAt then 
        return 
    end
    
    -- Wrap in pcall to catch errors and prevent crashes
    local success, err = pcall(function()
        if FarmDashboardDataCollector and dt and type(dt) == "number" then
            FarmDashboardDataCollector:update(dt)
        end
    end)
    
    if not success and err then
        Logging.error("[FarmDash] Update error: %s", tostring(err))
    end
    
    -- HTTP/WebSocket servers are not used anymore
end

function FarmDashboard:startDashboard()
    -- Batch file creation is disabled to prevent overwriting the working file
    -- The user should run the existing start-dashboard.bat manually
end

addModEventListener(FarmDashboard)