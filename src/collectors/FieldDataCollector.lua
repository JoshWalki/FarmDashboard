FieldDataCollector = {}

function FieldDataCollector:init()
    print("[FarmDashboard] Field data collector initialized")
end

function FieldDataCollector:collect()
    local fieldData = {}
    
    if not _G.g_currentMission then
        print("[FarmDashboard] No g_currentMission available")
        return fieldData
    end
    
    -- Get current farm ID for ownership checks
    local currentFarmId = 1 -- Default farm
    if _G.g_currentMission.getFarmId then
        currentFarmId = _G.g_currentMission:getFarmId()
    elseif _G.g_currentMission.player and _G.g_currentMission.player.farmId then
        currentFarmId = _G.g_currentMission.player.farmId
    end
    
    
    -- Collect field data using the correct property names
    if _G.g_fieldManager and _G.g_fieldManager.fields then
        local totalFields = 0
        local ownedFields = 0
        
        for fieldId, field in pairs(_G.g_fieldManager.fields) do
            totalFields = totalFields + 1
            
            -- Check ownership through farmland reference
            local isOwned = false
            local ownerFarmId = 0
            
            if field.farmland then
                ownerFarmId = field.farmland.farmId or 0
                
                -- Check if the field is actually owned (farmId > 0 and matches current farm)
                -- In FS25, farmId 0 typically means unowned
                if ownerFarmId > 0 then
                    isOwned = (ownerFarmId == currentFarmId)
                else
                    isOwned = false -- Unowned field
                end
                
            else
                -- If no farmland reference, field is not owned by anyone
                isOwned = false
                ownerFarmId = 0
            end
            
            -- Create field data object with correct property names
            local fData = {
                id = fieldId,
                name = string.format("Field %d", fieldId),
                
                -- Use areaHa for field area
                hectares = field.areaHa or 0,
                fieldArea = field.areaHa or 0,
                fieldAreaInSqm = (field.areaHa or 0) * 10000,
                
                -- Ownership information
                isOwned = isOwned,
                ownerFarmId = ownerFarmId,
                farmlandId = field.farmland and field.farmland.id or 0,
                farmlandPrice = field.farmland and field.farmland.price or 0,
                
                -- Position data
                posX = field.posX or 0,
                posZ = field.posZ or 0,
                
                -- Initialize crop and state data
                fruitType = "unknown",
                fruitTypeIndex = 0,
                growthState = 0,
                maxGrowthState = 0,
                growthStatePercentage = 0,
                harvestReady = false,
                
                -- Field conditions
                fertilizationLevel = 0,
                plowLevel = 0,
                limeLevel = 0,
                weedLevel = 0,
                mulchLevel = 0,
                rollerLevel = 0,
                stubbleLevel = 0,
                sprayLevel = 0,
                stoneLevel = 0,
                
                -- Status flags
                needsWork = false,
                needsPlowing = false,
                needsLime = false,
                needsFertilizer = false,
                needsWeeding = false,
                
                -- Suggestions
                suggestions = {}
            }
            
            -- Get field state information if available
            if field.fieldState then
                -- Try to extract fruit type
                if field.fieldState.fruitTypeIndex then
                    fData.fruitTypeIndex = field.fieldState.fruitTypeIndex
                elseif field.fieldState.currentFruitType then
                    fData.fruitTypeIndex = field.fieldState.currentFruitType
                end
                
                -- Try to get growth state
                if field.fieldState.growthState then
                    fData.growthState = field.fieldState.growthState
                end
                
                -- Try to get field conditions
                if field.fieldState.fertilizationLevel then
                    fData.fertilizationLevel = field.fieldState.fertilizationLevel
                end
                if field.fieldState.plowLevel then
                    fData.plowLevel = field.fieldState.plowLevel
                end
                if field.fieldState.limeLevel then
                    fData.limeLevel = field.fieldState.limeLevel
                end
                if field.fieldState.weedLevel then
                    fData.weedLevel = field.fieldState.weedLevel
                end
                if field.fieldState.mulchLevel then
                    fData.mulchLevel = field.fieldState.mulchLevel
                end
            end
            
            -- Check plannedFruitTypeIndex as fallback
            if fData.fruitTypeIndex == 0 and field.plannedFruitTypeIndex and field.plannedFruitTypeIndex > 0 then
                fData.fruitTypeIndex = field.plannedFruitTypeIndex
            end
            
            -- Get fruit type name if we have an index
            if fData.fruitTypeIndex > 0 and _G.g_fruitTypeManager then
                local fruitType = _G.g_fruitTypeManager:getFruitTypeByIndex(fData.fruitTypeIndex)
                if fruitType then
                    fData.fruitType = fruitType.name or "unknown"
                    fData.maxGrowthState = fruitType.numGrowthStates or 0
                end
            end
            
            -- Calculate growth percentage
            if fData.maxGrowthState > 0 then
                fData.growthStatePercentage = math.floor((fData.growthState / fData.maxGrowthState) * 100)
                fData.harvestReady = fData.growthState >= fData.maxGrowthState
            end
            
            -- Determine needs
            fData.needsFertilizer = fData.fertilizationLevel < 2
            fData.needsLime = fData.limeLevel < 1
            fData.needsWeeding = fData.weedLevel > 0.3
            fData.needsPlowing = fData.plowLevel < 1
            
            fData.needsWork = fData.needsFertilizer or fData.needsLime or 
                             fData.needsWeeding or fData.needsPlowing
            
            -- Generate suggestions based on field state
            if fData.harvestReady then
                table.insert(fData.suggestions, {
                    priority = 1,
                    type = "harvest",
                    action = "Harvest crop",
                    reason = "Crop is ready for harvest"
                })
            elseif fData.growthState == 0 and fData.hectares > 0 then
                if fData.needsPlowing then
                    table.insert(fData.suggestions, {
                        priority = 2,
                        type = "preparation",
                        action = "Plow field",
                        reason = "Field needs plowing before planting"
                    })
                else
                    table.insert(fData.suggestions, {
                        priority = 2,
                        type = "planting",
                        action = "Plant crop",
                        reason = "Field is empty and ready for planting"
                    })
                end
            elseif fData.growthState > 0 and fData.growthState < fData.maxGrowthState then
                if fData.needsFertilizer then
                    table.insert(fData.suggestions, {
                        priority = 3,
                        type = "maintenance",
                        action = "Apply fertilizer",
                        reason = string.format("Fertilization level: %d/2", fData.fertilizationLevel)
                    })
                end
                if fData.needsWeeding then
                    table.insert(fData.suggestions, {
                        priority = 3,
                        type = "maintenance",
                        action = "Remove weeds",
                        reason = string.format("Weed level: %.0f%%", fData.weedLevel * 100)
                    })
                end
                if fData.needsLime then
                    table.insert(fData.suggestions, {
                        priority = 3,
                        type = "maintenance",
                        action = "Apply lime",
                        reason = "Soil pH needs correction"
                    })
                end
            end
            
            -- Sort suggestions by priority
            table.sort(fData.suggestions, function(a, b) return a.priority < b.priority end)
            
            -- Add to collection if owned or if no owned fields exist
            if isOwned then
                ownedFields = ownedFields + 1
                table.insert(fieldData, fData)
            end
        end
        
        
        -- If no owned fields found, include all fields
        if ownedFields == 0 then
            for fieldId, field in pairs(_G.g_fieldManager.fields) do
                local fData = {
                    id = fieldId,
                    name = string.format("Field %d", fieldId),
                    hectares = field.areaHa or 0,
                    fieldArea = field.areaHa or 0,
                    fieldAreaInSqm = (field.areaHa or 0) * 10000,
                    isOwned = false,
                    ownerFarmId = field.farmland and field.farmland.farmId or 0,
                    farmlandId = field.farmland and field.farmland.id or 0,
                    fruitType = "unknown",
                    fruitTypeIndex = field.plannedFruitTypeIndex or 0,
                    growthState = 0,
                    maxGrowthState = 0,
                    growthStatePercentage = 0,
                    harvestReady = false,
                    fertilizationLevel = 0,
                    plowLevel = 0,
                    limeLevel = 0,
                    weedLevel = 0,
                    needsWork = false,
                    suggestions = {}
                }
                
                -- Add suggestion for all fields
                table.insert(fData.suggestions, {
                    priority = 1,
                    type = "info",
                    action = "Check field ownership",
                    reason = string.format("Field owned by farm %d", fData.ownerFarmId)
                })
                
                table.insert(fieldData, fData)
                
                -- Limit to 10 fields
                if #fieldData >= 10 then
                    break
                end
            end
        end
    end
    
    -- Sort fields by ID
    table.sort(fieldData, function(a, b) return a.id < b.id end)
    
    return fieldData
end