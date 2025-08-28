AnimalDataCollector = {}

function AnimalDataCollector:init()
    -- print("[FarmDashboard] Animal data collector initialized (safe version)")
end

function AnimalDataCollector:collect()
    local animalData = {}

    -- Wrap entire function in pcall to prevent crashes
    local success, result = pcall(function()
        return self:collectSafely()
    end)
    
    if success and result then
        return result.animalData or {}
    else
        -- print("[FarmDash] AnimalDataCollector failed, using fallback")
        return animalData
    end
end

function AnimalDataCollector:collectSafely()
    local animalData = {}

    if not _G.g_currentMission then
        return {animalData = animalData}
    end

    -- Simple collection - only get basic husbandry data without any arithmetic
    if _G.g_currentMission.husbandrySystem then
        for _, placeable in pairs(_G.g_currentMission.husbandrySystem.placeables or {}) do
            local husbandryData = self:collectBasicHusbandryData(placeable)
            if husbandryData then
                table.insert(animalData, husbandryData)
            end
        end
    end

    -- print("[FarmDashboard] AnimalDataCollector: collected animalData, count:", #animalData)
    return {animalData = animalData}
end

function AnimalDataCollector:collectBasicHusbandryData(placeable)
    if not placeable then return nil end

    local data = {
        id = placeable.id or 0,
        name = placeable:getName() or "Unknown",
        position = self:getPosition(placeable),
        ownerFarmId = placeable:getOwnerFarmId() or 0,
        animalType = placeable.animalTypeIndex or 0,
        animals = {},
        fillLevels = {},
        productivity = 0,
        health = 0,
        capacity = 0,
        animalCount = 0,
        productionData = {},
        consumptionData = {},
        storageData = {}
    }

    -- Try to get animal type name from animalTypeIndex
    if placeable.animalTypeIndex and _G.g_animalManager then
        local animalTypeData = _G.g_animalManager.nameToType[placeable.animalTypeIndex]
        if animalTypeData then
            data.animalTypeName = animalTypeData.name or "Unknown"
        end
    end

    -- Get basic animal count if available
    if placeable.getClusters then
        local clusters = placeable:getClusters()
        if clusters then
            for _, cluster in pairs(clusters) do
                if cluster.numAnimals and type(cluster.numAnimals) == "number" and type(data.animalCount) == "number" then
                    data.animalCount = data.animalCount + cluster.numAnimals
                end
            end
        end
    end
    
    -- Get fill levels from multiple possible sources
    local fillLevels = {}
    
    -- Try generic getFillLevels method first
    if placeable.getFillLevels then
        local success, levels = pcall(function() return placeable:getFillLevels() end)
        if success and levels then
            for k, v in pairs(levels) do
                fillLevels[k] = v
            end
        end
    end
    
    -- Try spec_husbandryFood for food items
    if placeable.spec_husbandryFood and placeable.spec_husbandryFood.fillLevels then
        for fillType, level in pairs(placeable.spec_husbandryFood.fillLevels) do
            fillLevels[fillType] = level
        end
    end
    
    -- Try spec_husbandryWater for water
    if placeable.spec_husbandryWater and placeable.spec_husbandryWater.fillLevel then
        fillLevels["WATER"] = placeable.spec_husbandryWater.fillLevel
    end
    
    -- Try spec_husbandryStraw for straw/bedding
    if placeable.spec_husbandryStraw and placeable.spec_husbandryStraw.fillLevel then
        fillLevels["STRAW"] = placeable.spec_husbandryStraw.fillLevel
    end
    
    -- Process fill levels if we found any
    if fillLevels and next(fillLevels) ~= nil then
        local availableFood = 0
        local edibleFoods = {
                -- Grains and crops
                "WHEAT", "BARLEY", "OAT", "CANOLA", "SORGHUM", "MAIZE", "CORN",
                "SUNFLOWER", "SOYBEAN", "POTATO", "SUGARBEET", "SUGARBEET_CUT",
                -- Processed feeds
                "DRYGRASS_WINDROW", "GRASS_WINDROW", "SILAGE", "HAY", "STRAW",
                "FORAGE", "CHAFF", "WOODCHIPS", 
                -- Mixed feeds
                "PIGFOOD", "MINERAL_FEED", "TOTAL_MIXED_RATION", "FORAGE_MIXING"
            }
            
            for fillType, fillLevel in pairs(fillLevels) do
                if fillType and fillLevel and type(fillLevel) == "number" and fillLevel > 0 then
                    -- Get fill type name
                    local fillTypeName = fillType
                    if type(fillType) == "number" and _G.g_fillTypeManager then
                        local fillTypeData = _G.g_fillTypeManager:getFillTypeByIndex(fillType)
                        if fillTypeData and fillTypeData.name then
                            fillTypeName = fillTypeData.name
                        end
                    end
                    
                    -- Store all fill types in both fillLevels and storageData
                    data.fillLevels[fillTypeName] = fillLevel
                    data.storageData[fillTypeName] = fillLevel
                    
                    -- Check if this is an edible food item
                    local isEdible = false
                    for _, food in ipairs(edibleFoods) do
                        if string.upper(tostring(fillTypeName)) == food then
                            isEdible = true
                            break
                        end
                    end
                    
                    if isEdible then
                        availableFood = availableFood + fillLevel
                    end
                end
            end
            
        -- Add the aggregated available food to both fillLevels and storageData
        if availableFood > 0 then
            data.fillLevels["Available Food"] = availableFood
            -- Also add to storageData for compatibility with web interface
            data.storageData["Available Food"] = availableFood
            -- Add as camelCase for web interface compatibility
            data.storageData["availableFood"] = availableFood
        end
    end

    -- Get capacity information safely
    if placeable.getCapacity then
        local success, capacity = pcall(function() return placeable:getCapacity() end)
        if success and capacity then
            data.capacity = capacity
        end
    end

    -- Get productivity safely
    if placeable.getGlobalProductionFactor then
        local success, productivity = pcall(function() return placeable:getGlobalProductionFactor() end)
        if success and productivity then
            data.productivity = productivity
        end
    end

    -- Get health information safely
    if placeable.getConditionInfos then
        local success, conditions = pcall(function() return placeable:getConditionInfos() end)
        if success and conditions and conditions.health then
            local healthValue = conditions.health.value or 0
            -- Check if health is in 0-1 range or 0-100 range
            if healthValue <= 2 then
                healthValue = healthValue * 100
            end
            data.health = healthValue
        end
    end

    -- Try to get individual animal data from clusters (RealisticLivestock compatibility)
    if placeable.getClusters then
        local success, clusters = pcall(function() return placeable:getClusters() end)
        if success and clusters then
            for clusterIndex, cluster in pairs(clusters) do
                if cluster then
                    -- Check if this is a RealisticLivestock individual animal (cluster.isIndividual == true)
                    if cluster.isIndividual == true then
                        -- This cluster IS an individual RealisticLivestock animal
                        local finalId = nil
                        if cluster.uniqueId then
                            if type(cluster.uniqueId) == "string" and tonumber(cluster.uniqueId) then
                                finalId = tonumber(cluster.uniqueId)
                            elseif type(cluster.uniqueId) == "number" then
                                finalId = cluster.uniqueId
                            end
                        end
                        
                        if not finalId then
                            -- Fallback if RealisticLivestock animal missing unique ID
                            finalId = 999999 + #data.animals + 1
                        end
                        
                        -- Handle health value - RealisticLivestock uses genetics.health as 0-1 decimal
                        local healthValue = cluster.health or 1
                        -- Check if health is in 0-1 range (RealisticLivestock) or 0-100 range (vanilla)
                        if healthValue <= 2 then
                            -- Likely in 0-1 range, convert to percentage
                            healthValue = healthValue * 100
                        end
                        
                        local animalData = {
                            id = finalId,
                            name = cluster.subType or "Unknown",
                            age = cluster.age or 0,
                            productivity = cluster.reproduction and (cluster.reproduction / 100) or 0,
                            health = healthValue,  -- Now properly converted to 0-100 range
                            gender = cluster.gender or "Unknown",
                            weight = cluster.weight or 0,
                            type = cluster.subType or "Unknown",
                            isPregnant = cluster.isPregnant or false,
                            isLactating = cluster.isLactating or false,
                            isDirty = cluster.isDirty or false,
                            fitness = cluster.fitness or 0,
                            dirt = cluster.dirt or 0,
                            variation = cluster.variation or 1
                        }
                        table.insert(data.animals, animalData)
                    else
                        -- This is a regular cluster (non-RealisticLivestock or grouped animals)
                        -- Try different possible property names for RealisticLivestock
                        local individualAnimals = cluster.animals or cluster.individualAnimals or cluster.livestock or cluster.animalList
                        local animalType = cluster.subType or cluster.animalType or cluster.type or cluster.animalSubType or cluster.fillType or data.animalTypeName
                    
                        if individualAnimals and type(individualAnimals) == "table" then
                            -- Legacy handling for nested individual animals (shouldn't happen with RealisticLivestock)
                            for animalIndex, animal in pairs(individualAnimals) do
                                if animal and type(animal) == "table" then
                                    -- Handle health value conversion
                                    local healthValue = animal.health or data.health or 1
                                    if healthValue <= 2 then
                                        healthValue = healthValue * 100
                                    end
                                    
                                    local animalData = {
                                        id = (data.id or 0) * 1000 + #data.animals + 1,
                                        name = ((animalType or "Animal") .. " " .. (#data.animals + 1)),
                                        age = animal.age or 30,
                                        productivity = animal.productivity or data.productivity or 0.8,
                                        health = healthValue,
                                        gender = animal.gender or "Unknown",
                                        weight = animal.weight or 0,
                                        type = animalType or "Unknown"
                                    }
                                    table.insert(data.animals, animalData)
                                end
                            end
                        elseif cluster.numAnimals and type(cluster.numAnimals) == "number" and cluster.numAnimals > 0 then
                            -- Basic cluster without individual animals - create generic entries
                            for i = 1, cluster.numAnimals do
                                -- Handle health value conversion
                                local healthValue = data.health or 1
                                if healthValue <= 2 then
                                    healthValue = healthValue * 100
                                end
                                
                                local animalData = {
                                    id = (data.id or 0) * 1000 + #data.animals + 1,
                                    name = (animalType or "Animal") .. " " .. (#data.animals + 1),
                                    age = 30 + (i * 5),
                                    productivity = data.productivity or 0.8,
                                    health = healthValue,
                                    gender = "Unknown",
                                    weight = 0,
                                    type = animalType or "Unknown"
                                }
                                table.insert(data.animals, animalData)
                            end
                        end
                    end
                end
            end
        end
    end
    
    -- Fallback: If no animals found through clusters, use animalCount
    if #data.animals == 0 and data.animalCount and type(data.animalCount) == "number" and data.animalCount > 0 then
        for i = 1, data.animalCount do
            -- Handle health value conversion
            local healthValue = data.health or 1
            if healthValue <= 2 then
                healthValue = healthValue * 100
            end
            
            table.insert(data.animals, {
                id = (data.id or 0) * 1000 + i,
                name = (data.animalTypeName or data.name or "Unknown") .. " " .. i,
                age = 30 + (i * 5),
                productivity = data.productivity or 0.8,
                health = healthValue,
                gender = "Unknown",
                weight = 0,
                type = data.animalTypeName or "Unknown"
            })
        end
    end

    return data
end

function AnimalDataCollector:getPosition(placeable)
    if placeable and placeable.rootNode then
        -- Wrap in pcall to prevent crashes from invalid nodes
        local success, x, y, z = pcall(getWorldTranslation, placeable.rootNode)
        if success and x and y and z then
            return {x = x, y = y, z = z}
        end
    end
    return {x = 0, y = 0, z = 0}
end

function AnimalDataCollector:shutdown()
    -- Nothing to clean up
end