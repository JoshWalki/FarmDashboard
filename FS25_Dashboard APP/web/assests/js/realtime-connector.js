class RealtimeConnector {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.ws = null;
    // Use dynamic endpoints based on current host
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    this.httpEndpoint = `${protocol}//${hostname}:8766`;
    this.wsEndpoint = `${wsProtocol}//${hostname}:8766`; // WebSocket uses same port as HTTP
    this.isConnected = false;
    this.reconnectInterval = 5000;
    this.reconnectTimer = null;
    this.updateInterval = 1000;
    this.updateTimer = null;
    this.useWebSocket = true;
    this.fileCheckInterval = 2000;
    this.lastFileData = null;

    // Store previous data for change comparison
    this.previousData = null;
    this.lastChangeCheck = 0;
  }

  // Helper function to generate consistent hash from string
  hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Helper function for seeded random number generation
  seededRandom(seed) {
    let currentSeed = seed;
    return function () {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  init() {
    this.checkConnectionMethod();
    this.setupStatusIndicator();
  }

  checkConnectionMethod() {
    fetch(`${this.httpEndpoint}/api/status`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        this.isConnected = true;
        this.updateConnectionStatus(true); // Show online badge immediately
        this.enableAPIMode();
        this.startHTTPPolling(); // Use HTTP polling instead of WebSocket for now
      })
      .catch((error) => {
        this.startFileMonitoring();
      });
  }

  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsEndpoint);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.updateConnectionStatus(true);

        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeData(data);
        } catch (error) {
          console.error(
            "[RealtimeConnector] Error parsing WebSocket data:",
            error
          );
        }
      };

      this.ws.onerror = (error) => {
        console.error("[RealtimeConnector] WebSocket error:", error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error("[RealtimeConnector] Failed to connect WebSocket:", error);
      this.fallbackToHTTP();
    }
  }

  fallbackToHTTP() {
    this.startHTTPPolling();
  }

  startHTTPPolling() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    const poll = () => {
      fetch(`${this.httpEndpoint}/api/data`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          this.handleRealtimeData(data);
          this.isConnected = true;
          this.updateConnectionStatus(true);
        })
        .catch((error) => {
          console.error("[RealtimeConnector] HTTP polling error:", error);
          this.isConnected = false;
          this.updateConnectionStatus(false);
        });
    };

    // Poll immediately, then every 5 seconds to reduce error spam
    poll();
    this.updateTimer = setInterval(poll, 5000);
  }

  startFileMonitoring() {
    const checkFile = () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";

      const dataPath = this.getModSettingsPath();
      if (dataPath) {
        this.loadFileData(dataPath);
      }
    };

    checkFile();
    setInterval(checkFile, this.fileCheckInterval);
  }

  getModSettingsPath() {
    if (window.require && window.require("fs")) {
      const fs = window.require("fs");
      const path = window.require("path");
      const os = window.require("os");

      const userHome = os.homedir();
      const modSettingsPath = path.join(
        userHome,
        "Documents",
        "My Games",
        "FarmingSimulator2025",
        "modSettings",
        "FS25_FarmDashboard",
        "data.json"
      );

      return modSettingsPath;
    }
    return null;
  }

  loadFileData(filePath) {
    if (window.require && window.require("fs")) {
      const fs = window.require("fs");

      fs.readFile(filePath, "utf8", (err, data) => {
        if (!err) {
          try {
            const jsonData = JSON.parse(data);
            if (
              JSON.stringify(jsonData) !== JSON.stringify(this.lastFileData)
            ) {
              this.lastFileData = jsonData;
              this.handleRealtimeData(jsonData);
              this.isConnected = true;
              this.updateConnectionStatus(true);
            }
          } catch (error) {
            console.error(
              "[RealtimeConnector] Error parsing file data:",
              error
            );
          }
        } else {
          this.isConnected = false;
          this.updateConnectionStatus(false);
        }
      });
    }
  }

  handleRealtimeData(data) {
    if (!data) return;

    // Store current dashboard state before updating (for change comparison)
    // Use the previously stored state, not the current state
    const oldState = this.previousData;

    if (data.animals) {
      // Store the raw husbandry data for pasture statistics
      this.dashboard.husbandryData = data.animals;
      this.updateAnimalsData(data.animals);
    }

    if (data.vehicles) {
      this.updateVehiclesData(data.vehicles);
    }

    if (data.fields) {
      this.updateFieldsData(data.fields);
    }

    if (data.production) {
      this.updateProductionData(data.production);
    }

    if (data.finance) {
      this.updateFinanceData(data.finance);
    }

    if (data.weather) {
      this.updateWeatherData(data.weather);
    }

    if (data.economy) {
      this.updateEconomyData(data.economy);
    }

    if (data.gameTime) {
      this.updateGameTime(data.gameTime);
    }

    if (data.farmInfo) {
      this.updateFarmInfo(data.farmInfo);
    }

    this.dashboard.lastUpdate = new Date();
    this.updateLastUpdateTime();

    // Store current state for next comparison
    const newState = {
      animals: this.dashboard.animals ? [...this.dashboard.animals] : [],
      pastures: this.dashboard.pastures ? [...this.dashboard.pastures] : [],
      gameTime: this.dashboard.gameTime,
    };

    // Check for changes and show toast notifications
    if (oldState && this.dashboard.showChangeToasts) {
      const oldCount = oldState.animals ? oldState.animals.length : 0;
      const newCount = newState.animals ? newState.animals.length : 0;

      // Check immediately if animal count changed, otherwise throttle to every 10 seconds
      const now = Date.now();
      const shouldCheckNow =
        oldCount !== newCount ||
        !this.lastChangeCheck ||
        now - this.lastChangeCheck >= 10000;

      if (shouldCheckNow) {
        console.log(
          `[ChangeDetection] Running change detection check... (count changed: ${
            oldCount !== newCount
          })`
        );
        this.detectAndShowChanges(oldState);
        this.lastChangeCheck = now;
      }
    }

    this.previousData = newState;
  }

  updateAnimalsData(animalsData) {
    // Handle API data format - husbandry buildings with animal details

    const formattedAnimals = [];

    // Handle different data formats (vanilla vs RealisticLivestock)
    if (animalsData) {
      // If animalsData is not an array, try to extract array from it
      let husbandryArray = animalsData;

      // Check if data is wrapped in another object (RealisticLivestock might do this)
      if (!Array.isArray(animalsData)) {
        // Try common property names that might contain the array
        if (animalsData.husbandries) {
          husbandryArray = animalsData.husbandries;
        } else if (animalsData.animals) {
          husbandryArray = animalsData.animals;
        } else if (animalsData.data) {
          husbandryArray = animalsData.data;
        } else {
          // Try to convert object values to array
          husbandryArray = Object.values(animalsData);
        }
      }

      if (!Array.isArray(husbandryArray)) {
        console.error(
          "[RealtimeConnector] Could not extract array from animals data:",
          animalsData
        );
        return;
      }

      husbandryArray.forEach((husbandry, index) => {
        // Check different possible animal data structures
        let animalsList = null;

        // Try different property names that might contain animals
        if (husbandry.animals && Array.isArray(husbandry.animals)) {
          animalsList = husbandry.animals;
        } else if (husbandry.livestock && Array.isArray(husbandry.livestock)) {
          // RealisticLivestock might use 'livestock' instead of 'animals'
          animalsList = husbandry.livestock;
        } else if (
          husbandry.animalList &&
          Array.isArray(husbandry.animalList)
        ) {
          animalsList = husbandry.animalList;
        }

        if (animalsList) {
          animalsList.forEach((animalGroup) => {
            // Handle both grouped animals (vanilla) and individual animals (RealisticLivestock)
            const numAnimals = animalGroup.numAnimals || animalGroup.count || 1;
            const animalType =
              animalGroup.subType ||
              animalGroup.type ||
              animalGroup.animalType ||
              "Unknown";

            // If RealisticLivestock provides individual animals with detailed data
            if (
              animalGroup.id &&
              (animalGroup.numAnimals === undefined ||
                animalGroup.numAnimals <= 1) &&
              (animalGroup.uniqueId ||
                animalGroup.age !== undefined ||
                animalGroup.weight !== undefined)
            ) {
              // This is likely an individual animal from RealisticLivestock
              //console.log(`[REALTIME] Using individual RealisticLivestock animal: ID=${animalGroup.id}, uniqueId=${animalGroup.uniqueId}`);
              formattedAnimals.push({
                id: animalGroup.id,
                name: animalGroup.name || `${animalType} ${animalGroup.id}`,
                husbandryName: husbandry.name || husbandry.buildingName,
                husbandryId: husbandry.id || husbandry.buildingId,
                ownerFarmId: husbandry.ownerFarmId || husbandry.farmId,
                age: animalGroup.age || animalGroup.ageInMonths || 24,
                health: animalGroup.health || animalGroup.healthStatus || 100,
                weight: animalGroup.weight || animalGroup.currentWeight || 350,
                gender: animalGroup.gender || animalGroup.sex || "female",
                subType: animalType,
                location: husbandry.name || husbandry.buildingName,
                locationType: "pasture",
                isLactating:
                  animalGroup.isLactating || animalGroup.lactating || false,
                isPregnant:
                  animalGroup.isPregnant || animalGroup.pregnant || false,
                isParent:
                  animalGroup.isParent || animalGroup.hasOffspring || false,
                // RealisticLivestock specific data if available
                genetics: animalGroup.genetics || null,
                productivity: animalGroup.productivity || null,
                sellPrice: animalGroup.sellPrice || null,
              });
            } else {
              // Handle grouped animals (vanilla format)
              //console.log(`[REALTIME] Using grouped/fallback generation for ${animalType} - numAnimals: ${numAnimals}, has ID: ${!!animalGroup.id}`);
              // Use realistic ratios for dairy operations
              const isDairyCow =
                animalType &&
                (animalType.toUpperCase().includes("COW") ||
                  animalType.toUpperCase() === "COW");

              let maleCount = 0;
              let femaleCount = 0;

              if (isDairyCow) {
                // Realistic dairy ratio: ~3-5% males, 95-97% females
                maleCount = Math.max(1, Math.floor(numAnimals * 0.04)); // ~4% males
                femaleCount = numAnimals - maleCount;
              } else {
                // Other animals: more balanced but still female-heavy for breeding
                maleCount = Math.floor(numAnimals * 0.25); // 25% males
                femaleCount = numAnimals - maleCount;
              }

              for (let i = 0; i < numAnimals; i++) {
                const animalId = `${husbandry.id}-${animalType}-${i}`;
                const seed = this.hashCode(animalId);
                const seededRandom = this.seededRandom(seed);

                // Determine gender based on realistic ratios
                const isMale = i < maleCount;
                const gender = isMale ? "male" : "female";

                // Determine age - use cluster age if available, otherwise realistic range
                const age =
                  animalGroup.age || 12 + Math.floor(seededRandom() * 36); // 12-48 months
                const isAdult = age >= 18;

                // Lactating logic for dairy cows - don't assume lactation status
                // Only set lactating to true if we have actual data indicating it
                let isLactating = false;
                // We don't have individual animal lactation data from the game
                // so we should not fabricate lactating animals

                // Pregnancy logic - don't assume pregnancy status
                // Only set pregnant to true if we have actual data indicating it
                let isPregnant = false;
                // We don't have individual animal pregnancy data from the game
                // so we should not fabricate pregnant animals

                formattedAnimals.push({
                  id: animalId,
                  name: `${animalType} ${i + 1}`,
                  husbandryName: husbandry.name || husbandry.buildingName,
                  husbandryId: husbandry.id || husbandry.buildingId,
                  ownerFarmId: husbandry.ownerFarmId || husbandry.farmId,
                  age: age,
                  health:
                    animalGroup.health && animalGroup.health > 0
                      ? animalGroup.health
                      : 85 + seededRandom() * 15,
                  weight: animalGroup.weight || 250 + seededRandom() * 200,
                  gender: gender,
                  subType: animalType,
                  location: husbandry.name || husbandry.buildingName,
                  locationType: "pasture",
                  isLactating: isLactating,
                  isPregnant: isPregnant,
                  isParent: false, // Don't fabricate parent status
                });
              }
            }
          });
        } else if (
          (husbandry.animalCount && husbandry.animalCount > 0) ||
          (husbandry.numAnimals && husbandry.numAnimals > 0)
        ) {
          // Fallback: if no detailed animal data but count exists
          const count = husbandry.animalCount || husbandry.numAnimals;
          //console.log(`[REALTIME] FALLBACK: Generating fake IDs for ${count} animals in ${husbandry.name} (no individual animal data found)`);

          for (let i = 0; i < count; i++) {
            const animalId = `${husbandry.id}-${i}`;
            // Generate consistent values based on animal ID to prevent fluctuations
            const seed = this.hashCode(animalId);
            const seededRandom = this.seededRandom(seed);

            formattedAnimals.push({
              id: animalId,
              name: `Animal ${i + 1}`,
              husbandryName: husbandry.name,
              husbandryId: husbandry.id,
              ownerFarmId: husbandry.ownerFarmId,
              age: Math.floor(seededRandom() * 48) + 12, // 12-60 months, consistent
              health: 85 + seededRandom() * 15, // Consistent health
              weight: 250 + seededRandom() * 200, // Consistent weight
              gender: seededRandom() > 0.5 ? "female" : "male", // Consistent gender
              subType: "Unknown",
              location: husbandry.name,
              locationType: "pasture",
              isLactating: false, // Don't fabricate lactating status
              isPregnant: false, // Don't fabricate pregnant status
              isParent: false, // Don't fabricate parent status
            });
          }
        }
      });
    }

    if (formattedAnimals.length === 0) {
      console.warn(
        "[RealtimeConnector] No animals found in data! Check the console logs above to debug."
      );
    } else {
    }

    this.dashboard.animals = formattedAnimals;
    this.dashboard.filteredAnimals = formattedAnimals;

    // Update pasture data since it depends on animals
    if (this.dashboard.parsePastureData) {
      this.dashboard.parsePastureData();
    }

    // Update landing page counts
    if (this.dashboard.updateLandingPageCounts) {
      this.dashboard.updateLandingPageCounts();
    }

    // Update livestock section if it's currently visible
    const livestockSection = document.getElementById("dashboard-content");
    if (livestockSection && !livestockSection.classList.contains("d-none")) {
      // Only update table if livestock section is visible
      if (this.dashboard.dataTable) {
        // Destroy and recreate table instead of trying to update with wrong format
        this.dashboard.renderAnimalsTable();
      } else {
        // If table doesn't exist but section is visible, create it
        setTimeout(() => {
          if (this.dashboard.renderAnimalsTable) {
            this.dashboard.renderAnimalsTable();
          }
        }, 100);
      }

      if (this.dashboard.updateSummaryCards) {
        this.dashboard.updateSummaryCards();
      }
    }

    // Update pastures section if it's currently visible
    const pasturesSection = document.getElementById("section-content");
    if (
      pasturesSection &&
      !pasturesSection.classList.contains("d-none") &&
      pasturesSection.innerHTML.includes("Pasture Management")
    ) {
      if (this.dashboard.updatePastureDisplay) {
        this.dashboard.updatePastureDisplay();
      }
    }
  }

  updateVehiclesData(vehiclesData) {
    // Filter to only show player-owned vehicles (ownerFarmId: 1)
    const playerVehicles = vehiclesData
      ? vehiclesData.filter((v) => v.ownerFarmId === 1)
      : [];
    this.dashboard.vehicles = playerVehicles;

    // Update vehicle count on landing page
    const vehicleCountElement = document.getElementById("vehicle-count");
    if (vehicleCountElement) {
      vehicleCountElement.textContent = `${playerVehicles.length} vehicles`;
    }

    // Update vehicles section if it's currently visible
    const sectionContent = document.getElementById("section-content");
    const isVehicleSectionVisible =
      sectionContent &&
      !sectionContent.classList.contains("d-none") &&
      sectionContent.innerHTML.includes("Vehicle Fleet Management");

    if (isVehicleSectionVisible) {
      this.dashboard.updateVehicleSummaryCards();
      this.dashboard.renderVehicleCards(playerVehicles);
    }
  }

  updateFieldsData(fieldsData) {
    this.dashboard.fields = fieldsData;

    // Clear any field retry interval since we got data via realtime
    if (this.dashboard.fieldRetryInterval) {
      clearInterval(this.dashboard.fieldRetryInterval);
      this.dashboard.fieldRetryInterval = null;
    }

    // Update fields display if currently viewing fields section
    if (this.dashboard.currentSection === "fields") {
      this.dashboard.updateFieldsList();
      this.dashboard.updateFieldStats();
    }
  }

  updateProductionData(productionData) {
    this.dashboard.production = productionData;

    // Store husbandry totals separately for easy access
    if (productionData && productionData.husbandryTotals) {
      this.dashboard.husbandryTotals = productionData.husbandryTotals;
    }

    // Always try to refresh the farm storage cards if they exist
    if (this.dashboard.updateFarmStorageDisplay) {
      this.dashboard.updateFarmStorageDisplay();
    }

    // Update pasture display if visible since it uses storage data
    const pasturesSection = document.getElementById("section-content");
    if (
      pasturesSection &&
      !pasturesSection.classList.contains("d-none") &&
      pasturesSection.innerHTML.includes("Pasture Management")
    ) {
      if (this.dashboard.updatePastureDisplay) {
        this.dashboard.updatePastureDisplay();
      }
    }
  }

  updateFinanceData(financeData) {
    this.dashboard.finance = financeData;
    // TODO: Implement finance display when finance section is ready
    // this.dashboard.updateFinanceDisplay();
  }

  updateWeatherData(weatherData) {
    this.dashboard.weather = weatherData;
    
    // Update weather display in navbar
    if (this.dashboard.updateWeatherDisplay) {
      this.dashboard.updateWeatherDisplay();
    }
  }

  updateEconomyData(economyData) {
    this.dashboard.economy = economyData;

    // Store milk price for value calculations
    if (
      economyData &&
      economyData.fillTypePrices &&
      economyData.fillTypePrices.MILK
    ) {
      this.dashboard.milkPrice =
        economyData.fillTypePrices.MILK.currentPrice ||
        economyData.fillTypePrices.MILK.pricePerLiter ||
        0;
    }

    // Update milk values if pastures are displayed
    if (this.dashboard.updateMilkValues) {
      this.dashboard.updateMilkValues();
    }
  }

  updateGameTime(gameTime) {
    this.dashboard.gameTime = gameTime;

    // Always call updateGameTimeDisplay since we've now defined it
    if (this.dashboard.updateGameTimeDisplay) {
      this.dashboard.updateGameTimeDisplay();
    } else {
      console.error(
        "[RealtimeConnector] updateGameTimeDisplay function not found"
      );
    }
  }

  updateFarmInfo(farmInfo) {
    this.dashboard.playerFarms = farmInfo;
    // TODO: Implement farm selector when multi-farm support is ready
    // this.dashboard.updateFarmSelector();
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.checkConnectionMethod();
    }, this.reconnectInterval);
  }

  setupStatusIndicator() {
    const statusContainer = document.createElement("div");
    statusContainer.id = "connection-status";
    statusContainer.className = "connection-status";
    statusContainer.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot"></span>
                <span class="status-text">Disconnected</span>
            </div>
            <div class="last-update">
                Last update: <span id="last-update-time">Never</span>
            </div>
        `;

    const header = document.querySelector(".dashboard-header");
    if (header) {
      header.appendChild(statusContainer);
    }

    this.addStatusStyles();
  }

  addStatusStyles() {
    const style = document.createElement("style");
    style.textContent = `
            .connection-status {
                position: absolute;
                top: 10px;
                right: 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 5px;
            }

            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 5px 10px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 20px;
            }

            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #dc3545;
                animation: pulse 2s infinite;
            }

            .status-dot.connected {
                background: #28a745;
            }

            .status-text {
                font-size: 12px;
                font-weight: 600;
            }

            .last-update {
                font-size: 11px;
                color: #666;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
    document.head.appendChild(style);
  }

  updateConnectionStatus(connected) {
    const statusDot = document.querySelector(".status-dot");
    const statusText = document.querySelector(".status-text");

    if (statusDot && statusText) {
      if (connected) {
        statusDot.classList.add("connected");
        statusText.textContent = "Connected";
      } else {
        statusDot.classList.remove("connected");
        statusText.textContent = "Disconnected";
      }
    }

    // Update navbar connection badge
    const navStatus = document.getElementById("nav-connection-status");
    const navStatusBadge = navStatus?.querySelector(".badge");
    const notificationBell = document.getElementById("notification-bell");

    if (navStatus) {
      if (connected) {
        navStatus.classList.remove("d-none");
        if (navStatusBadge) {
          navStatusBadge.className = "badge bg-success";
          navStatusBadge.innerHTML =
            '<i class="bi bi-wifi me-1"></i><span id="nav-connection-text">API Connected</span>';
        }
        // Show notification bell when API is connected
        if (notificationBell) {
          notificationBell.classList.remove("d-none");
        }
      } else {
        // Hide the badge when disconnected instead of showing offline
        navStatus.classList.add("d-none");
        // Hide notification bell when API is disconnected
        if (notificationBell) {
          notificationBell.classList.add("d-none");
        }
      }
    }
  }

  enableAPIMode() {
    // Hide the file selection section
    const landingSection = document.getElementById("landing");
    if (landingSection) {
      landingSection.style.display = "none";
    }

    // Show the main dashboard sections
    const sections = [
      "livestock",
      "vehicles",
      "fields",
      "economy",
      "statistics",
    ];
    sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = "block";
      }
    });

    // Stay on landing page - don't auto-navigate to any section
    // User can choose which section to view

    // Update page title to indicate API mode
    document.title = "Farm Dashboard - Live API Mode";

    // Add API mode indicator
    this.addAPIModeIndicator();
  }

  addAPIModeIndicator() {
    const header = document.querySelector(".dashboard-header h1");
    if (header && !header.querySelector(".api-mode-badge")) {
      const badge = document.createElement("span");
      badge.className = "api-mode-badge";
      badge.textContent = "LIVE API";
      badge.style.cssText = `
                background: #28a745;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 10px;
                font-weight: normal;
            `;
      header.appendChild(badge);
    }
  }

  updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById("last-update-time");
    if (lastUpdateElement && this.dashboard.lastUpdate) {
      const now = new Date();
      const diff = Math.floor((now - this.dashboard.lastUpdate) / 1000);

      if (diff < 60) {
        lastUpdateElement.textContent = `${diff} seconds ago`;
      } else if (diff < 3600) {
        lastUpdateElement.textContent = `${Math.floor(diff / 60)} minutes ago`;
      } else {
        lastUpdateElement.textContent = `${Math.floor(diff / 3600)} hours ago`;
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.updateConnectionStatus(false);
  }

  detectAndShowChanges(oldState) {
    try {
      // Quick check: if animal counts are the same and no obvious changes, skip detailed comparison
      const oldAnimalCount = oldState.animals ? oldState.animals.length : 0;
      const newAnimalCount = this.dashboard.animals
        ? this.dashboard.animals.length
        : 0;

      // Always run full comparison if animal counts changed (animals bought/sold)
      if (oldAnimalCount !== newAnimalCount) {
        console.log(
          `[ChangeDetection] ✅ Animal count changed (${oldAnimalCount} -> ${newAnimalCount}), running full comparison`
        );
      } else if (oldAnimalCount > 0) {
        // Only check for status changes (pregnant, lactating) if counts are the same
        const hasStatusChanges = this.hasSignificantStatusChanges(
          oldState.animals,
          this.dashboard.animals
        );
        if (!hasStatusChanges) {
          return; // No meaningful changes, skip notifications
        }
        console.log(`[ChangeDetection] Status changes detected`);
      } else {
        return; // No animals to compare
      }

      // Create a temporary comparison data structure similar to what the dashboard expects
      const tempPreRefreshData = {
        animals: oldState.animals,
        pastures: oldState.pastures,
        gameTime: oldState.gameTime,
        playerFarms: this.dashboard.playerFarms || [],
      };

      // Temporarily store this in dashboard for comparison
      const originalPreRefreshData = this.dashboard.preRefreshData;
      this.dashboard.preRefreshData = tempPreRefreshData;

      // Calculate changes using dashboard's existing logic
      const changes = this.dashboard.calculateDataChanges();

      console.log(`[ChangeDetection] Raw changes detected:`, {
        added: changes.livestock?.added?.length || 0,
        removed: changes.livestock?.removed?.length || 0,
        updated: changes.livestock?.updated?.length || 0,
      });

      // Filter changes to only include truly significant ones
      const filteredChanges = this.filterSignificantChanges(changes);

      console.log(`[ChangeDetection] Filtered significant changes:`, {
        added: filteredChanges.livestock?.added?.length || 0,
        removed: filteredChanges.livestock?.removed?.length || 0,
        updated: filteredChanges.livestock?.updated?.length || 0,
      });

      // Only show notifications if there are truly significant changes
      const hasSignificantChanges =
        (filteredChanges.livestock?.added?.length || 0) > 0 ||
        (filteredChanges.livestock?.removed?.length || 0) > 0 ||
        (filteredChanges.livestock?.updated?.length || 0) > 0;

      console.log(
        `[ChangeDetection] Has significant changes:`,
        hasSignificantChanges
      );

      if (hasSignificantChanges) {
        console.log(`[ChangeDetection] Showing toast notifications`);
        this.dashboard.showChangeToasts(filteredChanges);
      }

      // Restore original state
      this.dashboard.preRefreshData = originalPreRefreshData;
    } catch (error) {
      console.error("[RealtimeConnector] Error detecting changes:", error);
    }
  }

  hasSignificantStatusChanges(oldAnimals, newAnimals) {
    if (!oldAnimals || !newAnimals || oldAnimals.length !== newAnimals.length) {
      return true; // Count changed, that's significant
    }

    // Create maps for quick lookup
    const oldMap = {};
    const newMap = {};

    oldAnimals.forEach((animal) => {
      if (animal.id) {
        oldMap[animal.id] = {
          isPregnant: animal.isPregnant,
          isLactating: animal.isLactating,
          health: Math.floor(animal.health / 5) * 5, // Group health into 5-point ranges to avoid minor fluctuations
        };
      }
    });

    newAnimals.forEach((animal) => {
      if (animal.id) {
        newMap[animal.id] = {
          isPregnant: animal.isPregnant,
          isLactating: animal.isLactating,
          health: Math.floor(animal.health / 5) * 5,
        };
      }
    });

    // Check for actual status changes
    for (const id in oldMap) {
      if (newMap[id]) {
        const oldStatus = oldMap[id];
        const newStatus = newMap[id];

        if (
          oldStatus.isPregnant !== newStatus.isPregnant ||
          oldStatus.isLactating !== newStatus.isLactating ||
          Math.abs(oldStatus.health - newStatus.health) >= 10
        ) {
          // Only care about health changes of 10+ points
          return true;
        }
      }
    }

    return false; // No significant status changes found
  }

  filterSignificantChanges(changes) {
    if (!changes || !changes.livestock) {
      return changes;
    }

    // Always keep added and removed animals - these are always significant
    const filteredChanges = {
      ...changes,
      livestock: {
        ...changes.livestock,
        updated: [],
      },
    };

    // Filter updated animals to only include significant status changes
    if (changes.livestock.updated && changes.livestock.updated.length > 0) {
      changes.livestock.updated.forEach((update) => {
        console.log(`[ChangeDetection] Examining update:`, update);

        // Check the actual structure of changes - it might be an object or different format
        let changesArray = [];
        if (Array.isArray(update.changes)) {
          changesArray = update.changes;
        } else if (
          typeof update.changes === "object" &&
          update.changes !== null
        ) {
          changesArray = Object.keys(update.changes);
        } else if (typeof update.changes === "string") {
          changesArray = [update.changes];
        }

        // Only include updates for pregnancy, lactation, or significant health changes
        const isSignificantUpdate =
          changesArray.includes("isPregnant") ||
          changesArray.includes("isLactating") ||
          changesArray.includes("isParent") ||
          (changesArray.includes("health") &&
            Math.abs((update.new?.health || 0) - (update.old?.health || 0)) >=
              15);

        if (isSignificantUpdate) {
          filteredChanges.livestock.updated.push(update);
          console.log(
            `[ChangeDetection] Keeping significant update for ID ${
              update.new?.id
            }: ${changesArray.join(", ")}`
          );
        } else {
          console.log(
            `[ChangeDetection] Filtering out minor update for ID ${
              update.new?.id
            }: ${changesArray.join(", ")}`
          );
        }
      });
    }

    return filteredChanges;
  }
}

window.RealtimeConnector = RealtimeConnector;
