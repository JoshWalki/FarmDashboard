export function showEconomySection() {
  const economyHTML = `
          <div class="row mb-4">
              <div class="col-12 text-center">
                  <h2 class="text-farm-accent">
                      <i class="bi bi-graph-up me-2"></i>
                      Economic Dashboard
                  </h2>
                  <p class="lead text-muted">Monitor your finances, purchases, and market prices</p>
              </div>
          </div>

          <div class="row mb-4">
              <div class="col-md-3">
                  <div class="card bg-farm-primary text-white border-0">
                      <div class="card-body text-center">
                          <h5 class="card-title">
                              <i class="bi bi-cash-stack me-2"></i>Current Money
                          </h5>
                          <h2 class="display-4" id="current-money">$0</h2>
                          <small class="text-light opacity-75">Available funds</small>
                      </div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="card bg-success text-white border-0">
                      <div class="card-body text-center">
                          <h5 class="card-title">
                              <i class="bi bi-cart me-2"></i>Total Purchases
                          </h5>
                          <h2 class="display-4" id="total-purchases">$0</h2>
                          <small class="text-light opacity-75">Equipment value</small>
                      </div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="card bg-warning border-0">
                      <div class="card-body text-center">
                          <h5 class="card-title">
                              <i class="bi bi-exclamation-triangle me-2"></i>Outstanding Loan
                          </h5>
                          <h2 class="display-4" id="outstanding-loan">$0</h2>
                          <small class="opacity-75">Current debt</small>
                      </div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="card bg-info text-white border-0">
                      <div class="card-body text-center">
                          <h5 class="card-title">
                              <i class="bi bi-calculator me-2"></i>Net Worth
                          </h5>
                          <h2 class="display-4" id="net-worth">$0</h2>
                          <small class="text-light opacity-75">Assets - debt</small>
                      </div>
                  </div>
              </div>
          </div>

          <ul class="nav nav-tabs mb-4" id="economyTabs" role="tablist">
              <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="purchases-tab" data-bs-toggle="tab" data-bs-target="#purchases" type="button" role="tab">
                      <i class="bi bi-cart-fill me-1"></i> Equipment Purchases
                  </button>
              </li>
              <li class="nav-item" role="presentation">
                  <button class="nav-link" id="market-tab" data-bs-toggle="tab" data-bs-target="#market" type="button" role="tab">
                      <i class="bi bi-graph-up me-1"></i> Market Prices
                  </button>
              </li>
          </ul>

          <div class="tab-content" id="economyTabContent">
              <div class="tab-pane fade show active" id="purchases" role="tabpanel">
                  <div class="row mb-3">
                      <div class="col-md-6">
                          <div class="btn-group" role="group">
                              <button class="btn btn-outline-primary active" onclick="dashboard.filterPurchases('all')">
                                  <i class="bi bi-grid-3x3"></i> All Equipment
                              </button>
                              <button class="btn btn-outline-success" onclick="dashboard.filterPurchases('vehicles')">
                                  <i class="bi bi-truck"></i> Vehicles
                              </button>
                              <button class="btn btn-outline-info" onclick="dashboard.filterPurchases('implements')">
                                  <i class="bi bi-tools"></i> Implements
                              </button>
                          </div>
                      </div>
                      <div class="col-md-6 text-end">
                          <div class="btn-group" role="group">
                              <button class="btn btn-outline-secondary" onclick="dashboard.sortPurchases('price')">
                                  <i class="bi bi-sort-numeric-down"></i> Price
                              </button>
                              <button class="btn btn-outline-secondary" onclick="dashboard.sortPurchases('age')">
                                  <i class="bi bi-calendar"></i> Age
                              </button>
                              <button class="btn btn-outline-secondary" onclick="dashboard.sortPurchases('name')">
                                  <i class="bi bi-sort-alpha-down"></i> Name
                              </button>
                          </div>
                      </div>
                  </div>

                  <div class="row" id="purchases-list">
                      <div class="col-12 text-center p-5">
                          <div class="spinner-border text-primary" role="status">
                              <span class="visually-hidden">Loading purchases...</span>
                          </div>
                          <p class="mt-3 text-muted">Loading equipment data...</p>
                      </div>
                  </div>
              </div>

              <div class="tab-pane fade" id="market" role="tabpanel">
                  <div class="row mb-3">
                      <div class="col-12">
                          <div class="input-group">
                              <span class="input-group-text bg-secondary border-secondary">
                                  <i class="bi bi-search"></i>
                              </span>
                              <input type="text" class="form-control bg-secondary border-secondary text-white"
                                     id="crop-search" placeholder="Search crops or locations..."
                                     onkeyup="dashboard.searchMarket(this.value)">
                          </div>
                      </div>
                  </div>

                  <div id="market-prices">
                      <div class="text-center p-5">
                          <div class="spinner-border text-primary" role="status">
                              <span class="visually-hidden">Loading market data...</span>
                          </div>
                          <p class="mt-3 text-muted">Loading crop prices...</p>
                      </div>
                  </div>
              </div>
          </div>
      `;

  document.getElementById("section-content").innerHTML = economyHTML;
  document.getElementById("section-content").classList.remove("d-none");

  // Load economy data
  this.loadEconomyData();
}

export async function loadEconomyData() {
  try {
    const apiBaseURL = this.getAPIBaseURL();

    // Load main data for finances
    const dataResponse = await fetch(`${apiBaseURL}/api/data`);

    if (dataResponse.ok) {
      const data = await dataResponse.json();
      this.updateFinancialSummary(data);
      this.updatePurchasesList(data.vehicles || []);
    }

    // Try to load economy data, but don't fail if it's not available
    try {
      const economyResponse = await fetch(`${apiBaseURL}/api/economy`);
      if (economyResponse.ok) {
        const economyData = await economyResponse.json();
        this.updateMarketPrices(economyData);
      } else {
        // Economy data not available yet, show placeholder
        this.showMarketPricesPlaceholder();
      }
    } catch (economyError) {
      console.warn("[Economy] Market data not available yet:", economyError);
      this.showMarketPricesPlaceholder();
    }
  } catch (error) {
    console.error("[Economy] Error loading financial data:", error);
  }
}

export function showMarketPricesPlaceholder() {
  const marketContainer = document.getElementById("market-prices");
  if (!marketContainer) return;

  marketContainer.innerHTML = `
    <div class="text-center p-5">
      <i class="bi bi-graph-up text-muted" style="font-size: 3rem;"></i>
      <h5 class="text-muted mt-3">Market Data Coming Soon</h5>
      <p class="text-muted">Economy data collection is being optimized and will be available in a future update.</p>
      <small class="text-muted">Financial summary and equipment purchases are working normally.</small>
    </div>
  `;
}

export function updateFinancialSummary(data) {
  let money = 0;
  let loan = 0;
  let totalPurchases = 0;
  let netWorth = 0;

  // Grab the universally active Farm ID from the Dashboard
  const activeFarmId = window.dashboard.activeFarmId || 1;
  let activeFarm = null;
  
  if (data.farmInfo && Array.isArray(data.farmInfo)) {
      activeFarm = data.farmInfo.find(farm => farm.id === activeFarmId);
  }

  // Extract the specific farm's money and loan
  if (activeFarm) {
      money = activeFarm.money || 0;
      loan = activeFarm.loan || 0;
  } else if (data.money !== undefined) {
      money = data.money || 0;
      loan = data.loan || 0;
  }

  // Calculate Equipment Value explicitly for this Farm
  totalPurchases = this.calculateTotalPurchases(data.vehicles || [], activeFarmId);
  
  // Note: If you add buildings/animals to the advanced finance module later, 
  // you will want to filter those by activeFarmId as well!
  if (data.finance && typeof data.finance === "object") {
      totalPurchases += (data.finance.buildings?.totalValue || 0) + 
                        (data.finance.animals?.totalValue || 0) + 
                        (data.finance.land?.totalValue || 0);
  }

  netWorth = money + totalPurchases - loan;

  document.getElementById("current-money").textContent = this.formatCurrency(money);
  document.getElementById("total-purchases").textContent = this.formatCurrency(totalPurchases);
  document.getElementById("outstanding-loan").textContent = this.formatCurrency(loan);
  document.getElementById("net-worth").textContent = this.formatCurrency(netWorth);
}

export function calculateTotalPurchases(vehicles, targetFarmId = 1) {
  return vehicles
    .filter((v) => v.ownerFarmId === targetFarmId) // Only count vehicles owned by the selected farm
    .reduce((total, vehicle) => total + (vehicle.price || 0), 0);
}

export function updatePurchasesList(vehicles) {
  const purchasesContainer = document.getElementById("purchases-list");
  if (!purchasesContainer) return;

  // Use the global activeFarmId instead of hardcoding 1
  const activeFarmId = window.dashboard.activeFarmId || 1;
  const ownedVehicles = vehicles.filter((v) => v.ownerFarmId === activeFarmId);

  if (ownedVehicles.length === 0) {
    purchasesContainer.innerHTML = `
      <div class="col-12 text-center p-5">
        <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
        <p class="mt-3 text-muted">No equipment purchases found</p>
      </div>
    `;
    return;
  }

  let html = "";
  ownedVehicles.forEach((vehicle) => {
    const condition = this.calculateCondition(vehicle.damage || 0);
    const age = vehicle.age || 0;

    html += `
      <div class="col-md-6 col-lg-4 mb-4 purchase-card" data-type="${
        vehicle.vehicleType || "unknown"
      }" data-price="${vehicle.price || 0}" data-age="${age}">
        <div class="card bg-secondary h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi ${this.getVehicleIcon(
                vehicle.vehicleType
              )} text-primary"></i>
              ${vehicle.name || "Unknown"}
            </h6>
            <span class="badge bg-primary">${
              vehicle.brand?.title || "Unknown"
            }</span>
          </div>
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-6">
                <small class="text-muted">Purchase Price:</small><br>
                <strong class="text-success">${this.formatCurrency(
                  vehicle.price || 0
                )}</strong>
              </div>
              <div class="col-6">
                <small class="text-muted">Type:</small><br>
                <strong>${
                  vehicle.typeName || vehicle.vehicleType || "Unknown"
                }</strong>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-6">
                <small class="text-muted">Age:</small><br>
                <strong>${age} months</strong>
              </div>
              <div class="col-6">
                <small class="text-muted">Condition:</small><br>
                <span class="badge ${condition.class}">${
      condition.text
    }</span>
              </div>
            </div>
            ${
              vehicle.operatingTime
                ? `
              <div class="mt-2">
                <small class="text-muted">Operating Hours:</small><br>
                <strong>${Math.round(
                  (vehicle.operatingTime || 0) / 3600000
                )}h</strong>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  });

  purchasesContainer.innerHTML = html;
}

export function updateMarketPrices(economyData) {
  const marketContainer = document.getElementById("market-prices");
  if (!marketContainer) return;

  console.log("[Economy] Processing economy data:", economyData);

  // Check for new market prices structure
  if (economyData.marketPrices && economyData.marketPrices.crops) {
    this.displayMarketPrices(economyData.marketPrices);
    return;
  }
  
  // Fallback to old structure
  console.log("[Economy] fillTypePrices keys:", economyData.fillTypePrices ? Object.keys(economyData.fillTypePrices) : "none");

  if (
    !economyData.fillTypePrices ||
    Object.keys(economyData.fillTypePrices).length === 0
  ) {
    marketContainer.innerHTML = `
      <div class="text-center p-5">
        <i class="bi bi-graph-up text-muted" style="font-size: 3rem;"></i>
        <h5 class="text-muted mt-3">No Market Data Available</h5>
        <p class="text-muted">Make sure FS25 is running with the economy data being collected.</p>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';

  // Group items by comprehensive FS25 categories
  const crops = {};
  const products = {};
  const greenery = {};
  const greenhouse = {};
  const others = {};
  const yieldBoost = {};

  Object.entries(economyData.fillTypePrices).forEach(([name, priceInfo]) => {
    // Filter out big bag and pallet types - check various formats
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes("BIGBAG") || nameUpper.includes("BIG_BAG") || nameUpper.includes("BIG BAG") ||
        nameUpper.includes("PALLET") || nameUpper.includes("PALETTE") || nameUpper.includes("PALLETE") ||
        name.toLowerCase().includes("big bag") || name.toLowerCase().includes("pallet")) {
      console.log(`[Economy] Filtering out item: ${name}`);
      return; // Skip this item
    }
    
    // Categorize based on FS25 Icon Overview
    if ([
      "WHEAT", "BARLEY", "OAT", "CANOLA", "SORGHUM", "CORN", "MAIZE", "SUGAR_BEET", "SUGARBEET", "POTATO", "POTATOES",
      "GRASS", "COTTON", "SUNFLOWER", "SUGARCANE", "OLIVES", "OLIVE", "GRAPES", "GRAPE", "CARROTS", "CARROT", "PARSNIPS", "PARSNIP",
      "RED_BEET", "PEAS", "PEA", "SPINACH", "GREEN_BEANS", "SOYBEANS", "SOYBEAN", "LONG_GRAIN_RICE", "RICE"
    ].includes(nameUpper)) {
      crops[name] = priceInfo;
    } else if ([
      "FLOUR", "BREAD", "CHEESE", "BUFFALO_MOZZARELLA", "GOAT_CHEESE", "BUTTER", "CHOCOLATE", "OLIVE_OIL", "CANOLA_OIL",
      "SUNFLOWER_OIL", "RICE_OIL", "GRAPE_JUICE", "RAISINS", "CEREAL", "POTATO_CHIPS", "SPINACH_BAG", "RICE_FLOUR", "RICE_BOXES", "RICE_BAGS",
      "FABRIC", "CLOTHES", "CAKE", "CANNED_PEAS", "TRIPLE_SOUP", "CARROT_SOUP", "PARSNIP_SOUP", "RED_BEET_SOUP", "POTATO_SOUP",
      "NOODLE_SOUP", "JARRED_GREEN_BEANS", "KIMCHI", "PRESERVED_FOOD_CARROTS", "PRESERVED_FOOD_PARSNIPS", "PRESERVED_FOOD_RED_BEET",
      "CEMENT_BRICKS", "CEMENT_BAGS", "PLANKS", "PLANKS_LONG", "WOOD_BEAMS", "FURNITURE", "BATHTUB", "BUCKET", "BARREL", "ROPE",
      "CARTON_ROLL", "PAPER_ROLL", "PREFAB_WALL", "ROOF_PLATE", "PIANO", "TOY_TRACTOR", "WAGON",
      "MILK", "COW_MILK", "COW_MILK_BOTTLED", "BUFFALO_MILK", "BUFFALO_MILK_BOTTLED", "GOAT_MILK", "GOAT_MILK_BOTTLED",
      "EGGS", "EGG", "WOOL", "HONEY", "PIG_FOOD", "WATER", "MINERAL_FEED", "MINERAL_MIXED_RATION", "FORAGE",
      "CREAM", "KEFIR", "YOGURT", "PIZZA", "SUGAR", "LEMON", "ORANGE", "PEAR", "PLUM", "APPLE"
    ].includes(nameUpper)) {
      products[name] = priceInfo;
    } else if ([
      "GRASS", "HAY", "STRAW", "WOOD_CHIPS", "WOODCHIPS", "SILAGE", "GRASS_CUT", "HAY_ROUND", "STRAW_ROUND",
      "WOOD_ROUND_BALE", "SILAGE_ROUND_BALE", "COTTON_ROUND_BALE", "GRASS_SQUARE_BALE", "HAY_SQUARE_BALE", "STRAW_SQUARE_BALE",
      "SILAGE_SQUARE_BALE", "COTTON_SQUARE_BALE", "WHEAT_SWATH", "BARLEY_SWATH", "OAT_SWATH", "CANOLA_SWATH", "SORGHUM_SWATH",
      "SOYBEAN_SWATH", "SUGAR_BEET_CUT", "CHAFF", "FIR_TREE", "POPLAR", "TREE", "WOOD", "FORAGE_MIXING"
    ].includes(nameUpper)) {
      greenery[name] = priceInfo;
    } else if ([
      "STRAWBERRIES", "LETTUCE", "TOMATOES", "TOMATO", "CABBAGE", "SPRING_ONIONS", "SPRING_ONION", "GARLIC",
      "OYSTER_MUSHROOM", "OYSTER", "ENOKI", "CHILI_PEPPERS", "CHILLI", "RICE_SAPLINGS"
    ].includes(nameUpper)) {
      greenhouse[name] = priceInfo;
    } else if ([
      "MANURE", "SLURRY", "OILSEED_RADISH", "LIME", "SOLID_FERTILIZER", "LIQUID_FERTILIZER", "HERBICIDE",
      "SILAGE_ADDITIVE", "DIGESTATE"
    ].includes(nameUpper)) {
      yieldBoost[name] = priceInfo;
    } else if ([
      "SEEDS", "STONES", "STONE", "SNOW", "ROAD_SALT", "DIESEL", "DEF", "ELECTRIC_CHARGE", "METHANE",
      "BALE_WRAP", "BALE_TWINE", "BALE_NET", "CEMENT", "BOARDS", "PLANKS"
    ].includes(nameUpper)) {
      others[name] = priceInfo;
    } else {
      // If not categorized, put in others
      others[name] = priceInfo;
    }
  });

  // Display Crops
  if (Object.keys(crops).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-flower1 text-success"></i> Crops</h4></div>';
    Object.entries(crops).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  // Display Products
  if (Object.keys(products).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-box-seam text-warning"></i> Products</h4></div>';
    Object.entries(products).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  // Display Greenery
  if (Object.keys(greenery).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-tree text-success"></i> Greenery</h4></div>';
    Object.entries(greenery).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  // Display Greenhouse
  if (Object.keys(greenhouse).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-house-gear text-primary"></i> Greenhouse</h4></div>';
    Object.entries(greenhouse).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  // Display Yield Boost
  if (Object.keys(yieldBoost).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-arrow-up-circle text-success"></i> Yield Boost</h4></div>';
    Object.entries(yieldBoost).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  // Display Others
  if (Object.keys(others).length > 0) {
    html +=
      '<div class="col-12 mb-4"><h4><i class="bi bi-box text-info"></i> Others</h4></div>';
    Object.entries(others).forEach(([name, priceInfo]) => {
      html += this.createPriceCard(name, priceInfo);
    });
  }

  html += "</div>";
  marketContainer.innerHTML = html;
}

export function displayMarketPrices(marketData) {
  const marketContainer = document.getElementById("market-prices");
  if (!marketContainer) return;
  
  console.log("[Economy] Displaying market prices:", marketData);
  
  if (!marketData.crops || Object.keys(marketData.crops).length === 0) {
    marketContainer.innerHTML = `
      <div class="text-center p-5">
        <i class="bi bi-graph-up text-muted" style="font-size: 3rem;"></i>
        <h5 class="text-muted mt-3">No Market Data Available</h5>
        <p class="text-muted">Waiting for market data from the game...</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  // Create tabs for different views
  html += `
    <ul class="nav nav-tabs mb-3" id="marketTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="by-crop-tab" data-bs-toggle="tab" data-bs-target="#by-crop" type="button" role="tab">
          <i class="bi bi-flower1"></i> By Crop
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="by-location-tab" data-bs-toggle="tab" data-bs-target="#by-location" type="button" role="tab">
          <i class="bi bi-geo-alt"></i> By Location
        </button>
      </li>
    </ul>
  `;
  
  html += '<div class="tab-content" id="marketTabContent">';
  
  // By Crop Tab
  html += '<div class="tab-pane fade show active" id="by-crop" role="tabpanel">';
  
  // Filter out livestock animals (but keep livestock products) 
  const livestockAnimals = [
    "COW_ANGUS", "COW_SWISS_BROWN", "BULL_ANGUS", "BULL_SWISS_BROWN",
    "PIG_BLACK_PIED", "BOAR_BLACK_PIED", 
    "SHEEP_BLACK_WELSH", "RAM_BLACK_WELSH",
    "GOAT", "HORSE", "CHICKEN", "ROOSTER"
  ];
  const filteredCrops = Object.entries(marketData.crops).filter(([cropName]) => 
    !livestockAnimals.includes(cropName.toUpperCase())
  );
  
  // Categorize items based on FS25 structure
  const categories = {
    crops: { name: "Crops", icon: "bi-flower1", color: "text-success", items: {} },
    products: { name: "Products", icon: "bi-box-seam", color: "text-warning", items: {} },
    greenery: { name: "Greenery", icon: "bi-tree", color: "text-success", items: {} },
    greenhouse: { name: "Greenhouse", icon: "bi-house-gear", color: "text-primary", items: {} },
    yieldBoost: { name: "Yield Boost", icon: "bi-arrow-up-circle", color: "text-success", items: {} },
    others: { name: "Others", icon: "bi-box", color: "text-info", items: {} }
  };
  
  filteredCrops.forEach(([cropName, cropData]) => {
    const nameUpper = cropName.toUpperCase();
    
    if ([
      "WHEAT", "BARLEY", "OAT", "CANOLA", "SORGHUM", "CORN", "MAIZE", "SUGAR_BEET", "SUGARBEET", "POTATO", "POTATOES",
      "COTTON", "SUNFLOWER", "SUGARCANE", "OLIVES", "OLIVE", "GRAPES", "GRAPE", "CARROTS", "CARROT", "PARSNIPS", "PARSNIP",
      "RED_BEET", "PEAS", "PEA", "SPINACH", "GREEN_BEANS", "SOYBEANS", "SOYBEAN", "LONG_GRAIN_RICE", "RICE"
    ].includes(nameUpper)) {
      categories.crops.items[cropName] = cropData;
    } else if ([
      "FLOUR", "BREAD", "CHEESE", "BUFFALO_MOZZARELLA", "GOAT_CHEESE", "BUTTER", "CHOCOLATE", "OLIVE_OIL", "CANOLA_OIL",
      "SUNFLOWER_OIL", "RICE_OIL", "GRAPE_JUICE", "RAISINS", "CEREAL", "POTATO_CHIPS", "SPINACH_BAG", "RICE_FLOUR", "RICE_BOXES", "RICE_BAGS",
      "FABRIC", "CLOTHES", "CAKE", "CANNED_PEAS", "TRIPLE_SOUP", "CARROT_SOUP", "PIZZA", "SUGAR", "LEMON", "ORANGE", "PEAR", "PLUM", "APPLE",
      "MILK", "COW_MILK", "COW_MILK_BOTTLED", "BUFFALO_MILK", "BUFFALO_MILK_BOTTLED", "GOAT_MILK", "GOAT_MILK_BOTTLED",
      "EGGS", "EGG", "WOOL", "HONEY", "WATER", "CREAM", "KEFIR", "YOGURT"
    ].includes(nameUpper)) {
      categories.products.items[cropName] = cropData;
    } else if ([
      "GRASS", "HAY", "STRAW", "WOOD_CHIPS", "WOODCHIPS", "SILAGE", "CHAFF", "TREE", "WOOD", "POPLAR"
    ].includes(nameUpper)) {
      categories.greenery.items[cropName] = cropData;
    } else if ([
      "STRAWBERRIES", "LETTUCE", "TOMATOES", "TOMATO", "CABBAGE", "SPRING_ONIONS", "SPRING_ONION", "GARLIC",
      "OYSTER_MUSHROOM", "OYSTER", "ENOKI", "CHILI_PEPPERS", "CHILLI", "RICE_SAPLINGS"
    ].includes(nameUpper)) {
      categories.greenhouse.items[cropName] = cropData;
    } else if ([
      "MANURE", "SLURRY", "OILSEED_RADISH", "LIME", "SOLID_FERTILIZER", "LIQUID_FERTILIZER", "HERBICIDE",
      "SILAGE_ADDITIVE", "DIGESTATE"
    ].includes(nameUpper)) {
      categories.yieldBoost.items[cropName] = cropData;
    } else {
      categories.others.items[cropName] = cropData;
    }
  });
  
  // Start the grid row
  html += '<div class="row">';
  
  // Display each category
  Object.entries(categories).forEach(([categoryKey, category]) => {
    if (Object.keys(category.items).length > 0) {
      html += `<div class="col-12 mb-4"><h4><i class="bi ${category.icon} ${category.color}"></i> ${category.name}</h4></div>`;
      
      const sortedItems = Object.entries(category.items).sort((a, b) => a[0].localeCompare(b[0]));
      sortedItems.forEach(([cropName, cropData]) => {
        const formattedName = this.formatCropName(cropName);
        if (!formattedName) return; // Skip items that shouldn't be displayed
        
        // Sort locations by price (highest first) 
        const sortedLocations = cropData.locations ? 
          [...cropData.locations].sort((a, b) => b.price - a.price) : [];
        
        // Check if Market Base Prices is the best option (bad time to sell)
        const bestLocation = sortedLocations.length > 0 ? sortedLocations[0] : null;
        const isBadTimeToSell = bestLocation && bestLocation.name === 'Market Base Prices' && sortedLocations.length > 1;
        
        html += `
          <div class="col-md-6 col-lg-4 mb-3 market-crop-card" data-crop-name="${cropName.toLowerCase()}" data-search-text="${formattedName.toLowerCase()}">
            <div class="card ${isBadTimeToSell ? 'bg-danger bg-opacity-25 border-danger' : 'bg-secondary'} h-100">
              <div class="card-body">
                <h6 class="card-title text-farm-accent mb-2">
                  <i class="bi ${category.icon}"></i> ${formattedName}
                </h6>
                ${isBadTimeToSell ? `
                <div class="alert alert-warning py-2 px-2 mb-3" style="font-size: 0.75rem;">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i>
                  <strong>Poor Market!</strong> Wait for better prices.
                </div>
                ` : ''}
                
                <div class="mb-2">
                  <small class="text-muted d-block mb-2">Selling Locations:</small>
                  ${sortedLocations.length > 0 ? sortedLocations.map((location, index) => `
                    <div class="d-flex justify-content-between align-items-center mb-1 ${index === 0 ? 'bg-success bg-opacity-25 rounded px-2 py-1' : ''}">
                      <small class="${index === 0 ? 'text-success fw-bold' : 'text-light'}">
                        <i class="bi ${index === 0 ? 'bi-geo-alt-fill' : 'bi-geo-alt'}"></i> 
                        ${location.name === 'Market Base Prices' ? 
                          `<span style="cursor: pointer;" onclick="dashboard.showMarketBasePricesModal()" title="Click for explanation">
                            ${location.name} <i class="bi bi-info-circle ms-1"></i>
                          </span>` : 
                          location.name}
                      </small>
                      <small class="${index === 0 ? 'text-success fw-bold' : 'text-warning'}">
                        $${location.price.toFixed(0)}
                      </small>
                    </div>
                  `).join('') : '<small class="text-muted">No locations available</small>'}
                </div>
                
                ${sortedLocations.length > 1 ? `
                <div class="mt-3">
                  <small class="text-muted">Average Price: </small>
                  <span class="text-warning fw-bold">$${cropData.avgPrice.toFixed(0)}</span>
                  <small class="text-muted ms-2">(${sortedLocations.length} locations)</small>
                </div>
                ` : ''}
                
              </div>
            </div>
          </div>
        `;
      });
    }
  });
  
  html += '</div>'; // End row
  html += '</div>'; // End by-crop tab
  
  // By Location Tab
  html += '<div class="tab-pane fade" id="by-location" role="tabpanel">';
  
  if (marketData.sellPoints && marketData.sellPoints.length > 0) {
    // Filter out unwanted stations (backup filtering)
    const filteredSellPoints = marketData.sellPoints.filter(sellPoint => {
      const skipPatterns = [
        /^Unknown$/,
        /Silo$/,
        /Silo /,
        /^Grain.*Silo/,
        /^Farm Silo/,
        /Barn$/,
        /Barn /,
        /Stable$/
      ];
      
      return !skipPatterns.some(pattern => pattern.test(sellPoint.name));
    });
    
    if (filteredSellPoints.length === 0) {
      html += '<p class="text-muted text-center">No valid sell points available</p>';
    } else {
      html += '<div class="accordion" id="sellPointAccordion">';
      
      filteredSellPoints.forEach((sellPoint, index) => {
      // Count only non-animal crops (but include livestock products)
      const nonAnimalCrops = Object.keys(sellPoint.prices).filter(cropName => 
        !livestockAnimals.includes(cropName.toUpperCase())
      );
      const totalCrops = nonAnimalCrops.length;
      
      const locationCrops = nonAnimalCrops
        .map(crop => this.formatCropName(crop))
        .filter(name => name !== null) // Remove skipped crops
        .join(' ');
      
      html += `
        <div class="accordion-item market-location-item" data-location-name="${sellPoint.name.toLowerCase()}" data-search-text="${sellPoint.name.toLowerCase()} ${locationCrops.toLowerCase()}">
          <h2 class="accordion-header">
            <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#sellPoint${index}">
              <i class="bi bi-shop me-2"></i> ${sellPoint.name}
              <span class="badge bg-info ms-2">${totalCrops} crops</span>
              ${sellPoint.isSpecialEvent ? '<span class="badge bg-warning ms-2"><i class="bi bi-star-fill"></i> Special Event</span>' : ''}
            </button>
          </h2>
          <div id="sellPoint${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#sellPointAccordion">
            <div class="accordion-body">
              <div class="table-responsive">
                <table class="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th class="text-end">Price/Ton</th>
                      <th class="text-end">Multiplier</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
      `;
      
      // Filter out livestock animals (but keep livestock products) and sort prices by crop name
      const filteredPrices = Object.entries(sellPoint.prices).filter(([cropName]) => 
        !livestockAnimals.includes(cropName.toUpperCase())
      );
      const sortedPrices = filteredPrices.sort((a, b) => a[0].localeCompare(b[0]));
      
      if (sortedPrices.length === 0) {
        // Show message for stations with no products
        html += `
          <tr>
            <td colspan="4" class="text-center text-muted py-3">
              <i class="bi bi-search me-2"></i>
              No products available yet. The system is still discovering what this location accepts.
            </td>
          </tr>
        `;
      } else {
        sortedPrices.forEach(([cropName, priceInfo]) => {
          const formattedCropName = this.formatCropName(cropName);
          if (!formattedCropName) return; // Skip items that shouldn't be displayed
          
          const cropAvg = marketData.crops[cropName] ? marketData.crops[cropName].avgPrice : priceInfo.price;
          const isAboveAvg = priceInfo.price > cropAvg;
          
          
          html += `
            <tr>
              <td>${formattedCropName}</td>
              <td class="text-end"><strong>$${priceInfo.price.toFixed(0)}</strong></td>
              <td class="text-end">
                <span class="badge ${priceInfo.multiplier > 1.1 ? 'bg-success' : priceInfo.multiplier < 0.9 ? 'bg-danger' : 'bg-secondary'}">
                  ${(priceInfo.multiplier * 100).toFixed(0)}%
                </span>
              </td>
              <td class="text-center">
                ${priceInfo.isSpecialEvent ? '<span class="badge bg-warning"><i class="bi bi-star-fill"></i></span>' : ''}
                ${isAboveAvg ? '<span class="badge bg-success"><i class="bi bi-arrow-up"></i></span>' : '<span class="badge bg-danger"><i class="bi bi-arrow-down"></i></span>'}
              </td>
            </tr>
          `;
        });
      }
      
      html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
      });
      
      html += '</div>'; // End accordion
    }
  } else {
    html += '<p class="text-muted text-center">No sell point data available</p>';
  }
  
  html += '</div>'; // End by-location tab
  html += '</div>'; // End tab content
  
  marketContainer.innerHTML = html;
}

export function formatCropName(name) {
  // Handle edge cases and unusual names
  if (!name || typeof name !== 'string') return 'Unknown';
  
  // Define known crop mappings for better display names
  const cropMappings = {
    'WHEAT': 'Wheat',
    'BARLEY': 'Barley', 
    'CANOLA': 'Canola',
    'CORN': 'Corn',
    'MAIZE': 'Corn',
    'SOYBEANS': 'Soybeans',
    'SOYBEAN': 'Soybeans',
    'SUNFLOWER': 'Sunflower',
    'COTTON': 'Cotton',
    'SUGARCANE': 'Sugar Cane',
    'SUGAR_BEET': 'Sugar Beet',
    'SUGARBEET': 'Sugar Beet',
    'POTATO': 'Potato',
    'POTATOES': 'Potatoes',
    'OAT': 'Oat',
    'OATS': 'Oats',
    'RYE': 'Rye',
    'RICE': 'Rice',
    'MILK': 'Milk',
    'EGGS': 'Eggs',
    'WOOL': 'Wool',
    'HONEY': 'Honey',
    'FLOUR': 'Flour',
    'BREAD': 'Bread',
    'BUTTER': 'Butter',
    'CHEESE': 'Cheese',
    'CHOCOLATE': 'Chocolate',
    'FABRIC': 'Fabric',
    'CLOTHES': 'Clothes',
    'SILAGE': 'Silage',
    'HAY': 'Hay',
    'STRAW': 'Straw',
    'GRASS': 'Grass',
    'CHAFF': 'Chaff',
    'WOODCHIPS': 'Wood Chips',
    'WATER': 'Water',
    'DIESEL': 'Diesel',
    'LIME': 'Lime',
    'FERTILIZER': 'Fertilizer',
    'LIQUID_FERTILIZER': 'Liquid Fertilizer',
    'HERBICIDE': 'Herbicide',
    'SEEDS': 'Seeds',
    'PIGFOOD': 'Pig Food'
  };
  
  const upperName = name.toUpperCase();
  
  // Check if we have a direct mapping
  if (cropMappings[upperName]) {
    return cropMappings[upperName];
  }
  
  // Skip items that look like they shouldn't be displayed (concatenated words, IDs, etc.)
  if (this.shouldSkipCropName(name)) {
    return null; // Signal to skip this item
  }
  
  // Handle underscores and convert to title case
  let formatted = name.replace(/_/g, ' ');
  
  // Split camelCase words (e.g., ChocolateMilkBuffalo -> Chocolate Milk Buffalo)
  formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Convert to title case
  formatted = formatted.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  
  return formatted;
}

export function shouldSkipCropName(name) {
  if (!name || typeof name !== 'string') return true;
  
  const skipPatterns = [
    // Skip items that are clearly IDs or codes
    /^\d+$/,
    // Skip items with excessive consecutive capital letters (more lenient)
    /[A-Z]{8,}/,
    // Skip items that look like concatenated words without separators and are extremely long
    /^[a-zA-Z]{35,}$/,
    // Skip obvious test/debug items
    /test|debug|temp|placeholder/i,
    // Skip items that start with special characters
    /^[^a-zA-Z]/,
    // Skip BIGBAG and PALLET variants
    /^(BIGBAG|BIG_BAG|PALLET|PALETTE)/i,
    // Skip clearly invalid items
    /^(UNKNOWN|EMPTY|NULL|NONE)$/i
  ];
  
  return skipPatterns.some(pattern => pattern.test(name));
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toFixed(0);
  }
}

export function searchMarket(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  
  // Search in crop cards (By Crop tab)
  const cropCards = document.querySelectorAll('.market-crop-card');
  cropCards.forEach(card => {
    const searchText = card.getAttribute('data-search-text');
    if (!term || searchText.includes(term)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
  
  // Search in location items (By Location tab)
  const locationItems = document.querySelectorAll('.market-location-item');
  locationItems.forEach(item => {
    const searchText = item.getAttribute('data-search-text');
    if (!term || searchText.includes(term)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
  
  // Show "no results" message if needed
  this.updateSearchResults(term, cropCards, locationItems);
}

export function updateSearchResults(searchTerm, cropCards, locationItems) {
  const activeTab = document.querySelector('#marketTabs .nav-link.active');
  if (!activeTab) return;
  
  const isCropTab = activeTab.id === 'by-crop-tab';
  const relevantCards = isCropTab ? cropCards : locationItems;
  
  let hasVisibleResults = false;
  relevantCards.forEach(card => {
    if (card.style.display !== 'none') {
      hasVisibleResults = true;
    }
  });
  
  // Remove existing no-results message
  const existingMessage = document.querySelector('.market-no-results');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Add no-results message if needed
  if (searchTerm && !hasVisibleResults) {
    const container = isCropTab ? 
      document.querySelector('#by-crop .row') : 
      document.querySelector('#by-location .accordion');
    
    if (container) {
      const noResultsHTML = `
        <div class="col-12 text-center p-5 market-no-results">
          <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
          <h5 class="text-muted mt-3">No Results Found</h5>
          <p class="text-muted">No ${isCropTab ? 'crops' : 'locations'} match "${searchTerm}"</p>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', noResultsHTML);
    }
  }
}

export function createPriceCard(name, priceInfo) {
  const currentPrice = priceInfo.currentPrice || priceInfo.basePrice || 0;
  const basePrice = priceInfo.basePrice || currentPrice;
  const difference = currentPrice - basePrice;
  const percentChange = basePrice > 0 ? (difference / basePrice) * 100 : 0;

  const trendClass =
    percentChange > 5
      ? "text-success"
      : percentChange < -5
      ? "text-danger"
      : "text-warning";
  const trendIcon =
    percentChange > 0
      ? "bi-arrow-up"
      : percentChange < 0
      ? "bi-arrow-down"
      : "bi-dash";

  return `
    <div class="col-md-6 col-lg-4 mb-3 crop-card" data-name="${name.toLowerCase()}">
      <div class="card bg-secondary">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="card-title mb-0">${priceInfo.title || name}</h6>
            <span class="${trendClass}">
              <i class="bi ${trendIcon}"></i>
              ${Math.abs(percentChange).toFixed(1)}%
            </span>
          </div>
          <div class="row">
            <div class="col-6">
              <small class="text-muted">Current Price:</small><br>
              <strong class="text-success">$${currentPrice.toFixed(
                3
              )}/L</strong>
            </div>
            <div class="col-6">
              <small class="text-muted">Base Price:</small><br>
              <strong>$${basePrice.toFixed(3)}/L</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function calculateCondition(damage) {
  const condition = Math.max(0, 100 - damage * 100);
  if (condition >= 80) return { text: "Excellent", class: "bg-success" };
  if (condition >= 60) return { text: "Good", class: "bg-info" };
  if (condition >= 40) return { text: "Fair", class: "bg-warning text-dark" };
  return { text: "Poor", class: "bg-danger" };
}

export function getVehicleIcon(type) {
  switch (type?.toLowerCase()) {
    case "motorized":
      return "bi-truck-front";
    case "trailer":
      return "bi-truck";
    case "implement":
      return "bi-tools";
    case "seeder":
      return "bi-flower2";
    case "cultivator":
      return "bi-arrow-repeat";
    default:
      return "bi-gear";
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Filter and search methods
export function filterPurchases(type) {
  const cards = document.querySelectorAll(".purchase-card");
  const buttons = document.querySelectorAll(
    '[onclick^="dashboard.filterPurchases"]'
  );

  buttons.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  cards.forEach((card) => {
    const cardType = card.dataset.type;
    if (
      type === "all" ||
      (type === "vehicles" && cardType === "motorized") ||
      (type === "implements" &&
        ["implement", "trailer", "seeder", "cultivator"].includes(cardType))
    ) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

export function sortPurchases(sortBy) {
  const container = document.getElementById("purchases-list");
  const cards = Array.from(container.querySelectorAll(".purchase-card"));

  cards.sort((a, b) => {
    if (sortBy === "price") {
      return parseInt(b.dataset.price) - parseInt(a.dataset.price);
    } else if (sortBy === "age") {
      // Sort by age (oldest first - highest age value first)
      return parseInt(b.dataset.age) - parseInt(a.dataset.age);
    } else if (sortBy === "name") {
      return a
        .querySelector(".card-header h6")
        .textContent.localeCompare(
          b.querySelector(".card-header h6").textContent
        );
    }
    return 0;
  });

  container.innerHTML = "";
  cards.forEach((card) => container.appendChild(card));
}

export function searchCrops(searchTerm) {
  // For backwards compatibility - redirect to new searchMarket function
  this.searchMarket(searchTerm);
  
  // Also handle old crop-card structure if it exists
  const cards = document.querySelectorAll(".crop-card");
  const term = searchTerm.toLowerCase();

  cards.forEach((card) => {
    const name = card.dataset.name;
    if (name && name.includes(term)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}