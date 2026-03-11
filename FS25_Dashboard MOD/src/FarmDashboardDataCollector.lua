FarmDashboardDataCollector = {}
FarmDashboardDataCollector.updateTimer = 0
FarmDashboardDataCollector.data = {}
FarmDashboardDataCollector.collectionState = 0 -- Used for chunking data collection

function FarmDashboardDataCollector:init()
    self.collectors = {
        animals = AnimalDataCollector,
        vehicles = VehicleDataCollector,
        weather = WeatherDataCollector,
        fields = FieldDataCollector,
        finance = FinanceDataCollector,
        economy = EconomyDataCollector
    }

    for name, collector in pairs(self.collectors) do
        if collector.init then
            collector:init()
        end
    end

    -- Load or create configuration
    self:loadConfig()
end

function FarmDashboardDataCollector:loadConfig()
    self.config = {
        interval = 10000,
        enableAnimals = true,
        enableVehicles = true,
        enableWeather = true,
        enableFields = true,
        enableFinance = true,
        enableEconomy = true
    }

    local configPath = getUserProfileAppPath() .. "modSettings/FS25_FarmDashboard/config.xml"
    
    if fileExists(configPath) then
        local xmlFile = loadXMLFile("FarmDashboardConfig", configPath)
        if xmlFile ~= 0 then
            self.config.interval = getXMLInt(xmlFile, "farmDashboard.settings#updateInterval") or self.config.interval
            self.config.enableAnimals = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#animals"), true)
            self.config.enableVehicles = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#vehicles"), true)
            self.config.enableWeather = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#weather"), true)
            self.config.enableFields = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#fields"), true)
            self.config.enableFinance = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#finance"), true)
            self.config.enableEconomy = Utils.getNoNil(getXMLBool(xmlFile, "farmDashboard.modules#economy"), true)
            delete(xmlFile)
        end
    else
        -- Create directory and default config file if it doesn't exist
        createFolder(getUserProfileAppPath() .. "modSettings/FS25_FarmDashboard/")
        local xmlFile = createXMLFile("FarmDashboardConfig", configPath, "farmDashboard")
        
        setXMLInt(xmlFile, "farmDashboard.settings#updateInterval", self.config.interval)
        setXMLBool(xmlFile, "farmDashboard.modules#animals", true)
        setXMLBool(xmlFile, "farmDashboard.modules#vehicles", true)
        setXMLBool(xmlFile, "farmDashboard.modules#weather", true)
        setXMLBool(xmlFile, "farmDashboard.modules#fields", true)
        setXMLBool(xmlFile, "farmDashboard.modules#finance", true)
        setXMLBool(xmlFile, "farmDashboard.modules#economy", true)
        
        saveXMLFile(xmlFile)
        delete(xmlFile)
    end
    
    -- Override the global interval with our config
    FarmDashboard.UPDATE_INTERVAL = self.config.interval
end

function FarmDashboardDataCollector:update(dt)
    if not dt or type(dt) ~= "number" or dt <= 0 then return end
    if not _G.g_currentMission then return end

    -- STATE 0: Waiting for the timer
    if self.collectionState == 0 then
        self.updateTimer = (self.updateTimer or 0) + dt
        
        if self.updateTimer >= FarmDashboard.UPDATE_INTERVAL then
            self.updateTimer = 0
            self.collectionState = 1
            
            -- Initialize baseline data for this cycle, preserving old data for disabled modules
            self.tempData = {
                timestamp = _G.g_time or 0,
                status = "active",
                money = _G.g_currentMission:getMoney() or 0,
                gameTime = self:getGameTime(),
                farmInfo = self:getFarmInfo(),
                animals = self.data.animals or {},
                vehicles = self.data.vehicles or {},
                fields = self.data.fields or {},
                production = self.data.production or {},
                finance = self.data.finance or {},
                weather = self.data.weather or {},
                economy = self.data.economy or {}
            }
        end

    -- STATE 1: Collect Animals & Vehicles
    elseif self.collectionState == 1 then
        if self.config.enableAnimals then self.tempData.animals = self:safeCollect("animals") end
        if self.config.enableVehicles then self.tempData.vehicles = self:safeCollect("vehicles") end
        self.collectionState = 2

    -- STATE 2: Collect Fields, Finance & Weather
    elseif self.collectionState == 2 then
        if self.config.enableFields then self.tempData.fields = self:safeCollect("fields") end
        if self.config.enableFinance then self.tempData.finance = self:safeCollect("finance") end
        if self.config.enableWeather then self.tempData.weather = self:safeCollect("weather") end
        self.collectionState = 3

    -- STATE 3: Collect Economy (Heavy calculation)
    elseif self.collectionState == 3 then
        if self.config.enableEconomy then self.tempData.economy = self:safeCollect("economy") end
        self.collectionState = 4

    -- STATE 4: Finalize and Write to File
    elseif self.collectionState == 4 then
        self.data = self.tempData
        self:writeDataToFile(self.data)
        self.collectionState = 0 -- Reset to wait for the next interval
    end
end

function FarmDashboardDataCollector:safeCollect(collectorName)
    local collector = self.collectors[collectorName]
    if not collector or not collector.collect then return {} end

    local success, result = pcall(function()
        return collector:collect()
    end)

    if success then
        return result or {}
    else
        Logging.error("[FarmDash] Failed to collect %s data: %s", collectorName, tostring(result))
        return {}
    end
end

function FarmDashboardDataCollector:getGameTime()
    if not _G.g_currentMission or not _G.g_currentMission.environment then return {} end
    local env = _G.g_currentMission.environment
    return {
        day = env.currentDay or 1,
        dayInPeriod = env.currentDayInPeriod or 1,
        period = env.currentPeriod or 1,
        year = env.currentYear or 1,
        hour = env.currentHour or 0,
        minute = env.currentMinute or 0,
        dayTime = env.dayTime or 0,
        timeScale = _G.g_currentMission.missionInfo.timeScale or 1
    }
end

function FarmDashboardDataCollector:getFarmInfo()
    local farms = {}
    if _G.g_farmManager then
        for _, farm in pairs(_G.g_farmManager.farms) do
            local farmData = {
                id = farm.farmId,
                name = farm.name,
                color = farm.color,
                loan = farm.loan or 0,
                money = farm.money or 0,
                players = {}
            }
            if farm.players then
                for _, player in pairs(farm.players) do
                    table.insert(farmData.players, {
                        name = player.nickname or "Unknown",
                        id = player.userId
                    })
                end
            end
            table.insert(farms, farmData)
        end
    end
    return farms
end

function FarmDashboardDataCollector:writeDataToFile(data)
    -- ==========================================
    -- BULLETPROOF DYNAMIC MAP & SAVEGAME DETECTION
    -- ==========================================
    local savegameDir = "default_save"
    local currentMapName = "Unknown Map"

    if _G.g_currentMission and _G.g_currentMission.missionInfo then
        local info = _G.g_currentMission.missionInfo
        
        -- Primary check: Try to get the directory name directly
        if info.savegameDirectoryName and info.savegameDirectoryName ~= "" then
            savegameDir = info.savegameDirectoryName
        -- Fallback check: Use the hardcoded savegame index (e.g., Slot 1 = "savegame1")
        elseif info.savegameIndex and info.savegameIndex > 0 then
            savegameDir = "savegame" .. tostring(info.savegameIndex)
        end

        -- Try to get the map title
        if info.mapTitle and info.mapTitle ~= "" then
            currentMapName = info.mapTitle
        end
    end

    -- Inject the Server Info into the payload so the dashboard can read it!
    data.serverInfo = {
        mapName = currentMapName,
        saveSlot = savegameDir
    }

    -- Create the unique sub-folder based ONLY on the Save Slot
    local dataPath = getUserProfileAppPath() .. "modSettings/FS25_FarmDashboard/" .. savegameDir .. "/"
    createFolder(dataPath)
    -- ==========================================

    local jsonData = self:toJSON(data)
    if not jsonData or jsonData == "" then return end

    local filePath = dataPath .. "data.json"
    local file, err = io.open(filePath, "w")
    if file then
        file:write(jsonData)
        file:close()
        
        -- Also write farmdata.json for compatibility
        local farmDataPath = dataPath .. "farmdata.json"
        local farmFile = io.open(farmDataPath, "w")
        if farmFile then
            farmFile:write(jsonData)
            farmFile:close()
        end
    end
end

function FarmDashboardDataCollector:toJSON(data)
    if type(data) == "table" then
        local isArray = true
        local count = 0
        for k, v in pairs(data) do
            count = count + 1
            if type(k) ~= "number" or k ~= count then
                isArray = false
                break
            end
        end

        if isArray and count > 0 then
            local result = "["
            for i, v in ipairs(data) do
                if i > 1 then result = result .. "," end
                result = result .. self:toJSON(v)
            end
            return result .. "]"
        else
            local result = "{"
            local first = true
            for k, v in pairs(data) do
                if not first then result = result .. "," end
                local key = tostring(k):gsub('[\x00-\x1f]', ''):gsub('\\', '\\\\'):gsub('"', '\\"')
                result = result .. '"' .. key .. '":' .. self:toJSON(v)
                first = false
            end
            return result .. "}"
        end
    elseif type(data) == "string" then
        local escaped = data:gsub('\\', '\\\\')
                           :gsub('"', '\\"')
                           :gsub('\n', '\\n')
                           :gsub('\r', '\\r')
                           :gsub('\t', '\\t')
                           :gsub('[\x00-\x08\x0b\x0c\x0e-\x1f]', '')
        return '"' .. escaped .. '"'
    elseif type(data) == "number" then
        if data ~= data or data == math.huge or data == -math.huge then return "null" end
        return tostring(data)
    elseif type(data) == "boolean" then
        return tostring(data)
    else
        return "null"
    end
end

function FarmDashboardDataCollector:getCurrentData()
    return self.data
end

function FarmDashboardDataCollector:shutdown()
    for name, collector in pairs(self.collectors) do
        if collector.shutdown then
            collector:shutdown()
        end
    end
end