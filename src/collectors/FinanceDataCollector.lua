FinanceDataCollector = {}

function FinanceDataCollector:init()
end

function FinanceDataCollector:collect()
    -- Start with basic structure
    local financeData = {
        farmId = 1,
        money = 0,
        loan = 0,
        loanMax = 500000,
        totalAssets = 0,
        netWorth = 0,
        vehicles = { count = 0, totalValue = 0, vehicles = {} },
        animals = { count = 0, totalValue = 0, byType = {} },
        buildings = { count = 0, totalValue = 0, buildings = {} },
        land = { count = 0, totalValue = 0, hectares = 0, farmlands = {} }
    }
    
    -- Return basic data without any complex collection for now
    -- This ensures the collector doesn't crash and provides basic financial info
    if not _G.g_currentMission then
        return financeData
    end
    
    -- Only get the most basic data that we know works
    pcall(function()
        financeData.money = _G.g_currentMission:getMoney() or 0
    end)
    
    -- Calculate basic vehicle values from vehicle data (simpler approach)
    pcall(function()
        local vehicleValue = 0
        local vehicleCount = 0
        if _G.g_currentMission.vehicles then
            for _, vehicle in pairs(_G.g_currentMission.vehicles) do
                if vehicle:getOwnerFarmId() == 1 then
                    vehicleCount = vehicleCount + 1
                    local price = vehicle:getSellPrice() or vehicle.price or 0
                    vehicleValue = vehicleValue + price
                end
            end
        end
        financeData.vehicles.count = vehicleCount
        financeData.vehicles.totalValue = vehicleValue
    end)
    
    -- Simple totals calculation
    financeData.totalAssets = financeData.money + financeData.vehicles.totalValue
    financeData.netWorth = financeData.totalAssets - financeData.loan
    
    return financeData
end

function FinanceDataCollector:collectFarmFinanceData(farm)
    if not farm then return nil end
    
    local data = {
        farmId = farm.farmId,
        farmName = farm.name,
        money = farm.money or 0,
        loan = farm.loan or 0,
        loanMax = farm.loanMax or 500000,
        stats = {},
        vehicles = {},
        animals = {},
        buildings = {},
        land = {}
    }
    
    if farm.stats then
        data.stats = self:collectStats(farm.stats)
    end
    
    data.vehicles = self:collectVehicleValues(farm.farmId)
    data.animals = self:collectAnimalValues(farm.farmId)
    data.buildings = self:collectBuildingValues(farm.farmId)
    data.land = self:collectLandValues(farm.farmId)
    
    -- Safe arithmetic operations
    local function safeAdd(...)
        local total = 0
        for _, val in ipairs({...}) do
            if type(val) == "number" then
                if type(total) == "number" and type(val) == "number" then
                    total = total + val
                end
            end
        end
        return total
    end
    
    data.totalAssets = safeAdd(data.money, data.vehicles.totalValue, data.animals.totalValue, data.buildings.totalValue, data.land.totalValue)
    data.netWorth = safeAdd(data.totalAssets, -(data.loan or 0))
    
    return data
end

function FinanceDataCollector:collectStats(stats)
    local statsData = {
        revenue = {},
        expenses = {},
        sessions = {}
    }
    
    if stats.finances then
        for statName, value in pairs(stats.finances) do
            if string.find(statName, "revenue") then
                statsData.revenue[statName] = value
            elseif string.find(statName, "expense") then
                statsData.expenses[statName] = value
            end
        end
    end
    
    if stats.playTime then
        statsData.playTime = stats.playTime
    end
    
    return statsData
end

function FinanceDataCollector:collectVehicleValues(farmId)
    local vehicleData = {
        count = 0,
        totalValue = 0,
        vehicles = {}
    }
    
    if _G.g_currentMission.vehicles then
        for _, vehicle in pairs(_G.g_currentMission.vehicles) do
            if vehicle:getOwnerFarmId() == farmId then
                if type(vehicleData.count) == "number" then
                    vehicleData.count = vehicleData.count + 1
                end
                local value = vehicle:getSellPrice() or 0
                if type(vehicleData.totalValue) == "number" and type(value) == "number" then
                    vehicleData.totalValue = vehicleData.totalValue + value
                end
                
                table.insert(vehicleData.vehicles, {
                    name = vehicle:getName() or "Unknown",
                    value = value,
                    age = vehicle.age or 0,
                    operatingTime = vehicle.operatingTime or 0
                })
            end
        end
    end
    
    return vehicleData
end

function FinanceDataCollector:collectAnimalValues(farmId)
    local animalData = {
        count = 0,
        totalValue = 0,
        byType = {}
    }
    
    if _G.g_currentMission.husbandrySystem then
        for _, placeable in pairs(_G.g_currentMission.husbandrySystem.placeables or {}) do
            if placeable:getOwnerFarmId() == farmId then
                local clusters = placeable:getClusters()
                if clusters then
                    for _, cluster in pairs(clusters) do
                        local numAnimals = cluster.numAnimals or 1
                        local value = cluster:getSellPrice() or 0
                        
                        if type(animalData.count) == "number" and type(numAnimals) == "number" then
                            animalData.count = animalData.count + numAnimals
                        end
                        if type(animalData.totalValue) == "number" and type(value) == "number" then
                            animalData.totalValue = animalData.totalValue + value
                        end
                        
                        local typeName = cluster.subType or "unknown"
                        if not animalData.byType[typeName] then
                            animalData.byType[typeName] = {count = 0, value = 0}
                        end
                        if type(animalData.byType[typeName].count) == "number" and type(numAnimals) == "number" then
                            animalData.byType[typeName].count = animalData.byType[typeName].count + numAnimals
                        end
                        if type(animalData.byType[typeName].value) == "number" and type(value) == "number" then
                            animalData.byType[typeName].value = animalData.byType[typeName].value + value
                        end
                    end
                end
            end
        end
    end
    
    return animalData
end

function FinanceDataCollector:collectBuildingValues(farmId)
    local buildingData = {
        count = 0,
        totalValue = 0,
        buildings = {}
    }
    
    if _G.g_currentMission.placeableSystem and _G.g_currentMission.placeableSystem.placeables then
        for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
            if placeable:getOwnerFarmId() == farmId then
                if type(buildingData.count) == "number" then
                    buildingData.count = buildingData.count + 1
                end
                local value = placeable:getSellPrice() or 0
                if type(buildingData.totalValue) == "number" and type(value) == "number" then
                    buildingData.totalValue = buildingData.totalValue + value
                end
                
                table.insert(buildingData.buildings, {
                    name = placeable:getName() or "Unknown",
                    value = value,
                    age = placeable.age or 0
                })
            end
        end
    end
    
    return buildingData
end

function FinanceDataCollector:collectLandValues(farmId)
    local landData = {
        count = 0,
        totalValue = 0,
        hectares = 0,
        farmlands = {}
    }
    
    if _G.g_farmlandManager then
        for _, farmland in pairs(_G.g_farmlandManager.farmlands) do
            if farmland.ownerFarmId == farmId then
                if type(landData.count) == "number" then
                    landData.count = landData.count + 1
                end
                local value = farmland.price or 0
                if type(landData.totalValue) == "number" and type(value) == "number" then
                    landData.totalValue = landData.totalValue + value
                end
                
                local hectares = farmland.areaInHa or 0
                if type(landData.hectares) == "number" and type(hectares) == "number" then
                    landData.hectares = landData.hectares + hectares
                end
                
                table.insert(landData.farmlands, {
                    id = farmland.id,
                    value = value,
                    hectares = hectares
                })
            end
        end
    end
    
    return landData
end