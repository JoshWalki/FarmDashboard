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
    
    -- Source all collector scripts
    source(FarmDashboard.MOD_DIR .. "src/FarmDashboardDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/AnimalDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/VehicleDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/FieldDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/ProductionDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/FinanceDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/WeatherDataCollector.lua")
    source(FarmDashboard.MOD_DIR .. "src/collectors/EconomyDataCollector.lua")
    
    -- Initialize the main collector
    FarmDashboardDataCollector:init()
    
    -- MULTIPLAYER FIX: Use g_server check which is 100% reliable on Dedicated Servers
    if _G.g_server ~= nil then
        _G.g_currentMission:addUpdateable(FarmDashboard)
        FarmDashboard.isRegistered = true
        local currentTime = _G.g_time or 0
        if type(currentTime) == "number" then
            FarmDashboard.readyAt = currentTime + 2000
        else
            FarmDashboard.readyAt = 2000
        end
    end
    
    FarmDashboard:startDashboard()
end

function FarmDashboard:onStartMission()
    -- Double-check server status here as well
    if _G.g_server ~= nil and not self.isRegistered then
        if _G.g_currentMission then
            _G.g_currentMission:addUpdateable(FarmDashboard)
            self.isRegistered = true
            
            local currentTime = _G.g_time or 0
            if type(currentTime) == "number" then
                FarmDashboard.readyAt = currentTime + 2000
            else
                FarmDashboard.readyAt = 2000
            end
        end
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
end

function FarmDashboard:update(dt)
    -- Skip updates until mission is fully ready
    if not _G.g_currentMission then 
        return 
    end
    
    -- Instantly exit if this is running on a client machine
    if _G.g_server == nil then 
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
end

function FarmDashboard:startDashboard()
end

addModEventListener(FarmDashboard)