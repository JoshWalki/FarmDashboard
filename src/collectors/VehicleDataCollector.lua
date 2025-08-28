VehicleDataCollector = {}

function VehicleDataCollector:init()
    -- print("[FarmDashboard] Vehicle data collector initialized (simple version)")
end

function VehicleDataCollector:cleanupTypeName(typeName)
    if not typeName or typeName == "" then
        return "Unknown"
    end
    
    -- Define mapping for common type name cleanups
    local typeCleanupMap = {
        ["implementDynamicMountAttacher"] = "Attachment",
        ["teleHandler"] = "Telehandler",
        ["trailer"] = "Trailer",
        ["waterTrailer"] = "Water Trailer",
        ["manureTrailer"] = "Manure Trailer",
        ["livestockTrailer"] = "Livestock Trailer",
        ["augerWagon"] = "Auger Wagon",
        ["mixerWagon"] = "Mixer Wagon",
        ["forestryExcavator"] = "Forestry Excavator"
    }
    
    -- Check if we have a direct mapping
    if typeCleanupMap[typeName] then
        return typeCleanupMap[typeName]
    end
    
    -- If no direct mapping, apply basic cleanup
    -- Convert camelCase to Title Case with spaces
    local cleaned = typeName:gsub("(%l)(%u)", "%1 %2")
    -- Capitalize first letter of each word
    cleaned = cleaned:gsub("(%a)([%w_']*)", function(first, rest)
        return first:upper() .. rest:lower()
    end)
    
    return cleaned
end

function VehicleDataCollector:collect()
    local vehicleData = {}
    
    if not _G.g_currentMission then
        -- print("[FarmDashboard] No g_currentMission available")
        return vehicleData
    end
    
    if not _G.g_currentMission.vehicles then
        -- print("[FarmDashboard] No vehicles table in g_currentMission")
        -- Try alternative locations
        if _G.g_currentMission.vehicleSystem and _G.g_currentMission.vehicleSystem.vehicles then
            -- print("[FarmDashboard] Found vehicles in vehicleSystem")
            _G.g_currentMission.vehicles = _G.g_currentMission.vehicleSystem.vehicles
        elseif _G.g_currentMission.ownedVehicles then
            -- print("[FarmDashboard] Found ownedVehicles")
            _G.g_currentMission.vehicles = _G.g_currentMission.ownedVehicles
        else
            -- print("[FarmDashboard] Could not find vehicles in any known location")
            return vehicleData
        end
    end
    
    -- print("[FarmDashboard] Starting vehicle collection...")
    -- print("[FarmDashboard] Vehicle table type:", type(_G.g_currentMission.vehicles))
    
    local vehicleCount = 0
    local rawCount = 0
    
    -- Count raw entries
    for _ in pairs(_G.g_currentMission.vehicles) do
        rawCount = rawCount + 1
    end
    -- print("[FarmDashboard] Raw vehicle entries found:", rawCount)
    
    for _, vehicle in pairs(_G.g_currentMission.vehicles) do
        vehicleCount = vehicleCount + 1
        
        -- Collect only essential data with safe checks
        local vData = {}
        
        -- Basic info
        vData.id = vehicle.id or vehicleCount
        vData.typeName = self:cleanupTypeName(vehicle.typeName or "Unknown")
        vData.brand = vehicle.brand or "Unknown"
        vData.price = vehicle.price or 0
        vData.age = vehicle.age or 0
        vData.operatingTime = vehicle.operatingTime or 0
        
        -- Safe name retrieval
        vData.name = "Unknown"
        if vehicle.getName then
            local success, name = pcall(function() return vehicle:getName() end)
            if success and name then
                vData.name = name
            end
        end
        
        -- Owner farm
        vData.ownerFarmId = 0
        if vehicle.getOwnerFarmId then
            local success, farmId = pcall(function() return vehicle:getOwnerFarmId() end)
            if success and farmId then
                vData.ownerFarmId = farmId
            end
        end
        
        -- Position
        vData.position = {x = 0, y = 0, z = 0}
        if vehicle.rootNode then
            local success, x, y, z = pcall(getWorldTranslation, vehicle.rootNode)
            if success and x and y and z then
                vData.position = {x = x, y = y, z = z}
            end
        end
        
        -- Motorized info
        if vehicle.spec_motorized then
            vData.isMotorized = true
            vData.engineOn = vehicle.spec_motorized.isMotorStarted or false
            
            -- Fuel
            if vehicle.spec_motorized.consumersByFillTypeName then
                local diesel = vehicle.spec_motorized.consumersByFillTypeName["DIESEL"]
                if diesel then
                    vData.fuelLevel = diesel.fillLevel or 0
                    vData.fuelCapacity = diesel.capacity or 0
                else
                    vData.fuelLevel = 0
                    vData.fuelCapacity = 0
                end
            end
            
            -- Speed
            vData.speed = 0
            if vehicle.getLastSpeed then
                local success, speed = pcall(function() return vehicle:getLastSpeed() end)
                if success and speed then
                    vData.speed = speed
                end
            end
        else
            vData.isMotorized = false
            vData.engineOn = false
            vData.fuelLevel = 0
            vData.fuelCapacity = 0
            vData.speed = 0
        end
        
        -- Fill levels
        vData.fillLevels = {}
        if vehicle.spec_fillUnit and vehicle.spec_fillUnit.fillUnits then
            for _, fillUnit in pairs(vehicle.spec_fillUnit.fillUnits) do
                if fillUnit.fillType and fillUnit.fillLevel and fillUnit.capacity then
                    local fillTypeName = "unknown"
                    if _G.g_fillTypeManager and _G.g_fillTypeManager.getFillTypeNameByIndex then
                        local success, name = pcall(function() 
                            return _G.g_fillTypeManager:getFillTypeNameByIndex(fillUnit.fillType)
                        end)
                        if success and name then
                            fillTypeName = name
                        end
                    end
                    
                    vData.fillLevels[fillTypeName] = {
                        level = fillUnit.fillLevel,
                        capacity = fillUnit.capacity
                    }
                end
            end
        end
        
        -- Damage
        vData.damage = 0
        if vehicle.getDamageAmount then
            local success, damage = pcall(function() return vehicle:getDamageAmount() end)
            if success and damage then
                vData.damage = damage
            end
        end
        
        -- Attached implements count
        vData.attachedImplementsCount = 0
        if vehicle.getAttachedImplements then
            local success, implements = pcall(function() return vehicle:getAttachedImplements() end)
            if success and implements then
                vData.attachedImplementsCount = #implements
            end
        end
        
        -- Vehicle type
        vData.vehicleType = "unknown"
        if vehicle.spec_motorized then
            vData.vehicleType = "motorized"
        elseif vehicle.spec_trailer then
            vData.vehicleType = "trailer"
        elseif vehicle.spec_harvester then
            vData.vehicleType = "harvester"
        elseif vehicle.spec_sprayer then
            vData.vehicleType = "sprayer"
        elseif vehicle.spec_spreader then
            vData.vehicleType = "spreader"
        elseif vehicle.spec_cultivator then
            vData.vehicleType = "cultivator"
        elseif vehicle.spec_plow then
            vData.vehicleType = "plow"
        elseif vehicle.spec_sowingMachine then
            vData.vehicleType = "seeder"
        elseif vehicle.spec_attachable then
            vData.vehicleType = "implement"
        end
        
        table.insert(vehicleData, vData)
    end
    
    -- print("[FarmDashboard] Collected data for " .. #vehicleData .. " of " .. vehicleCount .. " vehicles")
    
    return vehicleData
end