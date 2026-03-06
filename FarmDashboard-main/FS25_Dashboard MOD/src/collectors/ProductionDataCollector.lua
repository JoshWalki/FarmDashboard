ProductionDataCollector = {}

function ProductionDataCollector:init()
    self.lastCollectTime = 0
    self.collectInterval = 1000 -- Throttle to once per second to avoid disk spam
end

function ProductionDataCollector:collect()
    -- Always return object with chains
    if not _G.g_currentMission then
        return { chains = {} }
    end
    
    -- Throttle collection to avoid disk spam
    local currentTime = _G.g_time or 0
    if type(currentTime) == "number" and type(self.lastCollectTime) == "number" and type(self.collectInterval) == "number" and currentTime - self.lastCollectTime < self.collectInterval then
        return self.lastProductionData or { chains = {} }
    end
    self.lastCollectTime = currentTime
    
    local result = { chains = {} }
    
    if not _G.g_currentMission.productionChainManager then
        self.lastProductionData = result
        return result
    end
    
    local productionChains = _G.g_currentMission.productionChainManager.productionChainsByFarmId
    if productionChains then
        for farmId, chains in pairs(productionChains) do
            for _, chain in pairs(chains) do
                local pData = self:collectProductionChainData(chain, farmId)
                if pData then
                    table.insert(result.chains, pData)
                end
            end
        end
    end
    
    self.lastProductionData = result
    return result
end

function ProductionDataCollector:collectProductionChainData(chain, farmId)
    if not chain then return nil end
    
    local function bool(val, obj, method)
        if type(val) == "boolean" then return val end
        if obj and type(obj[method]) == "function" then return obj[method](obj) end
        return false
    end
    
    local data = {
        id = chain.id or 0,
        name = (chain.getName and chain:getName()) or chain.name or "Unknown",
        ownerFarmId = farmId,
        isActive = bool(chain.isActive, chain, "isActive"),
        productions = {},
        inputFillLevels = {},
        outputFillLevels = {},
        position = self:getPosition(chain)
    }
    
    if chain.productions then
        for _, production in pairs(chain.productions) do
            local prodData = {
                id = production.id or "unknown",
                name = production.name or "Unknown",
                isActive = bool(production.isActive, production, "isActive"),
                status = production.status or "inactive",
                cyclesPerHour = (type(production.cyclesPerHour) == "function") and production:cyclesPerHour() or production.cyclesPerHour or 0,
                cyclesPerMonth = (type(production.cyclesPerMonth) == "function") and production:cyclesPerMonth() or production.cyclesPerMonth or 0,
                -- Note: inputs/outputs.amount are RECIPE amounts per cycle, not live storage levels
                inputs = {},
                outputs = {}
            }
            
            if production.inputs then
                for _, input in pairs(production.inputs) do
                    table.insert(prodData.inputs, {
                        fillType = _G.g_fillTypeManager:getFillTypeNameByIndex(input.type) or "unknown",
                        recipeAmount = input.amount or 0  -- Renamed for clarity: recipe amount per cycle, NOT storage level
                    })
                end
            end
            
            if production.outputs then
                for _, output in pairs(production.outputs) do
                    table.insert(prodData.outputs, {
                        fillType = _G.g_fillTypeManager:getFillTypeNameByIndex(output.type) or "unknown",
                        recipeAmount = output.amount or 0  -- Renamed for clarity: recipe amount per cycle, NOT storage level
                    })
                end
            end
            
            table.insert(data.productions, prodData)
        end
    end
    
    if chain.inputFillLevels then
        for fillType, level in pairs(chain.inputFillLevels) do
            local fillTypeName = _G.g_fillTypeManager:getFillTypeNameByIndex(fillType) or "unknown"
            data.inputFillLevels[fillTypeName] = level
        end
    end
    
    if chain.outputFillLevels then
        for fillType, level in pairs(chain.outputFillLevels) do
            local fillTypeName = _G.g_fillTypeManager:getFillTypeNameByIndex(fillType) or "unknown"
            data.outputFillLevels[fillTypeName] = level
        end
    end
    
    return data
end

-- Removed collectHusbandryTotals function as it's now handled by AnimalDataCollector

function ProductionDataCollector:getPosition(chain)
    if chain and chain.rootNode then
        -- Wrap in pcall to prevent crashes from invalid nodes
        local success, x, y, z = pcall(getWorldTranslation, chain.rootNode)
        if success and x and y and z then
            return {x = x, y = y, z = z}
        end
    end
    return {x = 0, y = 0, z = 0}
end