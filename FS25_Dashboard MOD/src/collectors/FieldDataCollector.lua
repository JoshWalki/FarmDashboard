FieldDataCollector = {}

function FieldDataCollector:init()
    print("[FarmDashboard] Field data collector initialized (PDA ID Sync & Growth Bar Fix)")
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

    if _G.g_fieldManager and _G.g_fieldManager.fields then
        for fieldIndex, field in pairs(_G.g_fieldManager.fields) do
            
            -- SAFELY GET OWNERSHIP & FARMLAND ID
            local flId = field.farmlandId or (field.farmland and field.farmland.id) or 0
            local ownerFarmId = 0
            
            if flId > 0 and _G.g_farmlandManager then
                local owner = _G.g_farmlandManager:getFarmlandOwner(flId)
                if type(owner) == "number" then
                    ownerFarmId = owner
                end
            end
            
            if ownerFarmId == 0 and field.farmland then
                ownerFarmId = field.farmland.ownerFarmId or field.farmland.farmId or 0
            end

            -- THE FIX: Perfectly sync Dashboard IDs with the PDA map numbers
            local actualFieldId = field.fieldId
            if actualFieldId == nil or actualFieldId == 0 then
                -- Map maker skipped IDs, so we lock onto the Farmland ID just like the PDA does
                if flId > 0 then
                    actualFieldId = flId
                else
                    actualFieldId = fieldIndex
                end
            end
            
            local shouldCollect = (ownerFarmId > 0)

            if shouldCollect then
                local fData = {
                    id = actualFieldId,
                    name = string.format("Field %d", actualFieldId),
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

                -- --- 1. FS25 AREA SCANNER (EasyDev & Tramline Proof) ---
                local bestIndex = 0
                local gState = 0
                local maxArea = 0
                
                if _G.FSDensityMapUtil and _G.FSDensityMapUtil.getFruitArea and _G.g_fruitTypeManager and _G.g_fruitTypeManager.fruitTypes then
                    -- Create a 10x10 meter measuring box around the center coordinate
                    local sX = fData.posX
                    local sZ = fData.posZ
                    local startX = sX - 5
                    local startZ = sZ - 5
                    local widthX = sX + 5
                    local widthZ = sZ - 5
                    local heightX = sX - 5
                    local heightZ = sZ + 5
                    
                    for _, fruitType in pairs(_G.g_fruitTypeManager.fruitTypes) do
                        if fruitType.index and fruitType.index ~= 0 then
                            local ok, area = pcall(_G.FSDensityMapUtil.getFruitArea, fruitType.index, startX, startZ, widthX, widthZ, heightX, heightZ, true, true)
                            if ok and type(area) == "number" and area > maxArea then
                                maxArea = area
                                bestIndex = fruitType.index
                                
                                local stateAreaMax = 0
                                -- Expanded to 15 to catch fully grown / withered states
                                for state = 1, 15 do
                                    local okState, sArea = pcall(_G.FSDensityMapUtil.getFruitAreaByState, fruitType.index, startX, startZ, widthX, widthZ, heightX, heightZ, state, state)
                                    if okState and type(sArea) == "number" and sArea > stateAreaMax then
                                        stateAreaMax = sArea
                                        gState = state
                                    end
                                end
                            end
                        end
                    end
                end

                if bestIndex > 0 then
                    fData.fruitTypeIndex = bestIndex
                    -- GROWTH BAR FIX: If scanner finds crop but loses track of the exact stage, fallback safely so the bar doesn't turn brown
                    if gState > 0 then
                        fData.growthState = gState
                    else
                        fData.growthState = (field.fieldState and field.fieldState.growthState) or 1
                    end
                else
                    if field.fieldState then
                        fData.fruitTypeIndex = field.fieldState.fruitTypeIndex or field.fieldState.currentFruitType or 0
                        fData.growthState = field.fieldState.growthState or 0
                    end
                end
                
                if fData.fruitTypeIndex == 0 and field.plannedFruitTypeIndex and field.plannedFruitTypeIndex > 0 then
                    fData.fruitTypeIndex = field.plannedFruitTypeIndex
                end
                
                local gType = field.fieldState and field.fieldState.groundType or 0
                if gType == 3 or gType == 4 then
                    if fData.growthState == 0 or fData.growthState > 4 then fData.growthState = 1 end
                    fData.harvestReady = false
                    fData.needsPlowing = false
                elseif gType == 1 or gType == 2 then
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

                -- --- 2. PRECISION FARMING STATS MANAGER ---
                local nLevel, nTarget, phLevel, phTarget = 0, 0, 0, 0
                local isScanned = false

                if isPF and pfInstance then
                    local statsManager = pfInstance.farmlandStatisticsManager
                    
                    if statsManager and fData.farmlandId > 0 then
                        local ok, stats = pcall(statsManager.getFarmlandStatistics, statsManager, fData.farmlandId)
                        
                        if ok and type(stats) == "table" then
                            isScanned = stats.isScanned
                            if isScanned == nil then isScanned = true end
                            
                            nLevel = stats.nitrogen or 0
                            nTarget = stats.targetNitrogen or 0
                            phLevel = stats.ph or 0
                            phTarget = stats.targetPh or 0
                        end
                    end
                    
                    if nLevel == 0 and phLevel == 0 then
                        local function callMethod(instance, methodName, ...)
                            if not instance then return nil end
                            if type(instance[methodName]) == "function" then
                                local ok, res = pcall(instance[methodName], instance, ...)
                                if ok and res ~= nil then return res end
                            end
                            return nil
                        end
                        
                        local soilType = callMethod(pfInstance.soilMap, "getTypeIndexAtWorldPos", fData.posX, fData.posZ)
                        if soilType and type(soilType) == "number" and soilType > 0 then 
                            isScanned = true 
                            local ptN = callMethod(pfInstance.nitrogenMap, "getLevelAtWorldPos", fData.posX, fData.posZ)
                            if ptN and type(ptN) == "number" then 
                                if ptN <= 45 and ptN % 1 == 0 then ptN = math.max(0, (ptN - 1) * 5) end
                                nLevel = ptN 
                            end
                            
                            local ptNTgt = callMethod(pfInstance.nitrogenMap, "getTargetLevelAtWorldPos", fData.posX, fData.posZ)
                            if ptNTgt == nil or ptNTgt == 0 then
                                ptNTgt = callMethod(pfInstance.nitrogenMap, "getTargetLevelAtWorldPos", fData.posX, fData.posZ, fData.fruitTypeIndex)
                            end
                            if ptNTgt and type(ptNTgt) == "number" then 
                                if ptNTgt <= 45 and ptNTgt % 1 == 0 then ptNTgt = math.max(0, (ptNTgt - 1) * 5) end
                                nTarget = ptNTgt 
                            end
                            
                            local ptPh = callMethod(pfInstance.pHMap, "getLevelAtWorldPos", fData.posX, fData.posZ)
                            if ptPh and type(ptPh) == "number" then 
                                if ptPh >= 1 and ptPh <= 31 and ptPh % 1 == 0 then ptPh = (ptPh * 0.125) + 4.375 end
                                phLevel = ptPh 
                            end
                            
                            local ptPhTgt = callMethod(pfInstance.pHMap, "getOptimalPHValueForSoilTypeIndex", soilType)
                            if ptPhTgt and type(ptPhTgt) == "number" then 
                                if ptPhTgt >= 1 and ptPhTgt <= 31 and ptPhTgt % 1 == 0 then ptPhTgt = (ptPhTgt * 0.125) + 4.375 end
                                phTarget = ptPhTgt 
                            end
                        end
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
                    if fData.growthStatePercentage > 50 then
                        local nRatio = 1
                        if isPF then
                            if nTarget > 0 then nRatio = nLevel / nTarget else nRatio = 0 end
                        else
                            nRatio = fData.fertilizationLevel / 2
                        end

                        if nRatio < 0.95 then
                            if isPF then
                                table.insert(fData.suggestions, {priority = 2, type="maintenance", action="Apply nitrogen", reason=string.format("Avg: %.0f / Target: %.0f kg/ha", nLevel, nTarget)})
                            else
                                table.insert(fData.suggestions, {priority = 2, type="maintenance", action="Apply fertilizer", reason=string.format("Fertilization level: %d/2", fData.fertilizationLevel)})
                            end
                        elseif fData.needsWeeding then
                            table.insert(fData.suggestions, {priority = 3, type = "maintenance", action = "Remove weeds", reason = string.format("Weed level: %.0f%%", fData.weedLevel * 100)})
                        else
                            table.insert(fData.suggestions, {priority = 4, type = "info", action = "Waiting for Harvest", reason = string.format("Growth at %d%%", fData.growthStatePercentage)})
                        end
                    else
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
                        
                        if #fData.suggestions == 0 then
                             table.insert(fData.suggestions, {priority = 4, type = "info", action = "Growing well", reason = string.format("Growth at %d%%", fData.growthStatePercentage)})
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