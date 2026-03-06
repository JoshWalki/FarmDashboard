FieldDataCollector = {}

function FieldDataCollector:init()
    print("[FarmDashboard] Field data collector initialized (Smart Ground-Type Override)")
end

function FieldDataCollector:collect()
    local fieldData = {}
    if not _G.g_currentMission then return fieldData end

    -- Detect FS25 Precision Farming
    local isPF = false
    local pfEnv = _G.FS25_precisionFarming
    local pfInstance = nil
    
    if pfEnv and pfEnv.g_precisionFarming then 
        isPF = true 
        pfInstance = pfEnv.g_precisionFarming
    elseif _G.g_precisionFarming then 
        isPF = true 
        pfInstance = _G.g_precisionFarming
    end

    local isDedicated = (_G.g_dedicatedServer ~= nil)
    local currentFarmId = 1
    if _G.g_currentMission.getFarmId then
        currentFarmId = _G.g_currentMission:getFarmId()
    elseif _G.g_currentMission.player and _G.g_currentMission.player.farmId then
        currentFarmId = _G.g_currentMission.player.farmId
    end

    if _G.g_fieldManager and _G.g_fieldManager.fields then
        for fieldId, field in pairs(_G.g_fieldManager.fields) do
            local ownerFarmId = field.farmland and field.farmland.farmId or 0
            local shouldCollect = false
            
            if isDedicated then
                if ownerFarmId > 0 then shouldCollect = true end
            else
                if ownerFarmId == currentFarmId and ownerFarmId > 0 then shouldCollect = true end
            end

            if shouldCollect then
                local flId = field.farmland and field.farmland.id or 0
                if flId == 0 and field.farmlandId then flId = field.farmlandId end

                local fData = {
                    id = fieldId,
                    name = string.format("Field %d", fieldId),
                    hectares = field.areaHa or 0,
                    fieldAreaInSqm = (field.areaHa or 0) * 10000,
                    isOwned = true,
                    ownerFarmId = ownerFarmId,
                    farmlandId = flId,
                    posX = field.posX or 0,
                    posZ = field.posZ or 0,
                    fruitType = "unknown",
                    fruitTypeIndex = 0,
                    growthState = 0,
                    maxGrowthState = 0,
                    growthStatePercentage = 0,
                    harvestReady = false,
                    fertilizationLevel = field.fieldState and field.fieldState.fertilizationLevel or 0,
                    limeLevel = field.fieldState and field.fieldState.limeLevel or 0,
                    plowLevel = field.fieldState and field.fieldState.plowLevel or 0,
                    weedLevel = field.fieldState and field.fieldState.weedLevel or 0,
                    isPrecisionFarming = isPF,
                    nitrogenLevel = 0,
                    targetNitrogen = 0,
                    phValue = 0,
                    targetPh = 0,
                    isScanned = false,
                    nitrogenText = "",
                    limeText = "",
                    suggestions = {}
                }

                -- Extract Crop Growth & Cache Fix
                fData.fruitTypeIndex = field.fieldState and (field.fieldState.fruitTypeIndex or field.fieldState.currentFruitType) or 0
                if fData.fruitTypeIndex == 0 and field.plannedFruitTypeIndex and field.plannedFruitTypeIndex > 0 then
                    fData.fruitTypeIndex = field.plannedFruitTypeIndex
                end
                
                fData.growthState = field.fieldState and field.fieldState.growthState or 0
                local gType = field.fieldState and field.fieldState.groundType or 0
                
                -- ENGINE CACHE OVERRIDE
                -- Ground types: 1=Plowed, 2=Cultivated, 3=Sown, 4=Sown Direct
                if gType == 3 or gType == 4 then
                    -- The field has freshly planted seeds in it! 
                    -- Override the lazy engine cache so it stops suggesting "Plant Crops"
                    if fData.growthState == 0 or fData.growthState > 4 then 
                        fData.growthState = 1 
                    end
                    fData.harvestReady = false
                    fData.needsPlowing = false
                elseif gType == 1 or gType == 2 then
                    -- The dirt is prepared but completely empty
                    fData.growthState = 0
                    fData.needsPlowing = false
                    fData.harvestReady = false
                end
                
                if fData.fruitTypeIndex > 0 and _G.g_fruitTypeManager then
                    local fruitType = _G.g_fruitTypeManager:getFruitTypeByIndex(fData.fruitTypeIndex)
                    if fruitType then
                        fData.fruitType = fruitType.name or "unknown"
                        fData.maxGrowthState = fruitType.numGrowthStates or 0
                    end
                end
                
                if fData.maxGrowthState > 0 then
                    fData.growthStatePercentage = math.floor((fData.growthState / fData.maxGrowthState) * 100)
                    fData.harvestReady = fData.growthState >= fData.maxGrowthState
                end

                -- THE FS25 MULTI-POINT GRID SCANNER
                local nLevel, nTarget, phLevel, phTarget = 0, 0, 0, 0
                local isScanned = false

                if isPF and pfInstance then
                    local function callMethod(instance, methodName, ...)
                        if not instance then return nil end
                        if type(instance[methodName]) == "function" then
                            local ok, res = pcall(instance[methodName], instance, ...)
                            if ok and res ~= nil then return res end
                        end
                        return nil
                    end

                    local baseRadius = math.sqrt(fData.fieldAreaInSqm / math.pi)
                    local sampleOffsets = {
                        {0, 0}, {0.25, 0}, {-0.25, 0}, {0, 0.25}, {0, -0.25},
                        {0.5, 0.5}, {-0.5, -0.5}, {0.5, -0.5}, {-0.5, 0.5},
                        {0.6, 0}, {-0.6, 0}, {0, 0.6}, {0, -0.6}
                    }
                    
                    local sumN, sumNTarget, validN = 0, 0, 0
                    local sumPh, sumPhTarget, validPh = 0, 0, 0

                    for _, offset in ipairs(sampleOffsets) do
                        local sX = fData.posX + (offset[1] * baseRadius)
                        local sZ = fData.posZ + (offset[2] * baseRadius)
                        
                        -- Check if scanned
                        local soilType = callMethod(pfInstance.soilMap, "getTypeIndexAtWorldPos", sX, sZ)
                        if soilType and type(soilType) == "number" and soilType > 0 then 
                            isScanned = true 
                            
                            -- Read Nitrogen
                            local ptN = callMethod(pfInstance.nitrogenMap, "getLevelAtWorldPos", sX, sZ)
                            if ptN and type(ptN) == "number" then
                                if ptN <= 45 and ptN % 1 == 0 then ptN = math.max(0, (ptN - 1) * 5) end
                                if ptN > 0 then
                                    sumN = sumN + ptN
                                    validN = validN + 1
                                end
                            end
                            
                            -- Use engine auto-detect for target to bypass cached fruit index
                            local ptNTgt = callMethod(pfInstance.nitrogenMap, "getTargetLevelAtWorldPos", sX, sZ)
                            if ptNTgt == nil or ptNTgt == 0 then
                                ptNTgt = callMethod(pfInstance.nitrogenMap, "getTargetLevelAtWorldPos", sX, sZ, fData.fruitTypeIndex)
                            end
                            
                            if ptNTgt and type(ptNTgt) == "number" then 
                                if ptNTgt <= 45 and ptNTgt % 1 == 0 then ptNTgt = math.max(0, (ptNTgt - 1) * 5) end
                                sumNTarget = sumNTarget + ptNTgt 
                            end
                            
                            -- Read pH
                            local ptPh = callMethod(pfInstance.pHMap, "getLevelAtWorldPos", sX, sZ)
                            if ptPh and type(ptPh) == "number" then
                                if ptPh >= 1 and ptPh <= 31 and ptPh % 1 == 0 then ptPh = (ptPh * 0.125) + 4.375 end
                                if ptPh > 0 then
                                    sumPh = sumPh + ptPh
                                    validPh = validPh + 1
                                end
                            end
                            
                            local ptPhTgt = callMethod(pfInstance.pHMap, "getOptimalPHValueForSoilTypeIndex", soilType)
                            if ptPhTgt and type(ptPhTgt) == "number" then 
                                if ptPhTgt >= 1 and ptPhTgt <= 31 and ptPhTgt % 1 == 0 then ptPhTgt = (ptPhTgt * 0.125) + 4.375 end
                                sumPhTarget = sumPhTarget + ptPhTgt 
                            end
                        end
                    end
                    
                    if validN > 0 then 
                        nLevel = sumN / validN 
                        nTarget = sumNTarget / validN 
                    end
                    if validPh > 0 then 
                        phLevel = sumPh / validPh 
                        phTarget = sumPhTarget / validPh 
                    end
                end

                fData.isScanned = isScanned
                fData.nitrogenLevel = nLevel
                fData.targetNitrogen = nTarget
                fData.phValue = phLevel
                fData.targetPh = phTarget
                fData.needsPlowing = fData.plowLevel < 1
                fData.needsWeeding = fData.weedLevel > 0.3

                if isPF then
                    if not isScanned then
                        fData.fertilizationLevel = 0
                        fData.limeLevel = 0
                        fData.needsLime = true
                        fData.needsFertilizer = true
                        fData.nitrogenText = "Needs Scan"
                        fData.limeText = "Needs Scan"
                    else
                        fData.nitrogenText = string.format("%.0f / %.0f kg/ha", nLevel, nTarget)
                        fData.limeText = string.format("%.1f pH", phLevel)

                        fData.fertilizationLevel = nTarget > 0 and math.min(2, (nLevel / nTarget) * 2) or 0
                        fData.limeLevel = (phTarget > 0 and phLevel >= (phTarget - 0.2)) and 1 or (phLevel >= 6.0 and 1 or 0)
                        
                        fData.needsLime = phTarget > 0 and (phLevel < phTarget - 0.2) or (phLevel < 6.0)
                        fData.needsFertilizer = nTarget > 0 and (nLevel < nTarget - 10)
                    end
                else
                    fData.needsFertilizer = fData.fertilizationLevel < 2
                    fData.needsLime = fData.limeLevel < 1
                    fData.nitrogenText = string.format("%d/2", fData.fertilizationLevel)
                    fData.limeText = fData.needsLime and "Needed" or "Done"
                end

                fData.needsWork = fData.needsFertilizer or fData.needsLime or fData.needsWeeding or fData.needsPlowing

                -- Suggestions System
                if fData.harvestReady then
                    table.insert(fData.suggestions, {priority = 1, type = "harvest", action = "Harvest crop", reason = "Crop is ready for harvest"})
                elseif fData.growthState == 0 and fData.hectares > 0 then
                    if fData.needsPlowing then
                        table.insert(fData.suggestions, {priority = 2, type = "preparation", action = "Plow field", reason = "Field needs plowing before planting"})
                    else
                        if isPF and not isScanned then
                            table.insert(fData.suggestions, {priority = 2, type = "preparation", action = "Soil Map", reason = "Field needs scanning"})
                        else
                            table.insert(fData.suggestions, {priority = 2, type = "planting", action = "Plant crop", reason = "Field is empty and ready for planting"})
                        end
                    end
                elseif fData.growthState > 0 and fData.growthState < fData.maxGrowthState then
                    if fData.needsWeeding then
                        table.insert(fData.suggestions, {priority = 3, type = "maintenance", action = "Remove weeds", reason = string.format("Weed level: %.0f%%", fData.weedLevel * 100)})
                    end
                    
                    if isPF then
                        if not isScanned then
                            table.insert(fData.suggestions, {priority = 4, type="info", action="Soil Map", reason="Field needs scanning"})
                        else
                            if fData.needsLime then
                                local targetStr = phTarget > 0 and string.format("%.1f", phTarget) or "6.5"
                                table.insert(fData.suggestions, {priority = 3, type="maintenance", action="Apply lime", reason=string.format("Avg: %.1f / Target: %s pH", phLevel, targetStr)})
                            end
                            if fData.needsFertilizer and nTarget > 0 then
                                table.insert(fData.suggestions, {priority = 3, type="maintenance", action="Apply nitrogen", reason=string.format("Avg: %.0f / Target: %.0f kg/ha", nLevel, nTarget)})
                            end
                        end
                    else
                        if fData.needsFertilizer then
                            table.insert(fData.suggestions, {priority = 3, type = "maintenance", action = "Apply fertilizer", reason = string.format("Fertilization level: %d/2", fData.fertilizationLevel)})
                        end
                        if fData.needsLime then
                            table.insert(fData.suggestions, {priority = 3, type = "maintenance", action = "Apply lime", reason = "Soil pH needs correction"})
                        end
                    end
                end

                table.sort(fData.suggestions, function(a, b) return a.priority < b.priority end)
                table.insert(fieldData, fData)
            end
        end
    end

    table.sort(fieldData, function(a, b) return a.id < b.id end)
    return fieldData
end