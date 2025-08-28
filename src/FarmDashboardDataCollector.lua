FarmDashboardDataCollector = {}
FarmDashboardDataCollector.updateTimer = 0
FarmDashboardDataCollector.data = {}

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

end

function FarmDashboardDataCollector:update(dt)
    -- Safety check for dt
    if not dt or type(dt) ~= "number" or dt <= 0 then
        return
    end

    -- Initialize timer if needed
    if not self.updateTimer then
        self.updateTimer = 0
    end

    if type(self.updateTimer) == "number" and type(dt) == "number" then
        self.updateTimer = self.updateTimer + dt
    end

    if self.updateTimer >= FarmDashboard.UPDATE_INTERVAL then
        self.updateTimer = 0

        -- Log every 10th update (every 10 seconds) to confirm it's working
        if not self.updateCount then
            self.updateCount = 0
        end
        if type(self.updateCount) == "number" then
            self.updateCount = self.updateCount + 1
        end

        -- Collect data first
        -- Logging.info("[FarmDash] Attempting data collection at time=%d", _G.g_time or 0)
        local collected = self:collectAllData()

        -- Always write the data - let the dashboard handle empty values
        if collected then
            self:writeDataToFile(collected)
        end
    end
end

function FarmDashboardDataCollector:collectAllData()
    -- Safety check: Don't collect if game isn't ready
    if not _G.g_currentMission then
        return nil
    end

    local data = {
        timestamp = _G.g_time or 0,
        status = "active",
        money = _G.g_currentMission:getMoney() or 0,
        gameTime = self:getGameTime(),
        farmInfo = self:getFarmInfo(),
        animals = {},
        vehicles = {},
        fields = {},
        production = {},
        finance = {},
        weather = {},
        economy = {}
    }

    for name, collector in pairs(self.collectors) do
        if collector.collect then
            -- Logging.info("[FarmDash] Collecting data from: %s", name)
            if name == "animals" then
                -- AnimalDataCollector now returns only animal data
                local success, animalData = pcall(function()
                    return collector:collect()
                end)

                if success then
                    data[name] = animalData or {}
                    -- Logging.info("[FarmDash] Animal data collected: %d entries", #(animalData or {}))
                else
                    data[name] = {}
                    Logging.error("[FarmDash] Failed to collect animal data: %s", tostring(animalData))
                end
            else
                -- Normal collectors that return single value
                local success, result = pcall(function()
                    return collector:collect()
                end)

                if success then
                    data[name] = result or {}
                    if name == "vehicles" then
                        -- Logging.info("[FarmDash] Vehicle data collected: %d entries", #(result or {}))
                    end
                else
                    data[name] = {}
                    Logging.error("[FarmDash] Failed to collect %s data: %s", name, tostring(result))
                end
            end
        end
    end

    -- Add basic safe manual data collection
    data.money = (_G.g_currentMission and _G.g_currentMission:getMoney()) or 0

    -- Remove husbandryTotals - no longer tracked

    -- DEBUG removed - let real scan run

    self.data = data
    return data
end

function FarmDashboardDataCollector:getGameTime()
    if not _G.g_currentMission or not _G.g_currentMission.environment then
        return {}
    end

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
    local dataPath = getUserProfileAppPath() .. "modSettings/FS25_FarmDashboard/"

    -- Create directory if it doesn't exist
    createFolder(dataPath)

    -- Convert data to JSON string
    local jsonData = self:toJSON(data)

    if not jsonData or jsonData == "" then
        return
    end

    -- Write to data.json file
    local filePath = dataPath .. "data.json"

    local file, err = io.open(filePath, "w")
    if file then
        file:write(jsonData)
        file:close()

        -- Log path and vehicle data for debugging
        local vehicleCount = 0
        if data.vehicles and type(data.vehicles) == "table" then
            vehicleCount = #data.vehicles
        end
        -- Logging.info("[FarmDash] wrote %s with %d vehicles", filePath, vehicleCount)
        
        -- Log first vehicle for debugging
        if vehicleCount > 0 and data.vehicles[1] then
            local firstVehicle = data.vehicles[1]
            -- Logging.info("[FarmDash] First vehicle: id=%s name=%s type=%s", 
            --     tostring(firstVehicle.id), 
            --     tostring(firstVehicle.name), 
            --     tostring(firstVehicle.vehicleType))
        end

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
        -- Check if it's an array (consecutive integer keys starting from 1)
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
                -- Sanitize key to ensure valid JSON
                local key = tostring(k):gsub('[\x00-\x1f]', ''):gsub('\\', '\\\\'):gsub('"', '\\"')
                result = result .. '"' .. key .. '":' .. self:toJSON(v)
                first = false
            end
            return result .. "}"
        end
    elseif type(data) == "string" then
        -- More robust string escaping to handle all control characters
        local escaped = data:gsub('\\', '\\\\')
                           :gsub('"', '\\"')
                           :gsub('\n', '\\n')
                           :gsub('\r', '\\r')
                           :gsub('\t', '\\t')
                           :gsub('[\x00-\x08\x0b\x0c\x0e-\x1f]', '') -- Remove other control chars
        return '"' .. escaped .. '"'
    elseif type(data) == "number" then
        -- Handle NaN and infinity
        if data ~= data then return "null" end -- NaN
        if data == math.huge then return "null" end -- Infinity
        if data == -math.huge then return "null" end -- -Infinity
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