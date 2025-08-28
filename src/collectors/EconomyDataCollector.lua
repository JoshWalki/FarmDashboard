EconomyDataCollector = {}

function EconomyDataCollector:init()
end

function EconomyDataCollector:collect()
-- Safety check: Don't collect if game isn't ready or managers aren't available
    if not _G.g_currentMission then
        return {
            marketPrices = {},
            sellingStations = {},
            timestamp = 0
        }
    end
    
    local economyData = {
        marketPrices = {},
        sellingStations = {},
        timestamp = _G.g_currentMission.environment and _G.g_currentMission.environment.dayTime or 0,
        debug = {
            totalFillTypes = 0,
            milkTypes = {},
            animalProducts = {},
            allFillTypes = {}
        }
    }
    
    -- Collect all market prices for each sell point
    economyData.marketPrices = self:collectMarketPrices()
    
    -- Include debug information from market prices collection
    if economyData.marketPrices and economyData.marketPrices.debug then
        economyData.debug = economyData.marketPrices.debug
    end
    
    return economyData
end

function EconomyDataCollector:collectMarketPrices()
    local marketData = {
        sellPoints = {},
        crops = {},
        lastUpdate = _G.g_time or 0,
        debug = {
            totalFillTypes = 0,
            milkTypes = {},
            animalProducts = {},
            allFillTypes = {}
        }
    }
    
    if not _G.g_currentMission then
        return marketData
    end
    
    -- Get all selling stations/points from multiple sources
    local sellingStations = {}
    local foundStations = {}
    
    -- Method 1: Check economy manager selling stations (most important for base prices)
    if _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.sellingStations then
        for _, station in pairs(_G.g_currentMission.economyManager.sellingStations) do
            if station and not foundStations[station] then
                foundStations[station] = true
                table.insert(sellingStations, station)
            end
        end
    end
    
    -- Method 2: Check storageSystem for selling stations
    if _G.g_currentMission.storageSystem then
        -- Check unloadingStations
        if _G.g_currentMission.storageSystem.unloadingStations then
            for _, station in pairs(_G.g_currentMission.storageSystem.unloadingStations) do
                if station and station.owningPlaceable and not foundStations[station.owningPlaceable] then
                    foundStations[station.owningPlaceable] = true
                    table.insert(sellingStations, station.owningPlaceable)
                end
            end
        end
        
        -- Check storages for sell points
        if _G.g_currentMission.storageSystem.storages then
            for _, storage in pairs(_G.g_currentMission.storageSystem.storages) do
                if storage and storage.owningPlaceable and storage.isFarmOwned == false then
                    if not foundStations[storage.owningPlaceable] then
                        foundStations[storage.owningPlaceable] = true
                        table.insert(sellingStations, storage.owningPlaceable)
                    end
                end
            end
        end
    end
    
    -- Method 3: Check all placeables for selling capabilities
    if _G.g_currentMission.placeables then
        for _, placeable in pairs(_G.g_currentMission.placeables) do
            if placeable and not foundStations[placeable] then
                -- Check for selling station spec
                if placeable.spec_sellingStation then
                    foundStations[placeable] = true
                    table.insert(sellingStations, placeable)
                end
                -- Check for animal dealer (sells animals/animal products)
                if placeable.spec_animalDealer then
                    foundStations[placeable] = true
                    table.insert(sellingStations, placeable)
                end
                -- Check for production points that might buy materials
                if placeable.spec_productionPoint and placeable.spec_productionPoint.inputFillTypes then
                    foundStations[placeable] = true
                    table.insert(sellingStations, placeable)
                end
            end
        end
    end
    
    -- Method 4: Check mission placeables (map default sell points)
    if _G.g_currentMission.placeableSystem and _G.g_currentMission.placeableSystem.placeables then
        local totalPlaceables = 0
        local productionPointsFound = 0
        
        for _ in pairs(_G.g_currentMission.placeableSystem.placeables) do totalPlaceables = totalPlaceables + 1 end
        -- Scanning placeables for stations
        
        for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
            if placeable and not foundStations[placeable] then
                local stationName = "Unknown"
                if placeable.getName then
                    stationName = placeable:getName() or "Unknown"
                elseif placeable.configFileName then
                    stationName = placeable.configFileName or "Unknown"
                end
                
                -- Check what specs this placeable has
                local specs = {}
                if placeable.spec_sellingStation then table.insert(specs, "sellingStation") end
                if placeable.spec_animalDealer then table.insert(specs, "animalDealer") end
                if placeable.spec_productionPoint then table.insert(specs, "productionPoint") end
                if placeable.spec_unloadingStation then table.insert(specs, "unloadingStation") end
                
                if #specs > 0 then
                    -- Placeable has specs
                end
                
                if placeable.spec_sellingStation then
                    -- Found selling station
                    foundStations[placeable] = true
                    table.insert(sellingStations, placeable)
                elseif placeable.spec_animalDealer then
                    -- Found animal dealer
                    foundStations[placeable] = true
                    table.insert(sellingStations, placeable)
                elseif placeable.spec_productionPoint then
                    productionPointsFound = productionPointsFound + 1
                    if placeable.spec_productionPoint.inputFillTypes then
                        local inputCount = 0
                        local milkAccepted = false
                        for fillTypeIndex, _ in pairs(placeable.spec_productionPoint.inputFillTypes) do
                            inputCount = inputCount + 1
                            local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                            if fillType and fillType.name and fillType.name == "MILK" then
                                milkAccepted = true
                            end
                        end
                        -- Found production point
                        foundStations[placeable] = true
                        table.insert(sellingStations, placeable)
                    else
                        -- Production point has no inputFillTypes
                    end
                end
            end
        end
        
        -- Production points discovery complete
    end
    
    -- Method 5: Add economy-based virtual sell points for base prices
    if _G.g_fillTypeManager and _G.g_currentMission.economyManager then
        local virtualStation, debugInfo = self:createVirtualEconomyStation()
        if debugInfo then
            marketData.debug = debugInfo
        end
        if virtualStation and next(virtualStation.prices) then
            table.insert(marketData.sellPoints, virtualStation)
            
            -- Add to crop aggregation
            for cropName, priceInfo in pairs(virtualStation.prices) do
                if not marketData.crops[cropName] then
                    marketData.crops[cropName] = {
                        name = cropName,
                        minPrice = priceInfo.price,
                        maxPrice = priceInfo.price,
                        avgPrice = priceInfo.price,
                        bestLocation = virtualStation.name,
                        worstLocation = virtualStation.name,
                        locations = {}
                    }
                else
                    local cropData = marketData.crops[cropName]
                    if priceInfo.price > cropData.maxPrice then
                        cropData.maxPrice = priceInfo.price
                        cropData.bestLocation = virtualStation.name
                    end
                    if priceInfo.price < cropData.minPrice then
                        cropData.minPrice = priceInfo.price
                        cropData.worstLocation = virtualStation.name
                    end
                end
                
                table.insert(marketData.crops[cropName].locations, {
                    name = virtualStation.name,
                    price = priceInfo.price,
                    multiplier = priceInfo.multiplier
                })
            end
        end
    end
    
    -- Process each selling station
    for _, station in pairs(sellingStations) do
        local stationData = self:getStationPrices(station)
        if stationData then
            -- Add all stations, even if they don't have prices initially
            -- The dynamic testing phase will try to find accepted products
            local priceCount = 0
            for _ in pairs(stationData.prices) do priceCount = priceCount + 1 end
            -- Station added to sellPoints
            table.insert(marketData.sellPoints, stationData)
            
            -- Skip crop aggregation here - we'll do it all at once at the end
        end
    end
    
    -- Skip old crop calculation - we'll rebuild crops data completely at the end
    
    -- Method 6: Dynamic station-product discovery
    -- Starting dynamic station-product discovery
    
 First, let's see what placeables actually exist in the game
 === PLACEABLE DISCOVERY ===")
    if _G.g_currentMission.placeableSystem and _G.g_currentMission.placeableSystem.placeables then
        local placeableCount = 0
        for _ in pairs(_G.g_currentMission.placeableSystem.placeables) do placeableCount = placeableCount + 1 end
     Found " .. placeableCount .. " total placeables in game")
        
        for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
            if placeable then
                local name = "Unknown"
                if placeable.getName then
                    name = placeable:getName() or "Unknown"
                elseif placeable.configFileName then
                    name = placeable.configFileName or "Unknown"
                end
                
                local specs = {}
                if placeable.spec_sellingStation then table.insert(specs, "sellingStation") end
                if placeable.spec_productionPoint then table.insert(specs, "productionPoint") end
                if placeable.spec_animalDealer then table.insert(specs, "animalDealer") end
                if placeable.spec_unloadingStation then table.insert(specs, "unloadingStation") end
                
                if #specs > 0 then
                 Placeable: '" .. name .. "' - Specs: " .. table.concat(specs, ", "))
                    
                 Check production point inputs specifically
                    if placeable.spec_productionPoint and placeable.spec_productionPoint.inputFillTypes then
                        local inputCount = 0
                        local acceptsMilk = false
                        for fillTypeIndex, _ in pairs(placeable.spec_productionPoint.inputFillTypes) do
                            inputCount = inputCount + 1
                            local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                            if fillType and fillType.name and (fillType.name == "MILK" or fillType.name == "GOATMILK" or fillType.name == "BUFFALOMILK") then
                                acceptsMilk = true
                            end
                        end
                        -- Production point accepts inputs
                    end
                end
            end
        end
    end
    -- === END PLACEABLE DISCOVERY ===
    
    -- Get all fill types that exist in the game
    local allFillTypes = {}
    if _G.g_fillTypeManager then
        for fillTypeIndex, fillType in pairs(_G.g_fillTypeManager.fillTypes) do
            if fillType and fillType.name then
                allFillTypes[fillType.name] = fillTypeIndex
            end
        end
    end
    
    local fillTypeCount = 0
    for _ in pairs(allFillTypes) do fillTypeCount = fillTypeCount + 1 end
    -- Found fill types to test
    
    -- Method 6a: Add production points as new selling stations if they're not already present
    if _G.g_currentMission.placeableSystem and _G.g_currentMission.placeableSystem.placeables then
        for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
            if placeable and placeable.spec_productionPoint and placeable.spec_productionPoint.inputFillTypes then
                local placeableName = "Unknown"
                if placeable.getName then
                    placeableName = placeable:getName() or "Unknown"
                elseif placeable.configFileName then
                    placeableName = placeable.configFileName or "Unknown"
                end
                
             Check if this production point is already in our sellPoints
                local alreadyExists = false
                for _, station in pairs(marketData.sellPoints) do
                    if station.name == placeableName or 
                       string.find(string.lower(station.name), string.lower(placeableName)) or
                       string.find(string.lower(placeableName), string.lower(station.name)) then
                        alreadyExists = true
                        break
                    end
                end
                
             If not already in sellPoints, create a new station
                if not alreadyExists then
                 Adding new production station: " .. placeableName)
                    local newStation = {
                        name = placeableName,
                        id = (#marketData.sellPoints + 1) * 100, -- Give it a unique ID
                        position = {x = 0, y = 0, z = 0}, -- We don't have position info
                        prices = {},
                        isSpecialEvent = false
                    }
                    
                 Add products that this production point accepts
                    for fillTypeIndex, _ in pairs(placeable.spec_productionPoint.inputFillTypes) do
                        local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                        if fillType and fillType.name then
                         Get market price for this product
                            local marketPrice = 0
                            
                         Try to get from existing Market Base Prices station
                            for _, station in pairs(marketData.sellPoints) do
                                if station.name == "Market Base Prices" and station.prices[fillType.name] then
                                    marketPrice = station.prices[fillType.name].price
                                    break
                                end
                            end
                            
                         If we found a market price, add this product to the production station
                            if marketPrice > 0 then
                                local productionPrice = marketPrice * 0.85 -- Production points pay 85% of market
                                newStation.prices[fillType.name] = {
                                    price = productionPrice,
                                    basePrice = marketPrice,
                                    multiplier = 0.85,
                                    isSpecialEvent = false
                                }
                             Added " .. fillType.name .. " to " .. placeableName .. " at $" .. string.format("%.2f", productionPrice))
                            end
                        end
                    end
                    
                 Only add the station if it has some products
                    if next(newStation.prices) then
                        table.insert(marketData.sellPoints, newStation)
                        local productCount = 0
                        for _ in pairs(newStation.prices) do productCount = productCount + 1 end
                     Successfully added " .. placeableName .. " with " .. productCount .. " products")
                        
                     Also update crops data to include this new station
                        for productName, priceInfo in pairs(newStation.prices) do
                            if marketData.crops[productName] then
                             Add this station as a location for this crop
                                if not marketData.crops[productName].locations then
                                    marketData.crops[productName].locations = {}
                                end
                                
                             Check if location already exists
                                local locationExists = false
                                for _, location in pairs(marketData.crops[productName].locations) do
                                    if location.name == placeableName then
                                        locationExists = true
                                        break
                                    end
                                end
                                
                             Add new location if it doesn't exist
                                if not locationExists then
                                    table.insert(marketData.crops[productName].locations, {
                                        name = placeableName,
                                        price = priceInfo.price,
                                        multiplier = priceInfo.multiplier
                                    })
                                    
                                 Recalculate crop stats
                                    local allPrices = {}
                                    for _, location in pairs(marketData.crops[productName].locations) do
                                        table.insert(allPrices, location.price)
                                    end
                                    
                                    if #allPrices > 0 then
                                        table.sort(allPrices)
                                        marketData.crops[productName].minPrice = allPrices[1]
                                        marketData.crops[productName].maxPrice = allPrices[#allPrices]
                                        
                                        local sum = 0
                                        for _, price in pairs(allPrices) do
                                            sum = sum + price
                                        end
                                        marketData.crops[productName].avgPrice = sum / #allPrices
                                        
                                        -- Update best/worst location names
                                        for _, location in pairs(marketData.crops[productName].locations) do
                                            if location.price == marketData.crops[productName].maxPrice then
                                                marketData.crops[productName].bestLocation = location.name
                                            end
                                            if location.price == marketData.crops[productName].minPrice then
                                                marketData.crops[productName].worstLocation = location.name
                                            end
                                        end
                                    end
                                 Updated " .. productName .. " crop data to include " .. placeableName)
                                end
                            end
                        end
                    end
                end
            end
        end
    end
    
 Test each station to see what products it actually accepts
    for _, station in pairs(marketData.sellPoints) do
        if station.name ~= "Market Base Prices" and station.prices then
         Testing station: " .. station.name)
            local originalPriceCount = 0
            for _ in pairs(station.prices) do originalPriceCount = originalPriceCount + 1 end
            
         Try to find the actual placeable for this station
            local actualStation = nil
            if _G.g_currentMission.placeableSystem then
                for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
                    if placeable and placeable.getName then
                        local placeableName = placeable:getName() or "Unknown"
                     Match station names (fuzzy matching)
                        if string.find(string.lower(placeableName), string.lower(station.name)) or 
                           string.find(string.lower(station.name), string.lower(placeableName)) then
                            actualStation = placeable
                         Found matching placeable: " .. placeableName)
                            break
                        end
                    end
                end
            end
            
            if actualStation then
             Test what products this station can accept
                local newProducts = 0
                for fillTypeName, fillTypeIndex in pairs(allFillTypes) do
                 Skip if we already have this product
                    if not station.prices[fillTypeName] then
                        local canAccept = false
                        local actualPrice = 0
                        
                     Test different station types
                        if actualStation.spec_sellingStation then
                         Check if selling station accepts this fill type
                            local spec = actualStation.spec_sellingStation
                            if spec.acceptedFillTypes and spec.acceptedFillTypes[fillTypeIndex] then
                                canAccept = true
                             Try to get actual price
                                if _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.getPricePerLiter then
                                    local success, pricePerLiter = pcall(function()
                                        return _G.g_currentMission.economyManager:getPricePerLiter(fillTypeIndex, actualStation)
                                    end)
                                    if success and pricePerLiter and pricePerLiter > 0 then
                                        actualPrice = pricePerLiter * 1000
                                    end
                                end
                            end
                        end
                        
                        if actualStation.spec_productionPoint then
                         Check if production point accepts this as input
                            local spec = actualStation.spec_productionPoint
                            if spec.inputFillTypes and spec.inputFillTypes[fillTypeIndex] then
                                canAccept = true
                             Production points typically pay market rate for inputs
                                if _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.getPricePerLiter then
                                    local success, pricePerLiter = pcall(function()
                                        return _G.g_currentMission.economyManager:getPricePerLiter(fillTypeIndex)
                                    end)
                                    if success and pricePerLiter and pricePerLiter > 0 then
                                     Production points typically pay 80-90% of market rate
                                        actualPrice = pricePerLiter * 1000 * 0.85
                                    end
                                end
                            end
                        end
                        
                     If no specific price found, try to get market base price
                        if canAccept and actualPrice == 0 then
                         Get base price from Market Base Prices station
                            for _, baseStation in pairs(marketData.sellPoints) do
                                if baseStation.name == "Market Base Prices" and baseStation.prices[fillTypeName] then
                                    actualPrice = baseStation.prices[fillTypeName].price * 0.85 -- Default to 85% of market
                                    break
                                end
                            end
                        end
                        
                     Add the product if it's accepted and has a valid price
                        if canAccept and actualPrice > 0 then
                            station.prices[fillTypeName] = {
                                price = actualPrice,
                                basePrice = actualPrice / 0.85, -- Estimate base price
                                multiplier = 0.85,
                                isSpecialEvent = false
                            }
                            newProducts = newProducts + 1
                         Added " .. fillTypeName .. " to " .. station.name .. " at $" .. string.format("%.2f", actualPrice))
                            
                         Also add to crops data if it exists
                            if marketData.crops[fillTypeName] then
                             Check if this location already exists
                                local locationExists = false
                                if marketData.crops[fillTypeName].locations then
                                    for _, location in pairs(marketData.crops[fillTypeName].locations) do
                                        if location.name == station.name then
                                            locationExists = true
                                            break
                                        end
                                    end
                                end
                                
                             Add new location if it doesn't exist
                                if not locationExists then
                                    if not marketData.crops[fillTypeName].locations then
                                        marketData.crops[fillTypeName].locations = {}
                                    end
                                    
                                    table.insert(marketData.crops[fillTypeName].locations, {
                                        name = station.name,
                                        price = actualPrice,
                                        multiplier = 0.85
                                    })
                                    
                                 Recalculate crop stats
                                    local allPrices = {}
                                    for _, location in pairs(marketData.crops[fillTypeName].locations) do
                                        table.insert(allPrices, location.price)
                                    end
                                    
                                    if #allPrices > 0 then
                                        table.sort(allPrices)
                                        marketData.crops[fillTypeName].minPrice = allPrices[1]
                                        marketData.crops[fillTypeName].maxPrice = allPrices[#allPrices]
                                        
                                        local sum = 0
                                        for _, price in pairs(allPrices) do
                                            sum = sum + price
                                        end
                                        marketData.crops[fillTypeName].avgPrice = sum / #allPrices
                                        
                                        -- Update best/worst location names
                                        for _, location in pairs(marketData.crops[fillTypeName].locations) do
                                            if location.price == marketData.crops[fillTypeName].maxPrice then
                                                marketData.crops[fillTypeName].bestLocation = location.name
                                            end
                                            if location.price == marketData.crops[fillTypeName].minPrice then
                                                marketData.crops[fillTypeName].worstLocation = location.name
                                            end
                                        end
                                    end
                                end
                            end
                        end
                    end
                end
                
                if newProducts > 0 then
                 Station " .. station.name .. " now accepts " .. (originalPriceCount + newProducts) .. " products (+" .. newProducts .. " new)")
                else
                 No new products found for " .. station.name)
                end
            else
             Could not find actual placeable for station: " .. station.name)
            end
        end
    end
    
 Method 7:    -- Force-add comprehensive Bakery and Dairy stations
    -- Force-adding comprehensive Bakery and Dairy stations
    
    -- Define comprehensive product lists (including all milk variants)
    local bakeryProducts = {
        "MILK", "GOAT_MILK", "BUFFALO_MILK", "GOATMILK", "BUFFALOMILK", 
        "MILK_BOTTLED", "GOATMILK_BOTTLED", "BUFFALOMILK_BOTTLED",
        "FLOUR", "SUGAR", "EGG", "BUTTER", "HONEY", "BREAD", "CAKE"
    }
    
    local dairyProducts = {
        "MILK", "GOAT_MILK", "BUFFALO_MILK", "GOATMILK", "BUFFALOMILK",
        "MILK_BOTTLED", "GOATMILK_BOTTLED", "BUFFALOMILK_BOTTLED",
        "CHOCOLATE_MILK", "CONDENSED_MILK", "CHOCOLATEMILKCOW", "CHOCOLATEMILKGOAT", 
        "CHOCOLATEMILKBUFFALO", "CREAM", "BUTTER", "CHEESE", "YOGURT", "KEFIR"
    }
    
    -- Check if Bakery and Dairy already exist with meaningful products
    local bakeryExists = false
    local dairyExists = false
    for _, station in pairs(marketData.sellPoints) do
        if station.name == "Bakery" then
            -- Only consider it as existing if it has prices
            local hasProducts = false
            for _ in pairs(station.prices) do hasProducts = true break end
            if hasProducts then bakeryExists = true end
        end
        if station.name == "Dairy" then
            -- Only consider it as existing if it has prices
            local hasProducts = false
            for _ in pairs(station.prices) do hasProducts = true break end
            if hasProducts then dairyExists = true end
        end
    end
    
    -- Bakery exists with products check complete
    -- Dairy exists with products check complete
    
 Always add/update Bakery with products (create new if doesn't exist, populate if exists empty)
    local bakeryStation = nil
    for _, station in pairs(marketData.sellPoints) do
        if station.name == "Bakery" then
            bakeryStation = station
         Found existing Bakery station, will populate with products")
            break
        end
    end
    
    if not bakeryStation then
     Creating new Bakery station")
        bakeryStation = {
            name = "Bakery",
            id = 201,
            position = {x = 0, y = 0, z = 0},
            prices = {},
            isSpecialEvent = false
        }
        table.insert(marketData.sellPoints, bakeryStation)
    end
    
 Always populate bakery with products (whether new or existing)
    if bakeryStation then
     Add all bakery products with market-based pricing
        for _, productName in pairs(bakeryProducts) do
            local marketPrice = 0
            
         First try to get from Market Base Prices station specifically
            for _, station in pairs(marketData.sellPoints) do
                if station.name == "Market Base Prices" and station.prices[productName] then
                    marketPrice = station.prices[productName].price
                 Found " .. productName .. " market price: $" .. string.format("%.2f", marketPrice))
                    break
                end
            end
            
         If not found in Market Base Prices, try any other station
            if marketPrice == 0 then
                for _, station in pairs(marketData.sellPoints) do
                    if station.prices[productName] then
                        marketPrice = station.prices[productName].price
                     Found " .. productName .. " price from " .. station.name .. ": $" .. string.format("%.2f", marketPrice))
                        break
                    end
                end
            end
            
         If market price found, add to bakery at 80% rate
            if marketPrice > 0 then
                bakeryStation.prices[productName] = {
                    price = marketPrice * 0.80,
                    basePrice = marketPrice,
                    multiplier = 0.80,
                    isSpecialEvent = false
                }
             Added " .. productName .. " to Bakery at $" .. string.format("%.2f", marketPrice * 0.80))
            else
             No market price found for " .. productName)
            end
        end
        
        local bakeryProductCount = 0
        for _ in pairs(bakeryStation.prices) do bakeryProductCount = bakeryProductCount + 1 end
     Bakery now has " .. bakeryProductCount .. " products")
    end
    
 Always add/update Dairy with products (create new if doesn't exist, populate if exists empty)
    local dairyStation = nil
    for _, station in pairs(marketData.sellPoints) do
        if station.name == "Dairy" then
            dairyStation = station
         Found existing Dairy station, will populate with products")
            break
        end
    end
    
    if not dairyStation then
     Creating new Dairy station")
        dairyStation = {
            name = "Dairy",
            id = 202,
            position = {x = 0, y = 0, z = 0},
            prices = {},
            isSpecialEvent = false
        }
        table.insert(marketData.sellPoints, dairyStation)
    end
    
 Always populate dairy with products (whether new or existing)
    if dairyStation then
     Add all dairy products with market-based pricing
        for _, productName in pairs(dairyProducts) do
            local marketPrice = 0
            
         First try to get from Market Base Prices station specifically
            for _, station in pairs(marketData.sellPoints) do
                if station.name == "Market Base Prices" and station.prices[productName] then
                    marketPrice = station.prices[productName].price
                 Found " .. productName .. " market price: $" .. string.format("%.2f", marketPrice))
                    break
                end
            end
            
         If not found in Market Base Prices, try any other station
            if marketPrice == 0 then
                for _, station in pairs(marketData.sellPoints) do
                    if station.prices[productName] then
                        marketPrice = station.prices[productName].price
                     Found " .. productName .. " price from " .. station.name .. ": $" .. string.format("%.2f", marketPrice))
                        break
                    end
                end
            end
            
         If market price found, add to dairy at 85% rate
            if marketPrice > 0 then
                dairyStation.prices[productName] = {
                    price = marketPrice * 0.85,
                    basePrice = marketPrice,
                    multiplier = 0.85,
                    isSpecialEvent = false
                }
             Added " .. productName .. " to Dairy at $" .. string.format("%.2f", marketPrice * 0.85))
            else
             No market price found for " .. productName)
            end
        end
        
        local dairyProductCount = 0
        for _ in pairs(dairyStation.prices) do dairyProductCount = dairyProductCount + 1 end
     Dairy now has " .. dairyProductCount .. " products")
    end
    
 Update crops data to include Bakery and Dairy locations
    local function addStationToCrop(cropName, stationName, price, multiplier)
        if marketData.crops[cropName] then
         Ensure locations array exists
            if not marketData.crops[cropName].locations then
                marketData.crops[cropName].locations = {}
            end
            
         Check if location already exists
            local locationExists = false
            for _, location in pairs(marketData.crops[cropName].locations) do
                if location.name == stationName then
                    locationExists = true
                    break
                end
            end
            
         Add new location
            if not locationExists then
                table.insert(marketData.crops[cropName].locations, {
                    name = stationName,
                    price = price,
                    multiplier = multiplier
                })
                
             Recalculate crop statistics
                local allPrices = {}
                for _, location in pairs(marketData.crops[cropName].locations) do
                    table.insert(allPrices, location.price)
                end
                
                table.sort(allPrices)
                marketData.crops[cropName].minPrice = allPrices[1]
                marketData.crops[cropName].maxPrice = allPrices[#allPrices]
                
                local sum = 0
                for _, price in pairs(allPrices) do sum = sum + price end
                marketData.crops[cropName].avgPrice = sum / #allPrices
                
                -- Update best/worst location names
                for _, location in pairs(marketData.crops[cropName].locations) do
                    if location.price == marketData.crops[cropName].maxPrice then
                        marketData.crops[cropName].bestLocation = location.name
                    end
                    if location.price == marketData.crops[cropName].minPrice then
                        marketData.crops[cropName].worstLocation = location.name
                    end
                end
                
             Updated " .. cropName .. " to include " .. stationName .. " location")
            end
        end
    end
    
 Add Bakery to relevant crops
    if not bakeryExists then
        for _, station in pairs(marketData.sellPoints) do
            if station.name == "Bakery" then
                for productName, priceInfo in pairs(station.prices) do
                    addStationToCrop(productName, "Bakery", priceInfo.price, priceInfo.multiplier)
                end
                break
            end
        end
    end
    
 Add Dairy to relevant crops
    if not dairyExists then
        for _, station in pairs(marketData.sellPoints) do
            if station.name == "Dairy" then
                for productName, priceInfo in pairs(station.prices) do
                    addStationToCrop(productName, "Dairy", priceInfo.price, priceInfo.multiplier)
                end
                break
            end
        end
    end
    
    -- Method 8: Force-add logical products to specific stations based on their type
    -- Adding logical products to specific station types
    
    local function addProductToStation(stationName, productName, price, multiplier)
        for _, station in pairs(marketData.sellPoints) do
            if station.name == stationName then
                if not station.prices[productName] then
                    station.prices[productName] = {
                        price = price,
                        basePrice = price / multiplier,
                        multiplier = multiplier,
                        isSpecialEvent = false
                    }
                    -- Added product to station
                end
                break
            end
        end
    end
    
    -- Get market base prices for reference
    local basePrice = {}
    for _, station in pairs(marketData.sellPoints) do
        if station.name == "Market Base Prices" then
            for productName, priceInfo in pairs(station.prices) do
                basePrice[productName] = priceInfo.price
            end
            break
        end
    end
    
    -- Methane Selling Station should accept methane/biogas products
    if basePrice["METHANE"] then
        addProductToStation("Methane Selling Station", "METHANE", basePrice["METHANE"] * 0.90, 0.90)
    end
    if basePrice["DIGESTATE"] then
        addProductToStation("Methane Selling Station", "DIGESTATE", basePrice["DIGESTATE"] * 0.85, 0.85)
    end
    
    -- Alma Logistics should accept various goods (general logistics)
    local logisticsProducts = {"BOARDS", "PLANKS", "FABRIC", "CLOTHES", "FURNITURE", "CEMENT", "STONE"}
    for _, productName in pairs(logisticsProducts) do
        if basePrice[productName] then
            addProductToStation("Alma Logistics", productName, basePrice[productName] * 0.92, 0.92)
        end
    end
    
    -- Sawmill should accept wood products
    local woodProducts = {"WOOD", "TREE", "POPLAR"}
    for _, productName in pairs(woodProducts) do
        if basePrice[productName] then
            addProductToStation("Sawmill (Wood-Mizer LT15)", productName, basePrice[productName] * 0.88, 0.88)
        end
    end
    
    -- Grain Mill should accept grains
    local grainProducts = {"WHEAT", "BARLEY", "OAT", "CORN_DRY", "MAIZE", "RICE", "CANOLA", "SOYBEAN", "SUNFLOWER"}
    for _, productName in pairs(grainProducts) do
        if basePrice[productName] then
            addProductToStation("Grain Mill", productName, basePrice[productName] * 0.87, 0.87)
        end
    end
    
    -- Remove silos - they are storage, not selling points
    -- Silos removed for data clarity
    
    -- Biogas Plant should accept organic materials
    local biogasProducts = {"CHAFF", "SILAGE", "MANURE", "SLURRY", "LIQUIDMANURE", "DIGESTATE", "CORN_DRY", "MAIZE", "SUGARBEET", "SUGAR_BEET"}
    for _, productName in pairs(biogasProducts) do
        if basePrice[productName] then
            addProductToStation("Biogas Plant", productName, basePrice[productName] * 0.80, 0.80)
        end
    end
    
    -- Also add products to production points that should logically accept specific inputs
    local productionMappings = {
        ["Pizzeria"] = {"FLOUR", "CHEESE", "TOMATO", "MILK", "GOATMILK", "BUFFALOMILK", "EGG", "OLIVE_OIL"},
        ["Popcorn Production"] = {"CORN_DRY", "MAIZE", "BUTTER"},
        ["Ketchup Production"] = {"TOMATO", "SUGAR"},
        ["Tailor Shop"] = {"FABRIC", "WOOL", "COTTON"},
        ["Corn Dryer"] = {"CORN_DRY", "MAIZE"},
        ["Bakery"] = {"MILK", "GOAT_MILK", "BUFFALO_MILK", "GOATMILK", "BUFFALOMILK", "MILK_BOTTLED", "GOATMILK_BOTTLED", "BUFFALOMILK_BOTTLED", "FLOUR", "SUGAR", "EGG", "BUTTER", "HONEY", "BREAD", "CAKE"},
        ["Dairy"] = {"MILK", "GOAT_MILK", "BUFFALO_MILK", "GOATMILK", "BUFFALOMILK", "MILK_BOTTLED", "GOATMILK_BOTTLED", "BUFFALOMILK_BOTTLED", "CHOCOLATE_MILK", "CONDENSED_MILK", "CHOCOLATEMILKCOW", "CHOCOLATEMILKGOAT", "CHOCOLATEMILKBUFFALO", "CREAM", "BUTTER", "CHEESE", "YOGURT", "KEFIR"}
    }
    
    for stationName, products in pairs(productionMappings) do
        for _, productName in pairs(products) do
            if basePrice[productName] then
                -- Use different multipliers for Bakery and Dairy
                local multiplier = 0.83
                if stationName == "Bakery" then
                    multiplier = 0.80
                elseif stationName == "Dairy" then
                    multiplier = 0.85
                end
                addProductToStation(stationName, productName, basePrice[productName] * multiplier, multiplier)
            end
        end
    end
    
    -- Method 9: COMPLETELY REBUILD crop data from ALL stations (including newly added products)
    -- Completely rebuilding crop data from all stations
    
    -- Clear existing crops data and rebuild from scratch
    marketData.crops = {}
    
    -- Helper function to check if station should be included
    local function isValidStation(stationName)
        -- Filter out unknown and storage locations
        local skipPatterns = {
            "^Unknown$",
            "Silo$", 
            "Silo ", 
            "^Grain.*Silo", 
            "^Farm Silo",
            "Barn$",
            "Barn ",
            "Stable$"
        }
        
        for _, pattern in pairs(skipPatterns) do
            if string.find(stationName, pattern) then
                return false
            end
        end
        
        return true
    end
    
    -- Go through ALL valid stations and build complete crop data
    for _, station in pairs(marketData.sellPoints) do
        if next(station.prices) and isValidStation(station.name) then 
            local priceCount = 0
            for _ in pairs(station.prices) do priceCount = priceCount + 1 end
            -- Processing valid station with prices
            
            for productName, priceInfo in pairs(station.prices) do
                -- Initialize crop if it doesn't exist
                if not marketData.crops[productName] then
                    marketData.crops[productName] = {
                        name = productName,
                        minPrice = priceInfo.price,
                        maxPrice = priceInfo.price,
                        avgPrice = priceInfo.price,
                        bestLocation = station.name,
                        worstLocation = station.name,
                        locations = {}
                    }
                end
                
                local cropData = marketData.crops[productName]
                
                -- Check if this location already exists for this crop
                local locationExists = false
                for _, location in pairs(cropData.locations) do
                    if location.name == station.name then
                        locationExists = true
                        break
                    end
                end
                
                -- Add location if it doesn't exist
                if not locationExists then
                    table.insert(cropData.locations, {
                        name = station.name,
                        price = priceInfo.price,
                        multiplier = priceInfo.multiplier
                    })
                    
                    -- Update price ranges
                    if priceInfo.price > cropData.maxPrice then
                        cropData.maxPrice = priceInfo.price
                        cropData.bestLocation = station.name
                    end
                    if priceInfo.price < cropData.minPrice then
                        cropData.minPrice = priceInfo.price
                        cropData.worstLocation = station.name
                    end
                    
                    -- Added station as location for product
                end
            end
        end
    end
    
    -- Calculate average prices for all crops
    for cropName, cropData in pairs(marketData.crops) do
        if cropData.locations and #cropData.locations > 0 then
            local sum = 0
            for _, location in pairs(cropData.locations) do
                sum = sum + location.price
            end
            cropData.avgPrice = sum / #cropData.locations
            -- Crop now has locations with average price calculated
        end
    end
    
    local totalCrops = 0
    for _ in pairs(marketData.crops) do totalCrops = totalCrops + 1 end
    -- Finished rebuilding crop data
    
    -- Final cleanup: Remove unwanted stations from sellPoints list
    -- Filtering out unwanted stations from API response
    local filteredSellPoints = {}
    local removedCount = 0
    
    for _, station in pairs(marketData.sellPoints) do
        if isValidStation(station.name) then
            table.insert(filteredSellPoints, station)
        else
            -- Filtered out station
            removedCount = removedCount + 1
        end
    end
    
    marketData.sellPoints = filteredSellPoints
    -- Removed unwanted stations, remaining stations in API
    
    -- Also clean up crop location lists to remove filtered stations
    -- Cleaning crop location lists
    local cropLocationsCleaned = 0
    
    for cropName, cropData in pairs(marketData.crops) do
        if cropData.locations then
            local filteredLocations = {}
            
            for _, location in pairs(cropData.locations) do
                if isValidStation(location.name) then
                    table.insert(filteredLocations, location)
                else
                    cropLocationsCleaned = cropLocationsCleaned + 1
                end
            end
            
            cropData.locations = filteredLocations
            
            -- Recalculate crop statistics after filtering
            if #filteredLocations > 0 then
                local allPrices = {}
                for _, location in pairs(filteredLocations) do
                    table.insert(allPrices, location.price)
                end
                
                table.sort(allPrices)
                cropData.minPrice = allPrices[1]
                cropData.maxPrice = allPrices[#allPrices]
                
                local sum = 0
                for _, price in pairs(allPrices) do sum = sum + price end
                cropData.avgPrice = sum / #allPrices
                
                -- Update best/worst location names
                for _, location in pairs(filteredLocations) do
                    if location.price == cropData.maxPrice then
                        cropData.bestLocation = location.name
                    end
                    if location.price == cropData.minPrice then
                        cropData.worstLocation = location.name
                    end
                end
            end
        end
    end
    
    -- Cleaned unwanted locations from crop data
    
    return marketData
end

function EconomyDataCollector:createVirtualEconomyStation()
    -- Create a virtual station that represents all available fill types with real prices
    local virtualStation = {
        name = "Market Base Prices",
        id = -1,
        position = {x = 0, y = 0, z = 0},
        prices = {},
        isSpecialEvent = false
    }
    
    -- Debug information storage
    local debugInfo = {
        totalFillTypes = 0,
        milkTypes = {},
        animalProducts = {},
        allFillTypes = {}
    }
    
    if not _G.g_fillTypeManager then
        return nil
    end
    
    -- Method 1: Get ALL fill types from the fill type manager (comprehensive scan)
    local fillTypes = _G.g_fillTypeManager:getFillTypes()
    if fillTypes then
        -- Log all available fill types
        local allFillTypes = {}
        local milkTypes = {}
        local animalProducts = {}
        
        for fillTypeIndex, fillType in pairs(fillTypes) do
            if fillType and fillType.name and type(fillTypeIndex) == "number" then
                table.insert(allFillTypes, fillType.name)
                table.insert(debugInfo.allFillTypes, fillType.name)
                
                -- Collect milk and animal product types specifically
                local nameLower = string.lower(fillType.name)
                if string.find(nameLower, "milk") then
                    table.insert(milkTypes, fillType.name)
                    table.insert(debugInfo.milkTypes, fillType.name)
                elseif string.find(nameLower, "slurry") or string.find(nameLower, "manure") or 
                       string.find(nameLower, "buffalo") or string.find(nameLower, "goat") then
                    table.insert(animalProducts, fillType.name)
                    table.insert(debugInfo.animalProducts, fillType.name)
                end
                
                if self:isValidCropName(fillType.name) then
                    local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                    -- Include items even if they don't have current market prices, use base prices
                    if priceInfo then
                        virtualStation.prices[fillType.name] = priceInfo
                    end
                end
            end
        end
        
        debugInfo.totalFillTypes = #allFillTypes
        
        -- Debug logging
        -- Total fill types found
        -- Milk types found
        -- Animal products found
        -- All fill types enumerated
    end
    
    -- Method 2: Comprehensive nameToIndex scan to ensure we get everything
    if _G.g_fillTypeManager.nameToIndex then
        local nameToIndexItems = {}
        local additionalMilkItems = {}
        local additionalAnimalItems = {}
        
        for fillTypeName, fillTypeIndex in pairs(_G.g_fillTypeManager.nameToIndex) do
            if type(fillTypeIndex) == "number" and fillTypeName then
                table.insert(nameToIndexItems, fillTypeName)
                
                -- Check for additional milk/animal items in nameToIndex
                local nameLower = string.lower(fillTypeName)
                if string.find(nameLower, "milk") then
                    table.insert(additionalMilkItems, fillTypeName)
                elseif string.find(nameLower, "slurry") or string.find(nameLower, "manure") or 
                       string.find(nameLower, "buffalo") or string.find(nameLower, "goat") then
                    table.insert(additionalAnimalItems, fillTypeName)
                end
                
                if self:isValidCropName(fillTypeName) then
                    -- Skip if we already have this item
                    if not virtualStation.prices[fillTypeName] then
                        local fillType = _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                        if fillType then
                            local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                            if priceInfo then
                                virtualStation.prices[fillTypeName] = priceInfo
                            end
                        end
                    end
                end
            end
        end
        
        -- NameToIndex scan complete
    end
    
    -- Method 3: Check fillTypeIndexToName for reverse lookup
    if _G.g_fillTypeManager.fillTypeIndexToName then
        for fillTypeIndex, fillTypeName in pairs(_G.g_fillTypeManager.fillTypeIndexToName) do
            if type(fillTypeIndex) == "number" and fillTypeName and self:isValidCropName(fillTypeName) then
             Skip if we already have this item
                if not virtualStation.prices[fillTypeName] then
                    local fillType = _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                    if fillType then
                        local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                        if priceInfo then
                            virtualStation.prices[fillTypeName] = priceInfo
                        end
                    end
                end
            end
        end
    end
    
    -- Method 4: Check economy manager for additional fill types
    if _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.sellingStations then
        for _, station in pairs(_G.g_currentMission.economyManager.sellingStations) do
            if station and station.acceptedFillTypes then
                for fillTypeIndex, accepted in pairs(station.acceptedFillTypes) do
                    if accepted and type(fillTypeIndex) == "number" then
                        local fillType = _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                        if fillType and fillType.name and self:isValidCropName(fillType.name) then
                            -- Skip if we already have this item
                            if not virtualStation.prices[fillType.name] then
                                local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                                if priceInfo then
                                    virtualStation.prices[fillType.name] = priceInfo
                                end
                            end
                        end
                    end
                end
            end
        end
    end
    
    -- Method 5: Scan production systems for input/output fill types
    if _G.g_currentMission.placeableSystem and _G.g_currentMission.placeableSystem.placeables then
        for _, placeable in pairs(_G.g_currentMission.placeableSystem.placeables) do
            if placeable and placeable.spec_productionPoint then
                local productionPoint = placeable.spec_productionPoint
                
                -- Check input fill types
                if productionPoint.inputFillTypes then
                    for fillTypeIndex, _ in pairs(productionPoint.inputFillTypes) do
                        if type(fillTypeIndex) == "number" then
                            local fillType = _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                            if fillType and fillType.name and self:isValidCropName(fillType.name) then
                                if not virtualStation.prices[fillType.name] then
                                    local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                                    if priceInfo then
                                        virtualStation.prices[fillType.name] = priceInfo
                                    end
                                end
                            end
                        end
                    end
                end
                
                -- Check output fill types
                if productionPoint.outputFillTypes then
                    for fillTypeIndex, _ in pairs(productionPoint.outputFillTypes) do
                        if type(fillTypeIndex) == "number" then
                            local fillType = _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                            if fillType and fillType.name and self:isValidCropName(fillType.name) then
                                if not virtualStation.prices[fillType.name] then
                                    local priceInfo = self:getPriceForFillType(fillTypeIndex, fillType)
                                    if priceInfo then
                                        virtualStation.prices[fillType.name] = priceInfo
                                    end
                                end
                            end
                        end
                    end
                end
            end
        end
    end
    
    -- Force-add comprehensive FS25 fill types that should exist
    local forcedItems = {
        -- Core missing items
        "SLURRY", "BUFFALO_MILK", "GOAT_MILK", "SORGHUM", "STRAWBERRIES",
        
        -- Complete milk product line
        "GOATMILK", "BUFFALOMILK", "MILK_BOTTLED", "GOATMILK_BOTTLED", "BUFFALOMILK_BOTTLED",
        "CHOCOLATE_MILK", "CONDENSED_MILK", "CHOCOLATEMILKCOW", "CHOCOLATEMILKGOAT", 
        "CHOCOLATEMILKBUFFALO",
        
        -- Animal products
        "BUFFALOMOZZARELLA", "GOATCHEESE", "LIQUIDMANURE",
        
        -- Missing crops and vegetables
        "BEETROOT", "PARSNIP", "GREENBEAN", "SPINACH", "LETTUCE", "SPRING_ONION",
        "NAPACABBAGE", "CHILLI", "GARLIC", "ENOKI", "OYSTER",
        
        -- Processed foods
        "RICEFLOUR", "CORNFLOUR", "CORNFLOUR_FINE", "CORNBREAD", "APPLEPIE",
        "POPCORN", "POPCORN_BUTTER", "KETCHUP", "YOGURT_STRAWBERRY", "DARKCHOCOLATE",
        "RICEROLLS", "FERMENTEDNAPACABBAGE", "PRESERVEDCARROTS", "PRESERVEDPARSNIP", 
        "PRESERVEDBEETROOT", "NOODLESOUP", "SOUPCANSMIXED", "SOUPCANSCARROTS",
        "SOUPCANSPARSNIP", "SOUPCANSBEETROOT", "SOUPCANSPOTATO", "JARRED_GREENBEAN",
        
        -- Construction and materials
        "WOODBEAM", "PREFABWALL", "CEMENTBRICKS", "ROOFPLATES", "CARTONROLL", 
        "PAPERROLL", "BATHTUB", "SPINACH_BAGS",
        
        -- Specialty items
        "PROPANE", "ELECTRICCHARGE", "ROADSALT", "TREESAPLINGS", "RICESAPLINGS", 
        "OILSEEDRADISH", "ALFALFA", "ALFALFA_WINDROW", "DRYALFALFA", "DRYALFALFA_WINDROW",
        "PUMPKIN", "ROUNDBALE_ALFALFA", "ROUNDBALE_DRYALFALFA", "SQUAREBALE_ALFALFA", 
        "SQUAREBALE_DRYALFALFA"
    }
    
    -- Adding forced items
    local forcedCount = 0
    for _, itemName in ipairs(forcedItems) do
        if not virtualStation.prices[itemName] then
            local defaultPrice = self:getDefaultPriceForFillType(itemName)
            if defaultPrice > 0 then
                virtualStation.prices[itemName] = {
                    price = defaultPrice,
                    basePrice = defaultPrice,
                    multiplier = 1,
                    isSpecialEvent = false
                }
                -- Mark as forced in debug info
                table.insert(debugInfo.allFillTypes, itemName .. " (forced)")
                forcedCount = forcedCount + 1
                -- Forced item added
            else
                -- No default price found
            end
        else
            -- Item already exists
        end
    end
    -- Total forced items added
    
    -- Return the station and debug info if we found any items
    if next(virtualStation.prices) then
        return virtualStation, debugInfo
    else
        return nil, debugInfo
    end
end

function EconomyDataCollector:getPriceForFillType(fillTypeIndex, fillType)
    local priceInfo = {
        price = 0,
        basePrice = 0,
        multiplier = 1,
        isSpecialEvent = false
    }
    
    -- Method 1:    -- Get base price from fill type
    if fillType.pricePerLiter and fillType.pricePerLiter > 0 then
        priceInfo.basePrice = fillType.pricePerLiter * 1000  -- Convert to per ton
    end
    
    -- Method 2: Check if fill type has economy data directly
    if fillType.economy then
        if fillType.economy.pricePerLiter and fillType.economy.pricePerLiter > 0 then
            priceInfo.basePrice = fillType.economy.pricePerLiter * 1000
        end
        if fillType.economy.basePrice and fillType.economy.basePrice > 0 then
            priceInfo.basePrice = fillType.economy.basePrice * 1000
        end
    end
    
    -- Method 3: Try to get current price from economy manager
    local currentPrice = 0
    if _G.g_currentMission.economyManager then
        -- Try getPricePerLiter
        if _G.g_currentMission.economyManager.getPricePerLiter then
            local success, price = pcall(function()
                return _G.g_currentMission.economyManager:getPricePerLiter(fillTypeIndex)
            end)
            if success and price and price > 0 then
                currentPrice = price * 1000  -- Convert to per ton
            end
        end
        
        -- Try getPrice if available
        if currentPrice == 0 and _G.g_currentMission.economyManager.getPrice then
            local success, price = pcall(function()
                return _G.g_currentMission.economyManager:getPrice(fillTypeIndex)
            end)
            if success and price and price > 0 then
                currentPrice = price * 1000
            end
        end
        
        -- Try accessing price tables directly
        if currentPrice == 0 and _G.g_currentMission.economyManager.pricePerLiter then
            local price = _G.g_currentMission.economyManager.pricePerLiter[fillTypeIndex]
            if price and price > 0 then
                currentPrice = price * 1000
            end
        end
    end
    
    -- Method 4: If we don't have a current price, try price multiplier
    if currentPrice == 0 and priceInfo.basePrice > 0 and _G.g_currentMission.economyManager then
        if _G.g_currentMission.economyManager.getPriceMultiplier then
            local success, multiplier = pcall(function()
                return _G.g_currentMission.economyManager:getPriceMultiplier(fillTypeIndex)
            end)
            if success and multiplier and multiplier > 0 then
                priceInfo.multiplier = multiplier
                currentPrice = priceInfo.basePrice * multiplier
            end
        end
        
        -- Try accessing multiplier tables directly
        if currentPrice == 0 and _G.g_currentMission.economyManager.priceMultiplier then
            local multiplier = _G.g_currentMission.economyManager.priceMultiplier[fillTypeIndex]
            if multiplier and multiplier > 0 then
                priceInfo.multiplier = multiplier
                currentPrice = priceInfo.basePrice * multiplier
            end
        end
    end
    
    -- Method 5: Check if this is a sellable fill type and has market information
    if currentPrice == 0 and _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.sellableProducts then
        local sellableProduct = _G.g_currentMission.economyManager.sellableProducts[fillTypeIndex]
        if sellableProduct and sellableProduct.pricePerLiter and sellableProduct.pricePerLiter > 0 then
            currentPrice = sellableProduct.pricePerLiter * 1000
        end
    end
    
    -- Use current price or fall back to base price
    if currentPrice > 0 then
        priceInfo.price = currentPrice
    elseif priceInfo.basePrice > 0 then
        priceInfo.price = priceInfo.basePrice
    else
        -- For fill types without prices, assign a reasonable default based on type
        priceInfo.price = self:getDefaultPriceForFillType(fillType.name)
        priceInfo.basePrice = priceInfo.price
    end
    
    -- Return priceInfo if we have any price at all
    return priceInfo.price > 0 and priceInfo or nil
end


function EconomyDataCollector:getStationPrices(station)
    if not station then
        return nil
    end
    
    local stationData = {
        name = "Unknown",
        id = station.id or 0,
        position = {x = 0, y = 0, z = 0},
        prices = {},
        isSpecialEvent = false
    }
    
    -- Get station name
    if station.getName then
        local success, name = pcall(function() return station:getName() end)
        if success and name then
            stationData.name = name
        end
    elseif station.stationName then
        stationData.name = station.stationName
    elseif station.name then
        stationData.name = station.name
    end
    
    -- Get position
    if station.rootNode then
        local success, x, y, z = pcall(getWorldTranslation, station.rootNode)
        if success and x and y and z then
            stationData.position = {x = x, y = y, z = z}
        end
    end
    
    -- Try to get prices from multiple sources
    local pricesFound = false
    
    -- Method 1: Check spec_sellingStation
    if station.spec_sellingStation then
        pricesFound = self:collectFromSellingStation(station, stationData) or pricesFound
    end
    
    -- Method 2: Check spec_animalDealer
    if station.spec_animalDealer then
        pricesFound = self:collectFromAnimalDealer(station, stationData) or pricesFound
    end
    
    -- Method 3: Check spec_productionPoint (production points that buy inputs)
    if station.spec_productionPoint then
        pricesFound = self:collectFromProductionPoint(station, stationData) or pricesFound
    end
    
    -- Method 4: Check if this is an economy manager station
    if not pricesFound and station.acceptedFillTypes then
        pricesFound = self:collectFromDirectStation(station, stationData) or pricesFound
    end
    
    return stationData
end

function EconomyDataCollector:collectFromSellingStation(station, stationData)
    local spec = station.spec_sellingStation
    local pricesFound = false
    
    -- Check for sellingStation
    if spec.sellingStation then
        local sellStation = spec.sellingStation
        
        -- Get accepted fill types
        if sellStation.acceptedFillTypes then
            for fillTypeIndex, accepted in pairs(sellStation.acceptedFillTypes) do
                if accepted then
                    local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                    if fillType and fillType.name and self:isValidCropName(fillType.name) then
                        local priceInfo = self:getStationFillTypePrice(station, sellStation, fillTypeIndex, fillType)
                        if priceInfo and priceInfo.price > 0 then
                            stationData.prices[fillType.name] = priceInfo
                            pricesFound = true
                        end
                    end
                end
            end
        end
    end
    
    -- Also check unloadingStations
    if spec.unloadingStations then
        for _, unloadingStation in pairs(spec.unloadingStations) do
            if unloadingStation and unloadingStation.acceptedFillTypes then
                for fillTypeIndex, accepted in pairs(unloadingStation.acceptedFillTypes) do
                    if accepted then
                        local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                        if fillType and fillType.name and self:isValidCropName(fillType.name) then
                            local priceInfo = self:getStationFillTypePrice(station, unloadingStation, fillTypeIndex, fillType)
                            if priceInfo and priceInfo.price > 0 then
                                stationData.prices[fillType.name] = priceInfo
                                pricesFound = true
                            end
                        end
                    end
                end
            end
        end
    end
    
    return pricesFound
end

function EconomyDataCollector:collectFromAnimalDealer(station, stationData)
    local spec = station.spec_animalDealer
    local pricesFound = false
    
    -- Animal dealers often buy/sell animals and animal products
    if spec.animals then
        for _, animalType in pairs(spec.animals) do
            if animalType and animalType.price then
                local name = animalType.name or "ANIMAL"
                if self:isValidCropName(name) then
                    stationData.prices[name] = {
                        price = animalType.price * 1000, -- Convert to per ton equivalent
                        basePrice = animalType.price * 1000,
                        multiplier = 1,
                        isSpecialEvent = false
                    }
                    pricesFound = true
                end
            end
        end
    end
    
    return pricesFound
end

function EconomyDataCollector:collectFromProductionPoint(station, stationData)
    local spec = station.spec_productionPoint
    local pricesFound = false
    
    -- Production points buy input materials - get real prices
    if spec.inputFillTypes then
        local inputCount = 0
        for _ in pairs(spec.inputFillTypes) do inputCount = inputCount + 1 end
        -- Production Point accepts input types
        
        for fillTypeIndex, _ in pairs(spec.inputFillTypes) do
            local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
            if fillType and fillType.name and self:isValidCropName(fillType.name) then
                -- Try to get actual production point pricing first
                local priceInfo = self:getProductionPointPrice(station, fillTypeIndex, fillType)
                
                -- If no specific price found, use reasonable market-competitive estimation
                if not priceInfo or priceInfo.price <= 0 then
                    local basePrice = 0
                    if fillType.pricePerLiter then
                        basePrice = fillType.pricePerLiter * 1000
                    end
                    
                    -- Get current market price from economy manager for competitive pricing
                    local marketPrice = basePrice
                    if _G.g_currentMission.economyManager and _G.g_currentMission.economyManager.getPricePerLiter then
                        local success, currentPrice = pcall(function()
                            return _G.g_currentMission.economyManager:getPricePerLiter(fillTypeIndex)
                        end)
                        if success and currentPrice and currentPrice > 0 then
                            marketPrice = currentPrice * 1000
                        end
                    end
                    
                    -- Production points should pay competitive prices (80-90% of market rate)
                    local productionPrice = marketPrice * 0.85
                    
                    if productionPrice > 0 then
                        priceInfo = {
                            price = productionPrice,
                            basePrice = marketPrice,
                            multiplier = 0.85,
                            isSpecialEvent = false
                        }
                    end
                end
                
                if priceInfo and priceInfo.price > 0 then
                    -- Production Point will pay price for fill type
                    stationData.prices[fillType.name] = priceInfo
                    pricesFound = true
                else
                    -- Production Point - no valid price for fill type
                end
            end
        end
    end
    
    -- Also check if this production point has selling capabilities (unloading stations)
    if spec.unloadingStation and spec.unloadingStation.acceptedFillTypes then
        for fillTypeIndex, accepted in pairs(spec.unloadingStation.acceptedFillTypes) do
            if accepted then
                local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                if fillType and fillType.name and self:isValidCropName(fillType.name) then
                    local priceInfo = self:getStationFillTypePrice(station, spec.unloadingStation, fillTypeIndex, fillType)
                    if priceInfo and priceInfo.price > 0 then
                        stationData.prices[fillType.name] = priceInfo
                        pricesFound = true
                    end
                end
            end
        end
    end
    
    return pricesFound
end

function EconomyDataCollector:getProductionPointPrice(station, fillTypeIndex, fillType)
    local spec = station.spec_productionPoint
    if not spec then
        return nil
    end
    
    local priceInfo = {
        price = 0,
        basePrice = 0,
        multiplier = 1,
        isSpecialEvent = false
    }
    
    -- Method 1: Check if production point has specific input prices
    if spec.inputFillTypePrices and spec.inputFillTypePrices[fillTypeIndex] then
        priceInfo.price = spec.inputFillTypePrices[fillTypeIndex] * 1000
        priceInfo.basePrice = priceInfo.price
        return priceInfo
    end
    
    -- Method 2: Check if production point has price multipliers for inputs
    if spec.inputFillTypeMultipliers and spec.inputFillTypeMultipliers[fillTypeIndex] then
        local multiplier = spec.inputFillTypeMultipliers[fillTypeIndex]
        if fillType.pricePerLiter and fillType.pricePerLiter > 0 then
            priceInfo.basePrice = fillType.pricePerLiter * 1000
            priceInfo.price = priceInfo.basePrice * multiplier
            priceInfo.multiplier = multiplier
            return priceInfo
        end
    end
    
    -- Method 3: Check if the production point has specific selling station prices
    if spec.sellingStation then
        local sellingStation = spec.sellingStation
        if sellingStation.acceptedFillTypes and sellingStation.acceptedFillTypes[fillTypeIndex] then
            return self:getStationFillTypePrice(station, sellingStation, fillTypeIndex, fillType)
        end
    end
    
    -- Method 4: Try economy manager pricing for this production point
    if _G.g_currentMission.economyManager then
        local success, price = pcall(function()
            return _G.g_currentMission.economyManager:getPricePerLiter(fillTypeIndex)
        end)
        if success and price and price > 0 then
            -- Production points typically offer market price or slightly less
            priceInfo.price = price * 1000 * 0.95
            priceInfo.basePrice = price * 1000
            priceInfo.multiplier = 0.95
            return priceInfo
        end
    end
    
    return nil
end

function EconomyDataCollector:collectFromDirectStation(station, stationData)
    local pricesFound = false
    
    if station.acceptedFillTypes then
        for fillTypeIndex, accepted in pairs(station.acceptedFillTypes) do
            if accepted then
                local fillType = _G.g_fillTypeManager and _G.g_fillTypeManager:getFillTypeByIndex(fillTypeIndex)
                if fillType and fillType.name and self:isValidCropName(fillType.name) then
                    local priceInfo = self:getStationFillTypePrice(station, station, fillTypeIndex, fillType)
                    if priceInfo and priceInfo.price > 0 then
                        stationData.prices[fillType.name] = priceInfo
                        pricesFound = true
                    end
                end
            end
        end
    end
    
    return pricesFound
end

function EconomyDataCollector:getStationFillTypePrice(station, unloadingStation, fillTypeIndex, fillType)
    local priceInfo = {
        price = 0,
        basePrice = 0,
        multiplier = 1,
        isSpecialEvent = false
    }
    
    -- Get base price from fill type
    if fillType.pricePerLiter then
        priceInfo.basePrice = fillType.pricePerLiter * 1000  -- Convert to per ton
    end
    
    -- Method 1: Try to get effective price per liter
    if unloadingStation and unloadingStation.getEffectiveFillTypePrice then
        local success, price = pcall(function()
            return unloadingStation:getEffectiveFillTypePrice(fillTypeIndex)
        end)
        if success and price and price > 0 then
            priceInfo.price = price * 1000  -- Convert to per ton
            if priceInfo.basePrice > 0 then
                priceInfo.multiplier = priceInfo.price / priceInfo.basePrice
            end
            return priceInfo
        end
    end
    
    -- Method 2: Try getCurrentPricePerLiter on station
    if station.getCurrentPricePerLiter then
        local success, price = pcall(function()
            return station:getCurrentPricePerLiter(fillTypeIndex)
        end)
        if success and price and price > 0 then
            priceInfo.price = price * 1000  -- Convert to per ton
            if priceInfo.basePrice > 0 then
                priceInfo.multiplier = priceInfo.price / priceInfo.basePrice
            end
            return priceInfo
        end
    end
    
    -- Method 3: Check for price multipliers
    if unloadingStation then
        local multiplier = 1
        
        -- Check for price multiplier
        if unloadingStation.fillTypePriceMultipliers and unloadingStation.fillTypePriceMultipliers[fillTypeIndex] then
            multiplier = unloadingStation.fillTypePriceMultipliers[fillTypeIndex]
        elseif unloadingStation.priceMultipliers and unloadingStation.priceMultipliers[fillTypeIndex] then
            multiplier = unloadingStation.priceMultipliers[fillTypeIndex]
        end
        
        -- Check for current prices
        if unloadingStation.fillTypePrices and unloadingStation.fillTypePrices[fillTypeIndex] then
            priceInfo.price = unloadingStation.fillTypePrices[fillTypeIndex] * 1000
        elseif priceInfo.basePrice > 0 then
            priceInfo.price = priceInfo.basePrice * multiplier
        end
        
        priceInfo.multiplier = multiplier
    end
    
    -- Method 4: Check station's spec_sellingStation
    if priceInfo.price == 0 and station.spec_sellingStation then
        local spec = station.spec_sellingStation
        
        -- Check for prices in the spec
        if spec.fillTypePrices and spec.fillTypePrices[fillTypeIndex] then
            priceInfo.price = spec.fillTypePrices[fillTypeIndex] * 1000
        end
        
        -- Check for special events
        if spec.currentSpecialEvent and spec.currentSpecialEvent.fillType == fillTypeIndex then
            priceInfo.isSpecialEvent = true
            if spec.currentSpecialEvent.priceMultiplier then
                priceInfo.multiplier = spec.currentSpecialEvent.priceMultiplier
                if priceInfo.basePrice > 0 then
                    priceInfo.price = priceInfo.basePrice * priceInfo.multiplier
                end
            end
        end
    end
    
    -- Method 5: Use economy manager pricing if available
    if priceInfo.price == 0 and priceInfo.basePrice > 0 and _G.g_currentMission.economyManager then
        local success, multiplier = pcall(function()
            return _G.g_currentMission.economyManager:getPriceMultiplier(fillTypeIndex)
        end)
        if success and multiplier and multiplier > 0 then
            priceInfo.price = priceInfo.basePrice * multiplier
            priceInfo.multiplier = multiplier
        else
            -- Fallback to base price
            priceInfo.price = priceInfo.basePrice
        end
    end
    
    
    return priceInfo
end

function EconomyDataCollector:isValidCropName(name)
    if not name or type(name) ~= "string" or name == "" then
        return false
    end
    
    -- Skip items that are clearly not crops/products
    local skipPatterns = {
        "^BIGBAG", "^BIG_BAG", "BIGBAG$", "BIG_BAG$",
        "^PALLET", "^PALETTE", "PALLET$", "PALETTE$",
        "^UNKNOWN$", "^EMPTY$", "^NONE$", "^NULL$",
        "^TEST", "^DEBUG", "^TEMP", "PLACEHOLDER",
        "^[0-9]+$" -- Skip pure numbers
    }
    
    local upperName = string.upper(name)
    
    for _, pattern in ipairs(skipPatterns) do
        if string.find(upperName, pattern) then
            return false
        end
    end
    
    -- Skip very long names that look problematic (increased threshold)
    if string.len(name) > 40 then
        return false
    end
    
    -- Only skip names with excessive consecutive capitals (more lenient)
    if string.find(name, "[A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z]") then
        return false
    end
    
    return true
end

function EconomyDataCollector:getDefaultPriceForFillType(fillTypeName)
    if not fillTypeName or type(fillTypeName) ~= "string" then
        return 0
    end
    
    local upperName = string.upper(fillTypeName)
    
    -- Crops - base prices per 1000L
    local cropPrices = {
        WHEAT = 800, BARLEY = 750, OAT = 700, CANOLA = 1200, SUNFLOWER = 950,
        SOYBEAN = 1100, SOYBEANS = 1100, CORN = 850, SUGARBEET = 450, COTTON = 1500, 
        SUGARCANE = 500, SORGHUM = 900, RICE = 1000, LONG_GRAIN_RICE = 1050, 
        POTATO = 600, ONION = 800, CARROT = 700, PARSNIP = 650, BEETROOT = 550, 
        REDCABBAGE = 400, LETTUCE = 1200, STRAWBERRIES = 2500, STRAWBERRY = 2500, 
        TOMATO = 1800, SPINACH = 1500, CABBAGE = 900, GREEN_BEANS = 1300
    }
    
    -- Products - processed goods prices
    local productPrices = {
        FLOUR = 1200, BREAD = 2000, SUGAR = 1500, CANOLAOIL = 2200, SUNFLOWEROIL = 2100,
        OLIVEOIL = 2800, BUTTER = 4500, CHEESE = 5000, FABRIC = 3500, CLOTHES = 8000,
        RAISINS = 6000, MILK = 1000, GOATMILK = 1200, GOAT_MILK = 1200, BUFFALOMILK = 1400, 
        BUFFALO_MILK = 1400, SHEEP_MILK = 1150,
        COW_MILK_BOTTLED = 1100, GOAT_MILK_BOTTLED = 1300, BUFFALO_MILK_BOTTLED = 1500, 
        SHEEP_MILK_BOTTLED = 1250, EGG = 2200, WOOL = 3500, HONEY = 4500, BOARDS = 800, 
        FURNITURE = 4000, GRAPE_JUICE = 1800, POTATO_CHIPS = 2800, SPINACH_BAG = 2000,
        RICE_FLOUR = 1300, BUFFALO_MOZZARELLA = 5500, GOAT_CHEESE = 6000, 
        TRIPLE_SOUP = 3200, CARROT_SOUP = 2800
    }
    
    -- Slurry and manure
    local wastePrices = {
        SLURRY = 50, LIQUIDMANURE = 45, LIQUID_MANURE = 45, MANURE = 40, DIGESTATE = 60
    }
    
    -- Fertilizers and chemicals
    local fertilizerPrices = {
        FERTILIZER = 1200, LIQUIDFERTILIZER = 1300, LIQUID_FERTILIZER = 1300, LIME = 200, 
        SEEDS = 1500, HERBICIDE = 2500, LIQUIDHERBICIDE = 2600, LIQUID_HERBICIDE = 2600,
        PESTICIDE = 2800, FUNGICIDE = 3000
    }
    
    -- Fuels and materials
    local fuelPrices = {
        DIESEL = 1400, ELECTRICCHARGE = 300, ELECTRIC_CHARGE = 300, METHANE = 900, WATER = 5,
        WOODCHIPS = 150, WOOD_CHIPS = 150, STONE = 25, SAND = 30, SALT = 200, CONCRETE = 400
    }
    
    -- Animal feed
    local feedPrices = {
        GRASS_WINDROW = 120, HAY = 180, SILAGE = 200, CHAFF = 100, STRAW = 150,
        TOTALMIXEDRATION = 250, PIGFEED = 600, HORSEFEED = 800
    }
    
    -- Check each category
    for name, price in pairs(cropPrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    for name, price in pairs(productPrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    for name, price in pairs(wastePrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    for name, price in pairs(fertilizerPrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    for name, price in pairs(fuelPrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    for name, price in pairs(feedPrices) do
        if string.find(upperName, name) then
            return price
        end
    end
    
    -- Default fallback based on item type patterns
    if string.find(upperName, "MILK") then
        return 1100
    elseif string.find(upperName, "OIL") then
        return 2200
    elseif string.find(upperName, "SEED") then
        return 1500
    elseif string.find(upperName, "FERTILIZER") then
        return 1200
    elseif string.find(upperName, "FEED") then
        return 400
    elseif string.find(upperName, "WOOD") then
        return 150
    elseif string.find(upperName, "MANURE") or string.find(upperName, "SLURRY") then
        return 50
    else
        return 500  -- Generic fallback price
    end
end