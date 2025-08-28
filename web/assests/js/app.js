class LivestockDashboard {
  constructor() {
    this.animals = [];
    this.filteredAnimals = [];
    this.fields = [];
    this.savedFolderData = null;
    this.dataTable = null;
    this.isDataLoaded = false;
    this.lastAnimalsDataHash = null;
    this.placeables = [];
    this.pastures = [];
    this.playerFarms = [];
    this.selectedFarm = null;
    this.selectedFarmId = null;
    this.gameTime = null;
    this.activeFilters = {};
    this.milkPrice = 0.45; // Default milk price per liter in FS25

    // Notification history system
    this.notificationHistory = [];
    this.maxNotifications = 10;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabs();
    this.setupURLRouting();
    this.loadNotificationHistory();

    // Check if API is available first, fallback to folder selection
    this.checkAPIAvailability();
  }

  // Get the API base URL dynamically based on current host
  getAPIBaseURL() {
    // Use the current host (works for both localhost and IP addresses)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = "8766"; // API port is always 8766
    return `${protocol}//${hostname}:${port}`;
  }

  async checkAPIAvailability() {
    try {
      const apiBaseURL = this.getAPIBaseURL();
      const response = await fetch(`${apiBaseURL}/api/status`);
      if (response.ok) {
        console.log("API is available - loading live data");

        // Load data from API
        const loaded = await this.tryLoadApiData();
        if (loaded) {
          // API is available and has data, hide folder selection and show landing
          this.isDataLoaded = true;
          document.getElementById("folder-selection").classList.add("d-none");
          document.getElementById("landing-page").classList.remove("d-none");
          document.getElementById("main-navbar").classList.remove("d-none");
          this.updateLandingPageCounts();
          console.log("Successfully loaded live data from API");

          // Check for hash navigation after loading data
          if (window.location.hash) {
            this.handleHashChange();
          }
          return;
        } else {
          console.log("API available but no data - showing folder selection");
        }
      }
    } catch (error) {
      console.log("API not available, showing folder selection");
    }

    // API not available or no data, try to load saved folder data
    this.loadSavedFolder();
  }

  // Storage utility functions (using localStorage for larger capacity)
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      return false;
    }
  }

  getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return null;
    }
  }

  deleteStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error deleting from localStorage:", error);
    }
  }

  setupEventListeners() {
    const folderInput = document.getElementById("folder-input");
    const clearFolderBtn = document.getElementById("clear-folder-btn");

    folderInput.addEventListener("change", (e) =>
      this.handleFolderSelection(e)
    );
    clearFolderBtn.addEventListener("click", () => this.clearSavedData());

    // Notification history event listeners
    const clearNotificationsBtn = document.getElementById(
      "clearNotificationsBtn"
    );
    if (clearNotificationsBtn) {
      clearNotificationsBtn.addEventListener("click", () =>
        this.clearNotificationHistory()
      );
    }

    // Display notification history when modal opens
    const notificationModal = document.getElementById(
      "notificationHistoryModal"
    );
    if (notificationModal) {
      notificationModal.addEventListener("show.bs.modal", () => {
        this.displayNotificationHistory();
      });
    }
  }

  setupURLRouting() {
    // Handle hash change events for navigation
    window.addEventListener("hashchange", () => {
      this.handleHashChange();
    });

    // Handle initial load with hash
    if (window.location.hash) {
      this.handleHashChange();
    }
  }

  handleHashChange() {
    const hash = window.location.hash.substring(1); // Remove the # symbol

    // Check if any data has been loaded (either from API or saved folder)
    if (!this.isDataLoaded && !this.savedFolderData) {
      // No data loaded yet, ignore hash navigation
      return;
    }

    if (hash) {
      // Navigate to specific section
      const validSections = [
        "livestock",
        "vehicles",
        "fields",
        "economy",
        "pastures",
        "statistics",
      ];
      if (validSections.includes(hash)) {
        this.showSection(hash);
      } else {
        // Invalid section, go to landing page
        this.showLanding();
      }
    } else {
      // No hash, show landing page
      this.showLanding();
    }
  }

  clearSavedData() {
    if (confirm("Are you sure you want to clear the saved folder data?")) {
      this.deleteStorage("livestockFolderData");
      document.getElementById("folder-path").textContent = "No folder selected";
      document.getElementById("clear-folder-btn").classList.add("d-none");
      document.getElementById("folder-selection").classList.remove("d-none");
      document.getElementById("dashboard-content").classList.add("d-none");
      this.animals = [];
      this.filteredAnimals = [];
      this.lastAnimalsDataHash = null;
      if (this.dataTable) {
        this.dataTable.destroy();
        this.dataTable = null;
      }
      this.showSuccessMessage("Saved folder data cleared successfully!");
    }
  }

  unloadData() {
    if (
      confirm(
        "Are you sure you want to unload all farm data? This will clear the stored save folder and return to the selection screen."
      )
    ) {
      this.deleteStorage("livestockFolderData");
      document.getElementById("folder-path").textContent = "No folder selected";
      document.getElementById("clear-folder-btn").classList.add("d-none");
      document.getElementById("main-navbar").classList.add("d-none");
      document.getElementById("folder-selection").classList.remove("d-none");
      document.getElementById("landing-page").classList.add("d-none");
      document.getElementById("dashboard-content").classList.add("d-none");
      document.getElementById("section-content").classList.add("d-none");

      // Reset all data
      this.animals = [];
      this.filteredAnimals = [];
      this.lastAnimalsDataHash = null;
      this.placeables = [];
      this.playerFarms = [];
      this.selectedFarm = null;
      this.selectedFarmId = null;
      this.savedFolderData = null;

      if (this.dataTable) {
        this.dataTable.destroy();
        this.dataTable = null;
      }

      this.showSuccessMessage("All farm data unloaded successfully!");
    }
  }

  refreshData() {
    if (!this.savedFolderData) {
      this.showInfoMessage(
        "No folder data to refresh. Please select a save folder first."
      );
      return;
    }

    // Show the refresh modal instead of browser popup
    const modal = new bootstrap.Modal(
      document.getElementById("refreshDataModal")
    );
    modal.show();
  }

  confirmRefreshData(useFiles) {
    if (useFiles) {
      // Store current data for comparison before refresh
      this.storeDataForComparison();

      // Trigger the folder selection dialog to get fresh files
      this.isRefreshing = true;
      document.getElementById("folder-input").click();
    } else {
      // Store current data for comparison before refresh
      this.storeDataForComparison();

      // Just refresh the display with existing cached data
      this.showInfoMessage("Refreshing display with cached data...");

      // Store current section visibility before refreshing
      const currentSection = this.getCurrentSection();

      // Set refresh flag to prevent navigation changes
      this.isRefreshing = true;

      // Re-parse all data from stored folder data
      if (this.savedFolderData.farmsData) {
        this.parseFarmsData(this.savedFolderData.farmsData);
      }

      // Try to get live data from API first (RealisticLivestock mod data)
      this.tryLoadApiData().then(() => {
        // If API data loaded, don't parse XML files
        if (!this.animals || this.animals.length === 0) {
          // Fallback to XML parsing
          if (this.savedFolderData.xmlData) {
            this.parseRealisticLivestockData(this.savedFolderData.xmlData);
          } else if (this.savedFolderData.placeablesData) {
            this.parsePlaceablesData(this.savedFolderData.placeablesData);
          }
        }

        // Update displays after loading data
        this.updateLandingPageCounts();
        if (currentSection === "livestock") {
          this.updateSummaryCards();
          this.renderAnimalsTable();
        }
      });

      if (this.savedFolderData.environmentData) {
        this.parseEnvironmentData(this.savedFolderData.environmentData);
      }

      // Note: Display updates are now handled in the API loading promise above

      // Clear refresh flag
      this.isRefreshing = false;

      // Compare data and show changes modal
      try {
        this.compareDataAndShowChanges();
      } catch (comparisonError) {
        console.error("Error during data comparison:", comparisonError);
        this.preRefreshData = null; // Clear to prevent further issues
        // Don't throw - comparison is optional, continue with refresh
      }

      this.showSuccessMessage("Display refreshed with cached data");
    }
  }

  showNavbar() {
    document.getElementById("main-navbar").classList.remove("d-none");
    this.updateNavbar();
  }

  hideNavbar() {
    document.getElementById("main-navbar").classList.add("d-none");
  }

  updateNavbar() {
    const currentSection = this.getCurrentSection();
    const sectionTitleElement = document.getElementById("navbar-section-title");
    const homeButton = document.getElementById("nav-home-btn");
    const gameTimeElement = document.getElementById("navbar-game-time");

    // Update section title and show/hide home button
    switch (currentSection) {
      case "landing":
        sectionTitleElement.textContent = "Farm Dashboard";
        homeButton.classList.add("d-none");
        break;
      case "livestock":
        sectionTitleElement.textContent = "Livestock Management";
        homeButton.classList.remove("d-none");
        break;
      case "other-section":
        sectionTitleElement.textContent = "Farm Management";
        homeButton.classList.remove("d-none");
        break;
      default:
        sectionTitleElement.textContent = "Farm Dashboard";
        homeButton.classList.add("d-none");
    }

    // Update game time in navbar
    if (this.gameTime) {
      const timeSpan = gameTimeElement.querySelector("span");
      timeSpan.textContent = this.getGameTimeDisplay();
      gameTimeElement.classList.remove("d-none");
    } else {
      gameTimeElement.classList.add("d-none");
    }
  }

  getCurrentSection() {
    if (!document.getElementById("landing-page").classList.contains("d-none")) {
      return "landing";
    }
    if (
      !document.getElementById("dashboard-content").classList.contains("d-none")
    ) {
      return "livestock";
    }
    if (
      !document.getElementById("section-content").classList.contains("d-none")
    ) {
      return "other-section";
    }
    return null;
  }

  async loadSavedFolder() {
    const savedData = this.getStorage("livestockFolderData");
    if (savedData) {
      try {
        this.savedFolderData = savedData;
        document.getElementById("folder-path").textContent =
          this.savedFolderData.folderName + " (saved)";

        // Load the saved XML data
        if (this.savedFolderData.xmlData) {
          if (this.savedFolderData.farmsData) {
            this.parseFarmsData(this.savedFolderData.farmsData);
            // Farm parsing will handle the rest of the data loading
          } else {
            // No farms data - proceed with placeables data only
            if (this.savedFolderData.placeablesData) {
              this.parsePlaceablesData(this.savedFolderData.placeablesData);
            }
            if (this.savedFolderData.environmentData) {
              this.parseEnvironmentData(this.savedFolderData.environmentData);
            }
            this.showDashboard();
          }
          document
            .getElementById("clear-folder-btn")
            .classList.remove("d-none");
          this.showNavbar();
          this.showSuccessMessage("Previous folder data loaded successfully!");
        }
      } catch (error) {
        console.error("Error loading saved folder data:", error);
        this.deleteStorage("livestockFolderData");
      }
    }
  }

  async tryLoadApiData() {
    try {
      console.log(
        "[API] Attempting to load live data from FarmDashboard API..."
      );
      const apiBaseURL = this.getAPIBaseURL();
      const response = await fetch(`${apiBaseURL}/api/data`);

      if (response.ok) {
        const data = await response.json();
        console.log("[API] Received data from API:", data);

        if (
          data.animals &&
          Array.isArray(data.animals) &&
          data.animals.length > 0
        ) {
          // Extract individual animals from building data
          const allAnimals = [];
          data.animals.forEach((building) => {
            if (building.animals && Array.isArray(building.animals)) {
              allAnimals.push(...building.animals);
            }
          });

          // Check for duplicate animals by ID
          const animalIds = {};
          const duplicateIds = [];
          allAnimals.forEach((animal, index) => {
            if (animalIds[animal.id]) {
              duplicateIds.push(animal.id);
            } else {
              animalIds[animal.id] = index;
            }
          });

          if (duplicateIds.length > 0) {
            // Remove duplicates - keep only the first occurrence of each ID
            const uniqueAnimals = [];
            const seenIds = new Set();
            allAnimals.forEach((animal) => {
              if (!seenIds.has(animal.id)) {
                seenIds.add(animal.id);
                uniqueAnimals.push(animal);
              }
            });

            allAnimals.length = 0;
            allAnimals.push(...uniqueAnimals);
          }

          if (allAnimals.length > 0) {
            // Log first actual animal to verify RealisticLivestock ID

            this.animals = allAnimals;
            console.log("[API] Successfully loaded animal data from API");
            return true;
          } else {
            console.log(
              "[API] No individual animals found in buildings - this is normal for crop-only farms"
            );
            this.animals = []; // Set empty array instead of falling back
            return true; // Return true since API is working, just no animals
          }
        } else {
          console.log(
            "[API] No animal data in API response - this is normal for crop-only farms"
          );
          this.animals = []; // Set empty array instead of falling back
          return true; // Return true since API is working, just no animals
        }
      } else {
        console.log(
          `[API] API request failed with status: ${response.status}, falling back to XML parsing`
        );
        return false;
      }
    } catch (error) {
      console.log(
        "[API] Failed to load from API:",
        error.message,
        "- falling back to XML parsing"
      );
      return false;
    }
  }

  showInfoMessage(message) {
    this.showAlert(message, "info");
  }

  showSuccessMessage(message) {
    this.showAlert(message, "success");
  }

  showMarketBasePricesModal() {
    const modalHtml = `
      <div class="modal fade" id="marketBasePricesModal" tabindex="-1" aria-labelledby="marketBasePricesModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content bg-dark text-white">
            <div class="modal-header border-secondary">
              <h5 class="modal-title" id="marketBasePricesModalLabel">
                <i class="bi bi-info-circle text-primary me-2"></i>
                Understanding "Market Base Prices"
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-info" role="alert">
                <h6><i class="bi bi-graph-up me-2"></i>What is "Market Base Prices"?</h6>
                <p class="mb-0">
                  "Market Base Prices" represents the <strong>baseline economy prices</strong> from Farming Simulator 25's 
                  internal economy system. It reflects current market conditions and economic multipliers.
                </p>
              </div>
              
              <h6 class="text-warning mb-3"><i class="bi bi-lightbulb me-2"></i>How to Interpret Market Position:</h6>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card bg-success bg-opacity-25 border-success mb-3">
                    <div class="card-body">
                      <h6 class="card-title text-success">
                        <i class="bi bi-check-circle-fill me-2"></i>Good Time to Sell
                      </h6>
                      <p class="card-text small">
                        When <strong>physical locations</strong> offer higher prices than "Market Base Prices":
                      </p>
                      <ul class="small mb-0">
                        <li>Real selling stations are competing</li>
                        <li>Physical locations pay premiums</li>
                        <li><strong>Excellent selling opportunity</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card bg-danger bg-opacity-25 border-danger mb-3">
                    <div class="card-body">
                      <h6 class="card-title text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Poor Time to Sell
                      </h6>
                      <p class="card-text small">
                        When "Market Base Prices" is the <strong>highest option</strong>:
                      </p>
                      <ul class="small mb-0">
                        <li>Physical stations offer below-market rates</li>
                        <li>Market conditions good, but stations aren't competing</li>
                        <li><strong>Consider waiting for better prices</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            <div class="modal-footer border-secondary">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('marketBasePricesModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('marketBasePricesModal'));
    modal.show();
    
    // Clean up modal after hiding
    document.getElementById('marketBasePricesModal').addEventListener('hidden.bs.modal', function () {
      this.remove();
    });
  }

  storeDataForComparison() {
    // Store current data state for comparison after refresh - deep copy to prevent reference issues
    this.preRefreshData = {
      animals: this.animals ? JSON.parse(JSON.stringify(this.animals)) : [],
      pastures: this.pastures ? JSON.parse(JSON.stringify(this.pastures)) : [],
      playerFarms: this.playerFarms
        ? JSON.parse(JSON.stringify(this.playerFarms))
        : [],
      gameTime: this.gameTime,
      timestamp: new Date().toISOString(),
    };
  }

  // Data normalization helpers to prevent false positives from parsing inconsistencies
  normalizeNumericValue(value) {
    if (value === null || value === undefined || value === "") return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  normalizeBooleanValue(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      return lower === "true" || lower === "1" || lower === "yes";
    }
    return Boolean(value);
  }

  normalizeStringValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  compareDataAndShowChanges() {
    if (!this.preRefreshData) {
      return; // No comparison data available
    }

    const changes = this.calculateDataChanges();

    // Show toast notifications for significant changes
    this.showChangeToasts(changes);

    // Always show modal when refreshing - either with changes or "no changes" message
    this.displayChangesModal(changes);

    // Clear comparison data
    this.preRefreshData = null;
  }

  calculateDataChanges() {
    const oldData = this.preRefreshData;
    const newData = {
      animals: this.animals || [],
      pastures: this.pastures || [],
      playerFarms: this.playerFarms || [],
      gameTime: this.gameTime,
    };

    const changes = {
      livestock: this.compareLivestock(oldData.animals, newData.animals),
      warnings: this.compareWarnings(oldData.pastures, newData.pastures),
      foodLevels: this.compareFoodLevels(oldData.pastures, newData.pastures),
      statistics: this.compareStatistics(oldData, newData),
      gameTime: {
        old: oldData.gameTime,
        new: newData.gameTime,
        changed: oldData.gameTime !== newData.gameTime,
      },
      refreshTime: new Date().toISOString(),
    };

    return changes;
  }

  hasSignificantChanges(changes) {
    return (
      changes.livestock.added.length > 0 ||
      changes.livestock.removed.length > 0 ||
      changes.livestock.updated.length > 0 ||
      changes.warnings.new.length > 0 ||
      changes.warnings.resolved.length > 0 ||
      (changes.foodLevels && changes.foodLevels.length > 0) ||
      changes.gameTime.changed ||
      changes.statistics.livestockCount.changed ||
      changes.statistics.pastureCount.changed
    );
  }

  compareLivestock(oldAnimals, newAnimals) {
    // Defensive coding - ensure arrays exist and have id property
    if (!Array.isArray(oldAnimals)) oldAnimals = [];
    if (!Array.isArray(newAnimals)) newAnimals = [];

    const oldMap = new Map(
      oldAnimals.filter((a) => a && a.id).map((animal) => [animal.id, animal])
    );
    const newMap = new Map(
      newAnimals.filter((a) => a && a.id).map((animal) => [animal.id, animal])
    );

    const added = newAnimals.filter(
      (animal) => animal && animal.id && !oldMap.has(animal.id)
    );
    const removed = oldAnimals.filter(
      (animal) => animal && animal.id && !newMap.has(animal.id)
    );
    const updated = [];

    // Check for updates in existing animals
    newAnimals.forEach((newAnimal) => {
      if (!newAnimal || !newAnimal.id) return;

      const oldAnimal = oldMap.get(newAnimal.id);
      if (oldAnimal) {
        const changes = {};

        // Normalize and compare health values
        const oldHealth = this.normalizeNumericValue(oldAnimal.health);
        const newHealth = this.normalizeNumericValue(newAnimal.health);
        const healthDiff = Math.abs(oldHealth - newHealth);

        // Only report significant health changes (>15 points to reduce noise)
        if (healthDiff > 15) {
          changes.health = {
            old: Math.round(oldHealth),
            new: Math.round(newHealth),
          };
        }

        // Normalize and compare age values
        const oldAge = this.normalizeNumericValue(oldAnimal.age);
        const newAge = this.normalizeNumericValue(newAnimal.age);
        const ageDiff = newAge - oldAge;

        // Only report realistic age increases (0.05 to 0.5 months per refresh)
        // Ignore tiny changes and large jumps which are likely parsing inconsistencies
        if (ageDiff > 0.05 && ageDiff <= 0.5) {
          changes.age = {
            old: Math.round(oldAge * 100) / 100,
            new: Math.round(newAge * 100) / 100,
          };
        }

        // Compare status fields with proper normalization
        const oldPregnant = this.normalizeBooleanValue(oldAnimal.isPregnant);
        const newPregnant = this.normalizeBooleanValue(newAnimal.isPregnant);
        if (oldPregnant !== newPregnant) {
          changes.pregnancy = { old: oldPregnant, new: newPregnant };
        }

        const oldLactating = this.normalizeBooleanValue(oldAnimal.isLactating);
        const newLactating = this.normalizeBooleanValue(newAnimal.isLactating);
        if (oldLactating !== newLactating) {
          changes.lactating = { old: oldLactating, new: newLactating };
        }

        // Compare location with normalization
        const oldLocation = this.normalizeStringValue(
          oldAnimal.pastureId || oldAnimal.location
        );
        const newLocation = this.normalizeStringValue(
          newAnimal.pastureId || newAnimal.location
        );
        if (oldLocation !== newLocation && (oldLocation || newLocation)) {
          changes.location = {
            old: oldLocation || "Free roaming",
            new: newLocation || "Free roaming",
          };
        }

        // Only add to updated list if there are meaningful changes
        if (Object.keys(changes).length > 0) {
          updated.push({
            animal: newAnimal,
            changes: changes,
          });
        }
      }
    });

    return { added, removed, updated };
  }

  compareWarnings(oldPastures, newPastures) {
    // Defensive coding - ensure arrays exist
    if (!Array.isArray(oldPastures)) oldPastures = [];
    if (!Array.isArray(newPastures)) newPastures = [];

    const oldWarnings = oldPastures.flatMap((p) =>
      p && p.allWarnings && Array.isArray(p.allWarnings)
        ? p.allWarnings.map((w) => ({
            ...w,
            pastureId: p.id || "unknown",
            pastureName: p.name || "Unknown Pasture",
          }))
        : []
    );
    const newWarnings = newPastures.flatMap((p) =>
      p && p.allWarnings && Array.isArray(p.allWarnings)
        ? p.allWarnings.map((w) => ({
            ...w,
            pastureId: p.id || "unknown",
            pastureName: p.name || "Unknown Pasture",
          }))
        : []
    );

    // More robust comparison - normalize warning messages and include warning type
    const normalizeWarning = (w) => {
      const message = w.message || w.text || w.toString();
      const type = w.type || "general";
      return `${w.pastureId}-${type}-${message.toLowerCase().trim()}`;
    };

    const oldWarningStrings = new Set(oldWarnings.map(normalizeWarning));
    const newWarningStrings = new Set(newWarnings.map(normalizeWarning));

    const newWarningsList = newWarnings.filter(
      (w) => !oldWarningStrings.has(normalizeWarning(w))
    );
    const resolvedWarningsList = oldWarnings.filter(
      (w) => !newWarningStrings.has(normalizeWarning(w))
    );

    return {
      new: newWarningsList,
      resolved: resolvedWarningsList,
      total: { old: oldWarnings.length, new: newWarnings.length },
    };
  }

  compareFoodLevels(oldPastures, newPastures) {
    // Defensive coding - ensure arrays exist
    if (!Array.isArray(oldPastures)) oldPastures = [];
    if (!Array.isArray(newPastures)) newPastures = [];

    const foodLevelChanges = [];

    newPastures.forEach((newPasture) => {
      if (!newPasture || !newPasture.id) return;

      const oldPasture = oldPastures.find((p) => p && p.id === newPasture.id);
      if (!oldPasture) return; // Skip new pastures

      const oldFood = parseFloat(
        oldPasture.foodReport?.availableFood ||
          oldPasture.foodReport?.totalMixedRation ||
          0
      );
      const newFood = parseFloat(
        newPasture.foodReport?.availableFood ||
          newPasture.foodReport?.totalMixedRation ||
          0
      );

      // Check if food dropped below 100L threshold
      if (oldFood >= 100 && newFood < 100) {
        foodLevelChanges.push({
          pastureId: newPasture.id,
          pastureName: newPasture.name || "Unknown Pasture",
          oldLevel: oldFood,
          newLevel: newFood,
          type: "low_food_alert",
        });
      }

      // Check for critical food drops (significant decrease > 50L)
      const foodDrop = oldFood - newFood;
      if (foodDrop > 50 && newFood < 200) {
        foodLevelChanges.push({
          pastureId: newPasture.id,
          pastureName: newPasture.name || "Unknown Pasture",
          oldLevel: oldFood,
          newLevel: newFood,
          type: "food_drop",
          amount: foodDrop,
        });
      }
    });

    return foodLevelChanges;
  }

  compareStatistics(oldData, newData) {
    return {
      livestockCount: {
        old: oldData.animals.length,
        new: newData.animals.length,
        changed: oldData.animals.length !== newData.animals.length,
      },
      pastureCount: {
        old: oldData.pastures.length,
        new: newData.pastures.length,
        changed: oldData.pastures.length !== newData.pastures.length,
      },
      farmsCount: {
        old: oldData.playerFarms.length,
        new: newData.playerFarms.length,
        changed: oldData.playerFarms.length !== newData.playerFarms.length,
      },
    };
  }

  displayChangesModal(changes) {
    // Check if there are any changes
    const hasChanges = this.hasSignificantChanges(changes);

    if (!hasChanges) {
      // Show simple "no changes" message
      this.displayNoChangesModal(changes);
    } else {
      // Show detailed changes
      this.populateChangesSummary(changes);
      this.populateLivestockChanges(changes.livestock);
      this.populateWarningsChanges(changes.warnings);
      this.populateStatisticsChanges(changes.statistics, changes.gameTime);
    }

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("dataChangesModal")
    );
    modal.show();
  }

  displayNoChangesModal(changes) {
    // Populate summary cards with zeros
    const summaryContainer = document.getElementById("changesSummaryCards");
    summaryContainer.innerHTML = `
      <div class="col-12">
        <div class="card bg-farm-info text-white">
          <div class="card-body text-center">
            <i class="bi bi-info-circle display-4 mb-3"></i>
            <h4 class="card-title">No Changes Detected</h4>
            <p class="mb-0">Your save data is identical to the previous refresh.</p>
          </div>
        </div>
      </div>
    `;

    // Show basic info in tabs
    document.getElementById("livestockChangesContent").innerHTML =
      '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No livestock changes detected.</div>';

    document.getElementById("warningsChangesContent").innerHTML =
      '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No warning changes detected.</div>';

    // Show game time if it exists, or no changes message
    const container = document.getElementById("statisticsChangesContent");
    let content = "";

    if (changes.gameTime && changes.gameTime.new) {
      content = `
        <div class="text-center py-4">
          <div class="card bg-farm-info bg-opacity-10 border-farm-info">
            <div class="card-body">
              <h6 class="text-farm-info"><i class="bi bi-clock me-1"></i>Current Game Time</h6>
              <strong>${changes.gameTime.new}</strong>
            </div>
          </div>
        </div>
      `;
    } else {
      content =
        '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No statistics changes detected.</div>';
    }

    container.innerHTML = content;
  }

  populateChangesSummary(changes) {
    const summaryContainer = document.getElementById("changesSummaryCards");
    const totalChanges =
      changes.livestock.added.length +
      changes.livestock.removed.length +
      changes.livestock.updated.length +
      changes.warnings.new.length +
      changes.warnings.resolved.length;

    summaryContainer.innerHTML = `
      <div class="col-md-3">
        <div class="card bg-farm-info text-white">
          <div class="card-body text-center">
            <h6 class="card-title">Total Changes</h6>
            <h3 class="mb-0">${totalChanges}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-farm-success text-white">
          <div class="card-body text-center">
            <h6 class="card-title">New Livestock</h6>
            <h3 class="mb-0">${changes.livestock.added.length}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-farm-warning text-dark">
          <div class="card-body text-center">
            <h6 class="card-title">New Warnings</h6>
            <h3 class="mb-0">${changes.warnings.new.length}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-farm-secondary text-white">
          <div class="card-body text-center">
            <h6 class="card-title">Updated Animals</h6>
            <h3 class="mb-0">${changes.livestock.updated.length}</h3>
          </div>
        </div>
      </div>
    `;
  }

  populateLivestockChanges(livestockChanges) {
    const container = document.getElementById("livestockChangesContent");
    let content = "";

    // New animals
    if (livestockChanges.added.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-success"><i class="bi bi-plus-circle me-1"></i>New Animals (${livestockChanges.added.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.added.forEach((animal) => {
        const displayName = this.formatAnimalType(animal.subType);
        content += `
          <li class="list-group-item bg-farm-success bg-opacity-10 border-farm-success">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || "Unnamed"}</strong> - ${displayName}
                <br><small class="text-muted">Age: ${
                  animal.age
                } months, Health: ${Math.round(animal.health)}%</small>
                ${
                  animal.isPregnant
                    ? '<br><small class="text-warning">🤰 Pregnant</small>'
                    : ""
                }
                ${
                  animal.isLactating
                    ? '<br><small class="text-info">🥛 Lactating</small>'
                    : ""
                }
              </div>
              <span class="badge bg-success">NEW</span>
            </div>
          </li>
        `;
      });
      content += "</ul></div>";
    }

    // Removed animals
    if (livestockChanges.removed.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-danger"><i class="bi bi-dash-circle me-1"></i>Removed Animals (${livestockChanges.removed.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.removed.forEach((animal) => {
        const displayName = this.formatAnimalType(animal.subType);
        content += `
          <li class="list-group-item bg-farm-danger bg-opacity-10 border-farm-danger">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || "Unnamed"}</strong> - ${displayName}
                <br><small class="text-muted">Age: ${
                  animal.age
                } months, Health: ${Math.round(animal.health)}%</small>
              </div>
              <span class="badge bg-danger">REMOVED</span>
            </div>
          </li>
        `;
      });
      content += "</ul></div>";
    }

    // Updated animals
    if (livestockChanges.updated.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-warning"><i class="bi bi-arrow-repeat me-1"></i>Updated Animals (${livestockChanges.updated.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.updated.forEach((update) => {
        const animal = update.animal;
        const changes = update.changes;
        const displayName = this.formatAnimalType(animal.subType);

        let changesList = [];
        Object.keys(changes).forEach((key) => {
          const change = changes[key];
          let label = key.charAt(0).toUpperCase() + key.slice(1);
          if (key === "pregnancy") label = "Pregnancy";
          if (key === "lactating") label = "Lactating";

          changesList.push(`${label}: ${change.old} → ${change.new}`);
        });

        content += `
          <li class="list-group-item bg-farm-warning bg-opacity-10 border-farm-warning">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || "Unnamed"}</strong> - ${displayName}
                <br><small class="text-muted">${changesList.join(", ")}</small>
              </div>
              <span class="badge bg-warning text-dark">UPDATED</span>
            </div>
          </li>
        `;
      });
      content += "</ul></div>";
    }

    if (content === "") {
      content =
        '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No livestock changes detected.</div>';
    }

    container.innerHTML = content;
  }

  populateWarningsChanges(warningsChanges) {
    const container = document.getElementById("warningsChangesContent");
    let content = "";

    // New warnings
    if (warningsChanges.new.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-danger"><i class="bi bi-exclamation-triangle me-1"></i>New Warnings (${warningsChanges.new.length})</h6>
      `;
      warningsChanges.new.forEach((warning) => {
        // Try to find the actual pasture name from current pastures
        const pasture = this.pastures.find((p) => p.id === warning.pastureId);
        const pastureName = pasture
          ? pasture.name
          : `Pasture ${warning.pastureId}`;

        content += `
          <div class="alert alert-warning mb-2">
            <strong>${pastureName}:</strong> ${
          warning.message || warning.text || warning
        }
          </div>
        `;
      });
      content += "</div>";
    }

    // Resolved warnings
    if (warningsChanges.resolved.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-success"><i class="bi bi-check-circle me-1"></i>Resolved Warnings (${warningsChanges.resolved.length})</h6>
      `;
      warningsChanges.resolved.forEach((warning) => {
        // Try to find the actual pasture name from current pastures
        const pasture = this.pastures.find((p) => p.id === warning.pastureId);
        const pastureName = pasture
          ? pasture.name
          : `Pasture ${warning.pastureId}`;

        content += `
          <div class="alert alert-success mb-2">
            <strong>${pastureName}:</strong> ${
          warning.message || warning.text || warning
        }
          </div>
        `;
      });
      content += "</div>";
    }

    if (content === "") {
      content =
        '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No warning changes detected.</div>';
    }

    container.innerHTML = content;
  }

  populateStatisticsChanges(stats, gameTime) {
    const container = document.getElementById("statisticsChangesContent");
    let content = "";

    // Game time
    if (gameTime.changed) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-info"><i class="bi bi-clock me-1"></i>Game Time Update</h6>
          <div class="card bg-farm-info bg-opacity-10 border-farm-info">
            <div class="card-body">
              <strong>Time:</strong> ${gameTime.old} → <strong>${gameTime.new}</strong>
            </div>
          </div>
        </div>
      `;
    }

    // Statistics changes
    const statChanges = [];
    if (stats.livestockCount.changed) {
      statChanges.push({
        label: "Livestock Count",
        old: stats.livestockCount.old,
        new: stats.livestockCount.new,
      });
    }
    if (stats.pastureCount.changed) {
      statChanges.push({
        label: "Pasture Count",
        old: stats.pastureCount.old,
        new: stats.pastureCount.new,
      });
    }
    if (stats.farmsCount.changed) {
      statChanges.push({
        label: "Farms Count",
        old: stats.farmsCount.old,
        new: stats.farmsCount.new,
      });
    }

    if (statChanges.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-accent"><i class="bi bi-graph-up me-1"></i>Statistics Changes</h6>
          <div class="row">
      `;
      statChanges.forEach((stat) => {
        const changeType = stat.new > stat.old ? "success" : "danger";
        const icon = stat.new > stat.old ? "arrow-up" : "arrow-down";
        content += `
          <div class="col-md-4 mb-2">
            <div class="card bg-farm-${changeType} bg-opacity-10 border-farm-${changeType}">
              <div class="card-body text-center py-2">
                <strong>${stat.label}</strong>
                <br><i class="bi bi-${icon} me-1"></i>${stat.old} → ${stat.new}
              </div>
            </div>
          </div>
        `;
      });
      content += "</div></div>";
    }

    if (content === "") {
      content =
        '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No statistics changes detected.</div>';
    }

    container.innerHTML = content;
  }

  showAlert(message, type) {
    // Create or get the toast container
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "toast-container";
      toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1055;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
      document.body.appendChild(toastContainer);
    }

    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.cssText = `
            min-width: 320px;
            border-radius: 12px;
            border: 2px solid rgba(85, 107, 47, 0.3);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(15px);
            margin-bottom: 0;
        `;
    alertDiv.innerHTML = `
            <i class="bi bi-${
              type === "success" ? "check-circle" : "info-circle"
            } me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

    toastContainer.appendChild(alertDiv);

    // Add click handler for close button
    const closeBtn = alertDiv.querySelector(".btn-close");
    closeBtn.addEventListener("click", () => {
      alertDiv.classList.remove("show");
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 150);
    });

    // Auto-remove after timeout
    setTimeout(
      () => {
        if (alertDiv.parentNode) {
          alertDiv.classList.remove("show");
          setTimeout(() => {
            if (alertDiv.parentNode) {
              alertDiv.remove();
            }
          }, 150);
        }
      },
      type === "success" ? 3000 : 4000
    );
  }

  showChangeToasts(changes) {
    // Only show toasts for significant changes, not when manually refreshing
    if (!this.hasSignificantChanges(changes)) {
      return;
    }

    // Animal additions
    if (changes.livestock.added.length > 0) {
      const count = changes.livestock.added.length;
      const clickableIds = this.createClickableAnimalIds(
        changes.livestock.added
      );
      const plainIds = changes.livestock.added
        .slice(0, 3)
        .map((a) => `#${a.id}`)
        .join(", ");

      const displayTextHtml =
        count > 3 ? `${clickableIds} +${count - 3} more` : clickableIds;
      const displayTextPlain =
        count > 3 ? `${plainIds} +${count - 3} more` : plainIds;

      const messageHtml = `🐄 ${count} new animal${
        count > 1 ? "s" : ""
      } added: ${displayTextHtml}`;
      this.showAlert(messageHtml, "success");

      // Add to notification history (use plain text for storage)
      this.addNotificationToHistory({
        type: "added",
        title: `${count} Animal${count > 1 ? "s" : ""} Added`,
        message: displayTextPlain,
        messageHtml: displayTextHtml, // Store both versions
      });
    }

    // Animal removals
    if (changes.livestock.removed.length > 0) {
      const count = changes.livestock.removed.length;
      const clickableIds = this.createClickableAnimalIds(
        changes.livestock.removed
      );
      const plainIds = changes.livestock.removed
        .slice(0, 3)
        .map((a) => `#${a.id}`)
        .join(", ");

      const displayTextHtml =
        count > 3 ? `${clickableIds} +${count - 3} more` : clickableIds;
      const displayTextPlain =
        count > 3 ? `${plainIds} +${count - 3} more` : plainIds;

      const messageHtml = `📦 ${count} animal${
        count > 1 ? "s" : ""
      } removed: ${displayTextHtml}`;
      this.showAlert(messageHtml, "warning");

      // Add to notification history (use plain text for storage)
      this.addNotificationToHistory({
        type: "removed",
        title: `${count} Animal${count > 1 ? "s" : ""} Removed`,
        message: displayTextPlain,
        messageHtml: displayTextHtml, // Store both versions
      });
    }

    // Lactation status changes
    const lactatingChanges = changes.livestock.updated.filter(
      (u) => u.changes.lactating
    );
    lactatingChanges.forEach((update) => {
      const animal = update.animal;
      const clickableId = this.createClickableAnimalId(animal.id);
      const plainId = `#${animal.id}`;
      const isStarting = update.changes.lactating.new;

      if (isStarting) {
        this.showAlert(`🥛 ${clickableId} started lactating`, "info");
        // Add to notification history
        this.addNotificationToHistory({
          type: "info",
          title: "Lactation Started",
          message: `${plainId} started lactating`,
          messageHtml: `${clickableId} started lactating`,
        });
      } else {
        this.showAlert(`⏸️ ${clickableId} stopped lactating`, "info");
        // Add to notification history
        this.addNotificationToHistory({
          type: "info",
          title: "Lactation Stopped",
          message: `${plainId} stopped lactating`,
          messageHtml: `${clickableId} stopped lactating`,
        });
      }
    });

    // Pregnancy status changes
    const pregnancyChanges = changes.livestock.updated.filter(
      (u) => u.changes.pregnancy
    );
    pregnancyChanges.forEach((update) => {
      const animal = update.animal;
      const clickableId = this.createClickableAnimalId(animal.id);
      const plainId = `#${animal.id}`;
      const isStarting = update.changes.pregnancy.new;

      if (isStarting) {
        this.showAlert(`🤰 ${clickableId} is now pregnant`, "info");
        // Add to notification history
        this.addNotificationToHistory({
          type: "info",
          title: "Pregnancy Started",
          message: `${plainId} is now pregnant`,
          messageHtml: `${clickableId} is now pregnant`,
        });
      } else {
        this.showAlert(`👶 ${clickableId} gave birth!`, "success");
        // Add to notification history
        this.addNotificationToHistory({
          type: "success",
          title: "Birth",
          message: `${plainId} gave birth!`,
          messageHtml: `${clickableId} gave birth!`,
        });
      }
    });

    // Food level changes (specific threshold monitoring)
    if (changes.foodLevels && changes.foodLevels.length > 0) {
      changes.foodLevels.forEach((foodChange) => {
        if (foodChange.type === "low_food_alert") {
          this.showAlert(
            `🥣 ${
              foodChange.pastureName
            } food below 100L (${foodChange.newLevel.toFixed(1)}L)`,
            "warning"
          );
        } else if (foodChange.type === "food_drop") {
          this.showAlert(
            `📉 ${
              foodChange.pastureName
            } food dropped by ${foodChange.amount.toFixed(1)}L`,
            "info"
          );
        }
      });
    }

    // Food warnings (low food levels from warning system)
    if (changes.warnings && changes.warnings.new) {
      const foodWarnings = changes.warnings.new.filter(
        (w) => w.type === "food"
      );
      foodWarnings.forEach((warning) => {
        if (
          warning.message.includes("Critical") ||
          warning.message.includes("Low")
        ) {
          this.showAlert(
            `⚠️ ${warning.pastureName}: ${warning.message}`,
            "warning"
          );
        }
      });
    }

    // Health warnings (critical health changes)
    const healthChanges = changes.livestock.updated.filter(
      (u) => u.changes.health && u.changes.health.new < 30
    );
    healthChanges.forEach((update) => {
      const animal = update.animal;
      const animalName = animal.name || `#${animal.id}`;
      const health = update.changes.health.new;

      this.showAlert(`🚨 ${animalName} health critical: ${health}%`, "danger");
    });
  }

  setupTabs() {
    // Bootstrap handles tab switching automatically, no custom code needed
  }

  switchTab(tabName) {
    // Bootstrap handles this automatically with data-bs-toggle="pill"
  }

  async handleFolderSelection(event) {
    const files = Array.from(event.target.files);
    const animalSystemFile = files.find(
      (file) => file.name === "animalSystem.xml"
    );
    const placeablesFile = files.find((file) => file.name === "placeables.xml");
    const farmsFile = files.find((file) => file.name === "farms.xml");
    const environmentFile = files.find(
      (file) => file.name === "environment.xml"
    );

    if (!animalSystemFile) {
      alert(
        "animalSystem.xml not found in selected folder. Please select a valid save folder."
      );
      return;
    }

    const folderName = animalSystemFile.webkitRelativePath.split("/")[0];
    document.getElementById("folder-path").textContent = folderName;

    try {
      const xmlContent = await this.readFileAsText(animalSystemFile);
      let placeablesContent = null;
      let farmsContent = null;
      let environmentContent = null;

      if (placeablesFile) {
        placeablesContent = await this.readFileAsText(placeablesFile);
      }

      if (farmsFile) {
        farmsContent = await this.readFileAsText(farmsFile);
      }

      if (environmentFile) {
        environmentContent = await this.readFileAsText(environmentFile);
      }

      // Save folder data to localStorage (much larger capacity than cookies)
      const folderData = {
        folderName: folderName,
        xmlData: xmlContent,
        placeablesData: placeablesContent,
        farmsData: farmsContent,
        environmentData: environmentContent,
        lastUpdated: new Date().toISOString(),
      };

      if (this.setStorage("livestockFolderData", folderData)) {
        this.showSuccessMessage(
          "Folder data saved! It will auto-load on refresh."
        );
      } else {
        this.showInfoMessage(
          "Data loaded but could not be saved (too large for storage)."
        );
      }

      // Store the folder data for later processing
      this.savedFolderData = folderData;

      // Store current data for comparison if we have existing data (for automatic change detection)
      const hasExistingData = this.animals && this.animals.length > 0;
      if (hasExistingData && !this.isRefreshing) {
        // This is a normal data load (not a manual refresh), but we have existing data to compare
        this.storeDataForComparison();
      }

      // Check if this is a refresh operation (preserve current view)
      const wasRefreshing = this.isRefreshing;
      const currentSection = wasRefreshing ? this.getCurrentSection() : null;

      if (farmsContent) {
        try {
          this.parseFarmsData(farmsContent);
          // Farm parsing will handle showing modal or proceeding directly
        } catch (parseError) {
          console.error("Error parsing farms data:", parseError);
          throw new Error("Failed to parse farms.xml: " + parseError.message);
        }
      } else {
        // No farms data - proceed with placeables data only
        if (placeablesContent) {
          try {
            this.parsePlaceablesData(placeablesContent);
          } catch (parseError) {
            console.error("Error parsing placeables data:", parseError);
            throw new Error(
              "Failed to parse placeables.xml: " + parseError.message
            );
          }
        }
        if (environmentContent) {
          try {
            this.parseEnvironmentData(environmentContent);
          } catch (parseError) {
            console.error("Error parsing environment data:", parseError);
            throw new Error(
              "Failed to parse environment.xml: " + parseError.message
            );
          }
        }

        // Only show dashboard if not refreshing, otherwise preserve current view
        if (!wasRefreshing) {
          this.showDashboard();
        }
      }

      document.getElementById("clear-folder-btn").classList.remove("d-none");
      this.showNavbar();

      // Update displays if refreshing
      if (wasRefreshing) {
        this.updateLandingPageCounts();
        if (currentSection === "livestock") {
          this.updateSummaryCards();
          this.renderAnimalsTable();
        }
        this.isRefreshing = false;

        // Compare data and show changes modal if this was a refresh
        if (this.preRefreshData) {
          try {
            this.compareDataAndShowChanges();
          } catch (comparisonError) {
            console.error("Error during data comparison:", comparisonError);
            this.preRefreshData = null; // Clear to prevent further issues
            // Don't throw - comparison is optional, continue with refresh
          }
        }
      }

      // Check for automatic changes if we have comparison data (for both refresh and normal loads)
      if (this.preRefreshData && !wasRefreshing) {
        try {
          // Show only toast notifications for normal data loads (no modal)
          const changes = this.calculateDataChanges();
          this.showChangeToasts(changes);
          this.preRefreshData = null; // Clear comparison data
        } catch (comparisonError) {
          console.error(
            "Error during automatic change detection:",
            comparisonError
          );
          this.preRefreshData = null; // Clear to prevent further issues
        }
      }
    } catch (error) {
      console.error("Error in handleFolderSelection:", error);
      console.error("Error stack:", error.stack);

      // Provide more specific error messages
      let errorMessage = "Error processing save data: ";
      if (error.name === "SyntaxError") {
        errorMessage +=
          "Invalid XML file format. Please check your save files.";
      } else if (error.message && error.message.includes("storage")) {
        errorMessage +=
          "Unable to save data to browser storage. File may be too large.";
      } else if (error.message && error.message.includes("comparison")) {
        errorMessage +=
          "Error comparing data changes. Data processed successfully.";
        // Still continue with the process if it's just a comparison error
        this.preRefreshData = null; // Clear comparison data
        return;
      } else {
        errorMessage +=
          error.message || "Unknown error occurred. Please try again.";
      }

      alert(errorMessage);

      // Reset states
      this.isRefreshing = false;
      this.preRefreshData = null;
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  parseFarmsData(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error("XML parsing error in farms:", parseError.textContent);
      return;
    }

    const farmElements = xmlDoc.querySelectorAll("farm");
    this.playerFarms = [];

    farmElements.forEach((farm) => {
      const farmId = farm.getAttribute("farmId");
      const farmName = farm.getAttribute("name") || `Farm ${farmId}`;

      // Check if this farm has players (indicating it's a player farm)
      const players = farm.querySelector("players");
      if (players && players.children.length > 0) {
        // Get the internal farm ID from statistics
        const statisticsElement = farm.querySelector("statistics");
        let internalFarmId = farmId;
        if (statisticsElement) {
          const farmIdElement = statisticsElement.querySelector("farmId");
          if (farmIdElement) {
            internalFarmId = farmIdElement.textContent;
          }
        }

        this.playerFarms.push({
          id: farmId, // External farm ID (used by placeables)
          internalId: internalFarmId, // Internal farm ID (used by animals)
          name: farmName,
          isDefault: this.playerFarms.length === 0, // First farm is default
        });
      }
    });

    // Set the default selected farm (first player farm)
    if (this.playerFarms.length > 0) {
      this.selectedFarm = this.playerFarms[0]; // Store the entire farm object
      this.selectedFarmId = this.playerFarms[0].internalId; // Keep for backward compatibility
    }

    // Proceed directly with data loading since we no longer need farm selection
    // Only call proceedWithDataLoading if we're not in a refresh operation
    if (!this.isRefreshing) {
      this.proceedWithDataLoading();
    }
  }

  showFarmSelectionModal() {
    const farmList = document.getElementById("farm-selection-list");
    farmList.innerHTML = "";

    this.playerFarms.forEach((farm, index) => {
      const farmOption = document.createElement("button");
      farmOption.className = `list-group-item list-group-item-action bg-secondary text-light d-flex justify-content-between align-items-center`;
      farmOption.innerHTML = `
                <div>
                    <h6 class="mb-1">${farm.name}</h6>
                    <small class="text-muted">Farm ID: ${farm.id} (Internal: ${farm.internalId})</small>
                </div>
                <i class="bi bi-arrow-right"></i>
            `;

      farmOption.addEventListener("click", () => {
        this.selectFarm(farm);
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("farmSelectionModal")
        );
        modal.hide();
      });

      farmList.appendChild(farmOption);
    });

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("farmSelectionModal")
    );
    modal.show();
  }

  selectFarm(farm) {
    this.selectedFarm = farm;
    this.selectedFarmId = farm.internalId;

    // Update the dropdown selector and proceed with data loading
    this.populateFarmSelector();
    this.proceedWithDataLoading();
  }

  proceedWithDataLoading() {
    // Parse placeables data which contains all the animal data we need
    if (this.savedFolderData.placeablesData) {
      this.parsePlaceablesData(this.savedFolderData.placeablesData);
    }
    // Parse environment data for game time
    if (this.savedFolderData.environmentData) {
      this.parseEnvironmentData(this.savedFolderData.environmentData);
    }

    // Parse animalSystem.xml for RealisticLivestock data
    if (this.savedFolderData.xmlData) {
      this.parseRealisticLivestockData(this.savedFolderData.xmlData);
    }

    // Only show dashboard if not refreshing
    if (!this.isRefreshing) {
      this.showDashboard();
    } else {
      // If refreshing, just update displays
      this.updateLandingPageCounts();
      const currentSection = this.getCurrentSection();
      if (currentSection === "livestock") {
        this.updateSummaryCards();
        this.renderAnimalsTable();
      }
    }
  }

  populateFarmSelector() {
    const farmSelect = document.getElementById("farm-select");
    const farmSelector = document.getElementById("farm-selector");

    if (this.playerFarms.length > 0) {
      // Always show farm selector when farms are available
      farmSelector.style.display = "block";
      farmSelect.innerHTML = "";

      this.playerFarms.forEach((farm) => {
        const option = document.createElement("option");
        option.value = farm.internalId;
        option.textContent = farm.name;
        option.selected = farm.internalId === this.selectedFarmId;
        farmSelect.appendChild(option);
      });
    } else {
      farmSelector.style.display = "none";
    }
  }

  refreshAnimalData() {
    if (!this.savedFolderData || !this.savedFolderData.xmlData) {
      return;
    }

    // Re-parse animal data with new farm filter
    this.parseAnimalData(this.savedFolderData.xmlData);
    this.updateSummaryCards();
    this.renderAnimalsTable();
  }

  parsePlaceablesData(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error("XML parsing error in placeables:", parseError.textContent);
      return;
    }

    const placeableElements = xmlDoc.querySelectorAll("placeable");
    this.placeables = [];
    this.animals = []; // Reset animals array - we'll populate it from placeables
    this.lastAnimalsDataHash = null;
    let totalAnimalsInBuildings = 0;

    placeableElements.forEach((placeable) => {
      const uniqueId = placeable.getAttribute("uniqueId") || "";
      const name = placeable.getAttribute("name") || "";
      const farmId = placeable.getAttribute("farmId") || "";
      const filename = placeable.getAttribute("filename") || "";

      // Check if this is a livestock building (has husbandryAnimals section)
      const husbandryAnimals = placeable.querySelector("husbandryAnimals");
      if (husbandryAnimals) {
        // Extract capacity information from various possible locations
        const maxAnimals =
          husbandryAnimals.getAttribute("maxAnimals") ||
          husbandryAnimals.getAttribute("maxAnimalCount") ||
          husbandryAnimals.getAttribute("capacity") ||
          husbandryAnimals.getAttribute("animalLimit") ||
          husbandryAnimals.getAttribute("maxNumAnimals") ||
          husbandryAnimals.getAttribute("numAnimalsMax") ||
          placeable.getAttribute("capacity") ||
          placeable.getAttribute("maxAnimals") ||
          placeable.getAttribute("animalCapacity");

        // Check child elements for capacity - look for more possible element names
        const animalLimitElement =
          husbandryAnimals.querySelector("animalLimit") ||
          husbandryAnimals.querySelector("maxAnimals") ||
          husbandryAnimals.querySelector("capacity") ||
          husbandryAnimals.querySelector("maxNumAnimals") ||
          husbandryAnimals.querySelector("numAnimalsMax") ||
          husbandryAnimals.querySelector("animalCapacity");
        const animalLimitFromElement = animalLimitElement
          ? animalLimitElement.textContent
          : null;

        // Check for custom fencing and calculate area-based capacity
        const husbandryFence = placeable.querySelector("husbandryFence");
        let fenceCapacity = null;
        if (husbandryFence) {
          const fence = husbandryFence.querySelector("fence");
          if (fence) {
            const segments = fence.querySelectorAll("segment");
            if (segments.length > 0) {
              const fenceResult = this.calculateFenceCapacity(segments);
              if (fenceResult && typeof fenceResult === "object") {
                fenceCapacity = fenceResult.capacity;
                // Store calculation details for later use
                window.fenceCalculationDetails =
                  window.fenceCalculationDetails || {};
                window.fenceCalculationDetails[uniqueId] =
                  fenceResult.calculationDetails;
              } else {
                fenceCapacity = fenceResult; // Handle old return format
              }
            }
          }
        }

        // Only process buildings that belong to the selected player farm
        const selectedExternalFarmId = this.selectedFarm?.id;
        if (String(farmId) !== String(selectedExternalFarmId)) {
          return;
        }

        // Parse all animals from clusters within husbandryAnimals
        const clusters = husbandryAnimals.querySelectorAll("clusters");
        let buildingAnimalCount = 0;

        clusters.forEach((cluster, clusterIndex) => {
          const animals = cluster.querySelectorAll("animal");

          animals.forEach((animal, animalIndex) => {
            // Debug: Log all attributes to find RealisticLivestock ID (disabled)
            // if (animalIndex === 0 && clusterIndex === 0) {
            //   console.log("[DEBUG] First animal attributes:");
            //   for (let attr of animal.attributes) {
            //     console.log(`  ${attr.name} = ${attr.value}`);
            //   }
            // }

            // Try to get RealisticLivestock ID - check all possible attribute names
            const realisticLivestockId =
              animal.getAttribute("id") || // Standard id attribute
              animal.getAttribute("rlId") ||
              animal.getAttribute("livestockId") ||
              animal.getAttribute("uniqueId") ||
              animal.getAttribute("animalId");

            // If the ID looks like a position (e.g., contains hyphen), it's not the real ID
            const isRealId =
              realisticLivestockId && !realisticLivestockId.includes("-");
            const animalId = isRealId
              ? realisticLivestockId
              : `temp-${clusterIndex}-${animalIndex}`;

            const animalName =
              animal.getAttribute("name") || `Animal #${animalId}`;
            const animalSubType = animal.getAttribute("subType") || "Unknown";

            // Always process the animal, even without a proper ID
            if (true) {
              // Always process
              // Use the placeable's name as the building name
              const buildingName = name || "Livestock Building";

              // Create the full animal data object directly from placeables.xml
              const animalData = {
                id: animalId,
                name: animalName,
                age: parseInt(animal.getAttribute("age")) || 0,
                health: parseFloat(animal.getAttribute("health")) || 0,
                monthsSinceLastBirth:
                  parseInt(animal.getAttribute("monthsSinceLastBirth")) || 0,
                gender: animal.getAttribute("gender") || "Unknown",
                subType: animalSubType,
                reproduction:
                  parseFloat(animal.getAttribute("reproduction")) || 0,
                isParent: animal.getAttribute("isParent") === "true",
                isPregnant: animal.getAttribute("isPregnant") === "true",
                isLactating: animal.getAttribute("isLactating") === "true",
                farmId: animal.getAttribute("farmId") || "Unknown",
                motherId: animal.getAttribute("motherId") || "-1",
                fatherId: animal.getAttribute("fatherId") || "-1",
                weight: parseFloat(animal.getAttribute("weight")) || 0,
                variation: parseInt(animal.getAttribute("variation")) || 1,
                location: buildingName,
                locationType: "Livestock Building",
                type: animalSubType.split("_")[0], // Extract animal type (COW, PIG, etc.)
                genetics: null,
              };

              // Parse genetics data if available
              const geneticsElement = animal.querySelector("genetics");
              if (geneticsElement) {
                animalData.genetics = {
                  metabolism:
                    parseFloat(geneticsElement.getAttribute("metabolism")) || 0,
                  quality:
                    parseFloat(geneticsElement.getAttribute("quality")) || 0,
                  health:
                    parseFloat(geneticsElement.getAttribute("health")) || 0,
                  fertility:
                    parseFloat(geneticsElement.getAttribute("fertility")) || 0,
                  productivity:
                    parseFloat(geneticsElement.getAttribute("productivity")) ||
                    0,
                };
              }

              // Add directly to animals array
              this.animals.push(animalData);
              buildingAnimalCount++;
              totalAnimalsInBuildings++;
            }
          });
        });

        if (buildingAnimalCount > 0) {
          // Store all animals for this building
          const placeableName = name || "Livestock Building";
          const buildingAnimals = this.animals.filter(
            (animal) => animal.location === placeableName
          );

          // Extract capacity information from multiple sources (prioritize fence calculation)
          const attributeCapacity = maxAnimals
            ? parseInt(maxAnimals)
            : animalLimitFromElement
            ? parseInt(animalLimitFromElement)
            : null;
          const estimatedCapacity = this.estimatePastureCapacity(filename);
          const finalCapacity =
            fenceCapacity || attributeCapacity || estimatedCapacity;

          this.placeables.push({
            uniqueId: uniqueId,
            name: placeableName,
            type: "Livestock Building",
            farmId: farmId,
            filename: filename,
            animalCount: buildingAnimalCount,
            animals: buildingAnimals,
            capacity: finalCapacity,
          });
        }
      }
    });

    this.filteredAnimals = [...this.animals];
  }

  parseEnvironmentData(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error(
        "XML parsing error in environment:",
        parseError.textContent
      );
      return;
    }

    // Try different possible root elements
    let environmentElement = xmlDoc.querySelector("environment");
    if (!environmentElement) {
      environmentElement = xmlDoc.documentElement; // Use root element if no 'environment' tag
    }

    if (environmentElement) {
      // Try to find dayTime and currentDay elements
      const dayTimeElement =
        environmentElement.querySelector("dayTime") ||
        environmentElement.querySelector("currentDayTime") ||
        environmentElement.querySelector("time");
      const currentDayElement =
        environmentElement.querySelector("currentDay") ||
        environmentElement.querySelector("day");

      if (dayTimeElement || currentDayElement) {
        this.gameTime = {
          dayTime: dayTimeElement ? parseFloat(dayTimeElement.textContent) : 0,
          currentDay: currentDayElement
            ? parseInt(currentDayElement.textContent)
            : 1,
        };
      } else {
        // No time elements found
      }
    } else {
    }
  }

  formatGameTime(dayTimeMinutes) {
    const hours = Math.floor(dayTimeMinutes / 60);
    const minutes = Math.floor(dayTimeMinutes % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  getGameTimeDisplay() {
    // Check if we have gameTime data (from API or file)
    if (!this.gameTime) {
      // If using API mode, show a different message
      if (this.realtimeConnector?.isConnected) {
        return "Waiting for game time data...";
      }
      // Check if environment.xml wasn't found or parsed
      if (!this.savedFolderData?.environmentData) {
        return "Time: environment.xml not found";
      }
      return "Time: Unable to parse environment data";
    }

    // Handle API format gameTime data
    if (typeof this.gameTime === "string") {
      // If gameTime is a string from the API (e.g., "Day 5, 10:30")
      return this.gameTime;
    }

    // Handle object format with separate hour/minute fields (prioritize this)
    if (
      (this.gameTime.hour !== undefined ||
        this.gameTime.minute !== undefined) &&
      (this.gameTime.currentDay !== undefined ||
        this.gameTime.day !== undefined)
    ) {
      const hour = parseInt(this.gameTime.hour) || 0;
      const minute = parseInt(this.gameTime.minute) || 0;
      const currentDay =
        parseInt(this.gameTime.currentDay || this.gameTime.day) || 1;

      // Convert to HH:MM format
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      return timeString;
    }

    // Handle object format with dayTime (could be in milliseconds or minutes)
    if (
      this.gameTime.dayTime !== undefined &&
      (this.gameTime.currentDay !== undefined ||
        this.gameTime.day !== undefined)
    ) {
      let dayTimeMinutes = parseInt(this.gameTime.dayTime) || 0;

      // If dayTime is very large, it's likely in milliseconds - convert to minutes
      if (dayTimeMinutes > 1440) {
        // 1440 minutes = 24 hours
        dayTimeMinutes = Math.floor(dayTimeMinutes / 1000 / 60); // milliseconds to minutes
      }

      // Support both currentDay (old format) and day (new format from Lua)
      const currentDay =
        parseInt(this.gameTime.currentDay || this.gameTime.day) || 1;

      return this.formatGameTime(dayTimeMinutes);
    }

    // Fallback if gameTime exists but in unexpected format
    console.log("[DEBUG] Unexpected gameTime format:", this.gameTime);
    return `Time format error: ${JSON.stringify(this.gameTime)}`;
  }

  updateGameTimeDisplay() {
    // Update all game time display elements
    const gameTimeElement = document.getElementById("game-time-display");
    if (gameTimeElement) {
      gameTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${this.getGameTimeDisplay()}`;
    }

    // Update navbar game time if it exists
    const navbarGameTime = document.getElementById("navbar-game-time");
    if (navbarGameTime) {
      navbarGameTime.innerHTML = `<i class="bi bi-clock me-1"></i><span>${this.getGameTimeDisplay()}</span>`;
      navbarGameTime.classList.remove("d-none");
    }

    // Update weather display
    this.updateWeatherDisplay();
  }

  getWeatherIcon(weatherType) {
    const type = (weatherType || 'unknown').toLowerCase();
    switch(type) {
      case 'sun':
      case 'sunny':
      case 'clear':
        return 'bi-sun';
      case 'cloudy':
      case 'overcast':
        return 'bi-cloudy';
      case 'rain':
      case 'rainy':
        return 'bi-cloud-rain';
      case 'snow':
      case 'snowy':
        return 'bi-snow';
      case 'fog':
      case 'foggy':
        return 'bi-cloud-fog';
      case 'hail':
        return 'bi-cloud-hail';
      default:
        return 'bi-cloud';
    }
  }

  updateWeatherDisplay() {
    const navbarWeather = document.getElementById("navbar-weather");
    const tempElement = document.getElementById("navbar-temperature");
    const weatherElement = document.getElementById("navbar-weather-condition");
    
    if (!navbarWeather || !tempElement || !weatherElement) return;

    if (this.weather && (this.weather.currentTemperature !== undefined || this.weather.currentWeather !== undefined)) {
      // Update temperature
      const temp = this.weather.currentTemperature !== undefined ? 
        `${Math.round(this.weather.currentTemperature)}°C` : '--°C';
      tempElement.textContent = temp;

      // Update weather condition
      let weatherCondition = this.weather.currentWeather || 'unknown';
      let weatherIcon = 'bi-cloud';
      
      // Map weather conditions to appropriate icons
      switch(weatherCondition.toLowerCase()) {
        case 'sun':
        case 'sunny':
        case 'clear':
          weatherIcon = 'bi-sun';
          weatherCondition = 'Sunny';
          break;
        case 'cloudy':
        case 'overcast':
          weatherIcon = 'bi-cloudy';
          weatherCondition = 'Cloudy';
          break;
        case 'rain':
        case 'rainy':
          weatherIcon = 'bi-cloud-rain';
          weatherCondition = 'Rainy';
          break;
        case 'snow':
        case 'snowy':
          weatherIcon = 'bi-snow';
          weatherCondition = 'Snow';
          break;
        case 'fog':
        case 'foggy':
          weatherIcon = 'bi-cloud-fog';
          weatherCondition = 'Foggy';
          break;
        default:
          weatherIcon = 'bi-cloud';
          weatherCondition = 'Unknown';
      }

      weatherElement.textContent = weatherCondition;
      
      // Update weather icon
      const weatherIconElement = navbarWeather.querySelector('i.bi-cloud, i.bi-sun, i.bi-cloudy, i.bi-cloud-rain, i.bi-snow, i.bi-cloud-fog');
      if (weatherIconElement) {
        weatherIconElement.className = `bi ${weatherIcon} ms-2 me-1`;
      }

      // Add click handler for weather modal
      navbarWeather.style.cursor = 'pointer';
      navbarWeather.onclick = () => this.showWeatherModal();

      navbarWeather.classList.remove("d-none");
    } else {
      navbarWeather.classList.add("d-none");
    }
  }

  showWeatherModal() {
    const modal = new bootstrap.Modal(document.getElementById('weatherForecastModal'));
    
    // Update modal with current weather data
    if (this.weather) {
      // Update current weather in modal
      const modalTemp = document.getElementById('modal-temperature');
      const modalCondition = document.getElementById('modal-weather-condition');
      const modalIcon = document.getElementById('modal-weather-icon');
      const modalWindSpeed = document.getElementById('modal-wind-speed');
      const modalCloudCoverage = document.getElementById('modal-cloud-coverage');
      const modalRainLevel = document.getElementById('modal-rain-level');
      
      if (modalTemp) {
        modalTemp.textContent = this.weather.currentTemperature !== undefined ? 
          `${Math.round(this.weather.currentTemperature)}°C` : '--°C';
      }
      
      if (modalCondition) {
        const weatherType = this.weather.currentWeather || 'unknown';
        modalCondition.textContent = weatherType.charAt(0).toUpperCase() + weatherType.slice(1);
      }
      
      if (modalIcon) {
        const iconClass = this.getWeatherIcon(this.weather.currentWeather || 'unknown');
        modalIcon.innerHTML = `<i class="bi ${iconClass}"></i>`;
      }
      
      if (modalWindSpeed) {
        modalWindSpeed.textContent = Math.round(this.weather.windSpeed || 0);
      }
      
      if (modalCloudCoverage) {
        modalCloudCoverage.textContent = Math.round((this.weather.cloudCoverage || 0) * 100);
      }
      
      if (modalRainLevel) {
        modalRainLevel.textContent = Math.round((this.weather.rainLevel || 0) * 100);
      }
      
      // Update forecast
      const forecastContainer = document.getElementById('forecast-days');
      if (forecastContainer) {
        forecastContainer.innerHTML = '';
        
        if (this.weather.forecast && Array.isArray(this.weather.forecast) && this.weather.forecast.length > 0) {
          this.weather.forecast.slice(0, 3).forEach((day, index) => {
            const dayLabel = index === 0 ? 'Tomorrow' : index === 1 ? 'Day After' : `Day ${index + 1}`;
            const weatherIcon = this.getWeatherIcon(day.weatherType);
            
            const forecastCard = `
              <div class="col-4">
                <div class="card bg-secondary bg-opacity-25 border-secondary">
                  <div class="card-body text-center p-2">
                    <h6 class="card-title text-farm-accent">${dayLabel}</h6>
                    <div class="fs-2 mb-2">
                      <i class="bi ${weatherIcon}"></i>
                    </div>
                    <div class="small">
                      <strong>${day.weatherType}</strong><br>
                      ${day.minTemperature}° - ${day.maxTemperature}°C
                      ${day.precipitationChance > 0 ? `<br><i class="bi bi-droplet"></i> ${day.precipitationChance}%` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
            
            forecastContainer.innerHTML += forecastCard;
          });
        } else {
          forecastContainer.innerHTML = '<div class="col-12 text-center text-muted">No forecast data available</div>';
        }
      }
    }
    
    modal.show();
  }

  updateMilkValues() {
    if (!this.milkPrice || this.milkPrice <= 0) {
      return;
    }

    // Milk values calculation removed - FS25 API doesn't provide accurate milk storage data
    // Only keeping milk production rates and lactating animal counts which are accurate

    // Refresh the display if pastures are currently shown
    const pasturesSection = document.getElementById("section-content");
    if (pasturesSection && !pasturesSection.classList.contains("d-none")) {
      this.updatePastureDisplay();
    }
  }

  parseRealisticLivestockData(animalSystemXml) {
    // Parse the animalSystem.xml to get RealisticLivestock IDs
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(animalSystemXml, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error(
        "XML parsing error in animalSystem:",
        parseError.textContent
      );
      return;
    }

    // Clear existing animals - we'll use animalSystem.xml as the primary source
    this.animals = [];
    this.lastAnimalsDataHash = null;

    // Look for all animals in animalSystem.xml
    const animalElements = xmlDoc.querySelectorAll("animal");

    if (animalElements.length === 0) {
    }

    animalElements.forEach((animal, index) => {
      // The 'id' attribute in the save file is actually the uniqueId from RealisticLivestock
      const rlId = animal.getAttribute("id");
      const name = animal.getAttribute("name") || "";
      const subType = animal.getAttribute("subType");

      if (index < 3) {
      }

      if (rlId && subType) {
        // Parse all RealisticLivestock attributes
        const animalData = {
          // Core identification
          id: rlId, // This is the RealisticLivestock uniqueId (e.g., "410063")
          name: name || `${subType} ${rlId}`,
          subType: subType,

          // Basic attributes
          age: parseInt(animal.getAttribute("age")) || 0,
          health: parseFloat(animal.getAttribute("health")) || 100,
          weight: parseFloat(animal.getAttribute("weight")) || 0,
          gender: animal.getAttribute("gender") || "female",
          variation: parseInt(animal.getAttribute("variation")) || 1,
          numAnimals: parseInt(animal.getAttribute("numAnimals")) || 1,

          // Reproductive attributes
          isPregnant: animal.getAttribute("isPregnant") === "true",
          isLactating: animal.getAttribute("isLactating") === "true",
          isParent: animal.getAttribute("isParent") === "true",
          reproduction: parseFloat(animal.getAttribute("reproduction")) || 0,
          monthsSinceLastBirth:
            parseInt(animal.getAttribute("monthsSinceLastBirth")) || 0,

          // Family relationships
          motherId: animal.getAttribute("motherId") || "-1",
          fatherId: animal.getAttribute("fatherId") || "-1",
          farmId: animal.getAttribute("farmId") || "0",

          // Additional attributes for display
          type: subType.split("_")[0], // Extract animal type (COW, PIG, etc.)
          location: "Unknown", // Will be updated from placeables data
          locationType: "Unknown",
          value: 0, // Will be calculated
        };

        // Parse genetics data if available
        const geneticsElement = animal.querySelector("genetics");
        if (geneticsElement) {
          animalData.genetics = {
            health: parseFloat(geneticsElement.getAttribute("health")) || 1,
            fertility:
              parseFloat(geneticsElement.getAttribute("fertility")) || 1,
            productivity:
              parseFloat(geneticsElement.getAttribute("productivity")) || 1,
            quality: parseFloat(geneticsElement.getAttribute("quality")) || 1,
            metabolism:
              parseFloat(geneticsElement.getAttribute("metabolism")) || 1,
          };
        }

        // Parse children if available
        const childrenElements = animal.querySelectorAll("children > child");
        if (childrenElements.length > 0) {
          animalData.children = [];
          childrenElements.forEach((child) => {
            const childId = child.getAttribute("uniqueId");
            if (childId) {
              animalData.children.push(childId);
            }
          });
        }

        this.animals.push(animalData);
      }
    });

    // Now try to match with placeables data to get location information
    if (this.savedFolderData && this.savedFolderData.placeablesData) {
      this.updateAnimalLocations(this.savedFolderData.placeablesData);
    }
  }

  updateAnimalLocations(placeablesXml) {
    // Parse placeables to get building/location information
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(placeablesXml, "text/xml");

    const placeableElements = xmlDoc.querySelectorAll("placeable");

    placeableElements.forEach((placeable) => {
      const buildingName = placeable.getAttribute("name") || "Unknown Building";
      const husbandryAnimals = placeable.querySelector("husbandryAnimals");

      if (husbandryAnimals) {
        // Count animals in this building to match with our animals
        const clusters = husbandryAnimals.querySelectorAll("clusters");
        clusters.forEach((cluster) => {
          const animalsInCluster = cluster.querySelectorAll("animal");
          animalsInCluster.forEach((animal) => {
            const subType = animal.getAttribute("subType");
            const animalName = animal.getAttribute("name");

            // Try to match with our RealisticLivestock animals
            const matchingAnimal = this.animals.find(
              (a) =>
                a.subType === subType &&
                (a.name === animalName || (!a.name && !animalName))
            );

            if (matchingAnimal && matchingAnimal.location === "Unknown") {
              matchingAnimal.location = buildingName;
              matchingAnimal.locationType = "Livestock Building";
            }
          });
        });
      }
    });
  }

  parseAnimalData(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("XML parsing error: " + parseError.textContent);
    }

    const animalElements = xmlDoc.querySelectorAll("animal");
    this.animals = [];
    this.lastAnimalsDataHash = null;
    let totalAnimalsProcessed = 0;

    animalElements.forEach((animal) => {
      totalAnimalsProcessed++;
      const animalData = {
        id: animal.getAttribute("id") || "Unknown",
        name: animal.getAttribute("name") || "Unnamed",
        age: parseInt(animal.getAttribute("age")) || 0,
        health: parseFloat(animal.getAttribute("health")) || 0,
        monthsSinceLastBirth:
          parseInt(animal.getAttribute("monthsSinceLastBirth")) || 0,
        gender: animal.getAttribute("gender") || "Unknown",
        subType: animal.getAttribute("subType") || "Unknown",
        reproduction: parseFloat(animal.getAttribute("reproduction")) || 0,
        isParent: animal.getAttribute("isParent") === "true",
        isPregnant: animal.getAttribute("isPregnant") === "true",
        isLactating: animal.getAttribute("isLactating") === "true",
        farmId: animal.getAttribute("farmId") || "Unknown",
        motherId: animal.getAttribute("motherId") || "-1",
        fatherId: animal.getAttribute("fatherId") || "-1",
        weight: parseFloat(animal.getAttribute("weight")) || 0,
        variation: parseInt(animal.getAttribute("variation")) || 1,
        genetics: null,
      };

      // Parse genetics data if available
      const geneticsElement = animal.querySelector("genetics");
      if (geneticsElement) {
        animalData.genetics = {
          metabolism:
            parseFloat(geneticsElement.getAttribute("metabolism")) || 0,
          quality: parseFloat(geneticsElement.getAttribute("quality")) || 0,
          health: parseFloat(geneticsElement.getAttribute("health")) || 0,
          fertility: parseFloat(geneticsElement.getAttribute("fertility")) || 0,
          productivity:
            parseFloat(geneticsElement.getAttribute("productivity")) || 0,
        };
      }

      // Extract animal type from subType (e.g., "COW_HEREFORD" -> "COW")
      animalData.type = animalData.subType.split("_")[0];

      // Add location information if available
      const locationInfo = this.locationMap.get(animalData.id);
      if (locationInfo) {
        animalData.location = locationInfo.building;
        animalData.locationType = locationInfo.type;
      } else {
        // Fallback: try to match by farm ID and animal type
        const farmBuildings = this.farmBuildingMap.get(animalData.farmId);
        if (farmBuildings) {
          // Find building that accepts this animal type
          const matchingBuilding = farmBuildings.find((building) =>
            building.animalTypes.includes(animalData.type)
          );

          if (matchingBuilding) {
            animalData.location = matchingBuilding.building;
            animalData.locationType = matchingBuilding.type;
          } else {
            // Use the first building as fallback
            animalData.location = farmBuildings[0].building;
            animalData.locationType = farmBuildings[0].type;
          }
        } else {
          animalData.location = "Farm Field";
          animalData.locationType = "Open Range";
        }
      }

      // Only include animals that are found in player's livestock buildings
      if (this.playerAnimalIds.has(animalData.id)) {
        this.animals.push(animalData);
      } else {
      }
    });

    this.filteredAnimals = [...this.animals];
    const farmName = this.selectedFarm ? this.selectedFarm.name : "All Farms";
  }

  showDashboard() {
    this.isDataLoaded = true;
    document.getElementById("folder-selection").classList.add("d-none");
    document.getElementById("landing-page").classList.remove("d-none");
    this.showNavbar(); // Make sure navbar is visible
    this.updateLandingPageCounts();
    this.updateNavbar();

    // Check for hash navigation after loading dashboard
    if (window.location.hash) {
      this.handleHashChange();
    }
  }

  updateLandingPageCounts() {
    // Update livestock count
    const livestockCount = this.animals.length;
    document.getElementById(
      "livestock-count"
    ).textContent = `${livestockCount} Animals`;

    // Update game time display
    const gameTimeElement = document.getElementById("game-time-display");
    if (gameTimeElement) {
      gameTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${this.getGameTimeDisplay()}`;
    }

    // Update vehicle count
    const vehicleCount = this.vehicles ? this.vehicles.length : 0;
    document.getElementById(
      "vehicle-count"
    ).textContent = `${vehicleCount} Vehicles`;

    // Update field count
    const fieldCountElement = document.getElementById("field-count");
    if (fieldCountElement) {
      const fieldCount = this.fields ? this.fields.length : 0;
      fieldCountElement.textContent = `${fieldCount} Field${
        fieldCount !== 1 ? "s" : ""
      }`;
    }

    // Update pasture count (replaced property-count)
    const pastureCountElement = document.getElementById("pasture-count");
    if (pastureCountElement) {
      // Always refresh pasture data to get current warnings and counts
      this.parsePastureData();
      pastureCountElement.textContent = `${
        this.pastures ? this.pastures.length : 0
      } Pastures`;

      // Update warning badge on dashboard
      const totalAllWarnings = this.pastures
        ? this.pastures.reduce(
            (sum, pasture) => sum + pasture.allWarnings.length,
            0
          )
        : 0;
      const warningBadge = document.getElementById("pasture-warnings-badge");
      const warningCount = document.getElementById("pasture-warnings-count");
      if (warningBadge && warningCount) {
        if (totalAllWarnings > 0) {
          warningCount.textContent = totalAllWarnings;
          warningBadge.classList.remove("d-none");
        } else {
          warningBadge.classList.add("d-none");
        }
      }
    }
  }

  showLanding() {
    // Track current section
    this.currentSection = "dashboard";

    // Clear URL hash when returning to main dashboard
    if (window.location.hash) {
      window.history.replaceState(null, null, window.location.pathname);
    }

    document.getElementById("section-content").classList.add("d-none");
    document.getElementById("dashboard-content").classList.add("d-none");
    document.getElementById("landing-page").classList.remove("d-none");
    this.updateLandingPageCounts(); // Update counts including pastures badge
    this.updateNavbar();
  }

  showSection(sectionName) {
    // Track current section
    this.currentSection = sectionName;

    // Update URL hash without triggering hashchange event
    if (window.location.hash.substring(1) !== sectionName) {
      window.history.replaceState(null, null, `#${sectionName}`);
    }

    document.getElementById("landing-page").classList.add("d-none");
    document.getElementById("section-content").classList.add("d-none");

    switch (sectionName) {
      case "livestock":
        // Show the existing livestock dashboard
        document.getElementById("dashboard-content").classList.remove("d-none");
        this.updateSummaryCards();
        this.renderAnimalsTable();
        break;
      case "vehicles":
        this.showVehiclesSection();
        break;
      case "fields":
        this.showFieldsSection();
        break;
      case "economy":
        this.showEconomySection();
        break;
      case "pastures":
        this.showPasturesSection();
        break;
      case "statistics":
        this.showStatisticsSection();
        break;
      default:
        document.getElementById("section-content").innerHTML = `
                    <div class="text-center">
                        <h3 class="text-warning">Section Under Development</h3>
                        <p class="text-muted">The ${sectionName} section is coming soon!</p>
                    </div>
                `;
        document.getElementById("section-content").classList.remove("d-none");
    }

    // Update navbar after section change
    this.updateNavbar();
  }

  showVehiclesSection() {
    const vehiclesHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-truck me-2"></i>
                        Vehicle Fleet Management
                    </h2>
                    <p class="lead text-muted">Monitor your vehicle fleet, fuel levels, and maintenance status</p>
                </div>
            </div>

            <!-- Vehicle Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-farm-primary text-white border-0 vehicle-summary-card"
                         style="cursor: pointer; transition: all 0.3s ease;"
                         onclick="dashboard.filterVehiclesBySummaryCard('all')"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-truck me-2"></i>Total Vehicles
                            </h5>
                            <h2 class="display-4" id="total-vehicles-count">0</h2>
                            <small class="text-light opacity-75">Click to show all equipment</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-farm-warning text-dark border-0 vehicle-summary-card"
                         style="cursor: pointer; transition: all 0.3s ease;"
                         onclick="dashboard.filterVehiclesBySummaryCard('low-fuel')"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-fuel-pump me-2"></i>Low Fuel
                            </h5>
                            <h2 class="display-4" id="low-fuel-count">0</h2>
                            <small class="text-dark opacity-75">Click to show &lt; 25% fuel</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 vehicle-summary-card"
                         style="cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #dc3545, #c82333);"
                         onclick="dashboard.filterVehiclesBySummaryCard('damaged')"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 20px rgba(220,53,69,0.4)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 10px rgba(220,53,69,0.2)'">
                        <div class="card-body text-center text-white">
                            <h5 class="card-title">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>High Damage
                            </h5>
                            <h2 class="display-4" id="damaged-vehicles-count">0</h2>
                            <small class="text-light opacity-90">
                                <i class="bi bi-shield-exclamation me-1"></i>Click to show &gt; 20% damage
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card shadow-lg border-farm-accent">
                        <div class="card-header text-white">
                            <h6 class="card-title mb-0">
                                <i class="bi bi-funnel me-2"></i>
                                Vehicle Filters
                                <button class="btn btn-sm btn-outline-light ms-2" onclick="dashboard.toggleVehicleFilters()" id="vehicle-filter-toggle-btn">
                                    <i class="bi bi-chevron-down"></i> Show Filters
                                </button>
                            </h6>
                        </div>
                        <div class="card-body d-none" id="vehicle-filters-panel">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label text-farm-accent">Vehicle Type</label>
                                    <select class="form-select form-select-sm" id="vehicle-type-filter">
                                        <option value="">All Types</option>
                                        <option value="tractor">Tractors</option>
                                        <option value="motorized">All Motorized</option>
                                        <option value="trailer">Trailers</option>
                                        <option value="implement">Implements</option>
                                        <option value="cultivator">Cultivators</option>
                                        <option value="unknown">Pallets & Others</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label text-farm-accent">Fuel Level</label>
                                    <select class="form-select form-select-sm" id="vehicle-fuel-filter">
                                        <option value="">All Levels</option>
                                        <option value="empty">Empty (0%)</option>
                                        <option value="low">Low (&lt; 25%)</option>
                                        <option value="medium">Medium (25-75%)</option>
                                        <option value="full">Full (&gt; 75%)</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label text-farm-accent">Status</label>
                                    <select class="form-select form-select-sm" id="vehicle-status-filter">
                                        <option value="">All Status</option>
                                        <option value="active">Engine Running</option>
                                        <option value="inactive">Engine Off</option>
                                        <option value="damaged">Damaged</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-farm-accent w-100" onclick="dashboard.applyVehicleFilters()">
                                        <i class="bi bi-search me-1"></i> Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vehicle Cards Grid -->
            <div class="row" id="vehicles-grid">
                <!-- Vehicle cards will be populated here -->
            </div>
        `;

    document.getElementById("section-content").innerHTML = vehiclesHTML;
    document.getElementById("section-content").classList.remove("d-none");

    // Load and display vehicles
    this.loadVehicles();
  }

  showFieldsSection() {
    const fieldsHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-geo-alt me-2"></i>
                        Field Management
                    </h2>
                    <p class="lead text-muted">Monitor your fields, crops, and field conditions</p>
                </div>
            </div>

            <!-- Field Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-farm-primary text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-grid-3x3 me-2"></i>Total Fields
                            </h5>
                            <h2 class="display-4" id="total-fields-count">0</h2>
                            <small class="text-light opacity-75">Owned fields</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-rulers me-2"></i>Total Area
                            </h5>
                            <h2 class="display-4" id="total-area">0</h2>
                            <small class="text-light opacity-75">Hectares</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-exclamation-triangle me-2"></i>Needs Work
                            </h5>
                            <h2 class="display-4" id="fields-need-work">0</h2>
                            <small class="text-light opacity-75">Fields requiring attention</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">
                                <i class="bi bi-basket me-2"></i>Ready to Harvest
                            </h5>
                            <h2 class="display-4" id="fields-harvest-ready">0</h2>
                            <small class="text-light opacity-75">Crops ready</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="btn-group" role="group">
                        <button class="btn btn-outline-primary active" onclick="dashboard.filterFields('all')">
                            <i class="bi bi-grid-3x3"></i> All Fields
                        </button>
                        <button class="btn btn-outline-success" onclick="dashboard.filterFields('harvest')">
                            <i class="bi bi-basket"></i> Ready to Harvest
                        </button>
                        <button class="btn btn-outline-warning" onclick="dashboard.filterFields('needswork')">
                            <i class="bi bi-tools"></i> Needs Work
                        </button>
                        <button class="btn btn-outline-info" onclick="dashboard.filterFields('growing')">
                            <i class="bi bi-flower1"></i> Growing
                        </button>
                        <button class="btn btn-outline-secondary" onclick="dashboard.filterFields('empty')">
                            <i class="bi bi-border"></i> Empty
                        </button>
                    </div>
                </div>
                <div class="col-md-6 text-end">
                    <div class="btn-group" role="group">
                        <button class="btn btn-outline-secondary" onclick="dashboard.sortFields('id')">
                            <i class="bi bi-sort-numeric-down"></i> Field #
                        </button>
                        <button class="btn btn-outline-secondary" onclick="dashboard.sortFields('size')">
                            <i class="bi bi-arrows-angle-expand"></i> Size
                        </button>
                        <button class="btn btn-outline-secondary" onclick="dashboard.sortFields('crop')">
                            <i class="bi bi-flower2"></i> Crop
                        </button>
                        <button class="btn btn-outline-secondary" onclick="dashboard.sortFields('status')">
                            <i class="bi bi-activity"></i> Status
                        </button>
                    </div>
                </div>
            </div>

            <!-- Search Bar -->
            <div class="row mb-3">
                <div class="col-12">
                    <div class="input-group">
                        <span class="input-group-text bg-secondary border-secondary">
                            <i class="bi bi-search"></i>
                        </span>
                        <input type="text" class="form-control bg-secondary border-secondary text-white"
                               id="field-search" placeholder="Search fields by name, crop, or status..."
                               onkeyup="dashboard.searchFields(this.value)">
                    </div>
                </div>
            </div>

            <!-- Fields List -->
            <div class="row" id="fields-list">
                <div class="col-12 text-center p-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading fields...</span>
                    </div>
                    <p class="mt-3 text-muted">Loading field data...</p>
                </div>
            </div>
        `;

    document.getElementById("section-content").innerHTML = fieldsHTML;
    document.getElementById("section-content").classList.remove("d-none");

    // Load and display fields
    this.loadFields();
  }

  showEconomySection() {
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

            <!-- Financial Summary Cards -->
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

            <!-- Navigation Tabs -->
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

            <!-- Tab Content -->
            <div class="tab-content" id="economyTabContent">
                <!-- Equipment Purchases Tab -->
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

                <!-- Market Prices Tab -->
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

  showPasturesSection() {
    // Parse pasture data from placeables
    this.parsePastureData();

    const pasturesHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-diagram-3 me-2"></i>
                        Pasture Management
                    </h2>
                    <p class="lead text-muted">Monitor pastures, livestock, and grazing conditions</p>
                </div>
            </div>

            <!-- Pasture Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-farm-primary text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">Total Pastures</h5>
                            <h2 class="display-4" id="total-pastures-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-primary text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">Active Livestock</h5>
                            <h2 class="display-4" id="pasture-livestock-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-primary text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">Birth Warnings</h5>
                            <h2 class="display-4" id="birth-warnings-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-primary text-white border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">Avg Health</h5>
                            <h2 class="display-4" id="pasture-avg-health">0%</h2>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Pasture List -->
            <div class="row">
                <div class="col-12">
                    <div class="card bg-secondary">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="bi bi-list-ul me-2"></i>
                                Pasture Overview
                            </h5>
                            <button class="btn btn-outline-success btn-sm" onclick="dashboard.showAllPastureLivestock()">
                                <i class="bi bi-table me-1"></i>View All Livestock
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="pastures-list">
                                <!-- Pastures will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("section-content").innerHTML = pasturesHTML;
    document.getElementById("section-content").classList.remove("d-none");

    // Update pasture data display
    this.updatePastureDisplay();
    this.updateNavbar("Pastures");
  }

  parsePastureData() {
    // Initialize pastures array if not exists
    if (!this.pastures) {
      this.pastures = [];
    }

    this.pastures = [];

    // Use the new API data format - check for animals data from realtime connector
    if (
      this.animals &&
      this.animals.length > 0 &&
      this.animals[0].husbandryId
    ) {
      // Group animals by their husbandry location (new API format)
      const animalsByHusbandry = {};

      this.animals.forEach((animal) => {
        const husbandryId = animal.husbandryId || animal.id;
        const locationName =
          animal.husbandryName || animal.location || "Unknown Location";

        if (!animalsByHusbandry[husbandryId]) {
          animalsByHusbandry[husbandryId] = {
            id: husbandryId,
            name: locationName,
            animals: [],
            ownerFarmId: animal.ownerFarmId || animal.farmId,
          };
        }
        animalsByHusbandry[husbandryId].animals.push(animal);
      });

      // Convert to pastures format
      Object.values(animalsByHusbandry).forEach((husbandryData) => {
        const pastureAnimals = husbandryData.animals;

        // Try to find the original husbandry data from the API for real statistics
        let originalHusbandry = null;
        if (this.husbandryData && Array.isArray(this.husbandryData)) {
          originalHusbandry = this.husbandryData.find(
            (h) => h.id === husbandryData.id || h.name === husbandryData.name
          );
        }

        // Calculate pasture statistics
        const avgHealth =
          pastureAnimals.length > 0
            ? (
                pastureAnimals.reduce((sum, animal) => sum + animal.health, 0) /
                pastureAnimals.length
              ).toFixed(0)
            : 0;

        // Check for condition reports
        const conditionReport = this.calculateConditionReport(
          pastureAnimals,
          originalHusbandry
        );

        // Debug logs disabled for milk troubleshooting
        // console.log(
        //   "[DEBUG] About to call calculateFoodReport with originalHusbandry:",
        //   originalHusbandry
        // );
        // console.log(
        //   "[DEBUG] About to call calculateFoodReport with husbandryData:",
        //   husbandryData
        // );
        // Calculate milk production based on actual cow data
        const milkProductionData = this.calculateMilkProduction(
          { name: husbandryData.name },
          pastureAnimals
        );

        const foodReportInput = originalHusbandry || husbandryData;
        // Add calculated milk production to the input
        foodReportInput.calculatedMilkProduction =
          milkProductionData.estimatedStorage;

        // console.log("[DEBUG] Final foodReportInput:", foodReportInput);
        // console.log("[DEBUG] Calculated milk production:", milkProductionData);

        // Debug logs disabled for milk troubleshooting
        // if (
        //   foodReportInput &&
        //   foodReportInput.storageData &&
        //   foodReportInput.storageData.FORAGE
        // ) {
        //   console.log(
        //     "[DEBUG] *** FORAGE DATA VERIFIED ***",
        //     foodReportInput.storageData.FORAGE
        //   );
        // } else {
        //   console.log("[DEBUG] *** FORAGE DATA MISSING ***");
        // }

        const foodReport = this.calculateFoodReport(foodReportInput);
        // Debug logs disabled for milk troubleshooting
        // console.log(
        //   "[DEBUG] ***** FOOD REPORT RETURNED TO parsePastureData *****"
        // );
        // console.log("[DEBUG] foodReport received:", foodReport);
        // console.log("[DEBUG] foodReport.forage:", foodReport.forage);

        const allWarnings = this.calculateAllPastureWarnings(
          husbandryData,
          pastureAnimals,
          conditionReport,
          foodReport
        );

        // Calculate gender counts for this pasture
        const maleCount = pastureAnimals.filter(
          (a) => a.gender?.toLowerCase() === "male"
        ).length;
        const femaleCount = pastureAnimals.filter(
          (a) => a.gender?.toLowerCase() === "female"
        ).length;

        const pastureData = {
          id: husbandryData.id,
          name: husbandryData.name,
          animals: pastureAnimals,
          animalCount: pastureAnimals.length,
          maleCount: maleCount,
          femaleCount: femaleCount,
          avgHealth: parseFloat(avgHealth),
          conditionReport: conditionReport,
          foodReport: foodReport,
          milkProductionData: milkProductionData, // Add milk production details
          allWarnings: allWarnings,
          farmId: husbandryData.ownerFarmId || "Unknown",
          capacity:
            originalHusbandry?.capacity ||
            this.estimatePastureCapacity(husbandryData.name),
          // Store original husbandry data for detailed stats
          husbandryData: originalHusbandry,
        };

        // Debug logs disabled except for milk data
        // console.log("[DEBUG] ***** PASTURE DATA CREATED *****");
        // console.log("[DEBUG] pastureData.foodReport:", pastureData.foodReport);
        // console.log(
        //   "[DEBUG] pastureData.foodReport.forage:",
        //   pastureData.foodReport.forage
        // );

        this.pastures.push(pastureData);
      });
    }
    // Fallback: try to use placeables data if available (for file-based mode)
    else if (this.placeables && this.placeables.length > 0) {
      this.placeables.forEach((placeable) => {
        // Check if this is a livestock building with animals
        if (
          placeable.type === "Livestock Building" &&
          placeable.animals &&
          placeable.animals.length > 0
        ) {
          const pastureAnimals = placeable.animals;

          // Calculate pasture statistics
          const avgHealth =
            pastureAnimals.length > 0
              ? (
                  pastureAnimals.reduce(
                    (sum, animal) => sum + animal.health,
                    0
                  ) / pastureAnimals.length
                ).toFixed(0)
              : 0;

          // Check for condition reports
          const conditionReport = this.calculateConditionReport(pastureAnimals);

          // Calculate milk production based on actual cow data
          const milkProductionData = this.calculateMilkProduction(
            { name: placeable.name },
            placeable.animals
          );

          // Food availability (mock data - would need to be parsed from XML if available)
          const placeableWithMilk = {
            ...placeable,
            calculatedMilkProduction: milkProductionData.estimatedStorage,
          };
          const foodReport = this.calculateFoodReport(placeableWithMilk);

          // Calculate all warnings for this pasture
          const allWarnings = this.calculateAllPastureWarnings(
            placeable,
            pastureAnimals,
            conditionReport,
            foodReport
          );

          // Calculate gender counts
          const maleCount = pastureAnimals.filter(
            (a) => a.gender?.toLowerCase() === "male"
          ).length;
          const femaleCount = pastureAnimals.filter(
            (a) => a.gender?.toLowerCase() === "female"
          ).length;

          const pastureData = {
            id: placeable.uniqueId,
            name: placeable.name,
            animals: pastureAnimals,
            animalCount: pastureAnimals.length,
            maleCount: maleCount,
            femaleCount: femaleCount,
            avgHealth: parseFloat(avgHealth),
            conditionReport: conditionReport,
            foodReport: foodReport,
            milkProductionData: milkProductionData, // Add milk production details
            allWarnings: allWarnings,
            farmId: placeable.farmId || "Unknown",
            filename: placeable.filename,
            capacity:
              placeable.capacity ||
              this.estimatePastureCapacity(placeable.filename),
          };

          this.pastures.push(pastureData);
        }
      });
    } else if (this.animals && this.animals.length > 0) {
      // Fallback: Group animals by location if placeables not available
      const animalsByLocation = {};

      this.animals.forEach((animal) => {
        const location = animal.location || "Unknown";
        if (
          location !== "Unknown" &&
          animal.locationType === "Livestock Building"
        ) {
          if (!animalsByLocation[location]) {
            animalsByLocation[location] = {
              name: location,
              animals: [],
              uniqueId: `pasture_${location.replace(/\s+/g, "_")}`,
              farmId: animal.farmId,
            };
          }
          animalsByLocation[location].animals.push(animal);
        }
      });

      // Convert to pastures array
      Object.values(animalsByLocation).forEach((locationData) => {
        const pastureAnimals = locationData.animals;

        // Calculate pasture statistics
        const avgHealth =
          pastureAnimals.length > 0
            ? (
                pastureAnimals.reduce((sum, animal) => sum + animal.health, 0) /
                pastureAnimals.length
              ).toFixed(0)
            : 0;

        // Check for condition reports
        const conditionReport = this.calculateConditionReport(pastureAnimals);

        // Calculate milk production based on actual cow data
        const milkProductionData = this.calculateMilkProduction(
          { name: locationData.name },
          locationData.animals
        );

        // Food availability (mock data - would need to be parsed from XML if available)
        const locationWithMilk = {
          ...locationData,
          calculatedMilkProduction: milkProductionData.estimatedStorage,
        };
        const foodReport = this.calculateFoodReport(locationWithMilk);

        // Calculate all warnings for this pasture
        const allWarnings = this.calculateAllPastureWarnings(
          locationData,
          pastureAnimals,
          conditionReport,
          foodReport
        );

        // Calculate gender counts
        const maleCount = pastureAnimals.filter(
          (a) => a.gender?.toLowerCase() === "male"
        ).length;
        const femaleCount = pastureAnimals.filter(
          (a) => a.gender?.toLowerCase() === "female"
        ).length;

        const pastureData = {
          id: locationData.uniqueId,
          name: locationData.name,
          animals: pastureAnimals,
          animalCount: pastureAnimals.length,
          maleCount: maleCount,
          femaleCount: femaleCount,
          avgHealth: parseFloat(avgHealth),
          conditionReport: conditionReport,
          foodReport: foodReport,
          milkProductionData: milkProductionData, // Add milk production details
          allWarnings: allWarnings,
          farmId: locationData.farmId || "Unknown",
          capacity: this.estimatePastureCapacity(locationData.name),
        };

        this.pastures.push(pastureData);
      });
    }

    // Update milk values if price is available
    if (this.milkPrice && this.milkPrice > 0) {
      this.updateMilkValues();
    }
  }

  calculateBirthWarnings(animals) {
    const warnings = [];
    const hasBull = animals.some(
      (animal) =>
        animal.gender?.toLowerCase() === "male" &&
        (animal.subType?.includes("COW") || animal.subType?.includes("BULL"))
    );

    animals.forEach((animal) => {
      if (animal.isPregnant) {
        // Calculate estimated due date based on our pregnancy calculation
        const animalType = animal.type || animal.subType.split("_")[0];
        const gestationPeriods = {
          COW: 9,
          PIG: 4,
          SHEEP: 5,
          GOAT: 5,
          HORSE: 11,
          CHICKEN: 1,
        };
        const gestationMonths = gestationPeriods[animalType] || 6;
        const reproductionPercent = animal.reproduction * 100;

        let pregnancyProgress = 0;
        if (reproductionPercent > 80) pregnancyProgress = 0.8;
        else if (reproductionPercent > 60) pregnancyProgress = 0.6;
        else if (reproductionPercent > 40) pregnancyProgress = 0.4;
        else pregnancyProgress = 0.2;

        const monthsRemaining = Math.max(
          0,
          Math.round(gestationMonths * (1 - pregnancyProgress))
        );

        if (monthsRemaining <= 1) {
          warnings.push({
            animalId: animal.id,
            animalName: animal.name || `Animal #${animal.id}`,
            type: "birth_due",
            message: `${
              animal.name || `Animal #${animal.id}`
            } due to give birth soon`,
            monthsRemaining: monthsRemaining,
          });
        }
      }

      // Check for young animals with bull present
      if (
        hasBull &&
        animal.age < 11 &&
        animal.gender?.toLowerCase() === "female"
      ) {
        warnings.push({
          animalId: animal.id,
          animalName: animal.name || `Animal #${animal.id}`,
          type: "breeding_risk",
          message: `Young female ${animal.name || `#${animal.id}`} (${
            animal.age
          } months) with bull present`,
          age: animal.age,
        });
      }
    });

    return warnings;
  }

  calculateConditionReport(animals, husbandryData) {
    // If we have real husbandry data from the API, use it
    if (husbandryData) {
      // Check new data structure from enhanced collector
      const productionData = husbandryData.productionData || {};
      const consumptionData = husbandryData.consumptionData || {};

      // Check if we have actual production data or just building info
      // Also check for storage data as evidence of real data collection
      const storageData = husbandryData.storageData || {};
      const hasStorageData =
        Object.keys(storageData).length > 0 &&
        Object.values(storageData).some((val) => (val || 0) > 0);

      // console.log("[DEBUG] Storage data check:", storageData);
      // console.log("[DEBUG] hasStorageData:", hasStorageData);
      // console.log("[DEBUG] productionData:", productionData);
      // console.log("[DEBUG] productionData keys:", Object.keys(productionData));
      // console.log("[DEBUG] consumptionData:", consumptionData);
      // console.log(
      //   "[DEBUG] consumptionData keys:",
      //   Object.keys(consumptionData)
      // );
      // console.log(
      //   "[DEBUG] husbandryData.productivity:",
      //   husbandryData.productivity
      // );
      // console.log(
      //   "[DEBUG] Full husbandryData keys:",
      //   Object.keys(husbandryData)
      // );

      const hasProductionData =
        husbandryData.productivity > 0 ||
        productionData.milkPerDay > 0 ||
        productionData.milk > 0 ||
        productionData.eggsPerDay > 0 ||
        productionData.eggs > 0 ||
        productionData.woolPerDay > 0 ||
        productionData.wool > 0 ||
        productionData.manurePerDay > 0 ||
        productionData.manure > 0 ||
        productionData.slurryPerDay > 0 ||
        productionData.liquidManure > 0 ||
        consumptionData.strawPerDay > 0 ||
        consumptionData.straw > 0 ||
        consumptionData.foodPerDay > 0 ||
        consumptionData.food > 0 ||
        consumptionData.waterPerDay > 0 ||
        consumptionData.water > 0 ||
        hasStorageData; // Include storage data as evidence of real data

      // console.log("[DEBUG] Final hasProductionData result:", hasProductionData);

      if (hasProductionData) {
        return {
          productivity: husbandryData.productivity * 100 || 0, // Convert to percentage
          milk: productionData.milkPerDay || productionData.milk || 0,
          straw: consumptionData.strawPerDay || consumptionData.straw || 0,
          manure: productionData.manurePerDay || productionData.manure || 0,
          slurry:
            productionData.slurryPerDay || productionData.liquidManure || 0,
          pallets: productionData.palletsPerDay || productionData.pallets || 0,
          eggs: productionData.eggsPerDay || productionData.eggs || 0,
          wool: productionData.woolPerDay || productionData.wool || 0,
          water: consumptionData.waterPerDay || consumptionData.water || 0,
          food: consumptionData.foodPerDay || consumptionData.food || 0,
          hasRealData: true,
        };
      } else {
      }
    }

    // Fallback: calculate based on animals if no API data
    let totalProductivity = 0;
    let milkProduction = 0;
    let strawConsumption = 0;
    let manureProduction = 0;

    animals.forEach((animal) => {
      if (animal.genetics) {
        totalProductivity += animal.genetics.productivity * 100;
      }

      // Estimate milk production for lactating cows
      if (animal.isLactating && animal.subType?.includes("COW")) {
        milkProduction += 20; // Base milk per day per cow
      }

      // Estimate straw consumption (1 straw per animal per day)
      strawConsumption += 1;

      // Estimate manure production (based on animal size)
      if (animal.subType?.includes("COW")) manureProduction += 3;
      else if (animal.subType?.includes("PIG")) manureProduction += 2;
      else manureProduction += 1;
    });

    return {
      productivity:
        animals.length > 0
          ? (totalProductivity / animals.length).toFixed(1)
          : 0,
      milk: milkProduction,
      straw: strawConsumption,
      manure: manureProduction,
      slurry: 0,
      pallets: 0,
      eggs: 0,
      wool: 0,
      water: 0,
      food: 0,
      hasRealData: false,
    };
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

  calculateMilkProduction(pasture, animals) {
    // Calculate milk production based on cow data
    // In FS25, only cows and goats produce milk that can be collected

    // Only debug the first dairy pasture to reduce spam
    const shouldDebug = pasture.name === "Primary Stock";

    if (shouldDebug) {
    }

    let totalMilkProduction = 0;
    let lactatingAnimals = 0;
    let totalProductivity = 0;
    let totalCows = 0;
    let adultFemaleCows = 0;

    // Debug logging to understand animal types and details
    const uniqueSubTypes = [...new Set(animals.map((a) => a.subType))];
    const genderCounts = { male: 0, female: 0, unknown: 0 };
    const ageCounts = { young: 0, adult: 0, unknown: 0 };

    animals.forEach((animal) => {
      // Count genders for debugging
      if (animal.gender === "male") genderCounts.male++;
      else if (animal.gender === "female") genderCounts.female++;
      else genderCounts.unknown++;

      // Count ages for debugging
      if (animal.age < 18) ageCounts.young++;
      else if (animal.age >= 18) ageCounts.adult++;
      else ageCounts.unknown++;
    });

    animals.forEach((animal) => {
      // Check if this is a dairy animal (be more flexible with animal type detection)
      const subTypeUpper = (animal.subType || "").toUpperCase();

      // More flexible dairy animal detection
      const isDairyCow = subTypeUpper.includes("COW") || subTypeUpper === "COW";
      const isDairyGoat =
        subTypeUpper.includes("GOAT") || subTypeUpper === "GOAT";
      const isDairyAnimal = isDairyCow || isDairyGoat;

      if (isDairyCow) {
        totalCows++;
      }

      if (isDairyAnimal) {
        // Check basic requirements for milk production
        const isAdult = animal.age >= 18; // Animals mature at 18 months
        const isFemale =
          animal.gender === "female" || animal.gender === "FEMALE";

        if (isDairyCow && isFemale && isAdult) {
          adultFemaleCows++;
        }

        // Use isLactating flag if available, otherwise assume adult females can lactate
        const isLactating =
          animal.isLactating === true || animal.isLactating === "true";
        const hasLactatingFlag = "isLactating" in animal;
        const canLactate = hasLactatingFlag ? isLactating : true; // If flag exists, use it; otherwise assume yes

        // Count animals that can produce milk
        const canProduceMilk = isAdult && isFemale && canLactate;

        // Debug lactating vs non-lactating animals
        if (isDairyCow && isFemale && isAdult && shouldDebug) {
          if (animal.isLactating === true) {
          }
        }

        if (canProduceMilk) {
          lactatingAnimals++;

          // Calculate productivity based on health
          const productivity = (animal.health || 100) / 100;
          totalProductivity += productivity;

          // Base milk production per animal per day
          let baseDailyProduction = 0;

          if (isDairyCow) {
            // Cow milk production rates - be more generous
            if (subTypeUpper.includes("HOLSTEIN")) {
              baseDailyProduction = 200; // Holstein cows are dairy specialists
            } else if (
              subTypeUpper.includes("BRAHMAN") ||
              subTypeUpper.includes("ANGUS")
            ) {
              baseDailyProduction = 100; // Beef breeds produce less milk
            } else {
              baseDailyProduction = 150; // Default cow production
            }
          } else if (isDairyGoat) {
            baseDailyProduction = 30; // Goats produce less milk than cows
          }

          // Apply productivity modifier
          const dailyProduction = baseDailyProduction * productivity;

          // Convert to hourly rate (game time)
          const hourlyProduction = dailyProduction / 24;

          totalMilkProduction += hourlyProduction;
        }
      }
    });

    // Calculate accumulated milk storage
    let totalMilkStored = 0;
    if (lactatingAnimals > 0) {
      // Accumulate milk over 24 in-game hours
      const hoursOfAccumulation = 24;
      totalMilkStored = totalMilkProduction * hoursOfAccumulation;
    }

    // Summary for Primary Stock only
    if (shouldDebug) {
      const lactatingCount = animals.filter((a) => {
        const subTypeUpper = (a.subType || "").toUpperCase();
        const isDairyCow =
          subTypeUpper.includes("COW") || subTypeUpper === "COW";
        const isFemale = a.gender === "female";
        const isAdult = a.age >= 18;
        return isDairyCow && isFemale && isAdult && a.isLactating === true;
      }).length;
    }

    // Only use actual lactating animal data - don't estimate/assume lactation status
    let finalLactatingCount = lactatingAnimals;
    let finalHourlyProduction = totalMilkProduction;
    let finalEstimatedStorage = totalMilkStored;

    // Don't make assumptions about lactation status
    // Only show milk production if we have actual lactating animals
    // This prevents showing false milk data for pastures that don't have lactating animals

    return {
      lactatingCows: finalLactatingCount,
      hourlyProduction: finalHourlyProduction,
      estimatedStorage: 0, // Always 0 - FS25 doesn't expose milk storage data via API
      avgProductivity:
        finalLactatingCount > 0 ? totalProductivity / finalLactatingCount : 0.9,
    };
  }

  calculateFoodReport(husbandryData) {
    // Debug logs disabled for milk troubleshooting
    // console.log("[DEBUG] ===== calculateFoodReport CALLED =====");
    // console.log("[DEBUG] husbandryData received:", husbandryData);
    // console.log("[DEBUG] husbandryData type:", typeof husbandryData);

    // Check if we have real husbandry data from the API with food information
    if (husbandryData && typeof husbandryData === "object") {
      // Check new enhanced storage data structure
      const storageData = husbandryData.storageData || {};
      const fillLevels = husbandryData.fillLevels || {};

      // console.log("[DEBUG] StorageData:", storageData);
      // console.log("[DEBUG] StorageData type:", typeof storageData);
      // console.log("[DEBUG] StorageData is array:", Array.isArray(storageData));
      // console.log("[DEBUG] FillLevels:", fillLevels);
      // console.log("[DEBUG] FillLevels type:", typeof fillLevels);
      // console.log("[DEBUG] FillLevels is array:", Array.isArray(fillLevels));

      // Check for food-related properties in the enhanced API data
      // Look for any properties in storageData (even if they're 0)
      const hasStorageData = Object.keys(storageData).length > 0;
      const hasFillLevelsData =
        typeof fillLevels === "object" && Object.keys(fillLevels).length > 0;
      const hasForageSpecifically = storageData.FORAGE !== undefined;

      // console.log("[DEBUG] hasStorageData:", hasStorageData);
      // console.log("[DEBUG] hasFillLevelsData:", hasFillLevelsData);
      // console.log("[DEBUG] hasForageSpecifically:", hasForageSpecifically);
      // console.log("[DEBUG] storageData keys:", Object.keys(storageData));
      // console.log("[DEBUG] storageData.FORAGE value:", storageData.FORAGE);

      // Force to true if we have FORAGE data, regardless of other checks
      const hasAnyFoodData =
        hasStorageData || hasFillLevelsData || hasForageSpecifically;

      // console.log("[DEBUG] hasAnyFoodData:", hasAnyFoodData);

      if (hasAnyFoodData) {
        // Calculate total food capacity from various sources
        const totalCapacity =
          (storageData.wheatCapacity || 0) +
            (storageData.barleyCapacity || 0) +
            (storageData.oatCapacity || 0) +
            (storageData.canolaCapacity || 0) +
            (storageData.soybeanCapacity || 0) +
            (storageData.cornCapacity || 0) +
            (storageData.sunflowerCapacity || 0) +
            (storageData.silageCapacity || 0) +
            (storageData.totalmixedrationCapacity || 0) || 1000;

        // Use the actual data we're getting from the game
        // Use exact field names from the debug data

        // Ensure all values are properly converted to numbers
        // Food/Feed storage - check fillLevels for "Available Food"
        const availableFood = parseFloat(fillLevels["Available Food"]) || 0;
        const forage = parseFloat(storageData.FORAGE) || 0;
        const hay = parseFloat(storageData.DRYGRASS_WINDROW) || 0;
        const silage = parseFloat(storageData.SILAGE) || 0;
        const grass = parseFloat(storageData.GRASS_WINDROW) || 0;
        const tmr = parseFloat(storageData.TOTALMIXEDRATION) || 0;

        // Production and waste storage - check all possible sources
        // console.log("[DEBUG] All storageData keys:", Object.keys(storageData));
        // console.log("[DEBUG] Checking for production items in storage...");
        // console.log("[DEBUG] Checking for aggregated storage data...");

        // Check for farm-wide husbandry totals from production collector (new preferred source)
        let milkFromStorage = 0;
        let manureFromStorage = 0;
        let slurryFromStorage = 0;
        let liquidManureFromStorage = 0;
        let hasAggregatedData = false;

        if (this.husbandryTotals) {
          // Use farm-wide totals from the new production collector
          milkFromStorage = parseFloat(this.husbandryTotals.MILK) || 0;
          manureFromStorage = parseFloat(this.husbandryTotals.MANURE) || 0;
          slurryFromStorage = parseFloat(this.husbandryTotals.SLURRY) || 0;
          liquidManureFromStorage =
            parseFloat(this.husbandryTotals.LIQUIDMANURE) || 0;
          hasAggregatedData = true;
          //console.log("[DEBUG] Using husbandryTotals:", this.husbandryTotals);
        } else if (
          husbandryData.aggregatedStorage &&
          husbandryData.aggregatedStorage.totalMilk
        ) {
          // Fallback to old aggregated storage data
          milkFromStorage =
            parseFloat(husbandryData.aggregatedStorage.totalMilk) || 0;
          hasAggregatedData = true;
        } else {
          // Final fallback to individual storage data
          milkFromStorage = parseFloat(storageData.MILK) || 0;
        }

        // Primary storage sources (with farm-wide totals preferred)
        const liquidManure =
          liquidManureFromStorage ||
          parseFloat(storageData.liquidManure) ||
          parseFloat(storageData.LIQUIDMANURE) ||
          parseFloat(storageData.SLURRY) ||
          0;
        const manure = manureFromStorage || parseFloat(storageData.MANURE) || 0;
        const straw =
          parseFloat(storageData.straw) || parseFloat(storageData.STRAW) || 0;
        const water =
          parseFloat(storageData.water) || parseFloat(storageData.WATER) || 0;

        // Check production data as backup source (likely empty in FS25)
        const productionData = husbandryData.productionData || {};
        // console.log("[DEBUG] Production data contents:", productionData);

        // Use aggregated/storage data as primary, production data as fallback
        let milkProduction =
          milkFromStorage ||
          parseFloat(productionData.MILK) ||
          parseFloat(productionData.milk) ||
          0;

        let manureProduction =
          manure ||
          parseFloat(productionData.MANURE) ||
          parseFloat(productionData.manure) ||
          0;
        let liquidManureProduction =
          liquidManure ||
          parseFloat(productionData.LIQUIDMANURE) ||
          parseFloat(productionData.liquidManure) ||
          0;
        const meadowProduction =
          parseFloat(storageData.MEADOW) ||
          parseFloat(productionData.MEADOW) ||
          parseFloat(productionData.meadow) ||
          0;

        // Extract production rates if available
        const milkRate = parseFloat(productionData.milkPerHour) || 0;
        const liquidManureRate =
          parseFloat(productionData.liquidManurePerHour) || 0;

        // console.log("[DEBUG] Using forage data for Mixed Ration display");

        const result = {
          totalCapacity: totalCapacity || 10000, // Default if not calculated
          availableFood: availableFood, // Use aggregated available food from fillLevels
          totalMixedRation: availableFood || forage || tmr, // Backwards compatibility, use Available Food
          hay: hay,
          silage: silage,
          grass: grass,
          forage: forage, // Keep for internal use but won't display separately
          food: availableFood || forage || tmr || hay || silage || grass || 0, // Use available food as main food
          // Storage and production values
          water: water,
          waterCapacity: parseFloat(storageData.waterCapacity) || 0,
          straw: straw,
          strawCapacity: parseFloat(storageData.strawCapacity) || 0,
          liquidManure: liquidManureProduction, // Use combined liquid manure data
          liquidManureCapacity:
            parseFloat(storageData.liquidManureCapacity) || 0,
          milk: milkProduction, // Use combined/aggregated milk data
          manure: manureProduction, // Use combined manure data
          MANURE: manure, // Direct access to MANURE storage (farm-wide if available)
          SLURRY: slurryFromStorage || parseFloat(storageData.SLURRY) || 0, // Direct access to SLURRY storage
          LIQUIDMANURE: liquidManure, // Direct access to LIQUIDMANURE storage (farm-wide if available)
          meadow: meadowProduction, // Meadow/grass production data
          milkRate: milkRate, // Production rate in L/h
          liquidManureRate: liquidManureRate, // Production rate in L/h
          hasRealData: true,
          hasAggregatedData: hasAggregatedData, // Flag to indicate if using farm totals
          aggregatedInfo: hasAggregatedData
            ? husbandryData.aggregatedStorage
            : null, // Include aggregation info
        };

        // console.log("[DEBUG] Calculated food report result:", result);
        // console.log("[DEBUG] Using aggregated data:", result.hasAggregatedData);
        // console.log("[DEBUG] ***** FOOD REPORT COMPLETE *****");
        return result;
      }
    }

    // Check legacy foodData structure for backwards compatibility
    if (
      husbandryData &&
      husbandryData.foodData &&
      typeof husbandryData.foodData === "object"
    ) {
      return {
        totalCapacity: husbandryData.foodData.totalCapacity || 1000,
        totalMixedRation: husbandryData.foodData.totalMixedRation || 0,
        hay: husbandryData.foodData.hay || 0,
        silage: husbandryData.foodData.silage || 0,
        grass: husbandryData.foodData.grass || 0,
        hasRealData: true,
      };
    }

    // Return empty food data to indicate no real data available
    // This will trigger critical warnings when animals are present but no food data exists
    return {
      totalCapacity: 1000,
      totalMixedRation: 0,
      hay: 0,
      silage: 0,
      grass: 0,
      food: 0,
      water: 0,
      hasRealData: false, // Flag to indicate this is not real data
    };
  }

  estimatePastureCapacity(filename) {
    // Estimate capacity based on building type from filename
    if (!filename) return 20; // Default capacity

    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes("cowbarnbig") || lowerFilename.includes("large"))
      return 80;
    if (
      lowerFilename.includes("cowbarnmedium") ||
      lowerFilename.includes("medium")
    )
      return 45;
    if (
      lowerFilename.includes("cowbarnsmall") ||
      lowerFilename.includes("small")
    )
      return 15;
    if (lowerFilename.includes("chickencoop")) return 30;
    if (lowerFilename.includes("pigbarn")) return 25;
    if (lowerFilename.includes("sheepbarn")) return 25;
    if (lowerFilename.includes("horsestable")) return 10;
    return 20; // Default for unknown types
  }

  /* LEGACY
  // Was used for attempting to get a max capacity
  // FS25 does not store this data and is not accessible by API
  calculateFenceCapacity(segments) {
    try {
      // Extract coordinates from fence segments
      const coordinates = [];

      segments.forEach((segment) => {
        const start = segment.getAttribute("start");
        const end = segment.getAttribute("end");

        if (start) {
          const [x, y, z] = start.split(" ").map(parseFloat);
          coordinates.push({ x, z }); // Use x,z coordinates (ignore y/height)
        }
      });

      // Close the polygon if not already closed
      if (coordinates.length > 0) {
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first.x !== last.x || first.z !== last.z) {
          coordinates.push({ x: first.x, z: first.z });
        }
      }

      if (coordinates.length < 3) {
        console.warn("Insufficient coordinates for area calculation");
        return null;
      }

      // Calculate area using the shoelace formula
      let area = 0;
      const n = coordinates.length - 1; // Exclude the duplicate closing point

      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coordinates[i].x * coordinates[j].z;
        area -= coordinates[j].x * coordinates[i].z;
      }

      area = Math.abs(area) / 2;

      // Convert area to animal capacity
      const animalsPerSquareMeter = 0.01597; // Calibrated to match real game capacity values
      const capacity = Math.floor(area * animalsPerSquareMeter);

      const finalCapacity = Math.max(capacity, 5); // Minimum capacity of 5 animals

      // Store calculation details for later use in warning modals
      return {
        capacity: finalCapacity,
        calculationDetails: {
          area: area,
          segmentCount: segments.length,
          animalsPerSqMeter: animalsPerSquareMeter,
          rawCapacity: capacity,
        },
      };
    } catch (error) {
      console.error("Error calculating fence capacity:", error);
      return null;
    }
  }
  */
  calculateAllPastureWarnings(pasture, animals, conditionReport, foodReport) {
    const warnings = [];

    // 1. Capacity Warning (>90% full) ** Legacy
    /* LEGACY as mentioned above
    const capacity = pasture.capacity || 20;
    const capacityPercent = (animals.length / capacity) * 100;
    if (capacityPercent >= 90) {
      warnings.push({
        type: "capacity",
        severity: capacityPercent >= 100 ? "danger" : "warning",
        message: `At ${capacityPercent.toFixed(0)}% capacity (${
          animals.length
        }/${capacity})`,
        icon: "bi-exclamation-triangle-fill",
        affectedAnimals: animals, // All animals are affected by overcrowding
        details: {
          currentAnimals: animals.length,
          maxCapacity: capacity,
          utilizationPercent: capacityPercent,
          availableSpace: Math.max(0, capacity - animals.length),
          capacitySource: this.getCapacitySource(pasture),
          calculationMethod: this.getCapacityCalculationMethod(pasture),
          pastureValue: this.calculateTotalPastureValue(animals),
        },
      });
    }
    */
    // 2. Food and Water Warnings
    if (foodReport.hasRealData) {
      // If we have real data, check for low levels. Removed checks for "hay", "silage", "grass"
      const foodTypes = ["totalMixedRation"];
      foodTypes.forEach((foodType) => {
        const amount = foodReport[foodType];
        const capacity = foodReport.totalCapacity;
        const percent = (amount / capacity) * 100;
        if (percent < 20) {
          warnings.push({
            type: "food",
            severity: percent < 10 ? "danger" : "warning",
            message: `Low ${foodType}: ${percent.toFixed(0)}% remaining`,
            icon: "bi-basket",
          });
        }
      });
    } else {
      // If no real data available, assume animals need food and water
      // This represents the critical situation where food levels are unknown/0
      const animalCount = animals.length;
      if (animalCount > 0) {
        warnings.push({
          type: "food",
          severity: "danger",
          message: `Critical: No food data available for ${animalCount} animals - check feed levels immediately`,
          icon: "bi-exclamation-triangle-fill",
          details: {
            animalCount: animalCount,
            message:
              "Animals require food and water. Game shows 0L - immediate attention needed.",
          },
        });

        // Add water warning as well since animals need both
        warnings.push({
          type: "water",
          severity: "danger",
          message: `Critical: No water data available for ${animalCount} animals - check water supply immediately`,
          icon: "bi-droplet-fill",
          details: {
            animalCount: animalCount,
            message:
              "Animals require fresh water. Ensure water systems are functioning.",
          },
        });
      }
    }

    // 3. Health Warnings (animals with health < 70%)
    const sickAnimals = animals.filter((a) => a.health < 70);
    if (sickAnimals.length > 0) {
      const criticalAnimals = sickAnimals.filter((a) => a.health < 20);
      warnings.push({
        type: "health",
        severity: criticalAnimals.length > 0 ? "danger" : "warning",
        message: `${sickAnimals.length} with low health (${criticalAnimals.length} critical)`,
        icon: "bi-heart-pulse",
        affectedAnimals: sickAnimals,
        details: {
          total: sickAnimals.length,
          critical: criticalAnimals.length,
          warning: sickAnimals.length - criticalAnimals.length,
        },
      });
    }

    // 4. Production Warnings
    // High milk production warning (lactating cows need attention)
    const lactatingCows = animals.filter(
      (a) => a.isLactating && a.subType?.includes("COW")
    );
    if (lactatingCows.length > 5) {
      warnings.push({
        type: "production",
        severity: "info",
        message: `High milk production: ${conditionReport.milk}L/day from ${lactatingCows.length} cows`,
        icon: "bi-droplet-fill",
        affectedAnimals: lactatingCows,
        details: {
          totalProduction: conditionReport.milk,
          cowCount: lactatingCows.length,
        },
      });
    }

    // 5. Manure Warning (high storage needs collection)
    const manureStorage =
      foodReport && foodReport.MANURE ? foodReport.MANURE : 0;
    const slurryStorage =
      foodReport && foodReport.SLURRY ? foodReport.SLURRY : 0;
    const liquidManureStorage =
      foodReport && foodReport.LIQUIDMANURE ? foodReport.LIQUIDMANURE : 0;
    const totalManureStorage =
      manureStorage + slurryStorage + liquidManureStorage;

    if (totalManureStorage > 500) {
      // Warn when total manure/slurry storage exceeds 500L
      warnings.push({
        type: "maintenance",
        severity: "warning",
        message: `High manure storage: ${totalManureStorage.toFixed(
          1
        )}L needs collection`,
        icon: "bi-recycle",
      });
    }

    // 6. Breeding Management Warning
    const maleAnimals = animals.filter(
      (a) => a.gender?.toLowerCase() === "male"
    );
    const femaleAnimals = animals.filter(
      (a) => a.gender?.toLowerCase() === "female"
    );
    if (maleAnimals.length > 0 && femaleAnimals.length > 10) {
      const ratio = femaleAnimals.length / maleAnimals.length;
      if (ratio > 20) {
        warnings.push({
          type: "breeding",
          severity: "info",
          message: `Breeding ratio: 1 male to ${ratio.toFixed(
            0
          )} females is expected`,
          icon: "bi-gender-ambiguous",
        });
      }
    }

    // 7. Age Warning (too many old animals)
    const oldAnimals = animals.filter((a) => {
      const lifeExpectancy = {
        COW: 240,
        PIG: 180,
        SHEEP: 144,
        GOAT: 168,
        HORSE: 360,
        CHICKEN: 96,
      };
      const type = a.type || a.subType?.split("_")[0];
      const maxAge = lifeExpectancy[type] || 200;
      return a.age > maxAge * 0.8;
    });
    if (oldAnimals.length > animals.length * 0.3) {
      warnings.push({
        type: "age",
        severity: "warning",
        message: `${oldAnimals.length} aging animals need replacement planning`,
        icon: "bi-clock-history",
        affectedAnimals: oldAnimals,
        details: {
          total: oldAnimals.length,
          percentage: Math.round((oldAnimals.length / animals.length) * 100),
        },
      });
    }

    // 8. Dairy Optimization Warning
    const dairyAnimals = animals.filter(
      (a) =>
        a.isLactating &&
        (a.subType?.includes("COW") ||
          a.subType?.includes("GOAT") ||
          a.subType?.includes("SHEEP"))
    );

    if (dairyAnimals.length > 0) {
      // Find animals that could be offspring (young animals of same type)
      const potentialOffspring = [];

      dairyAnimals.forEach((mother) => {
        const motherType = mother.subType?.split("_")[0] || mother.type;

        // Look for young animals of the same type that could be offspring
        const youngOfSameType = animals.filter((animal) => {
          const animalType = animal.subType?.split("_")[0] || animal.type;
          return (
            animalType === motherType &&
            animal.age < 12 && // Less than 12 months old
            animal.id !== mother.id && // Not the mother herself
            !animal.isLactating
          ); // Not lactating (so likely offspring)
        });

        if (youngOfSameType.length > 0) {
          potentialOffspring.push({
            mother: mother,
            offspring: youngOfSameType,
            type: motherType,
          });
        }
      });

      if (potentialOffspring.length > 0) {
        const totalOffspring = potentialOffspring.reduce(
          (sum, pair) => sum + pair.offspring.length,
          0
        );
        const totalMothers = potentialOffspring.length;

        warnings.push({
          type: "dairy_optimization",
          severity: "info",
          message: `${totalMothers} lactating mothers with ${totalOffspring} young animals - separate for optimal milk production`,
          icon: "bi-droplet-half",
          affectedAnimals: [
            ...potentialOffspring.map((p) => p.mother),
            ...potentialOffspring.flatMap((p) => p.offspring),
          ],
          details: {
            motherOffspringPairs: potentialOffspring,
            totalMothers: totalMothers,
            totalOffspring: totalOffspring,
            potentialMilkGain: totalMothers * 15, // Estimated additional liters per day
          },
        });
      }
    }

    // 9. Birth Warning - animals due to give birth within a month
    const pregnantAnimals = animals.filter((a) => a.isPregnant);
    console
      .log
      //`[DEBUG] Found ${pregnantAnimals.length} pregnant animals in pasture`
      ();

    const animalsDueSoon = animals.filter((animal) => {
      if (animal.isPregnant) {
        // Calculate estimated due date based on pregnancy calculation
        const animalType = animal.type || animal.subType?.split("_")[0];
        const gestationPeriods = {
          COW: 9,
          PIG: 4,
          SHEEP: 5,
          GOAT: 5,
          HORSE: 11,
          CHICKEN: 1,
        };
        const gestationMonths = gestationPeriods[animalType] || 6;
        const reproductionPercent = (animal.reproduction || 0) * 100;

        let pregnancyProgress = 0;
        if (reproductionPercent > 80) pregnancyProgress = 0.8;
        else if (reproductionPercent > 60) pregnancyProgress = 0.6;
        else if (reproductionPercent > 40) pregnancyProgress = 0.4;
        else pregnancyProgress = 0.2;

        const monthsRemaining = Math.max(
          0,
          Math.round(gestationMonths * (1 - pregnancyProgress))
        );

        return monthsRemaining <= 1;
      }
      return false;
    });

    //console.log(`[DEBUG] Animals due soon: ${animalsDueSoon.length}`);

    if (animalsDueSoon.length > 0) {
      const dueNames = animalsDueSoon
        .slice(0, 3)
        .map((a) => a.name || `#${a.id}`)
        .join(", ");
      const moreCount =
        animalsDueSoon.length > 3 ? animalsDueSoon.length - 3 : 0;
      const displayNames =
        moreCount > 0 ? `${dueNames} +${moreCount}` : dueNames;

      console
        .log
        //`[DEBUG] Adding birth warning for ${animalsDueSoon.length} animals: ${displayNames}`
        ();

      warnings.push({
        type: "birth",
        severity: "warning",
        message: `${animalsDueSoon.length} animal${
          animalsDueSoon.length > 1 ? "s" : ""
        } due to give birth soon`,
        icon: "bi-exclamation-triangle",
        details: {
          dueCount: animalsDueSoon.length,
          dueNames: displayNames,
          animals: animalsDueSoon,
        },
      });
    }

    return warnings;
  }

  showWarningDetails(pastureId, warningIndex) {
    const pasture = this.pastures.find((p) => p.id === pastureId);
    if (!pasture || !pasture.allWarnings[warningIndex]) {
      console.error("Warning not found");
      return;
    }

    const warning = pasture.allWarnings[warningIndex];
    const modal = new bootstrap.Modal(document.getElementById("warningModal"));
    const content = document.getElementById("warningDetailsContent");

    // Update modal title
    document.getElementById("warningModalLabel").innerHTML = `
            <i class="bi bi-${warning.icon} me-2 text-${
      warning.severity === "danger" ? "danger" : warning.severity
    }"></i>
            ${this.getWarningTypeTitle(warning.type)} - ${pasture.name}
        `;

    let detailsHTML = `
            <div class="alert alert-${
              warning.severity === "danger"
                ? "danger"
                : warning.severity === "warning"
                ? "warning"
                : "info"
            } mb-4">
                <i class="bi bi-${warning.icon} me-2"></i>
                <strong>${warning.message}</strong>
            </div>
        `;

    // Add specific details based on warning type
    if (warning.affectedAnimals && warning.affectedAnimals.length > 0) {
      detailsHTML += `
                <h6 class="text-farm-accent mb-3">
                    <i class="bi bi-list me-2"></i>
                    Affected Animals (${warning.affectedAnimals.length})
                </h6>
                <div class="table-responsive">
                    <table class="table table-dark table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Health</th>
                                <th>Age</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      warning.affectedAnimals.forEach((animal) => {
        const displayName =
          animal.name && animal.name.trim() !== ""
            ? animal.name
            : `#${animal.id}`;
        const healthClass = this.getHealthClass(animal.health);
        const statusBadges = [];

        if (animal.health < 20)
          statusBadges.push('<span class="badge bg-danger">Critical</span>');
        else if (animal.health < 50)
          statusBadges.push('<span class="badge bg-warning">Poor</span>');
        if (animal.isPregnant)
          statusBadges.push(
            '<span class="badge status-pregnant">Pregnant</span>'
          );
        if (animal.isLactating)
          statusBadges.push(
            '<span class="badge status-lactating">Lactating</span>'
          );

        detailsHTML += `
                    <tr>
                        <td>${animal.id}</td>
                        <td>${displayName}</td>
                        <td>${animal.subType || animal.type || "Unknown"}</td>
                        <td>
                            <div class="health-bar">
                                <div class="health-fill ${healthClass}" style="width: ${
          animal.health
        }%"></div>
                            </div>
                            ${Math.round(animal.health)}%
                        </td>
                        <td>${animal.age || 0} months</td>
                        <td>${
                          statusBadges.join(" ") ||
                          '<span class="badge bg-success">Normal</span>'
                        }</td>
                    </tr>
                `;
      });

      detailsHTML += `
                        </tbody>
                    </table>
                </div>
            `;
    }

    // Add additional context based on warning type
    if (warning.details) {
      detailsHTML += `
                <h6 class="text-farm-accent mb-3 mt-4">
                    <i class="bi bi-info-circle me-2"></i>
                    Additional Information
                </h6>
                <div class="row">
            `;

      switch (warning.type) {
        case "health":
          detailsHTML += `
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-danger">${warning.details.critical}</h5>
                                    <small>Critical (<20% health)</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.warning}</h5>
                                    <small>Poor (20-70% health)</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${warning.details.total}</h5>
                                    <small>Total Affected</small>
                                </div>
                            </div>
                        </div>
                    `;
          break;
        case "production":
          detailsHTML += `
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${warning.details.totalProduction}L</h5>
                                    <small>Daily Milk Production</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-success">${warning.details.cowCount}</h5>
                                    <small>Lactating Cows</small>
                                </div>
                            </div>
                        </div>
                    `;
          break;
        case "age":
          detailsHTML += `
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.total}</h5>
                                    <small>Aging Animals</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.percentage}%</h5>
                                    <small>Of Total Herd</small>
                                </div>
                            </div>
                        </div>
                    `;
          break;
        case "birth":
          detailsHTML += `
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning pulse-warning">${warning.details.dueCount}</h5>
                                    <small>Animals Due Soon</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${warning.details.dueNames}</h5>
                                    <small>Names</small>
                                </div>
                            </div>
                        </div>
                    `;
          break;
        case "capacity":
          detailsHTML += `
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-danger">${
                                      warning.details.currentAnimals
                                    }</h5>
                                    <small>Current Animals</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${
                                      warning.details.maxCapacity
                                    }</h5>
                                    <small>Max Capacity</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.utilizationPercent.toFixed(
                                      1
                                    )}%</h5>
                                    <small>Utilization</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-${
                                      warning.details.availableSpace > 0
                                        ? "success"
                                        : "danger"
                                    }">${warning.details.availableSpace}</h5>
                                    <small>Available Space</small>
                                </div>
                            </div>
                        </div>
                    `;

          // Add capacity calculation details
          detailsHTML += `
                        </div>
                        <div class="alert alert-info mt-4">
                            <h6 class="text-info mb-3">
                                <i class="bi bi-calculator me-2"></i>
                                Capacity Calculation Details
                            </h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Source:</strong> ${
                                      warning.details.capacitySource
                                    }</p>
                                    <p><strong>Method:</strong> ${
                                      warning.details.calculationMethod
                                        .description
                                    }</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Formula:</strong> <code>${
                                      warning.details.calculationMethod.formula
                                    }</code></p>
                                    <p><strong>Details:</strong> ${
                                      warning.details.calculationMethod.details
                                    }</p>
                                </div>
                            </div>
                        </div>
                        <div class="alert alert-success mt-3">
                            <h6 class="text-success mb-3">
                                <i class="bi bi-currency-dollar me-2"></i>
                                Pasture Livestock Value
                            </h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <h5 class="text-success">$${warning.details.pastureValue.total.toLocaleString()}</h5>
                                        <small>Total Value</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <h5 class="text-info">$${warning.details.pastureValue.average.toLocaleString()}</h5>
                                        <small>Average per Animal</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <h5 class="text-warning">${
                                          Object.keys(
                                            warning.details.pastureValue
                                              .breakdown
                                          ).length
                                        }</h5>
                                        <small>Animal Types</small>
                                    </div>
                                </div>
                            </div>
                            ${
                              Object.keys(
                                warning.details.pastureValue.breakdown
                              ).length > 0
                                ? `
                            <hr class="my-3">
                            <h6 class="mb-2">Value Breakdown by Type:</h6>
                            <div class="row">
                                ${Object.entries(
                                  warning.details.pastureValue.breakdown
                                )
                                  .map(
                                    ([type, data]) => `
                                    <div class="col-md-6 mb-2">
                                        <small><strong>${type}:</strong> ${
                                      data.count
                                    } animals = $${data.totalValue.toLocaleString()}</small>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                            `
                                : ""
                            }
                        </div>
                        <div class="row">
                    `;
          break;
        case "dairy_optimization":
          detailsHTML += `
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${warning.details.totalMothers}</h5>
                                    <small>Lactating Mothers</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.totalOffspring}</h5>
                                    <small>Young Animals</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-success">+${warning.details.potentialMilkGain}L</h5>
                                    <small>Potential Daily Gain</small>
                                </div>
                            </div>
                        </div>
                    `;

          // Add detailed mother-offspring pairs
          if (warning.details.motherOffspringPairs) {
            detailsHTML += `
                            </div>
                            <h6 class="text-farm-accent mb-3 mt-4">
                                <i class="bi bi-arrow-left-right me-2"></i>
                                Mother-Offspring Pairs
                            </h6>
                            <div class="row">
                        `;

            warning.details.motherOffspringPairs.forEach((pair, index) => {
              const motherName =
                pair.mother.name && pair.mother.name.trim() !== ""
                  ? pair.mother.name
                  : `#${pair.mother.id}`;
              detailsHTML += `
                                <div class="col-md-6 mb-3">
                                    <div class="card bg-dark border-info">
                                        <div class="card-header">
                                            <h6 class="mb-0 text-info">
                                                <i class="bi bi-droplet-fill me-2"></i>
                                                Mother: ${motherName} (${
                pair.type
              })
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <p><small class="text-muted">Age: ${
                                              pair.mother.age || 0
                                            } months | Health: ${pair.mother.health.toFixed(
                1
              )}%</small></p>
                                            <h6 class="text-warning mb-2">
                                                <i class="bi bi-arrow-down me-1"></i>
                                                Young Animals (${
                                                  pair.offspring.length
                                                }):
                                            </h6>
                                            <ul class="list-unstyled mb-0">
                                                ${pair.offspring
                                                  .map((offspring) => {
                                                    const offspringName =
                                                      offspring.name &&
                                                      offspring.name.trim() !==
                                                        ""
                                                        ? offspring.name
                                                        : `#${offspring.id}`;
                                                    return `<li><small>${offspringName} - ${
                                                      offspring.age || 0
                                                    } months old</small></li>`;
                                                  })
                                                  .join("")}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            `;
            });

            detailsHTML += `
                            </div>
                            <div class="alert alert-info mt-3">
                                <i class="bi bi-lightbulb me-2"></i>
                                <strong>Recommendation:</strong> Move the young animals to a separate pasture to allow mothers to produce milk at optimal capacity.
                                This can increase daily milk production by an estimated ${warning.details.potentialMilkGain} liters.
                            </div>
                            <div class="row">
                        `;
          }
          break;
      }

      detailsHTML += `
                </div>
            `;
    }

    content.innerHTML = detailsHTML;
    modal.show();
  }

  getCapacitySource(pasture) {
    // Determine how the capacity was calculated
    if (pasture.filename && pasture.filename.includes("cowbarn")) {
      return "Building Type (Cow Barn)";
    } else if (pasture.filename && pasture.filename.includes("pigbarn")) {
      return "Building Type (Pig Barn)";
    } else if (pasture.filename && pasture.filename.includes("chickencoop")) {
      return "Building Type (Chicken Coop)";
    } else if (pasture.filename && pasture.filename.includes("sheepbarn")) {
      return "Building Type (Sheep Barn)";
    } else if (pasture.filename && pasture.filename.includes("horsestable")) {
      return "Building Type (Horse Stable)";
    } else if (this.hasFencing(pasture)) {
      return "Custom Fence Area";
    } else {
      return "Default Estimate";
    }
  }

  getCapacityCalculationMethod(pasture) {
    if (this.hasFencing(pasture)) {
      const fenceDetails = window.fenceCalculationDetails?.[pasture.id];
      if (fenceDetails) {
        return {
          type: "fence_area",
          description:
            "Calculated from custom fence perimeter using polygon area formula",
          formula: `${fenceDetails.area.toFixed(1)} sq meters × ${
            fenceDetails.animalsPerSqMeter
          } animals/sq meter = ${fenceDetails.rawCapacity} animals (min 5)`,
          details: `Shoelace formula applied to ${fenceDetails.segmentCount} fence segments. Final capacity: ${pasture.capacity} animals`,
        };
      } else {
        return {
          type: "fence_area",
          description:
            "Calculated from custom fence perimeter using polygon area formula",
          formula: "Area (sq meters) × 0.01 animals/sq meter = Capacity",
          details:
            "Uses shoelace formula to calculate enclosed area from fence coordinates",
        };
      }
    } else {
      const filename = pasture.filename || "";
      const estimatedCapacity = this.estimatePastureCapacity(filename);
      return {
        type: "building_estimate",
        description: "Estimated based on building type from filename",
        formula: `Standard building type → ${estimatedCapacity} animals`,
        details: `Building: ${
          filename || "Unknown"
        } → Standard capacity for this building type`,
      };
    }
  }

  hasFencing(pasture) {
    // This would ideally check if the pasture was created with fence calculation
    // For now, we'll use a heuristic based on capacity values
    const filename = pasture.filename || "";
    const estimatedCapacity = this.estimatePastureCapacity(filename);
    return pasture.capacity && pasture.capacity !== estimatedCapacity;
  }

  calculateAnimalValue(animal) {
    // Debug logging for specific animals

    // RealisticLivestock mod accurate base values by breed
    const baseValues = {
      // Cows (increased base values by ~300)
      COW_HOLSTEIN: 1100,
      COW_ANGUS: 1050,
      COW_SWISS_BROWN: 1100,
      COW_LIMOUSIN: 1080,
      COW_HEREFORD: 1020,
      COW_WATERBUFFALO: 1150,
      COW_AYRSHIRE: 1000,
      COW_BRAHMAN: 1080,
      COW_BROWN_SWISS: 1050,
      COW: 1050, // Default cow

      // Bulls (increased base values by ~300)
      BULL_HOLSTEIN: 1200,
      BULL_ANGUS: 1150,
      BULL_SWISS_BROWN: 1200,
      BULL_LIMOUSIN: 1170,
      BULL_HEREFORD: 1100,
      BULL_WATERBUFFALO: 1250,
      BULL: 1150, // Default bull

      // Sheep
      SHEEP_SUFFOLK: 1200,
      SHEEP_DORPER: 1100,
      SHEEP_ALPINE: 1300,
      SHEEP_LANDRACE: 600,
      SHEEP: 600, // Default sheep

      // Pigs
      PIG_LANDRACE: 1500,
      PIG_DUROC: 1400,
      PIG_PIETRAIN: 1100,
      PIG: 1000,

      // Chickens
      CHICKEN_BROWN: 25,
      CHICKEN_WHITE: 25,
      CHICKEN: 5,
      ROOSTER_BROWN: 30,
      ROOSTER_WHITE: 30,
      ROOSTER: 30,

      // Horses (mature prices, young horses are much cheaper)
      HORSE_QUARTER: 5000,
      HORSE_CLYDESDALE: 6000,
      HORSE_HAFLINGER: 4000,
      HORSE_AMERICAN_QUARTER: 5000,
      HORSE_SEAL_BROWN: 4500,
      HORSE: 5000,
    };

    // Target weights for RealisticLivestock weight factor calculation
    const targetWeights = {
      COW_HOLSTEIN: 650,
      COW_ANGUS: 600,
      COW_SWISS_BROWN: 620,
      COW_LIMOUSIN: 640,
      COW_HEREFORD: 580,
      COW_WATERBUFFALO: 700,
      BULL_HOLSTEIN: 950,
      BULL_ANGUS: 900,
      BULL_SWISS_BROWN: 920,
      BULL_LIMOUSIN: 940,
      BULL_HEREFORD: 880,
      BULL_WATERBUFFALO: 1000,
      SHEEP_SUFFOLK: 80,
      SHEEP_DORPER: 75,
      SHEEP_ALPINE: 85,
      SHEEP: 80,
      PIG_LANDRACE: 120,
      PIG_DUROC: 115,
      PIG: 120,
      CHICKEN_BROWN: 2.5,
      CHICKEN_WHITE: 2.5,
      CHICKEN: 2.5,
      ROOSTER_BROWN: 3.0,
      ROOSTER_WHITE: 3.0,
      ROOSTER: 3.0,
      HORSE_QUARTER: 500,
      HORSE_CLYDESDALE: 800,
      HORSE_HAFLINGER: 450,
      HORSE_SEAL_BROWN: 500,
      HORSE: 500,
    };

    const minWeights = {
      COW_HOLSTEIN: 40,
      COW_ANGUS: 35,
      COW_SWISS_BROWN: 38,
      COW_LIMOUSIN: 42,
      COW_HEREFORD: 32,
      COW_WATERBUFFALO: 45,
      BULL_HOLSTEIN: 42,
      BULL_ANGUS: 38,
      BULL_SWISS_BROWN: 40,
      BULL_LIMOUSIN: 45,
      BULL_HEREFORD: 35,
      BULL_WATERBUFFALO: 48,
      SHEEP_SUFFOLK: 3,
      SHEEP_DORPER: 2.8,
      SHEEP_ALPINE: 3.2,
      SHEEP: 3,
      PIG_LANDRACE: 1.5,
      PIG_DUROC: 1.4,
      PIG: 1.5,
      CHICKEN_BROWN: 0.1,
      CHICKEN_WHITE: 0.1,
      CHICKEN: 0.1,
      ROOSTER_BROWN: 0.12,
      ROOSTER_WHITE: 0.12,
      ROOSTER: 0.12,
      HORSE_QUARTER: 50,
      HORSE_CLYDESDALE: 80,
      HORSE_HAFLINGER: 45,
      HORSE_SEAL_BROWN: 50,
      HORSE: 50,
    };

    // Get values for this animal
    const subType = animal.subType || animal.type?.toUpperCase();
    const baseValue =
      baseValues[subType] ||
      baseValues[subType?.split("_")[0]] ||
      baseValues["COW"];
    const targetWeight =
      targetWeights[subType] || targetWeights[subType?.split("_")[0]] || 100;
    const minWeight =
      minWeights[subType] || minWeights[subType?.split("_")[0]] || 10;
    const reproductionMinAge = 12; // Most animals can reproduce at 12 months

    // Get age-based sell price (RealisticLivestock uses subType.sellPrice:get(age))
    const age = animal.age || 12;
    let sellPrice;

    // Create age-based pricing curves based on in-game data
    if (subType?.includes("COW")) {
      // Cow pricing: starts low, peaks around 24-36 months
      if (age <= 1) sellPrice = baseValue * 0.15;
      else if (age <= 6)
        sellPrice = baseValue * (0.15 + (age - 1) * 0.07); // 15% to 50%
      else if (age <= 12)
        sellPrice = baseValue * (0.5 + (age - 6) * 0.08); // 50% to 98%
      else if (age <= 36) sellPrice = baseValue * 1.0; // Peak value
      else if (age <= 120)
        sellPrice = baseValue * Math.max(0.6, 1.0 - ((age - 36) / 84) * 0.4);
      else sellPrice = baseValue * 0.4; // Old cows
    } else if (subType?.includes("BULL")) {
      // Bulls: similar to cows but higher peak
      if (age <= 1) sellPrice = baseValue * 0.2;
      else if (age <= 6) sellPrice = baseValue * (0.2 + (age - 1) * 0.08);
      else if (age <= 12) sellPrice = baseValue * (0.6 + (age - 6) * 0.07);
      else if (age <= 48) sellPrice = baseValue * 1.0;
      else if (age <= 120)
        sellPrice = baseValue * Math.max(0.5, 1.0 - ((age - 48) / 72) * 0.5);
      else sellPrice = baseValue * 0.3;
    } else if (subType?.includes("HORSE")) {
      // Horses: very low when young, peak much later
      if (age < 24) {
        sellPrice = baseValue * (0.2 + (age / 24) * 0.4); // 20-60% of base
      } else if (age < 60) {
        sellPrice = baseValue * (0.6 + ((age - 24) / 36) * 0.4); // 60-100%
      } else if (age > 240) {
        sellPrice = baseValue * Math.max(0.3, 1.0 - ((age - 240) / 120) * 0.7);
      } else {
        sellPrice = baseValue;
      }
    } else {
      // Default age curve for other animals
      if (age <= 6) sellPrice = baseValue * (0.3 + age * 0.1);
      else if (age <= 24) sellPrice = baseValue;
      else sellPrice = baseValue * Math.max(0.6, 1.0 - ((age - 24) / 96) * 0.4);
    }

    // Age factor for display
    let ageFactor = 1.0;
    if (age < reproductionMinAge) {
      ageFactor = 0.3 + (age / reproductionMinAge) * 0.7;
    } else if (age > 120) {
      ageFactor = Math.max(0.2, 1.0 - ((age - 120) / 120) * 0.8);
    }

    // Calculate weight factor (exact RealisticLivestock formula)
    let weightFactor = 1.0;
    const weight = parseFloat(animal.weight) || targetWeight;
    if (weight > 0) {
      const targetWeightForAge =
        ((targetWeight - minWeight) / (reproductionMinAge * 1.5)) *
        Math.min(age + 1.5, reproductionMinAge * 1.5) *
        0.85;
      weightFactor = 1 + (weight - targetWeightForAge) / targetWeightForAge;
    }

    // Health factor (RealisticLivestock: health/100)
    const healthFactor = (animal.health || 0) / 100;

    // Meat/Quality factor (RealisticLivestock uses genetics.quality)
    const meatFactor = animal.genetics?.quality || 1.0;

    // Apply RealisticLivestock formula adjustments (exact from Lua code)
    sellPrice = sellPrice + sellPrice * 0.25 * (meatFactor - 1);
    sellPrice =
      sellPrice +
      ((sellPrice * 0.6) / targetWeight) * weight * (-1 + meatFactor);

    // Add pregnancy and lactation bonuses to sellPrice (not final value)
    if (animal.isPregnant) {
      sellPrice = sellPrice + sellPrice * 0.25;
    }
    if (animal.isLactating) {
      sellPrice = sellPrice + sellPrice * 0.15;
    }

    // Final calculation based on animal type (exact RealisticLivestock formula)
    let finalValue;
    if (subType?.includes("HORSE")) {
      // Horses use fitness and riding factors from animal data
      const fitnessFactor = (animal.fitness || 0) / 100;
      const ridingFactor = (animal.riding || 0) / 100;
      const dirtFactor = (animal.dirt || 0) / 100;

      finalValue = Math.max(
        sellPrice *
          meatFactor *
          weightFactor *
          (0.3 +
            0.5 * healthFactor +
            0.3 * ridingFactor +
            0.2 * fitnessFactor -
            0.2 * dirtFactor),
        sellPrice * 0.05
      );
    } else {
      // Standard livestock formula (exact from RealisticLivestock line 2682)

      finalValue = Math.max(
        sellPrice * 0.6 +
          sellPrice * 0.4 * weightFactor * (0.75 * healthFactor),
        sellPrice * 0.05
      );
    }

    // Calculate genetics factor for display (weighted average)
    let geneticsFactor = 1.0;
    if (animal.genetics) {
      geneticsFactor =
        animal.genetics.productivity * 0.4 +
        animal.genetics.quality * 0.3 +
        animal.genetics.health * 0.15 +
        animal.genetics.fertility * 0.1 +
        animal.genetics.metabolism * 0.05;
    }

    // Reproduction factor for display
    let reproductionFactor = 1.0;
    if (animal.isPregnant) reproductionFactor += 0.25;
    if (animal.isLactating) reproductionFactor += 0.15;

    // Debug for any animal to understand genetics ratings
    if (animal.name === "Charlie" || true) {
      // Enable for all animals temporarily
      const avgGenetics = animal.genetics
        ? (animal.genetics.metabolism +
            animal.genetics.quality +
            animal.genetics.health +
            animal.genetics.fertility +
            animal.genetics.productivity) /
          5
        : 1.0;

      let geneticsRating = "Unknown";
      if (avgGenetics < 0.4) geneticsRating = "Very Bad";
      else if (avgGenetics < 0.7) geneticsRating = "Bad";
      else if (avgGenetics < 1.0) geneticsRating = "Average";
      else if (avgGenetics < 1.3) geneticsRating = "Good";
      else if (avgGenetics < 1.6) geneticsRating = "Very Good";
      else geneticsRating = "Excellent";

      const calculatedValue = Math.round(
        Math.max(finalValue, baseValue * 0.05)
      );
    }

    return {
      value: Math.round(Math.max(finalValue, baseValue * 0.05)),
      breakdown: {
        baseValue,
        ageFactor,
        healthFactor,
        geneticsFactor,
        reproductionFactor,
        weightFactor,
        animalType: subType,
      },
    };
  }

  calculateTotalPastureValue(animals) {
    let totalValue = 0;
    const breakdown = {};

    animals.forEach((animal) => {
      const animalValue = this.calculateAnimalValue(animal);
      totalValue += animalValue.value;

      const type = animalValue.breakdown.animalType;
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, totalValue: 0 };
      }
      breakdown[type].count++;
      breakdown[type].totalValue += animalValue.value;
    });

    return {
      total: totalValue,
      breakdown,
      average: animals.length > 0 ? Math.round(totalValue / animals.length) : 0,
    };
  }

  generateAnimalValueDisplay(animal) {
    const valueInfo = this.calculateAnimalValue(animal);
    const breakdown = valueInfo.breakdown;

    return `
            <div class="row">
                <div class="col-md-4">
                    <div class="text-center">
                        <h4 class="text-success mb-2">$${valueInfo.value.toLocaleString()}</h4>
                        <small class="text-muted">Estimated Market Value<br>Value is not final</small>
                    </div>
                </div>
                <div class="col-md-8">
                    <h6 class="text-info mb-3">Value Calculation Breakdown:</h6>
                    <table class="table table-sm table-borderless table-dark text-light">
                        <tr>
                            <td><strong>Base Value (${
                              breakdown.animalType
                            }):</strong></td>
                            <td class="text-end">$${breakdown.baseValue.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Age Factor:</strong></td>
                            <td class="text-end">${(
                              breakdown.ageFactor * 100
                            ).toFixed(0)}% (${this.getAgeDescription(
      animal.age
    )})</td>
                        </tr>
                        <tr>
                            <td><strong>Health Factor:</strong></td>
                            <td class="text-end">${(
                              breakdown.healthFactor * 100
                            ).toFixed(0)}% (${Math.round(
      animal.health
    )}% health)</td>
                        </tr>
                        <tr>
                            <td><strong>Genetics Factor:</strong></td>
                            <td class="text-end">${breakdown.geneticsFactor.toFixed(
                              2
                            )}x (${this.getGeneticsDescription(
      animal.genetics
    )})</td>
                        </tr>
                        <tr>
                            <td><strong>Reproduction Factor:</strong></td>
                            <td class="text-end">${(
                              breakdown.reproductionFactor * 100
                            ).toFixed(0)}% (${this.getReproductionDescription(
      animal
    )})</td>
                        </tr>
                        ${
                          breakdown.weightFactor !== 1.0
                            ? `
                        <tr>
                            <td><strong>Weight Factor:</strong></td>
                            <td class="text-end">${(
                              breakdown.weightFactor * 100
                            ).toFixed(0)}% (${
                                animal.weight?.toFixed(2) || 0
                              } kg)</td>
                        </tr>
                        `
                            : ""
                        }
                    </table>
                    <hr class="my-2">
                    <div class="d-flex justify-content-between">
                        <strong>Estimated Final Value:</strong>
                        <strong class="text-success">$${valueInfo.value.toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        `;
  }

  getAgeDescription(age) {
    if (age < 6) return "Very Young";
    if (age < 12) return "Young";
    if (age < 120) return "Mature";
    return "Old";
  }

  getGeneticsDescription(genetics) {
    if (!genetics) return "Unknown";
    const avg =
      (genetics.health +
        genetics.metabolism +
        genetics.fertility +
        genetics.quality +
        genetics.productivity) /
      5;
    if (avg > 1.8) return "Excellent";
    if (avg > 1.6) return "Good";
    if (avg > 1.4) return "Average";
    if (avg > 1.2) return "Below Average";
    return "Poor";
  }

  getReproductionDescription(animal) {
    const descriptions = [];
    if (animal.isPregnant === "true" || animal.isPregnant === true) {
      descriptions.push("Pregnant");
    }
    if (animal.isParent === "true" || animal.isParent === true) {
      descriptions.push("Breeding Stock");
    }
    if (animal.isLactating === "true" || animal.isLactating === true) {
      descriptions.push("Lactating");
    }
    return descriptions.length > 0 ? descriptions.join(", ") : "Standard";
  }

  getWarningTypeTitle(type) {
    const titles = {
      health: "Health Warning",
      capacity: "Capacity Warning",
      food: "Food Warning",
      production: "Production Notice",
      maintenance: "Maintenance Required",
      breeding: "Breeding Notice",
      age: "Age Management",
      dairy_optimization: "Dairy Optimization",
      birth: "Birth Warning",
    };
    return titles[type] || "Warning";
  }

  updatePastureDisplay() {
    // Only update pasture display if we're on the pastures section
    if (
      this.currentSection !== "pastures" &&
      this.currentSection !== "dashboard"
    ) {
      return;
    }

    if (!this.pastures) {
      this.parsePastureData();
    }

    // Update summary cards
    const totalPastures = this.pastures.length;
    const totalLivestock = this.pastures.reduce(
      (sum, pasture) => sum + pasture.animalCount,
      0
    );
    const totalAllWarnings = this.pastures.reduce(
      (sum, pasture) => sum + pasture.allWarnings.length,
      0
    );
    const totalMilkValue = this.pastures.reduce((sum, pasture) => {
      // Only include value from pastures that actually have dairy animals
      if (
        pasture.milkProductionData &&
        pasture.milkProductionData.lactatingCows > 0
      ) {
        return sum + (pasture.milkValue || 0);
      }
      return sum;
    }, 0);
    const avgHealth =
      totalLivestock > 0
        ? (
            this.pastures.reduce(
              (sum, pasture) => sum + pasture.avgHealth * pasture.animalCount,
              0
            ) / totalLivestock
          ).toFixed(0)
        : 0;

    const totalPasturesEl = document.getElementById("total-pastures-count");
    const pastureAnimalsEl = document.getElementById("pasture-livestock-count");

    if (totalPasturesEl) totalPasturesEl.textContent = totalPastures;
    if (pastureAnimalsEl) pastureAnimalsEl.textContent = totalLivestock;
    // Calculate total birth warnings from unified warnings system
    const totalBirthWarnings = this.pastures.reduce((sum, pasture) => {
      const birthWarnings = pasture.allWarnings.filter(
        (w) => w.type === "birth"
      );
      console
        .log
        //`[DEBUG] Pasture ${pasture.name} has ${birthWarnings.length} birth warnings`
        ();
      return sum + birthWarnings.length;
    }, 0);
    console
      .log
      //`[DEBUG] Total birth warnings across all pastures: ${totalBirthWarnings}`
      ();
    const birthWarningsEl = document.getElementById("birth-warnings-count");
    const pastureHealthEl = document.getElementById("pasture-avg-health");

    if (birthWarningsEl) birthWarningsEl.textContent = totalBirthWarnings;
    if (pastureHealthEl) pastureHealthEl.textContent = avgHealth + "%";

    // Update pastures list (only if pastures container exists)
    if (document.getElementById("pastures-list")) {
      this.renderPasturesList();
    }

    // Update main dashboard count
    const pastureCountElement = document.getElementById("pasture-count");
    if (pastureCountElement) {
      pastureCountElement.textContent = `${totalPastures} Pastures`;
    }

    // Update warning badge on dashboard
    const warningBadge = document.getElementById("pasture-warnings-badge");
    const warningCount = document.getElementById("pasture-warnings-count");
    if (warningBadge && warningCount) {
      if (totalAllWarnings > 0) {
        warningCount.textContent = totalAllWarnings;
        warningBadge.classList.remove("d-none");
      } else {
        warningBadge.classList.add("d-none");
      }
    }
  }

  renderPasturesList() {
    // console.log("[DEBUG] ***** renderPasturesList CALLED *****");
    // console.log("[DEBUG] this.pastures:", this.pastures);
    // console.log("[DEBUG] this.pastures.length:", this.pastures.length);

    if (this.pastures && this.pastures.length > 0) {
      this.pastures.forEach((pasture, index) => {
        // console.log(
        //   `[DEBUG] Pasture ${index} (${pasture.name}) foodReport:`,
        //   pasture.foodReport
        // );
        // console.log(
        //   `[DEBUG] Pasture ${index} foodReport.forage:`,
        //   pasture.foodReport.forage
        // );
        // console.log(
        //   `[DEBUG] Pasture ${index} foodReport.forage > 0:`,
        //   pasture.foodReport.forage > 0
        // );
      });
    }

    const pasturesContainer = document.getElementById("pastures-list");
    if (!pasturesContainer) return;

    if (this.pastures.length === 0) {
      pasturesContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-info-circle display-1"></i>
                    <h4>No Pastures Found</h4>
                    <p>No livestock buildings with animals were found in your save data.</p>
                </div>
            `;
      return;
    }

    const pasturesHTML = this.pastures
      .map(
        (pasture) => `
            <div class="card bg-dark mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 d-flex align-items-center">
                        <i class="bi bi-house-door me-2"></i>
                        ${pasture.name}
                    </h6>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-info btn-sm" onclick="dashboard.showPastureDetails('${
                          pasture.id
                        }')">
                            <i class="bi bi-eye me-1"></i>Details
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="dashboard.showPastureLivestock('${
                          pasture.id
                        }')">
                            <i class="bi bi-table me-1"></i>Livestock
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-list-ol me-2 text-farm-accent"></i>
                                <span><strong>Total Animals:</strong> ${
                                  pasture.animalCount
                                }</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-heart-pulse me-2 text-farm-success"></i>
                                <span><strong>Avg Health:</strong> ${
                                  pasture.avgHealth
                                }%</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-gender-male me-2 text-info"></i>
                                <span><strong>Males:</strong> ${
                                  pasture.maleCount || 0
                                }</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-gender-female me-2 text-danger"></i>
                                <span><strong>Females:</strong> ${
                                  pasture.femaleCount || 0
                                }</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-speedometer2 me-2 text-farm-info"></i>
                                <span><strong>Productivity:</strong> ${Math.round(
                                  pasture.conditionReport.productivity
                                )}%</span>
                            </div>
                            ${(() => {
                              const hasMilkData =
                                pasture.milkProductionData &&
                                pasture.milkProductionData.lactatingCows > 0;
                              const isDairyPasture =
                                hasMilkData &&
                                pasture.animals.some((animal) => {
                                  const subTypeUpper = (
                                    animal.subType || ""
                                  ).toUpperCase();
                                  return (
                                    subTypeUpper.includes("COW") ||
                                    subTypeUpper === "COW" ||
                                    subTypeUpper.includes("GOAT")
                                  );
                                });

                              if (hasMilkData && isDairyPasture) {
                                return `
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-droplet-fill me-2 text-farm-info"></i>
                                <span><strong>Lactating:</strong> ${pasture.milkProductionData.lactatingCows} animals</small></span>
                            </div>`;
                              } else {
                                return "";
                              }
                            })()}
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-basket me-2 text-success"></i>
                                <span><strong>Available Food:</strong> ${parseFloat(
                                  pasture.foodReport.availableFood ||
                                    pasture.foodReport.totalMixedRation ||
                                    0
                                ).toFixed(0)}L</span>
                            </div>
                            ${
                              pasture.foodReport.water > 0
                                ? `
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-droplet me-2 text-info"></i>
                                <span><strong>Water:</strong> ${parseFloat(
                                  pasture.foodReport.water
                                ).toFixed(0)}L</span>
                            </div>`
                                : ""
                            }
                            ${
                              pasture.foodReport.straw > 0
                                ? `
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-grid me-2 text-warning"></i>
                                <span><strong>Straw:</strong> ${parseFloat(
                                  pasture.foodReport.straw
                                ).toFixed(0)}L</span>
                            </div>`
                                : ""
                            }
                            ${(() => {
                              // Debug logging for milk display conditions
                              const hasMilkData = pasture.milkProductionData;
                              const isDairyPasture =
                                hasMilkData &&
                                pasture.animals.some((animal) => {
                                  const subTypeUpper = (
                                    animal.subType || ""
                                  ).toUpperCase();
                                  return (
                                    subTypeUpper.includes("COW") ||
                                    subTypeUpper === "COW" ||
                                    subTypeUpper.includes("GOAT")
                                  );
                                });

                              console.log(
                                `[renderPasturesList] ${pasture.name} milk display check:`,
                                {
                                  hasMilkData,
                                  isDairyPasture,
                                  lactatingCows: hasMilkData
                                    ? pasture.milkProductionData.lactatingCows
                                    : "N/A",
                                  estimatedStorage: hasMilkData
                                    ? pasture.milkProductionData
                                        .estimatedStorage
                                    : "N/A",
                                  willShow: hasMilkData && isDairyPasture,
                                }
                              );

                              if (hasMilkData && isDairyPasture) {
                                return `
                            <!-- Milk storage removed - FS25 API doesn't provide accurate milk storage data -->
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-graph-up me-2 text-success"></i>
                                <span><strong>Production: </strong>${pasture.milkProductionData.hourlyProduction.toFixed(
                                  1
                                )}L/h</small></span>
                            </div>
`;
                              } else {
                                return "";
                              }
                            })()}
                        </div>
                    </div>

                    ${
                      pasture.allWarnings.length > 0
                        ? `
                        <div class="mt-3">
                            <h6 class="text-warning">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                Active Warnings
                            </h6>
                            <div class="row">
                                ${pasture.allWarnings
                                  .map(
                                    (warning, index) => `
                                    <div class="col-md-6 mb-2">
                                        <div class="alert alert-${
                                          warning.severity === "danger"
                                            ? "danger"
                                            : warning.severity === "warning"
                                            ? "warning"
                                            : "info"
                                        } alert-sm py-2 warning-clickable"
                                             style="cursor: pointer;"
                                             onclick="dashboard.showWarningDetails('${
                                               pasture.id
                                             }', ${index})">
                                            <i class="bi bi-${
                                              warning.icon
                                            } me-2"></i>
                                            ${warning.message}
                                            <i class="bi bi-chevron-right float-end"></i>
                                        </div>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `
      )
      .join("");

    pasturesContainer.innerHTML = pasturesHTML;
  }

  showPastureDetails(pastureId) {
    // Convert to string for comparison since onclick passes string
    const pasture = this.pastures.find(
      (p) => String(p.id) === String(pastureId)
    );
    if (!pasture) {
      console.error("[ERROR] Pasture not found with ID:", pastureId);
      return;
    }

    // console.log("[DEBUG] Found pasture for details:", pasture.name);

    // Create detailed pasture modal
    const modalHTML = `
            <div class="modal fade" id="pasture-details-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header border-bottom border-secondary">
                            <h5 class="modal-title">
                                <i class="bi bi-house-door me-2"></i>${
                                  pasture.name
                                } - Details
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card bg-secondary">
                                        <div class="card-header">
                                            <h6 class="mb-0">
                                                Condition Report
                                                ${
                                                  pasture.conditionReport
                                                    .hasRealData
                                                    ? '<span class="badge bg-success ms-2 text-light">Live Data</span>'
                                                    : '<span class="badge bg-warning ms-2 text-dark">Estimated</span>'
                                                }
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <table class="table table-sm table-borderless table-dark">
                                                <tr><td>Total Animals:</td><td>${
                                                  pasture.animalCount
                                                }</td></tr>
                                                <tr><td>Males:</td><td>${
                                                  pasture.maleCount || 0
                                                }</td></tr>
                                                <tr><td>Females:</td><td>${
                                                  pasture.femaleCount || 0
                                                }</td></tr>
                                                <tr><td>Productivity:</td><td>${Math.round(
                                                  pasture.conditionReport
                                                    .productivity
                                                )}%</td></tr>
                                                <tr><td>Avg Health:</td><td>${
                                                  pasture.avgHealth
                                                }%</td></tr>
                                                ${
                                                  pasture.foodReport &&
                                                  pasture.foodReport.SLURRY > 0
                                                    ? `<tr><td>Slurry Storage:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .SLURRY
                                                      ).toFixed(0)}L</td></tr>`
                                                    : pasture.foodReport &&
                                                      pasture.foodReport
                                                        .LIQUIDMANURE > 0
                                                    ? `<tr><td>Liquid Manure Storage:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .LIQUIDMANURE
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.conditionReport.eggs >
                                                  0
                                                    ? `<tr><td>Egg Production:</td><td>${pasture.conditionReport.eggs}/day</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.conditionReport.wool >
                                                  0
                                                    ? `<tr><td>Wool Production:</td><td>${pasture.conditionReport.wool}/day</td></tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card bg-secondary">
                                        <div class="card-header">
                                            <h6 class="mb-0">
                                                Storage & Production
                                                ${
                                                  pasture.foodReport.hasRealData
                                                    ? '<span class="badge bg-success ms-2 text-light">Live Data</span>'
                                                    : '<span class="badge bg-warning ms-2 text-dark">Not Monitored</span>'
                                                }
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <table class="table table-sm table-borderless table-dark">
                                                <tr><td><strong>Feed Storage</strong></td><td></td></tr>
                                                <tr><td>Total Capacity:</td><td>${
                                                  pasture.foodReport
                                                    .totalCapacity
                                                }L</td></tr>
                                                <tr><td>Available Food:</td><td>${parseFloat(
                                                  pasture.foodReport
                                                    .availableFood ||
                                                    pasture.foodReport
                                                      .totalMixedRation ||
                                                    0
                                                ).toFixed(0)}L</td></tr>
                                                ${
                                                  pasture.foodReport.hay > 0
                                                    ? `<tr><td>Hay:</td><td>${parseFloat(
                                                        pasture.foodReport.hay
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.silage > 0
                                                    ? `<tr><td>Silage:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .silage
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.grass > 0
                                                    ? `<tr><td>Grass:</td><td>${parseFloat(
                                                        pasture.foodReport.grass
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.straw > 0
                                                    ? `<tr><td>Straw:</td><td>${parseFloat(
                                                        pasture.foodReport.straw
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.water > 0
                                                    ? `<tr><td>Water:</td><td>${parseFloat(
                                                        pasture.foodReport.water
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }

                                                ${
                                                  pasture.foodReport.MANURE >
                                                    0 ||
                                                  pasture.foodReport.SLURRY >
                                                    0 ||
                                                  pasture.foodReport
                                                    .LIQUIDMANURE > 0 ||
                                                  pasture.foodReport.meadow > 0
                                                    ? `<tr><td><strong>Production Storage</strong></td><td></td></tr>`
                                                    : ""
                                                }
                                                <!-- Milk storage removed - FS25 API doesn't provide accurate data -->
                                                ${
                                                  pasture.foodReport.MANURE > 0
                                                    ? `<tr><td>Manure:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .MANURE
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.SLURRY > 0
                                                    ? `<tr><td>Slurry:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .SLURRY
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport
                                                    .LIQUIDMANURE > 0
                                                    ? `<tr><td>Liquid Manure:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .LIQUIDMANURE
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                                ${
                                                  pasture.foodReport.meadow > 0
                                                    ? `<tr><td>Meadow:</td><td>${parseFloat(
                                                        pasture.foodReport
                                                          .meadow
                                                      ).toFixed(0)}L</td></tr>`
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-12">
                                    <div class="card bg-secondary">
                                        <div class="card-header">
                                            <h6 class="mb-0">Livestock Summary</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>Total Animals:</strong> ${
                                              pasture.animalCount
                                            }</p>
                                            <p><strong>Average Health:</strong> ${
                                              pasture.avgHealth
                                            }%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${
                          !pasture.conditionReport.hasRealData ||
                          !pasture.foodReport.hasRealData
                            ? `
                        <div class="row mt-4">
                            <div class="col-12">
                                <div class="alert alert-info">
                                    <h6><i class="bi bi-info-circle me-2"></i>Production Data Not Available</h6>
                                    <p class="mb-0">
                                        This pasture's production and food levels are not being monitored in real-time.
                                        This can happen when:
                                    </p>
                                    <ul class="mt-2 mb-0">
                                        <li>The RealisticLivestock mod is not monitoring this building</li>
                                        <li>The building doesn't have detailed monitoring enabled</li>
                                        <li>The building is new and hasn't generated data yet</li>
                                    </ul>
                                    <p class="mt-2 mb-0 text-muted">
                                        <small>Values shown are estimates based on animal count and type.</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                        `
                            : ""
                        }

                        <div class="modal-footer border-top border-secondary">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="dashboard.showPastureLivestock('${pastureId}'); bootstrap.Modal.getInstance(document.getElementById('pasture-details-modal')).hide();">
                                View Livestock Table
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Remove existing modal if any
    const existingModal = document.getElementById("pasture-details-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body and show
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    const modal = new bootstrap.Modal(
      document.getElementById("pasture-details-modal")
    );
    modal.show();
  }

  showPastureLivestock(pastureId) {
    // Convert to string for comparison since onclick passes string
    const pasture = this.pastures.find(
      (p) => String(p.id) === String(pastureId)
    );
    if (!pasture) {
      console.error("[ERROR] Pasture not found with ID:", pastureId);
      return;
    }

    this.renderPastureLivestockTable(
      pasture.animals,
      `${pasture.name} Livestock`
    );

    const modalElement = document.getElementById("pasturelivestock-modal");
    if (!modalElement) {
      console.error("[ERROR] Modal element not found: pasturelivestock-modal");
      return;
    }

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  showAllPastureLivestock() {
    // Combine all animals from all pastures
    const allAnimals = this.pastures.flatMap((pasture) => pasture.animals);
    this.renderPastureLivestockTable(allAnimals, "All Pasture Livestock");
    const modal = new bootstrap.Modal(
      document.getElementById("pasturelivestock-modal")
    );
    modal.show();
  }

  renderPastureLivestockTable(animals, title) {
    const modalTitle = document.getElementById("pastureModal-title");
    const tableContainer = document.getElementById(
      "pasture-livestock-table-container"
    );

    if (modalTitle) {
      modalTitle.innerHTML = `<i class="bi bi-table me-2"></i>${title}`;
    }

    if (!animals || animals.length === 0) {
      tableContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-info-circle display-1"></i>
                    <h4>No Livestock Found</h4>
                    <p>No animals found in the selected pasture(s).</p>
                </div>
            `;
      return;
    }

    // Create the same table structure as livestock management
    const tableHTML = `
            <div class="table-responsive">
                <table class="table table-dark table-striped" id="pasture-livestock-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Health</th>
                            <th>Weight</th>
                            <th>Value</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${animals
                          .map((animal) => {
                            const statusBadges = [];
                            if (animal.health === 0)
                              statusBadges.push(
                                '<span class="badge bg-danger">Error</span>'
                              );
                            if (animal.isPregnant)
                              statusBadges.push(
                                '<span class="badge status-pregnant">Pregnant</span>'
                              );
                            if (animal.isLactating)
                              statusBadges.push(
                                '<span class="badge status-lactating">Lactating</span>'
                              );
                            if (animal.isParent)
                              statusBadges.push(
                                '<span class="badge status-parent">Parent</span>'
                              );

                            const healthClass = this.getHealthClass(
                              animal.health
                            );
                            const healthBar = `
                                <div style="display: flex; align-items: center;">
                                    <div class="health-bar">
                                        <div class="health-fill ${healthClass}" style="width: ${
                              animal.health
                            }%"></div>
                                    </div>
                                    <span class="ms-2">${animal.health.toFixed(
                                      1
                                    )}%</span>
                                </div>
                            `;

                            return `
                                <tr>
                                    <td><small class="text-muted">#${
                                      animal.id
                                    }</small></td>
                                    <td>${this.formatAnimalType(
                                      animal.subType
                                    )}</td>
                                    <td>${this.capitalize(animal.gender)}</td>
                                    <td>${animal.age} months</td>
                                    <td>${healthBar}</td>
                                    <td>${animal.weight.toFixed(1)} kg</td>
                                    <td>$${this.calculateAnimalValue(
                                      animal
                                    ).value.toLocaleString()}</td>
                                    <td>${statusBadges.join(" ") || "-"}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${
                                          animal.id
                                        }')">
                                            <i class="bi bi-eye me-1"></i>Details
                                        </button>
                                    </td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    tableContainer.innerHTML = tableHTML;

    // Initialize DataTable for the pasture livestock table
    setTimeout(() => {
      $("#pasture-livestock-table").DataTable({
        pageLength: 25,
        responsive: true,
        order: [[1, "asc"]], // Sort by name by default
        language: {
          search: "Search animals:",
          lengthMenu: "Show _MENU_ animals per page",
          info: "Showing _START_ to _END_ of _TOTAL_ animals",
          emptyTable: "No animals found",
        },
      });
    }, 100);
  }

  showStatisticsSection() {
    document.getElementById("section-content").innerHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-bar-chart me-2"></i>
                        Farm Statistics
                    </h2>
                    <p class="lead text-muted">Coming soon - Comprehensive farm analytics</p>
                </div>
            </div>
        `;
    document.getElementById("section-content").classList.remove("d-none");
  }

  // Generate a hash of animal data to detect changes
  generateAnimalsDataHash() {
    if (!this.animals || this.animals.length === 0) {
      return "empty";
    }

    // Create a string representation of key animal data
    const dataString = this.animals
      .map(
        (animal) =>
          `${animal.id}-${animal.health}-${animal.age}-${animal.isLactating}-${animal.isPregnant}-${animal.weight}`
      )
      .sort()
      .join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  updateSummaryCards() {
    const totalCount = this.animals.length;
    const lactatingCount = this.animals.filter((a) => a.isLactating).length;
    const pregnantCount = this.animals.filter((a) => a.isPregnant).length;
    const avgHealth =
      totalCount > 0
        ? (
            this.animals.reduce((sum, a) => sum + a.health, 0) / totalCount
          ).toFixed(0)
        : 0;

    document.getElementById("total-count").textContent = totalCount;
    document.getElementById("lactating-count").textContent = lactatingCount;
    document.getElementById("pregnant-count").textContent = pregnantCount;
    document.getElementById("avg-health").textContent = avgHealth + "%";
  }

  renderAnimalsTable() {
    // console.log("[renderAnimalsTable] Called with animals:", this.animals);

    // Check if data has actually changed
    const currentHash = this.generateAnimalsDataHash();
    if (this.lastAnimalsDataHash === currentHash && this.dataTable) {
      // Data hasn't changed and table exists, no need to update
      return;
    }
    this.lastAnimalsDataHash = currentHash;

    // Check if we have animals data
    if (!this.animals || this.animals.length === 0) {
      // console.log("[renderAnimalsTable] No animals data available");
      if (this.dataTable) {
        // If DataTable exists, clear it
        this.dataTable.clear().draw();
      } else {
        // If no DataTable, show empty message
        document.getElementById("animals-tbody").innerHTML =
          '<tr><td colspan="10" class="text-center text-muted">No animals found</td></tr>';
      }
      return;
    }

    // Prepare data for DataTables
    const tableData = this.animals.map((animal) => {
      // console.log("[renderAnimalsTable] Processing animal:", animal);
      try {
        // Create status badges
        const statusBadges = [];
        if (animal.health === 0)
          statusBadges.push('<span class="badge bg-danger">Error</span>');
        if (animal.isPregnant)
          statusBadges.push(
            '<span class="badge status-pregnant">Pregnant</span>'
          );
        if (animal.isLactating)
          statusBadges.push(
            '<span class="badge status-lactating">Lactating</span>'
          );
        if (animal.isParent)
          statusBadges.push('<span class="badge status-parent">Parent</span>');

        // Create health bar
        const healthClass = this.getHealthClass(animal.health || 100);
        const healthBar = `
                  <div style="display: flex; align-items: center;">
                      <div class="health-bar">
                          <div class="health-fill ${healthClass}" style="width: ${
          animal.health || 100
        }%"></div>
                      </div>
                      <span>${Math.round(animal.health || 100)}%</span>
                  </div>
              `;

        // Display RealisticLivestock ID prominently
        const animalIdDisplay = animal.id
          ? `<code class="text-info" title="RealisticLivestock ID: ${animal.id}">#${animal.id}</code>`
          : '<code class="text-muted">N/A</code>';

        return [
          animalIdDisplay,
          this.formatAnimalType(animal.subType || "Unknown"),
          `${animal.age || 0} months`,
          this.capitalize(animal.gender || "unknown"),
          healthBar,
          `${(animal.weight || 0).toFixed(1)} kg`,
          `$${this.calculateAnimalValue(animal).value.toLocaleString()}`,
          statusBadges.join(" ") || "-",
          this.formatLocation(
            animal.location || "Unknown",
            animal.locationType || "unknown"
          ),
          `<button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')" title="View full RealisticLivestock details">
                      <i class="bi bi-eye me-1"></i>Details
                  </button>`,
        ];
      } catch (error) {
        // console.error(
        //   "[renderAnimalsTable] Error processing animal:",
        //   animal,
        //   error
        // );
        // Return a safe fallback row
        return [
          `<code class="text-muted">${animal.id || "Error"}</code>`,
          "Unknown",
          "0 months",
          "Unknown",
          "0%",
          "0 kg",
          "$0",
          "Error",
          "Unknown",
          "Error",
        ];
      }
    });

    // console.log("[renderAnimalsTable] Final tableData:", tableData);

    // If DataTable already exists, update the data instead of recreating
    if (this.dataTable) {
      try {
        this.dataTable.clear().rows.add(tableData).draw();
        return;
      } catch (error) {
        // If there's an error updating, destroy and recreate
        this.dataTable.destroy();
        this.dataTable = null;
      }
    }

    // Clear existing table body only when creating new DataTable
    document.getElementById("animals-tbody").innerHTML = "";

    // Initialize DataTable (only if it doesn't exist)
    try {
      this.dataTable = $("#animals-table").DataTable({
        data: tableData,
        columns: [
          { title: "ID", data: 0 },
          { title: "Type", data: 1 },
          { title: "Age", data: 2 },
          { title: "Gender", data: 3 },
          { title: "Health", data: 4, orderable: false },
          { title: "Weight", data: 5 },
          { title: "Value", data: 6 },
          { title: "Status", data: 7, orderable: false },
          { title: "Location", data: 8 },
          { title: "Actions", data: 9, orderable: false },
        ],
        pageLength: 25,
        responsive: true,
        order: [[0, "asc"]], // Sort by ID by default
        columnDefs: [
          {
            targets: [0], // ID column - smaller width
            width: "80px",
          },
          {
            targets: [4], // Health column
            orderable: false,
          },
          {
            targets: [7], // Status column
            orderable: false,
          },
          {
            targets: [9], // Actions column
            orderable: false,
          },
        ],
        dom: '<"d-none"B>frtip', // Hidden buttons for export functionality
        buttons: ["copy", "csv", "excel", "pdf", "print"],
        language: {
          search: "Search animals:",
          lengthMenu: "Show _MENU_ animals per page",
          info: "Showing _START_ to _END_ of _TOTAL_ animals",
          emptyTable: "No animals found",
        },
      });
    } catch (error) {
      // console.error(
      //   "[renderAnimalsTable] Error initializing DataTable:",
      //   error
      // );
      // Fallback: show data in a simple table format
      const tbody = document.getElementById("animals-tbody");
      tbody.innerHTML = tableData
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
        )
        .join("");
    }

    // Initialize sliders for the first time or after table recreation
    this.initializeSliders();
  }

  getHealthClass(health) {
    if (health >= 80) return "health-excellent";
    if (health >= 60) return "health-good";
    if (health >= 40) return "health-average";
    if (health >= 20) return "health-poor";
    return "health-critical";
  }

  formatAnimalType(subType) {
    // Convert "COW_HEREFORD" to "Hereford Cow"
    const parts = subType.split("_");
    if (parts.length > 1) {
      const type = parts[0].toLowerCase();
      const breed = parts
        .slice(1)
        .join(" ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return `${breed} ${this.capitalize(type)}`;
    }
    return this.capitalize(subType);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  formatLocation(location, locationType) {
    if (!location || location === "Unknown") {
      return '<span class="badge bg-secondary">Unknown Location</span>';
    }

    // Determine badge color based on location type
    let badgeClass = "bg-secondary";
    let icon = "bi-house";

    if (locationType && locationType.includes("Cow")) {
      badgeClass = "bg-success";
      icon = "bi-building";
    } else if (locationType && locationType.includes("Pig")) {
      badgeClass = "bg-warning text-dark";
      icon = "bi-building";
    } else if (locationType && locationType.includes("Chicken")) {
      badgeClass = "bg-info";
      icon = "bi-house-door";
    } else if (locationType && locationType.includes("Sheep")) {
      badgeClass = "bg-primary";
      icon = "bi-tree";
    }

    return `<span class="badge ${badgeClass}" title="${locationType}">
                    <i class="${icon} me-1"></i>${location}
                </span>`;
  }

  showAnimalDetails(animalId) {
    // Convert animalId to number if it's a string, to handle both string and number IDs
    const searchId =
      typeof animalId === "string" ? parseInt(animalId) : animalId;
    const animal = this.animals.find(
      (a) => a.id === searchId || a.id === animalId
    );
    if (!animal) {
      console.error(
        "Animal not found:",
        animalId,
        "Available IDs:",
        this.animals.map((a) => a.id)
      );
      return;
    }

    const modalTitle = document.getElementById("animalDetailsModalLabel");
    const modalContent = document.getElementById("animalDetailsContent");

    modalTitle.innerHTML = `<i class="bi bi-clipboard-data me-2"></i>${
      animal.name || `Animal #${animal.id}`
    } <span class="badge bg-info ms-2">${animal.id}</span>`;

    // Create comprehensive animal details with RealisticLivestock data
    const detailsHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header bg-info text-dark">
                            <h6 class="mb-0"><i class="bi bi-tag-fill me-2"></i>Tag</h6>
                        </div>
                        <div class="card-body text-center">
                            <div class="livestock-tag">
                                <img src="assests/img/tag.png" alt="Livestock Tag" />
                                <div class="tag-id">${animal.id}</div>
                            </div>
                            <div class="mt-3">

                                ${
                                  animal.numAnimals
                                    ? `<small class="text-muted d-block">Num Animals: ${animal.numAnimals}</small>`
                                    : ""
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Family Relationships (RealisticLivestock) -->
                    ${
                      (animal.motherId && animal.motherId !== -1) ||
                      (animal.fatherId && animal.fatherId !== -1)
                        ? `
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-people-fill me-2"></i>Family</h6>
                        </div>
                        <div class="card-body">
                            ${
                              animal.motherId && animal.motherId !== -1
                                ? `<p class="mb-1"><strong>Mother ID:</strong> <code>#${animal.motherId}</code></p>`
                                : ""
                            }
                            ${
                              animal.fatherId && animal.fatherId !== -1
                                ? `<p class="mb-1"><strong>Father ID:</strong> <code>#${animal.fatherId}</code></p>`
                                : ""
                            }
                        </div>
                    </div>
                    `
                        : ""
                    }
                </div>

                <div class="col-md-8">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card bg-secondary mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Basic Information</h6>
                                </div>
                                <div class="card-body">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        <tr><td><strong>Name:</strong></td><td>${
                                          animal.name || `Animal #${animal.id}`
                                        }</td></tr>
                                        <tr><td><strong>Type:</strong></td><td>${this.formatAnimalType(
                                          animal.subType
                                        )}</td></tr>
                                        <tr><td><strong>Gender:</strong></td><td>${this.capitalize(
                                          animal.gender
                                        )}</td></tr>
                                        <tr><td><strong>Age:</strong></td><td>${
                                          animal.age || 0
                                        } months</td></tr>
                                        <tr><td><strong>Location:</strong></td><td>${
                                          animal.location || "Unknown"
                                        }
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="card bg-secondary mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0"><i class="bi bi-heart-pulse me-2"></i>Health & Physical</h6>
                                </div>
                                <div class="card-body">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        <tr><td><strong>Health:</strong></td><td>${Math.round(
                                          animal.health || 0
                                        )}%</td></tr>
                                        <tr><td><strong>Weight:</strong></td><td>${(
                                          animal.weight || 0
                                        ).toFixed(0)} kg</td></tr>
                                        <tr><td><strong>Reproduction:</strong></td><td>${(animal.reproduction &&
                                        !isNaN(animal.reproduction)
                                          ? animal.reproduction
                                          : animal.genetics &&
                                            animal.genetics.fertility &&
                                            !isNaN(animal.genetics.fertility)
                                          ? animal.genetics.fertility
                                          : 0
                                        ).toFixed(2)}x</td></tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header bg-farm-accent">
                            <h6 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Reproduction Data</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        <tr><td><strong>Is Parent:</strong></td><td>
                                            ${
                                              animal.isParent
                                                ? '<span class="badge bg-success">Yes</span>'
                                                : '<span class="badge bg-secondary">No</span>'
                                            }
                                        </td></tr>
                                        <tr><td><strong>Is Pregnant:</strong></td><td>
                                            ${
                                              animal.isPregnant
                                                ? '<span class="badge bg-warning text-dark">Yes</span>'
                                                : '<span class="badge bg-secondary">No</span>'
                                            }
                                        </td></tr>
                                        <tr><td><strong>Is Lactating:</strong></td><td>
                                            ${
                                              animal.isLactating
                                                ? '<span class="badge bg-info">Yes</span>'
                                                : '<span class="badge bg-secondary">No</span>'
                                            }
                                        </td></tr>
                                        <tr><td><strong>Reproduction Rate:</strong></td><td>
                                            <div class="progress" style="height: 20px;">
                                                <div class="progress-bar bg-farm-success" role="progressbar"
                                                     style="width: ${
                                                       (animal.reproduction &&
                                                       !isNaN(
                                                         animal.reproduction
                                                       )
                                                         ? animal.reproduction
                                                         : animal.genetics &&
                                                           animal.genetics
                                                             .fertility &&
                                                           !isNaN(
                                                             animal.genetics
                                                               .fertility
                                                           )
                                                         ? animal.genetics
                                                             .fertility
                                                         : 0) * 100
                                                     }%">
                                                    ${(animal.reproduction &&
                                                    !isNaN(animal.reproduction)
                                                      ? animal.reproduction
                                                      : animal.genetics &&
                                                        animal.genetics
                                                          .fertility &&
                                                        !isNaN(
                                                          animal.genetics
                                                            .fertility
                                                        )
                                                      ? animal.genetics
                                                          .fertility
                                                      : 0
                                                    ).toFixed(2)}x
                                                </div>
                                            </div>
                                        </td></tr>
                                        <tr><td><strong>Months Since Birth:</strong></td><td>
                                            ${
                                              animal.monthsSinceLastBirth !==
                                              undefined
                                                ? animal.monthsSinceLastBirth
                                                : "N/A"
                                            } ${
      animal.monthsSinceLastBirth !== undefined ? "months" : ""
    }
                                        </td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        ${
                                          animal.isPregnant
                                            ? this.getPregnancyDetails(animal)
                                            : ""
                                        }
                                        ${
                                          animal.impregnatedBy &&
                                          animal.impregnatedBy !== -1
                                            ? `<tr><td><strong>Impregnated By:</strong></td><td><code class="text-warning">#${animal.impregnatedBy}</code></td></tr>`
                                            : ""
                                        }
                                        ${
                                          animal.pregnancyDuration
                                            ? `<tr><td><strong>Pregnancy Duration:</strong></td><td>${animal.pregnancyDuration} days</td></tr>`
                                            : ""
                                        }
                                        ${
                                          animal.offspring
                                            ? `<tr><td><strong>Expected Offspring:</strong></td><td>${animal.offspring}</td></tr>`
                                            : ""
                                        }
                                    </table>
                                </div>
                            </div>
                            ${
                              animal.genetics
                                ? `
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6 class="text-farm-accent"><i class="bi bi-dna me-1"></i>Genetics</h6>
                                    <div class="row">
                                        <div class="col">
                                            <small class="text-muted">Health</small>
                                            <div class="mb-2" style="height: 15px;">
                                                <div class="text-info mb-3" style="width: ${
                                                  (animal.genetics.health ||
                                                    1) * 100
                                                }%">
                                                    ${(
                                                      animal.genetics.health ||
                                                      1
                                                    ).toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <small class="text-muted">Fertility</small>
                                            <div class="mb-2" style="height: 15px;">
                                                <div class="text-info mb-3" style="width: ${
                                                  (animal.genetics.fertility ||
                                                    1) * 100
                                                }%">
                                                    ${(
                                                      animal.genetics
                                                        .fertility || 1
                                                    ).toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <small class="text-muted">Productivity</small>
                                            <div class="mb-2" style="height: 15px;">
                                                <div class="text-info mb-3" style="width: ${
                                                  (animal.genetics
                                                    .productivity || 1) * 100
                                                }%">
                                                    ${(
                                                      animal.genetics
                                                        .productivity || 1
                                                    ).toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <small class="text-muted">Quality</small>
                                            <div class="mb-2" style="height: 15px;">
                                                <div class="text-info mb-3" style="width: ${
                                                  (animal.genetics.quality ||
                                                    1) * 100
                                                }%">
                                                    ${(
                                                      animal.genetics.quality ||
                                                      1
                                                    ).toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
            </div>
            <!-- Livestock Value Section -->
            <div class="row">
                <div class="col-md-12">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-currency-dollar me-2"></i>Livestock Value</h6>
                        </div>
                        <div class="card-body">
                            ${this.generateAnimalValueDisplay(animal)}
                        </div>
                    </div>
                </div>
            </div>
        `;

    modalContent.innerHTML = detailsHTML;

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("animalDetailsModal")
    );
    modal.show();
  }

  showExportModal() {
    const modal = new bootstrap.Modal(
      document.getElementById("exportDataModal")
    );
    modal.show();
  }

  exportData(format) {
    // Hide the export modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("exportDataModal")
    );
    modal.hide();

    // Prepare data for export
    const exportData = this.animals.map((animal) => ({
      Name: animal.name || `Animal #${animal.id}`,
      Type: this.formatAnimalType(animal.subType),
      Age: `${animal.age} months`,
      Gender: this.capitalize(animal.gender),
      Health: `${Math.round(animal.health)}%`,
      Weight: `${animal.weight.toFixed(1)} kg`,
      Value: `$${this.calculateAnimalValue(animal).value.toLocaleString()}`,
      Status:
        [
          animal.health === 0 ? "Error" : "",
          animal.isPregnant ? "Pregnant" : "",
          animal.isLactating ? "Lactating" : "",
          animal.isParent ? "Parent" : "",
        ]
          .filter((s) => s)
          .join(", ") || "Normal",
      Location: animal.location,
      "Farm ID": animal.farmId,
      "Animal ID": animal.id,
      "Mother ID": animal.motherId !== "-1" ? animal.motherId : "",
      "Father ID": animal.fatherId !== "-1" ? animal.fatherId : "",
    }));

    // Use DataTables built-in export functionality
    switch (format) {
      case "csv":
        this.dataTable.button(".buttons-csv").trigger();
        break;
      case "excel":
        this.dataTable.button(".buttons-excel").trigger();
        break;
      case "pdf":
        this.dataTable.button(".buttons-pdf").trigger();
        break;
      case "print":
        this.dataTable.button(".buttons-print").trigger();
        break;
      default:
        console.error("Unknown export format:", format);
    }

    this.showSuccessMessage(
      `Export started in ${format.toUpperCase()} format!`
    );
  }

  filterAnimals(filterType) {
    // Store current active filter
    this.activeFilter = filterType;

    // Reset all animals to show initially (use this.animals as the source)
    let filteredAnimals = [...this.animals];

    // Apply the filter based on type
    switch (filterType) {
      case "all":
        // Show all animals - no filtering needed
        break;
      case "lactating":
        filteredAnimals = this.animals.filter((animal) => animal.isLactating);
        break;
      case "pregnant":
        filteredAnimals = this.animals.filter((animal) => animal.isPregnant);
        break;
      case "health":
        // Sort by health (highest to lowest) for health filter
        filteredAnimals = [...this.animals].sort((a, b) => b.health - a.health);
        break;
      default:
        console.warn("Unknown filter type:", filterType);
        break;
    }

    // Update the DataTable with filtered data
    if (this.dataTable) {
      // Clear current search to avoid conflicts
      this.dataTable.search("").draw();

      // Prepare filtered data for DataTable
      const tableData = filteredAnimals.map((animal) => {
        // Create status badges
        const statusBadges = [];
        if (animal.health === 0)
          statusBadges.push('<span class="badge bg-danger">Error</span>');
        if (animal.isPregnant)
          statusBadges.push(
            '<span class="badge status-pregnant">Pregnant</span>'
          );
        if (animal.isLactating)
          statusBadges.push(
            '<span class="badge status-lactating">Lactating</span>'
          );
        if (animal.isParent)
          statusBadges.push('<span class="badge status-parent">Parent</span>');

        // Create health bar
        const healthClass = this.getHealthClass(animal.health);
        const healthBar = `
                    <div style="display: flex; align-items: center;">
                        <div class="health-bar">
                            <div class="health-fill ${healthClass}" style="width: ${
          animal.health
        }%"></div>
                        </div>
                        <span>${Math.round(animal.health)}%</span>
                    </div>
                `;

        return [
          `<code class="text-muted">${animal.id}</code>`,
          this.formatAnimalType(animal.subType),
          `${animal.age} months`,
          this.capitalize(animal.gender),
          healthBar,
          `${animal.weight.toFixed(1)} kg`,
          `$${this.calculateAnimalValue(animal).value.toLocaleString()}`,
          statusBadges.join(" ") || "-",
          this.formatLocation(animal.location, animal.locationType),
          `<button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')">
                        <i class="bi bi-eye me-1"></i>Details
                    </button>`,
        ];
      });

      // Clear and reload the DataTable with filtered data
      this.dataTable.clear();
      this.dataTable.rows.add(tableData);
      this.dataTable.draw();
    }

    // Update visual feedback on summary cards
    this.updateSummaryCardStates(filterType);

    // Show status message
    const filterMessages = {
      all: `Showing all ${filteredAnimals.length} animals`,
      lactating: `Showing ${filteredAnimals.length} lactating animals`,
      pregnant: `Showing ${filteredAnimals.length} pregnant animals`,
      health: `Showing all animals sorted by health`,
    };

    this.showInfoMessage(
      filterMessages[filterType] || `Filter applied: ${filterType}`
    );
  }

  updateSummaryCardStates(activeFilter) {
    // Remove active state from all cards
    document.querySelectorAll(".summary-card-clickable").forEach((card) => {
      card.classList.remove("summary-card-active");
    });

    // Add active state to the clicked card
    const activeCard = document.querySelector(
      `[data-filter="${activeFilter}"]`
    );
    if (activeCard) {
      activeCard.classList.add("summary-card-active");
    }
  }

  // Filter Management Functions
  toggleFilters() {
    const panel = document.getElementById("filters-panel");
    const toggleBtn = document.getElementById("filter-toggle-btn");

    if (panel.classList.contains("d-none")) {
      panel.classList.remove("d-none");
      toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Filters';
    } else {
      panel.classList.add("d-none");
      toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i> Show Filters';
    }
  }

  resetFilters() {
    // Clear all filter inputs
    document.getElementById("age-min").value = "";
    document.getElementById("age-max").value = "";
    document.getElementById("weight-min").value = "";
    document.getElementById("weight-max").value = "";
    document.getElementById("animal-type-filter").value = "";

    // Reset slider values to full range
    const sliderTypes = [
      "health",
      "metabolism",
      "fertility",
      "quality",
      "productivity",
    ];
    sliderTypes.forEach((type) => {
      const minSlider = document.getElementById(`${type}-min`);
      const maxSlider = document.getElementById(`${type}-max`);
      if (minSlider && maxSlider) {
        minSlider.value = 0;
        // Set max value based on slider type - genetics sliders go to 200, health to 100
        const maxValue = type === "health" ? 100 : 200;
        maxSlider.value = maxValue;
      }
    });

    // Update slider displays and fills
    this.updateSliderDisplays();

    // Reset active filters
    this.activeFilters = {};

    // Hide active filters display
    document.getElementById("active-filters").style.display = "none";

    // Apply filters (which will show all animals)
    this.applyFilters();

    this.showSuccessMessage("All filters cleared");
  }

  applyFilters(isSliderChange = false) {
    // Collect filter values
    const filters = {
      ageMin: parseFloat(document.getElementById("age-min").value) || null,
      ageMax: parseFloat(document.getElementById("age-max").value) || null,
      weightMin:
        parseFloat(document.getElementById("weight-min").value) || null,
      weightMax:
        parseFloat(document.getElementById("weight-max").value) || null,
      healthMin: parseFloat(document.getElementById("health-min").value) || 0,
      healthMax: parseFloat(document.getElementById("health-max").value) || 100,
      metabolismMin:
        parseFloat(document.getElementById("metabolism-min").value) || 0,
      metabolismMax:
        parseFloat(document.getElementById("metabolism-max").value) || 200,
      fertilityMin:
        parseFloat(document.getElementById("fertility-min").value) || 0,
      fertilityMax:
        parseFloat(document.getElementById("fertility-max").value) || 200,
      qualityMin: parseFloat(document.getElementById("quality-min").value) || 0,
      qualityMax:
        parseFloat(document.getElementById("quality-max").value) || 200,
      productivityMin:
        parseFloat(document.getElementById("productivity-min").value) || 0,
      productivityMax:
        parseFloat(document.getElementById("productivity-max").value) || 200,
      animalType: document.getElementById("animal-type-filter").value || null,
    };

    // Store active filters for display
    this.activeFilters = filters;

    // Filter animals
    let filteredAnimals = [...this.animals];

    // Apply age filter
    if (filters.ageMin !== null) {
      filteredAnimals = filteredAnimals.filter(
        (animal) => animal.age >= filters.ageMin
      );
    }
    if (filters.ageMax !== null) {
      filteredAnimals = filteredAnimals.filter(
        (animal) => animal.age <= filters.ageMax
      );
    }

    // Apply weight filter
    if (filters.weightMin !== null) {
      filteredAnimals = filteredAnimals.filter(
        (animal) => animal.weight >= filters.weightMin
      );
    }
    if (filters.weightMax !== null) {
      filteredAnimals = filteredAnimals.filter(
        (animal) => animal.weight <= filters.weightMax
      );
    }

    // Apply animal type filter
    if (filters.animalType !== null) {
      filteredAnimals = filteredAnimals.filter((animal) => {
        // Extract animal type from subType (e.g., "COW_HEREFORD" -> "COW")
        const animalType = animal.subType ? animal.subType.split("_")[0] : "";
        return animalType === filters.animalType;
      });
    }

    // Apply genetics filters with range sliders
    filteredAnimals = filteredAnimals.filter((animal) => {
      const healthPercent = animal.health || 100;

      // Check health filter first (always available)
      if (
        healthPercent < filters.healthMin ||
        healthPercent > filters.healthMax
      ) {
        return false;
      }

      // If animal doesn't have genetics data, only apply health filter
      if (!animal.genetics) {
        return true; // Pass if health filter passed
      }

      // Convert genetics multipliers (0.0-2.0+) to percentage scale (0-200%) for filtering
      const metabolismPercent = animal.genetics.metabolism * 100;
      const fertilityPercent = animal.genetics.fertility * 100;
      const qualityPercent = animal.genetics.quality * 100;
      const productivityPercent = animal.genetics.productivity * 100;

      return (
        metabolismPercent >= filters.metabolismMin &&
        metabolismPercent <= filters.metabolismMax &&
        fertilityPercent >= filters.fertilityMin &&
        fertilityPercent <= filters.fertilityMax &&
        qualityPercent >= filters.qualityMin &&
        qualityPercent <= filters.qualityMax &&
        productivityPercent >= filters.productivityMin &&
        productivityPercent <= filters.productivityMax
      );
    });

    // Update table with filtered results
    this.updateTableWithFilteredAnimals(filteredAnimals);

    // Update active filters display
    this.updateActiveFiltersDisplay();

    // Show result message only if not from slider change
    if (!isSliderChange) {
      this.showInfoMessage(
        `Showing ${filteredAnimals.length} of ${this.animals.length} animals`
      );
    }
  }

  // Slider Management Functions
  initializeSliders() {
    const sliderTypes = [
      "health",
      "metabolism",
      "fertility",
      "quality",
      "productivity",
    ];

    // Initialize debounce timer
    this.filterDebounceTimer = null;

    sliderTypes.forEach((type) => {
      const minSlider = document.getElementById(`${type}-min`);
      const maxSlider = document.getElementById(`${type}-max`);
      const fillElement = document.getElementById(`${type}-fill`);

      if (minSlider && maxSlider && fillElement) {
        // Set initial values
        minSlider.value = 0;
        // Set max value based on slider type - genetics sliders go to 200, health to 100
        const maxValue = type === "health" ? 100 : 200;
        maxSlider.value = maxValue;

        // Add event listeners
        minSlider.addEventListener("input", () =>
          this.handleSliderChange(type, "min")
        );
        maxSlider.addEventListener("input", () =>
          this.handleSliderChange(type, "max")
        );
      }
    });

    // Update initial displays and fill bars
    this.updateSliderDisplays();
  }

  handleSliderChange(type, position) {
    const minSlider = document.getElementById(`${type}-min`);
    const maxSlider = document.getElementById(`${type}-max`);
    const fillElement = document.getElementById(`${type}-fill`);

    if (minSlider && maxSlider && fillElement) {
      let minVal = parseInt(minSlider.value);
      let maxVal = parseInt(maxSlider.value);

      // Ensure min doesn't exceed max
      if (position === "min" && minVal > maxVal) {
        maxSlider.value = minVal;
        maxVal = minVal;
      }

      // Ensure max doesn't go below min
      if (position === "max" && maxVal < minVal) {
        minSlider.value = maxVal;
        minVal = maxVal;
      }

      // Update display and fill bar immediately
      this.updateSliderDisplay(type, minVal, maxVal);
      this.updateSliderFill(type, minVal, maxVal);

      // Debounce the filtering to prevent spam
      if (this.filterDebounceTimer) {
        clearTimeout(this.filterDebounceTimer);
      }

      this.filterDebounceTimer = setTimeout(() => {
        this.applyFilters(true); // Pass true to indicate slider change
      }, 300); // 300ms delay
    }
  }

  updateSliderDisplays() {
    const sliderTypes = [
      "health",
      "metabolism",
      "fertility",
      "quality",
      "productivity",
    ];

    sliderTypes.forEach((type) => {
      const minSlider = document.getElementById(`${type}-min`);
      const maxSlider = document.getElementById(`${type}-max`);

      if (minSlider && maxSlider) {
        const minVal = parseInt(minSlider.value);
        const maxVal = parseInt(maxSlider.value);
        this.updateSliderDisplay(type, minVal, maxVal);
        this.updateSliderFill(type, minVal, maxVal);
      }
    });
  }

  updateSliderDisplay(type, minVal, maxVal) {
    const minDisplay = document.getElementById(`${type}-min-value`);
    const maxDisplay = document.getElementById(`${type}-max-value`);

    if (minDisplay && maxDisplay) {
      minDisplay.textContent = `${minVal}%`;
      maxDisplay.textContent = `${maxVal}%`;
    }
  }

  updateSliderFill(type, minVal, maxVal) {
    const fillElement = document.getElementById(`${type}-fill`);

    if (fillElement) {
      // Get the maximum value for this slider type
      const maxSlider = document.getElementById(`${type}-max`);
      const sliderMax = maxSlider
        ? parseInt(maxSlider.getAttribute("max"))
        : 100;

      // Calculate percentages based on actual slider range
      const leftPercent = (minVal / sliderMax) * 100;
      const rightPercent = ((sliderMax - maxVal) / sliderMax) * 100;

      // Update the fill bar to show selected range
      fillElement.style.left = `${leftPercent}%`;
      fillElement.style.right = `${rightPercent}%`;

      // Add visual feedback for active ranges
      const isHealthSlider = type === "health";
      const maxValue = isHealthSlider ? 100 : 200;
      if (minVal > 0 || maxVal < maxValue) {
        fillElement.style.opacity = "1";
        fillElement.parentElement.classList.add("filter-active");
      } else {
        fillElement.style.opacity = "0.3";
        fillElement.parentElement.classList.remove("filter-active");
      }
    }
  }

  getPregnancyDetails(animal) {
    // Get gestation period based on animal type
    const gestationPeriods = {
      COW: 9, // 9 months
      PIG: 4, // 4 months
      SHEEP: 5, // 5 months
      GOAT: 5, // 5 months
      HORSE: 11, // 11 months
      CHICKEN: 1, // 1 month (21 days)
    };

    // Expected offspring counts based on animal type
    const expectedOffspring = {
      COW: 1,
      PIG: "8-12",
      SHEEP: "1-2",
      GOAT: "1-2",
      HORSE: 1,
      CHICKEN: "8-15",
    };

    const animalType = animal.type || animal.subType.split("_")[0];
    const gestationMonths = gestationPeriods[animalType] || 6; // Default 6 months if unknown
    const expectedCount = expectedOffspring[animalType] || "1-2";

    // Calculate estimated due date
    // Since we don't have conception date, we'll estimate based on reproduction percentage
    // Higher reproduction % might indicate later in pregnancy
    const reproductionPercent = animal.reproduction * 100;
    let pregnancyProgress = 0;

    // Estimate pregnancy progress (this is a rough approximation)
    if (reproductionPercent > 80) {
      pregnancyProgress = 0.8; // 80% through pregnancy
    } else if (reproductionPercent > 60) {
      pregnancyProgress = 0.6; // 60% through pregnancy
    } else if (reproductionPercent > 40) {
      pregnancyProgress = 0.4; // 40% through pregnancy
    } else {
      pregnancyProgress = 0.2; // Early pregnancy
    }

    const monthsRemaining = Math.max(
      0,
      Math.round(gestationMonths * (1 - pregnancyProgress))
    );

    let dueDateText = "Unknown";
    if (monthsRemaining === 0) {
      dueDateText =
        '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>Due Soon</span>';
    } else if (monthsRemaining === 1) {
      dueDateText = `~${monthsRemaining} month`;
    } else {
      dueDateText = `~${monthsRemaining} months`;
    }

    return `
            <tr><td><strong>Est. Due Date:</strong></td><td>${dueDateText}</td></tr>
            <tr><td><strong>Expected Count:</strong></td><td>${expectedCount}</td></tr>
            <tr><td><strong>Pregnancy Progress:</strong></td><td>${(
              pregnancyProgress * 100
            ).toFixed(0)}%</td></tr>
        `;
  }

  updateTableWithFilteredAnimals(filteredAnimals) {
    if (!this.dataTable) return;

    // Prepare filtered data for DataTable
    const tableData = filteredAnimals.map((animal) => {
      // Create status badges
      const statusBadges = [];
      if (animal.health === 0)
        statusBadges.push('<span class="badge bg-danger">Error</span>');
      if (animal.isPregnant)
        statusBadges.push(
          '<span class="badge status-pregnant">Pregnant</span>'
        );
      if (animal.isLactating)
        statusBadges.push(
          '<span class="badge status-lactating">Lactating</span>'
        );
      if (animal.isParent)
        statusBadges.push('<span class="badge status-parent">Parent</span>');

      // Create health bar
      const healthClass = this.getHealthClass(animal.health);
      const healthBar = `
                <div style="display: flex; align-items: center;">
                    <div class="health-bar">
                        <div class="health-fill ${healthClass}" style="width: ${
        animal.health
      }%"></div>
                    </div>
                    <span>${Math.round(animal.health)}%</span>
                </div>
            `;

      return [
        `<code class="text-muted">${animal.id}</code>`,
        this.formatAnimalType(animal.subType),
        `${animal.age} months`,
        this.capitalize(animal.gender),
        healthBar,
        `${animal.weight.toFixed(1)} kg`,
        `$${this.calculateAnimalValue(animal).value.toLocaleString()}`,
        statusBadges.join(" ") || "-",
        this.formatLocation(animal.location, animal.locationType),
        `<button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')">
                    <i class="bi bi-eye me-1"></i>Details
                </button>`,
      ];
    });

    // Clear and reload the DataTable with filtered data
    this.dataTable.clear();
    this.dataTable.rows.add(tableData);
    this.dataTable.draw();
  }

  updateActiveFiltersDisplay() {
    const activeFiltersDiv = document.getElementById("active-filters");
    const activeFiltersList = document.getElementById("active-filters-list");

    const filterDisplays = [];

    // Age filter
    if (
      this.activeFilters.ageMin !== null ||
      this.activeFilters.ageMax !== null
    ) {
      let ageText = "Age: ";
      if (
        this.activeFilters.ageMin !== null &&
        this.activeFilters.ageMax !== null
      ) {
        ageText += `${this.activeFilters.ageMin}-${this.activeFilters.ageMax} months`;
      } else if (this.activeFilters.ageMin !== null) {
        ageText += `≥${this.activeFilters.ageMin} months`;
      } else {
        ageText += `≤${this.activeFilters.ageMax} months`;
      }
      filterDisplays.push(
        `<span class="badge bg-farm-primary me-1">${ageText}</span>`
      );
    }

    // Weight filter
    if (
      this.activeFilters.weightMin !== null ||
      this.activeFilters.weightMax !== null
    ) {
      let weightText = "Weight: ";
      if (
        this.activeFilters.weightMin !== null &&
        this.activeFilters.weightMax !== null
      ) {
        weightText += `${this.activeFilters.weightMin}-${this.activeFilters.weightMax} kg`;
      } else if (this.activeFilters.weightMin !== null) {
        weightText += `≥${this.activeFilters.weightMin} kg`;
      } else {
        weightText += `≤${this.activeFilters.weightMax} kg`;
      }
      filterDisplays.push(
        `<span class="badge bg-farm-primary me-1">${weightText}</span>`
      );
    }

    // Animal type filter
    if (this.activeFilters.animalType !== null) {
      const typeNames = {
        COW: "Cows",
        BULL: "Bulls",
        SHEEP: "Sheep",
        PIG: "Pigs",
        CHICKEN: "Chickens",
        HORSE: "Horses",
      };
      const typeName =
        typeNames[this.activeFilters.animalType] ||
        this.activeFilters.animalType;
      filterDisplays.push(
        `<span class="badge bg-farm-secondary me-1">Type: ${typeName}</span>`
      );
    }

    // Genetics filters
    const geneticsFilters = [
      "health",
      "metabolism",
      "fertility",
      "quality",
      "productivity",
    ];
    geneticsFilters.forEach((filter) => {
      if (this.activeFilters[filter]) {
        const displayName = filter.charAt(0).toUpperCase() + filter.slice(1);
        const rating = this.activeFilters[filter]
          .replace("-", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        filterDisplays.push(
          `<span class="badge bg-farm-accent text-dark me-1">${displayName}: ${rating}</span>`
        );
      }
    });

    if (filterDisplays.length > 0) {
      activeFiltersList.innerHTML = filterDisplays.join("");
      activeFiltersDiv.style.display = "block";
    } else {
      activeFiltersDiv.style.display = "none";
    }
  }

  // Helper function to create clickable animal ID links
  createClickableAnimalId(animalId) {
    return `<a href="#" class="animal-link text-farm-accent text-decoration-none" data-animal-id="${animalId}" onclick="window.dashboard.openAnimalDetailsFromId('${animalId}'); return false;">#${animalId}</a>`;
  }

  createClickableAnimalIds(animals) {
    return animals
      .slice(0, 3)
      .map((a) => this.createClickableAnimalId(a.id))
      .join(", ");
  }

  openAnimalDetailsFromId(animalIdOrObject) {
    // Handle both ID and full object
    const animalId =
      typeof animalIdOrObject === "object"
        ? animalIdOrObject.id
        : animalIdOrObject;

    // Convert animalId to number if it's a string, to handle both string and number IDs
    const searchId =
      typeof animalId === "string" ? parseInt(animalId) : animalId;
    const animal = this.animals.find(
      (a) => a.id === searchId || a.id === animalId
    );

    if (animal) {
      this.showAnimalDetails(animal.id); // Pass the ID, not the full object
    } else {
      console.warn("Animal not found for ID:", animalId);
      this.showAlert(`Animal #${animalId} not found`, "warning");
    }
  }

  // Notification History Management
  addNotificationToHistory(notification) {
    // Add timestamp if not present
    if (!notification.timestamp) {
      notification.timestamp = new Date().toISOString();
    }

    // Add to beginning of array (newest first)
    this.notificationHistory.unshift(notification);

    // Keep only the latest 10 notifications
    if (this.notificationHistory.length > this.maxNotifications) {
      this.notificationHistory = this.notificationHistory.slice(
        0,
        this.maxNotifications
      );
    }

    // Update the notification bell
    this.updateNotificationBell();

    // Save to localStorage
    this.saveNotificationHistory();
  }

  updateNotificationBell() {
    const bellDiv = document.getElementById("notification-bell");
    const countBadge = document.getElementById("notification-count");

    if (bellDiv && countBadge) {
      const count = this.notificationHistory.length;

      if (count > 0) {
        bellDiv.classList.remove("d-none");
        countBadge.textContent = count > 99 ? "99+" : count.toString();
        countBadge.classList.remove("d-none");
      } else {
        countBadge.classList.add("d-none");
      }
    }
  }

  displayNotificationHistory() {
    const content = document.getElementById("notificationHistoryContent");
    if (!content) return;

    if (this.notificationHistory.length === 0) {
      content.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-bell-slash fs-1 mb-3"></i>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    const notifications = this.notificationHistory
      .map((notification) => {
        const timestamp = new Date(notification.timestamp);
        const timeAgo = this.getTimeAgo(timestamp);
        const iconClass = this.getNotificationIcon(notification.type);
        const bgClass = this.getNotificationBgClass(notification.type);

        return `
        <div class="notification-item border-bottom border-secondary pb-3 mb-3">
          <div class="d-flex align-items-start">
            <div class="notification-icon me-3">
              <div class="rounded-circle d-flex align-items-center justify-center" style="width: 40px; height: 40px;">
                <i class="${iconClass} text-white"></i>
              </div>
            </div>
            <div class="notification-content flex-grow-1">
              <div class="notification-title fw-bold mb-1">${
                notification.title
              }</div>
              <div class="notification-message text-muted mb-2">${
                notification.messageHtml || notification.message
              }</div>
              <div class="notification-time text-muted small">
                <i class="bi bi-clock me-1"></i>
                ${timeAgo}
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    content.innerHTML = notifications;
  }

  getNotificationIcon(type) {
    switch (type) {
      case "success":
      case "added":
        return "bi bi-plus";
      case "warning":
      case "removed":
        return "bi bi-dash";
      case "info":
      case "updated":
        return "bi bi-info-";
      case "danger":
      case "error":
        return "bi bi-exclamation-triangle-fill";
      default:
        return "bi bi-bell";
    }
  }

  getNotificationBgClass(type) {
    switch (type) {
      case "success":
      case "added":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "info":
      case "updated":
        return "bg-info";
      case "danger":
      case "error":
      case "removed":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
  }

  clearNotificationHistory() {
    this.notificationHistory = [];
    this.updateNotificationBell();
    this.displayNotificationHistory();
    this.saveNotificationHistory();

    // Hide the bell if no notifications
    const bellDiv = document.getElementById("notification-bell");
    if (bellDiv) {
      bellDiv.classList.add("d-none");
    }
  }

  saveNotificationHistory() {
    try {
      localStorage.setItem(
        "farmdashboard_notifications",
        JSON.stringify(this.notificationHistory)
      );
    } catch (error) {
      console.warn(
        "Could not save notification history to localStorage:",
        error
      );
    }
  }

  loadNotificationHistory() {
    try {
      const stored = localStorage.getItem("farmdashboard_notifications");
      if (stored) {
        this.notificationHistory = JSON.parse(stored);
        this.updateNotificationBell();
      }
    } catch (error) {
      console.warn(
        "Could not load notification history from localStorage:",
        error
      );
      this.notificationHistory = [];
    }
  }

  // Generate vehicle display using local images
  generateVehicleDisplay(vehicleName, brandName, typeName) {
    // Try to find a local image first
    const localImage = this.getLocalVehicleImage(
      vehicleName,
      brandName,
      typeName
    );

    if (localImage) {
      return {
        imageUrl: localImage,
        isImage: true,
        displayText: vehicleName,
      };
    }

    // Fallback to CSS-based display if no local image found
    const vehicleTypeColors = {
      tractor: { bg: "#2E7D32", text: "#FFFFFF" },
      teleHandler: { bg: "#F57F17", text: "#FFFFFF" },
      trailer: { bg: "#5D4037", text: "#FFFFFF" },
      motorized: { bg: "#1976D2", text: "#FFFFFF" },
      harvester: { bg: "#F44336", text: "#FFFFFF" },
      implement: { bg: "#7B1FA2", text: "#FFFFFF" },
      cultivator: { bg: "#689F38", text: "#FFFFFF" },
      pallet: { bg: "#FF8F00", text: "#000000" },
      car: { bg: "#424242", text: "#FFFFFF" },
      forestryExcavator: { bg: "#795548", text: "#FFFFFF" },
      waterTrailer: { bg: "#2196F3", text: "#FFFFFF" },
      manureTrailer: { bg: "#8D6E63", text: "#FFFFFF" },
      livestockTrailer: { bg: "#E65100", text: "#FFFFFF" },
      augerWagon: { bg: "#9C27B0", text: "#FFFFFF" },
      mixerWagon: { bg: "#673AB7", text: "#FFFFFF" },
      default: { bg: "#607D8B", text: "#FFFFFF" },
    };

    const brandColors = {
      "John Deere": { bg: "#2E7D32", text: "#FFFF00" },
      JOHNDEERE: { bg: "#2E7D32", text: "#FFFF00" },
      Volvo: { bg: "#1565C0", text: "#FFFFFF" },
      JCB: { bg: "#FFB300", text: "#000000" },
      Manitou: { bg: "#D32F2F", text: "#FFFFFF" },
      International: { bg: "#B71C1C", text: "#FFFFFF" },
      INTERNATIONAL: { bg: "#B71C1C", text: "#FFFFFF" },
      Kotte: { bg: "#4CAF50", text: "#FFFFFF" },
      KOTTE: { bg: "#4CAF50", text: "#FFFFFF" },
      "Wilson Trailer": { bg: "#1976D2", text: "#FFFFFF" },
      WILSON: { bg: "#1976D2", text: "#FFFFFF" },
    };

    let colors =
      brandColors[brandName] ||
      vehicleTypeColors[typeName] ||
      vehicleTypeColors.default;

    let displayText = vehicleName;
    if (displayText.length > 15) {
      if (brandName && brandName !== "None" && brandName !== "NONE") {
        displayText = brandName;
      } else {
        displayText = displayText.substring(0, 12) + "...";
      }
    }

    return {
      background: colors.bg,
      textColor: colors.text,
      displayText: displayText,
      isImage: false,
    };
  }

  // Match vehicles to local images
  getLocalVehicleImage(vehicleName, brandName, typeName) {
    // Skip image matching for bigBags, pallets, and other storage items
    const skipImageTypes = ["bigbag", "pallet"];
    if (skipImageTypes.includes(typeName?.toLowerCase())) {
      console.log(
        `[LocalImage] Skipping image for storage item type: ${typeName}`
      );
      return null;
    }

    // First try to find image through dynamic matching
    const dynamicMatch = this.findVehicleImageDynamic(
      vehicleName,
      brandName,
      typeName
    );
    if (dynamicMatch) {
      return dynamicMatch;
    }

    // Create search terms from vehicle name, brand, and type
    const searchTerms = [
      vehicleName,
      brandName,
      typeName,
      `${brandName} ${vehicleName}`.replace(/\s+/g, " ").trim(),
    ].filter(
      (term) => term && term !== "Unknown" && term !== "None" && term !== "NONE"
    );

    // Common vehicle model mappings based on the filenames we saw
    const vehicleModelMap = {
      // John Deere tractors
      "8R 410": "_44_FS25_John_Deere_8R_Series.png",
      "8r": "_44_FS25_John_Deere_8R_Series.png",
      "john deere 8r": "_44_FS25_John_Deere_8R_Series.png",
      "john deere tractor": "_28_FS25_John_Deere_6R_Series.png",
      "john deere": "_28_FS25_John_Deere_6R_Series.png",

      // JCB
      "541-70 AGRI PRO": "_115_FS25_JCB_541-70_AGRI_PRO.png",
      "541-70": "_115_FS25_JCB_541-70_AGRI_PRO.png",
      jcb: "_115_FS25_JCB_541-70_AGRI_PRO.png",

      // Manitou
      "M50-4": "_162_FS25_Manitou_M50-4.png",
      m50: "_162_FS25_Manitou_M50-4.png",
      manitou: "_162_FS25_Manitou_M50-4.png",

      // Volvo
      EC380DL: "_535_FS25_Volvo_EC380DL.png",
      ec380: "_535_FS25_Volvo_EC380DL.png",
      volvo: "_535_FS25_Volvo_EC380DL.png",

      // International
      "Transtar II": "_64_FS25_INTERNATIONAL_Transtar_II_Eagle.png",
      transtar: "_64_FS25_INTERNATIONAL_Transtar_II_Eagle.png",
      "Series 200": "_78_FS25_INTERNATIONAL_Series_200.png",
      international: "_64_FS25_INTERNATIONAL_Transtar_II_Eagle.png",

      // Kotte
      "TSA 30000": "_316_FS25_Kotte_TSA_30000.png",
      tsa: "_316_FS25_Kotte_TSA_30000.png",
      "FRC 65": "_317_FS25_Kotte_FRC_65.png",
      frc: "_317_FS25_Kotte_FRC_65.png",
      kotte: "_316_FS25_Kotte_TSA_30000.png",

      // SILOKING
      "TrailedLine 4.0 System 1000+":
        "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",
      "trailedline 4.0 system 1000+":
        "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",
      trailedline: "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",
      "siloking trailedline":
        "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",
      siloking: "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",

      // Wilson
      Silverstar: "_523_FS25_Wilson_Trailer_Silverstar.png",
      wilson: "_523_FS25_Wilson_Trailer_Silverstar.png",

      // LODE KING
      "Renown Drop Deck": "_201_FS25_LODE_KING_Renown_Drop_Deck.png",
      lodeking: "_201_FS25_LODE_KING_Renown_Drop_Deck.png",
      "lode king": "_201_FS25_LODE_KING_Renown_Drop_Deck.png",

      // Hawe
      "SUW 5000": "_186_FS25_Hawe_SUW_5000.png",
      hawe: "_186_FS25_Hawe_SUW_5000.png",

      // Lizard
      "MKS 32": "_520_FS25_Lizard_MKS_32.png",
      lizard: "_520_FS25_Lizard_MKS_32.png",

      // Kärcher
      "HDS 9/18-4 M": "_613_FS25_Kärcher_HDS_9-18-4M.png",
      kärcher: "_613_FS25_Kärcher_HDS_9-18-4M.png",
      kaercher: "_613_FS25_Kärcher_HDS_9-18-4M.png",

      // Kubota
      "RTV-XG850 SIDEKICK": "_75_FS25_Kubota_RTV-XG850_SIDEKICK.png",
      kubota: "_75_FS25_Kubota_RTV-XG850_SIDEKICK.png",
      sidekick: "_75_FS25_Kubota_RTV-XG850_SIDEKICK.png",

      // STEMA
      TRIUS: "_598_FS25_STEMA_TRIUS.png",
      stema: "_598_FS25_STEMA_TRIUS.png",

      // TMC Cancela
      "THX-180": "_537_FS25_TMC_Cancela_THX-180.png",
      tmccancela: "_537_FS25_TMC_Cancela_THX-180.png",
      tmccancela: "_537_FS25_TMC_Cancela_THX-180.png",

      // Abi
      1600: "_518_FS25_Abi_1600.png",
      abi: "_518_FS25_Abi_1600.png",

      // Heizomat
      "HM 10-500 KF": "_543_FS25_Heizomat_HM_10-500_KF.png",
      heizomat: "_543_FS25_Heizomat_HM_10-500_KF.png",

      // Albutt
      "Bale Fork F155A (Telehandler)":
        "_102_200px-FS25_Albutt_F155A_Bale_Fork.png",
      F155A: "_102_200px-FS25_Albutt_F155A_Bale_Fork.png",
      albutt: "_102_200px-FS25_Albutt_F155A_Bale_Fork.png",

      // MAGSI
      "Bale Fork": "_122_FS25_MAGSI_Bale_Fork.png",
      "Manure Fork": "_733_FS25_MAGSI_Manure_Fork.png",
      magsi: "_122_FS25_MAGSI_Bale_Fork.png",

      // PÖTTINGER
      "TERRIA 6040": "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      "terria 6040": "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      terria: "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      "pöttinger terria": "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      pöttinger: "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      poettinger: "_221_FS25_PÖTTINGER_TERRIA_6040.png",

      // Krampe
      "SKS 30/1050": "_205_FS25_Krampe_SKS_30-1050.png",
      "sks 30/1050": "_205_FS25_Krampe_SKS_30-1050.png",
      "sks 30-1050": "_205_FS25_Krampe_SKS_30-1050.png",
      sks: "_205_FS25_Krampe_SKS_30-1050.png",
      "krampe sks": "_205_FS25_Krampe_SKS_30-1050.png",
      krampe: "_205_FS25_Krampe_SKS_30-1050.png",

      // Tenwinkel
      "FGB 600": "_557_FS25_Tenwinkel_FGB_600.png",
      "fbg 600": "_557_FS25_Tenwinkel_FGB_600.png",
      fbg: "_557_FS25_Tenwinkel_FGB_600.png",
      "tenwinkel fbg": "_557_FS25_Tenwinkel_FGB_600.png",
      tenwinkel: "_557_FS25_Tenwinkel_FGB_600.png",
    };

    // Try exact matches first
    for (const term of searchTerms) {
      const termLower = term.toLowerCase().trim();
      if (vehicleModelMap[termLower]) {
        const imagePath = `/assests/img/items/${vehicleModelMap[termLower]}`;
        return imagePath;
      }
    }

    // Try partial matches
    for (const term of searchTerms) {
      if (!term) continue;
      const termLower = term.toLowerCase().trim();

      if (termLower.length < 3) continue;

      for (const [mapKey, filename] of Object.entries(vehicleModelMap)) {
        const mapKeyLower = mapKey.toLowerCase();

        // Check if any significant words match
        if (
          termLower.includes(mapKeyLower) ||
          mapKeyLower.includes(termLower)
        ) {
          const imagePath = `/assests/img/items/${filename}`;
          return imagePath;
        }
      }
    }

    return null;
  }

  // Dynamic image matching using fuzzy search
  findVehicleImageDynamic(vehicleName, brandName, typeName) {
    // Enhanced normalization function
    const normalizeText = (text) => {
      if (!text) return "";
      return text
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Remove special chars
        .replace(/series/g, "")
        .replace(/model/g, "")
        .replace(/fs25/g, "")
        .replace(/imgi/g, "");
    };

    const vehicleNameNorm = normalizeText(vehicleName);
    const brandNameNorm = normalizeText(brandName);
    const typeNameNorm = normalizeText(typeName);

    // Debug logging (only for specific cases)
    if (
      vehicleNameNorm.includes("8570") ||
      vehicleNameNorm.includes("trailer")
    ) {
      console.log(
        `[LocalImage] Searching for vehicle: "${vehicleName}" | brand: "${brandName}" | type: "${typeName}"`
      );
      console.log(
        `[LocalImage] Normalized: vehicle="${vehicleNameNorm}" | brand="${brandNameNorm}" | type="${typeNameNorm}"`
      );
    }

    // Cache for image files (populate once)
    if (!this.vehicleImageCache) {
      this.vehicleImageCache = [];
      // List of all available images (expanded for better coverage)
      const imageFiles = [
        "_10_FS25_Massey_Ferguson_MF_5700_S.png",
        "_11_FS25_Antonio_Carraro_Tony_10900_TTR.png",
        "_12_FS25_Antonio_Carraro_Mach_4R.png",
        "_13_FS25_Fendt_300_Vario.png",
        "_14_FS25_John_Deere_3650.png",
        "_15_FS25_Zetor_FORTERRA_HSX.png",
        "_16_FS25_Iseki_TJW.png",
        "_17_FS25_Fendt_500_Vario.png",
        "_18_FS25_Lindner_Lintrac_130.png",
        "_19_FS25_Same_Virtus_135_RVShift.png",
        "_20_FS25_DEUTZ-FAHR_6C_RVShift.png",
        "_21_200px-FS25_CLAAS_ARION_550-530.png",
        "_22_FS25_Massey_Ferguson_MF_7S.png",
        "_23_200px-FS25_Fiat_160-90_DT.png",
        "_24_FS25_Challenger_MT600_Series.png",
        "_25_FS25_AGCO_White_8010_Series.png",
        "_26_FS25_Zetor_CRYSTAL_HD.png",
        "_27_FS25_Kubota_M8_SERIES.png",
        "_28_FS25_John_Deere_6R_Series.png",
        "_29_FS25_Fendt_700_Vario.png",
        "_30_FS25_Valtra_T_Series.png",
        "_31_FS25_Case_IH_Puma_AFS_Connect.png",
        "_32_FS25_New_Holland_T7_LWB_PLMI.png",
        "_33_FS25_STEYR_Absolut_CVT.png",
        "_34_FS25_DEUTZ-FAHR_AgroStar_8.31.png",
        "_35_FS25_DEUTZ-FAHR_Series_7_TTV_HD.png",
        "_36_FS25_McCormick_X8_VT-Drive.png",
        "_37_200px-FS25_John_Deere_6R_Series_230-250.png",
        "_38_FS25_DEUTZ-FAHR_Series_8_TTV.png",
        "_39_FS25_Versatile_Nemesis.png",
        "_40_FS25_Valtra_S_Series.png",
        "_41_FS25_Massey_Ferguson_MF_9S.png",
        "_42_FS25_Fendt_900_Vario.png",
        "_43_FS25_John_Deere_7R_Series.png",
        "_44_FS25_John_Deere_8R_Series.png",
        "_45_FS25_New_Holland_T8_GENESIS_Series.png",
        "_46_FS25_John_Deere_8RT_Series.png",
        "_47_FS25_John_Deere_8RX_Series.png",
        "_48_FS25_Case_IH_Magnum_AFS_Connect_Series.png",
        "_49_FS25_Fendt_1000_Vario.png",
        "_50_FS25_John_Deere_9R_Series.png",
        "_51_FS25_Fendt_1100_Vario_MT.png",
        "_52_FS25_John_Deere_9RX_Series.png",
        "_53_FS25_CLAAS_XERION_12.png",
        "_54_FS25_Case_IH_Steiger_715_Quadtrac.png",
        "_55_FS25_Versatile_MFWD.png",
        "_115_FS25_JCB_541-70_AGRI_PRO.png",
        "_162_FS25_Manitou_M50-4.png",
        "_164_FS25_Farmtech_EDK_650.png",
        "_326_FS25_Massey_Ferguson_MF_8570.png",
        "_339_FS25_Massey_Ferguson_MF_8570_Header.png",
        "_357_200px-FS25_New_Holland_980CR_8-30.png",
        "_362_FS25_New_Holland_980CR_18-30.png",
        "_368_FS25_Massey_Ferguson_MF_8570_Trailer.png",
        "_535_FS25_Volvo_EC380DL.png",
        "_316_FS25_Kotte_TSA_30000.png",
        "_317_FS25_Kotte_FRC_65.png",
        "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%252B.png",
        "_523_FS25_Wilson_Trailer_Silverstar.png",
        "_201_FS25_LODE_KING_Renown_Drop_Deck.png",
        "_186_FS25_Hawe_SUW_5000.png",
        "_520_FS25_Lizard_MKS_32.png",
        "_613_FS25_Kärcher_HDS_9-18-4M.png",
        "_75_FS25_Kubota_RTV-XG850_SIDEKICK.png",
        "_598_FS25_STEMA_TRIUS.png",
        "_537_FS25_TMC_Cancela_THX-180.png",
        "_518_FS25_Abi_1600.png",
        "_543_FS25_Heizomat_HM_10-500_KF.png",
        "_102_200px-FS25_Albutt_F155A_Bale_Fork.png",
        "_122_FS25_MAGSI_Bale_Fork.png",
        "_221_FS25_PÖTTINGER_TERRIA_6040.png",
        "_205_FS25_Krampe_SKS_30-1050.png",
        "_557_FS25_Tenwinkel_FGB_600.png",
        "_64_FS25_INTERNATIONAL_Transtar_II_Eagle.png",
        "_78_FS25_INTERNATIONAL_Series_200.png",
      ];

      // Parse and cache image metadata
      imageFiles.forEach((filename) => {
        const parts = filename.replace(".png", "").split("_");
        const brandPart = parts[2] || "";
        const modelPart = parts
          .slice(3)
          .join(" ")
          .replace(/%2B/g, "+")
          .replace(/%25/g, "%");

        const cacheEntry = {
          filename: filename,
          path: `/assests/img/items/${filename}`,
          brandNorm: normalizeText(brandPart),
          modelNorm: normalizeText(modelPart),
          fullNorm: normalizeText(brandPart + " " + modelPart),
          originalBrand: brandPart,
          originalModel: modelPart,
        };

        this.vehicleImageCache.push(cacheEntry);

        // Debug log cache entries for specific images
        if (filename.includes("8570")) {
          console.log(
            `[LocalImage] Cached: ${filename} -> brand:"${cacheEntry.brandNorm}" model:"${cacheEntry.modelNorm}"`
          );
        }
      });
    }

    // Score-based matching
    let bestMatch = null;
    let bestScore = 0;

    this.vehicleImageCache.forEach((img) => {
      let score = 0;

      // Simplified brand matching - much more permissive
      let brandBonus = 0;
      if (brandNameNorm && img.brandNorm) {
        // Exact brand match
        if (img.brandNorm === brandNameNorm) {
          brandBonus = 10;
        }
        // Partial brand match
        else if (
          brandNameNorm.length >= 3 &&
          img.brandNorm.includes(brandNameNorm.substring(0, 3))
        ) {
          brandBonus = 6;
        }
        // Brand abbreviations
        else if (
          (brandNameNorm === "john" && img.brandNorm.includes("johndeere")) ||
          (brandNameNorm === "mf" && img.brandNorm.includes("massey")) ||
          (brandNameNorm === "jd" && img.brandNorm.includes("johndeere")) ||
          (brandNameNorm === "massey" && img.brandNorm.includes("massey"))
        ) {
          brandBonus = 8;
        }
        // Reverse check - image brand contained in search brand
        else if (
          img.brandNorm.length >= 3 &&
          brandNameNorm.includes(img.brandNorm.substring(0, 3))
        ) {
          brandBonus = 4;
        }
      }

      // Model name matching - more flexible
      if (vehicleNameNorm && img.modelNorm) {
        // Exact model name match
        if (img.modelNorm === vehicleNameNorm) {
          score += 25;
        }
        // Vehicle name contained in model
        else if (
          vehicleNameNorm.length >= 3 &&
          img.modelNorm.includes(vehicleNameNorm)
        ) {
          score += 15;
        }
        // Model contained in vehicle name
        else if (
          img.modelNorm.length >= 3 &&
          vehicleNameNorm.includes(img.modelNorm)
        ) {
          score += 12;
        }

        // Number matching - more precise
        const vehicleNumbers = vehicleNameNorm.match(/(\d+)/g) || [];
        const imageNumbers = img.modelNorm.match(/(\d+)/g) || [];

        if (vehicleNumbers.length > 0 && imageNumbers.length > 0) {
          let hasExactNumberMatch = false;
          vehicleNumbers.forEach((vNum) => {
            imageNumbers.forEach((iNum) => {
              if (vNum === iNum) {
                hasExactNumberMatch = true;
                // Give good scores for exact number match
                if (vNum.length >= 4) {
                  score += 12;
                } else if (vNum.length >= 3) {
                  score += 8;
                } else {
                  score += 4;
                }
              }
              // Penalty for significant number mismatches (different lengths or very different numbers)
              else if (vNum.length >= 3 && iNum.length >= 3) {
                const vNumInt = parseInt(vNum);
                const iNumInt = parseInt(iNum);
                const diff = Math.abs(vNumInt - iNumInt);

                // Large difference penalty (e.g., 980 vs 3650)
                if (diff > 1000) {
                  score -= 8;
                }
                // Medium difference penalty (e.g., 980 vs 1200)
                else if (diff > 500) {
                  score -= 4;
                }
                // Small difference penalty (e.g., 980 vs 985)
                else if (diff > 100) {
                  score -= 2;
                }
              }
            });
          });

          // Additional penalty if no exact number matches found but vehicle has specific numbers
          if (
            !hasExactNumberMatch &&
            vehicleNumbers.length > 0 &&
            vehicleNumbers[0].length >= 3
          ) {
            score -= 3;
          }
        }

        // Letter-number combinations
        const vehicleAlphaNum =
          vehicleNameNorm.match(/(\d+[a-z]+|[a-z]+\d+)/g) || [];
        vehicleAlphaNum.forEach((pattern) => {
          if (img.modelNorm.includes(pattern)) {
            score += 8;
          }
        });

        // Word matching - split into words and check overlap
        const vehicleWords = vehicleNameNorm
          .split(/\s+/)
          .filter((w) => w.length >= 3);
        const modelWords = img.modelNorm
          .split(/\s+/)
          .filter((w) => w.length >= 3);

        let wordMatches = 0;
        vehicleWords.forEach((vWord) => {
          modelWords.forEach((mWord) => {
            if (
              vWord === mWord ||
              vWord.includes(mWord) ||
              mWord.includes(vWord)
            ) {
              wordMatches++;
            }
          });
        });

        if (wordMatches > 0) {
          score += wordMatches * 3;
        }
      }

      // Special type handling - HIGH PRIORITY for exact type matches
      if (typeNameNorm) {
        if (
          typeNameNorm.includes("trailer") &&
          img.modelNorm.includes("trailer")
        ) {
          score += 15; // High bonus for trailer match
        } else if (
          typeNameNorm.includes("header") &&
          img.modelNorm.includes("header")
        ) {
          score += 15; // High bonus for header match
        } else if (
          typeNameNorm.includes("header") &&
          !img.modelNorm.includes("header") &&
          !img.modelNorm.includes("trailer")
        ) {
          // Penalty for header vehicles matching non-header images
          score -= 5;
        } else if (
          typeNameNorm.includes("trailer") &&
          !img.modelNorm.includes("trailer") &&
          !img.modelNorm.includes("header")
        ) {
          // Penalty for trailer vehicles matching non-trailer images
          score -= 5;
        }
      }

      // Apply brand bonus
      score += brandBonus;

      // Update best match with lower threshold
      if (score > bestScore && score >= 3) {
        // Much lower threshold
        bestScore = score;
        bestMatch = img;
      }
    });

    if (bestMatch) {
      console.log(
        `[LocalImage] Dynamic match found: ${vehicleName} -> ${bestMatch.filename} (score: ${bestScore})`
      );
      return bestMatch.path;
    }

    return null;
  }

  // Format operating time from milliseconds to readable format
  formatOperatingTime(operatingTimeMs) {
    if (!operatingTimeMs || operatingTimeMs === 0) {
      return "0h";
    }

    // Convert milliseconds to hours
    const hours = Math.round(operatingTimeMs / (1000 * 60 * 60));

    if (hours < 1) {
      return "0h";
    } else if (hours < 24) {
      return `${hours}h`;
    } else if (hours < 8760) {
      // Less than a year
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } else {
      const years = Math.floor(hours / 8760);
      const remainingHours = hours % 8760;
      const days = Math.floor(remainingHours / 24);
      if (days > 0) {
        return `${years}y ${days}d`;
      } else {
        return `${years}y`;
      }
    }
  }

  // Vehicle Image Mapping (keeping for future use when wiki URLs are fixed)
  getVehicleWikiImage(vehicleName, brandName, typeName) {
    // Mapping of vehicle names and keywords to their FS25 wiki images
    const vehicleImageMap = {
      // John Deere Tractors
      "8R 410":
        "https://farmingsimulator.wiki.gg/images/thumb/5/54/Johndeere8r410.png/300px-Johndeere8r410.png",
      "8r": "https://farmingsimulator.wiki.gg/images/thumb/5/54/Johndeere8r410.png/300px-Johndeere8r410.png",
      "john deere tractor":
        "https://farmingsimulator.wiki.gg/images/thumb/5/54/Johndeere8r410.png/300px-Johndeere8r410.png",
      "X9 1100":
        "https://farmingsimulator.wiki.gg/images/thumb/a/a4/Johndeere_x9_1100.png/300px-Johndeere_x9_1100.png",
      x9: "https://farmingsimulator.wiki.gg/images/thumb/a/a4/Johndeere_x9_1100.png/300px-Johndeere_x9_1100.png",

      // McCormick
      "X8.631 VT-Drive":
        "https://farmingsimulator.wiki.gg/images/thumb/c/c4/Mccormick_x8631_vt-drive.png/300px-Mccormick_x8631_vt-drive.png",
      mccormick:
        "https://farmingsimulator.wiki.gg/images/thumb/c/c4/Mccormick_x8631_vt-drive.png/300px-Mccormick_x8631_vt-drive.png",

      // JCB
      "541-70 AGRI PRO":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7e/Jcb_541-70_agri_pro.png/300px-Jcb_541-70_agri_pro.png",
      "541-70":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7e/Jcb_541-70_agri_pro.png/300px-Jcb_541-70_agri_pro.png",
      "jcb telehandler":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7e/Jcb_541-70_agri_pro.png/300px-Jcb_541-70_agri_pro.png",

      // Manitou
      "M50-4":
        "https://farmingsimulator.wiki.gg/images/thumb/8/8c/Manitou_m50-4.png/300px-Manitou_m50-4.png",
      m50: "https://farmingsimulator.wiki.gg/images/thumb/8/8c/Manitou_m50-4.png/300px-Manitou_m50-4.png",
      "manitou telehandler":
        "https://farmingsimulator.wiki.gg/images/thumb/8/8c/Manitou_m50-4.png/300px-Manitou_m50-4.png",
      "MLT 841-145 PS+":
        "https://farmingsimulator.wiki.gg/images/thumb/d/d5/Manitou_mlt_841-145_ps%2B.png/300px-Manitou_mlt_841-145_ps%2B.png",

      // Volvo
      EC380DL:
        "https://farmingsimulator.wiki.gg/images/thumb/3/3e/Volvo_ec380dl.png/300px-Volvo_ec380dl.png",
      ec380:
        "https://farmingsimulator.wiki.gg/images/thumb/3/3e/Volvo_ec380dl.png/300px-Volvo_ec380dl.png",
      "volvo excavator":
        "https://farmingsimulator.wiki.gg/images/thumb/3/3e/Volvo_ec380dl.png/300px-Volvo_ec380dl.png",

      // International
      "Transtar II":
        "https://farmingsimulator.wiki.gg/images/thumb/a/ac/International_transtar_ii.png/300px-International_transtar_ii.png",
      transtar:
        "https://farmingsimulator.wiki.gg/images/thumb/a/ac/International_transtar_ii.png/300px-International_transtar_ii.png",
      "Series 200":
        "https://farmingsimulator.wiki.gg/images/thumb/5/5c/International_series_200.png/300px-International_series_200.png",
      "international truck":
        "https://farmingsimulator.wiki.gg/images/thumb/a/ac/International_transtar_ii.png/300px-International_transtar_ii.png",

      // Kotte
      "TSA 30000":
        "https://farmingsimulator.wiki.gg/images/thumb/8/8f/Kotte_tsa_30000.png/300px-Kotte_tsa_30000.png",
      tsa: "https://farmingsimulator.wiki.gg/images/thumb/8/8f/Kotte_tsa_30000.png/300px-Kotte_tsa_30000.png",
      "FRC 65":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f8/Kotte_frc_65.png/300px-Kotte_frc_65.png",
      frc: "https://farmingsimulator.wiki.gg/images/thumb/f/f8/Kotte_frc_65.png/300px-Kotte_frc_65.png",
      kotte:
        "https://farmingsimulator.wiki.gg/images/thumb/8/8f/Kotte_tsa_30000.png/300px-Kotte_tsa_30000.png",

      // Hawe
      "SUW 5000":
        "https://farmingsimulator.wiki.gg/images/thumb/4/4c/Hawe_suw_5000.png/300px-Hawe_suw_5000.png",
      suw: "https://farmingsimulator.wiki.gg/images/thumb/4/4c/Hawe_suw_5000.png/300px-Hawe_suw_5000.png",
      hawe: "https://farmingsimulator.wiki.gg/images/thumb/4/4c/Hawe_suw_5000.png/300px-Hawe_suw_5000.png",

      // Lizard
      "MKS 32":
        "https://farmingsimulator.wiki.gg/images/thumb/9/92/Lizard_mks_32.png/300px-Lizard_mks_32.png",
      mks: "https://farmingsimulator.wiki.gg/images/thumb/9/92/Lizard_mks_32.png/300px-Lizard_mks_32.png",
      lizard:
        "https://farmingsimulator.wiki.gg/images/thumb/9/92/Lizard_mks_32.png/300px-Lizard_mks_32.png",

      // Wilson
      Silverstar:
        "https://farmingsimulator.wiki.gg/images/thumb/1/1f/Wilson_silverstar.png/300px-Wilson_silverstar.png",
      wilson:
        "https://farmingsimulator.wiki.gg/images/thumb/1/1f/Wilson_silverstar.png/300px-Wilson_silverstar.png",

      // Krampe
      "SKS 30/1050":
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Krampe_sks_30-1050.png/300px-Krampe_sks_30-1050.png",
      krampe:
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Krampe_sks_30-1050.png/300px-Krampe_sks_30-1050.png",

      // LODE KING
      "Renown Drop Deck":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7c/Lodeking_renown_drop_deck.png/300px-Lodeking_renown_drop_deck.png",
      lodeking:
        "https://farmingsimulator.wiki.gg/images/thumb/7/7c/Lodeking_renown_drop_deck.png/300px-Lodeking_renown_drop_deck.png",
      "lode king":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7c/Lodeking_renown_drop_deck.png/300px-Lodeking_renown_drop_deck.png",

      // Heizomat
      "HM 10-500 KF":
        "https://farmingsimulator.wiki.gg/images/thumb/2/2b/Heizomat_hm_10-500_kf.png/300px-Heizomat_hm_10-500_kf.png",
      heizomat:
        "https://farmingsimulator.wiki.gg/images/thumb/2/2b/Heizomat_hm_10-500_kf.png/300px-Heizomat_hm_10-500_kf.png",

      // Siloking
      "TrailedLine 4.0 System 1000+":
        "https://farmingsimulator.wiki.gg/images/thumb/d/d6/Siloking_trailedline_4.0_system_1000%2B.png/300px-Siloking_trailedline_4.0_system_1000%2B.png",
      trailedline:
        "https://farmingsimulator.wiki.gg/images/thumb/d/d6/Siloking_trailedline_4.0_system_1000%2B.png/300px-Siloking_trailedline_4.0_system_1000%2B.png",
      siloking:
        "https://farmingsimulator.wiki.gg/images/thumb/d/d6/Siloking_trailedline_4.0_system_1000%2B.png/300px-Siloking_trailedline_4.0_system_1000%2B.png",

      // Kärcher
      "HDS 9/18-4 M":
        "https://farmingsimulator.wiki.gg/images/thumb/0/05/Kaercher_hds_9-18-4_m.png/300px-Kaercher_hds_9-18-4_m.png",
      hds: "https://farmingsimulator.wiki.gg/images/thumb/0/05/Kaercher_hds_9-18-4_m.png/300px-Kaercher_hds_9-18-4_m.png",
      kaercher:
        "https://farmingsimulator.wiki.gg/images/thumb/0/05/Kaercher_hds_9-18-4_m.png/300px-Kaercher_hds_9-18-4_m.png",
      kärcher:
        "https://farmingsimulator.wiki.gg/images/thumb/0/05/Kaercher_hds_9-18-4_m.png/300px-Kaercher_hds_9-18-4_m.png",

      // Kubota
      "RTV-XG850 SIDEKICK":
        "https://farmingsimulator.wiki.gg/images/thumb/a/a9/Kubota_rtv-xg850_sidekick.png/300px-Kubota_rtv-xg850_sidekick.png",
      rtv: "https://farmingsimulator.wiki.gg/images/thumb/a/a9/Kubota_rtv-xg850_sidekick.png/300px-Kubota_rtv-xg850_sidekick.png",
      kubota:
        "https://farmingsimulator.wiki.gg/images/thumb/a/a9/Kubota_rtv-xg850_sidekick.png/300px-Kubota_rtv-xg850_sidekick.png",
      sidekick:
        "https://farmingsimulator.wiki.gg/images/thumb/a/a9/Kubota_rtv-xg850_sidekick.png/300px-Kubota_rtv-xg850_sidekick.png",

      // STEMA
      TRIUS:
        "https://farmingsimulator.wiki.gg/images/thumb/6/6f/Stema_trius.png/300px-Stema_trius.png",
      trius:
        "https://farmingsimulator.wiki.gg/images/thumb/6/6f/Stema_trius.png/300px-Stema_trius.png",
      stema:
        "https://farmingsimulator.wiki.gg/images/thumb/6/6f/Stema_trius.png/300px-Stema_trius.png",

      // TMC Cancela
      "THX-180":
        "https://farmingsimulator.wiki.gg/images/thumb/9/9a/Tmccancela_thx-180.png/300px-Tmccancela_thx-180.png",
      thx: "https://farmingsimulator.wiki.gg/images/thumb/9/9a/Tmccancela_thx-180.png/300px-Tmccancela_thx-180.png",
      tmccancela:
        "https://farmingsimulator.wiki.gg/images/thumb/9/9a/Tmccancela_thx-180.png/300px-Tmccancela_thx-180.png",

      // Abi
      1600: "https://farmingsimulator.wiki.gg/images/thumb/0/09/Abi_1600.png/300px-Abi_1600.png",
      abi: "https://farmingsimulator.wiki.gg/images/thumb/0/09/Abi_1600.png/300px-Abi_1600.png",

      // PÖTTINGER
      "TERRIA 6040":
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Poettinger_terria_6040.png/300px-Poettinger_terria_6040.png",
      terria:
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Poettinger_terria_6040.png/300px-Poettinger_terria_6040.png",
      pöttinger:
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Poettinger_terria_6040.png/300px-Poettinger_terria_6040.png",
      poettinger:
        "https://farmingsimulator.wiki.gg/images/thumb/8/8a/Poettinger_terria_6040.png/300px-Poettinger_terria_6040.png",

      // Tenwinkel
      "FGB 600":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f5/Tenwinkel_fgb_600.png/300px-Tenwinkel_fgb_600.png",
      fgb: "https://farmingsimulator.wiki.gg/images/thumb/f/f5/Tenwinkel_fgb_600.png/300px-Tenwinkel_fgb_600.png",
      tenwinkel:
        "https://farmingsimulator.wiki.gg/images/thumb/f/f5/Tenwinkel_fgb_600.png/300px-Tenwinkel_fgb_600.png",

      // Albutt
      "Bale Fork F155A (Telehandler)":
        "https://farmingsimulator.wiki.gg/images/thumb/a/a5/Albutt_bale_fork_f155a_%28telehandler%29.png/300px-Albutt_bale_fork_f155a_%28telehandler%29.png",
      "bale fork":
        "https://farmingsimulator.wiki.gg/images/thumb/a/a5/Albutt_bale_fork_f155a_%28telehandler%29.png/300px-Albutt_bale_fork_f155a_%28telehandler%29.png",
      albutt:
        "https://farmingsimulator.wiki.gg/images/thumb/a/a5/Albutt_bale_fork_f155a_%28telehandler%29.png/300px-Albutt_bale_fork_f155a_%28telehandler%29.png",

      // MAGSI
      "Bale Fork":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f1/Magsi_bale_fork.png/300px-Magsi_bale_fork.png",
      "Manure Fork":
        "https://farmingsimulator.wiki.gg/images/thumb/e/e2/Magsi_manure_fork.png/300px-Magsi_manure_fork.png",
      "manure fork":
        "https://farmingsimulator.wiki.gg/images/thumb/e/e2/Magsi_manure_fork.png/300px-Magsi_manure_fork.png",
      magsi:
        "https://farmingsimulator.wiki.gg/images/thumb/f/f1/Magsi_bale_fork.png/300px-Magsi_bale_fork.png",

      // Train Cars (generic)
      Train:
        "https://farmingsimulator.wiki.gg/images/thumb/c/c8/Train_locomotive.png/300px-Train_locomotive.png",
      locomotive:
        "https://farmingsimulator.wiki.gg/images/thumb/c/c8/Train_locomotive.png/300px-Train_locomotive.png",
      "Grain Wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f4/Train_grain_wagon.png/300px-Train_grain_wagon.png",
      "grain wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f4/Train_grain_wagon.png/300px-Train_grain_wagon.png",
      "Sugarbeet Wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/9/9d/Train_sugarbeet_wagon.png/300px-Train_sugarbeet_wagon.png",
      "sugarbeet wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/9/9d/Train_sugarbeet_wagon.png/300px-Train_sugarbeet_wagon.png",
      "Woodchips Wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7a/Train_woodchips_wagon.png/300px-Train_woodchips_wagon.png",
      "woodchips wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7a/Train_woodchips_wagon.png/300px-Train_woodchips_wagon.png",
      "Timber Wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/b/b8/Train_timber_wagon.png/300px-Train_timber_wagon.png",
      "timber wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/b/b8/Train_timber_wagon.png/300px-Train_timber_wagon.png",
      "Flatbed Wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/b/b8/Train_timber_wagon.png/300px-Train_timber_wagon.png",
      "flatbed wagon":
        "https://farmingsimulator.wiki.gg/images/thumb/b/b8/Train_timber_wagon.png/300px-Train_timber_wagon.png",

      // Pallets and Big Bags - Generic Images for Storage Items
      Wheat:
        "https://farmingsimulator.wiki.gg/images/thumb/6/6a/Pallet_wheat.png/300px-Pallet_wheat.png",
      wheat:
        "https://farmingsimulator.wiki.gg/images/thumb/6/6a/Pallet_wheat.png/300px-Pallet_wheat.png",
      Seeds:
        "https://farmingsimulator.wiki.gg/images/thumb/a/a7/Bigbag_seeds.png/300px-Bigbag_seeds.png",
      seeds:
        "https://farmingsimulator.wiki.gg/images/thumb/a/a7/Bigbag_seeds.png/300px-Bigbag_seeds.png",
      "Bag of fertilizer":
        "https://farmingsimulator.wiki.gg/images/thumb/c/c2/Pallet_fertilizer.png/300px-Pallet_fertilizer.png",
      fertilizer:
        "https://farmingsimulator.wiki.gg/images/thumb/c/c2/Pallet_fertilizer.png/300px-Pallet_fertilizer.png",
      "Bag of mineral feed":
        "https://farmingsimulator.wiki.gg/images/thumb/d/d4/Pallet_mineral_feed.png/300px-Pallet_mineral_feed.png",
      "Mineral Feed":
        "https://farmingsimulator.wiki.gg/images/thumb/d/d4/Pallet_mineral_feed.png/300px-Pallet_mineral_feed.png",
      "mineral feed":
        "https://farmingsimulator.wiki.gg/images/thumb/d/d4/Pallet_mineral_feed.png/300px-Pallet_mineral_feed.png",
      "Canister with herbicide":
        "https://farmingsimulator.wiki.gg/images/thumb/8/81/Canister_herbicide.png/300px-Canister_herbicide.png",
      Herbicide:
        "https://farmingsimulator.wiki.gg/images/thumb/8/81/Canister_herbicide.png/300px-Canister_herbicide.png",
      herbicide:
        "https://farmingsimulator.wiki.gg/images/thumb/8/81/Canister_herbicide.png/300px-Canister_herbicide.png",
      "Honey Pallet":
        "https://farmingsimulator.wiki.gg/images/thumb/f/f3/Pallet_honey.png/300px-Pallet_honey.png",
      honey:
        "https://farmingsimulator.wiki.gg/images/thumb/f/f3/Pallet_honey.png/300px-Pallet_honey.png",
      Eggs: "https://farmingsimulator.wiki.gg/images/thumb/e/e4/Pallet_eggs.png/300px-Pallet_eggs.png",
      eggs: "https://farmingsimulator.wiki.gg/images/thumb/e/e4/Pallet_eggs.png/300px-Pallet_eggs.png",
      "Garlic Pallet":
        "https://farmingsimulator.wiki.gg/images/thumb/2/2a/Pallet_garlic.png/300px-Pallet_garlic.png",
      garlic:
        "https://farmingsimulator.wiki.gg/images/thumb/2/2a/Pallet_garlic.png/300px-Pallet_garlic.png",
      "Strawberries Pallet":
        "https://farmingsimulator.wiki.gg/images/thumb/4/4c/Pallet_strawberries.png/300px-Pallet_strawberries.png",
      strawberries:
        "https://farmingsimulator.wiki.gg/images/thumb/4/4c/Pallet_strawberries.png/300px-Pallet_strawberries.png",
      "Tomatoes Pallet":
        "https://farmingsimulator.wiki.gg/images/thumb/7/7d/Pallet_tomatoes.png/300px-Pallet_tomatoes.png",
      tomatoes:
        "https://farmingsimulator.wiki.gg/images/thumb/7/7d/Pallet_tomatoes.png/300px-Pallet_tomatoes.png",
      "Chilli Peppers Pallet":
        "https://farmingsimulator.wiki.gg/images/thumb/1/15/Pallet_chilli.png/300px-Pallet_chilli.png",
      chilli:
        "https://farmingsimulator.wiki.gg/images/thumb/1/15/Pallet_chilli.png/300px-Pallet_chilli.png",
    };

    // Debug logging to understand what we're trying to match
    console.log(
      `[VehicleImage] Trying to match: "${vehicleName}" | Brand: "${brandName}" | Type: "${typeName}"`
    );

    // Create search terms - combine all relevant information
    const searchTerms = [
      vehicleName,
      brandName,
      `${brandName} ${vehicleName}`,
      `${vehicleName} ${brandName}`,
      typeName,
    ].filter(
      (term) =>
        term &&
        term.toLowerCase() !== "none" &&
        term.toLowerCase() !== "unknown"
    );

    // Try exact matches first for all search terms
    for (const term of searchTerms) {
      if (term && vehicleImageMap[term]) {
        console.log(`[VehicleImage] Exact match found for "${term}"`);
        return vehicleImageMap[term];
      }
    }

    // Try case-insensitive matches
    for (const term of searchTerms) {
      if (!term) continue;
      const termLower = term.toLowerCase();
      for (const [mapKey, url] of Object.entries(vehicleImageMap)) {
        if (mapKey.toLowerCase() === termLower) {
          console.log(
            `[VehicleImage] Case-insensitive match found: "${term}" -> "${mapKey}"`
          );
          return url;
        }
      }
    }

    // Try partial/fuzzy matching with very flexible approach
    for (const term of searchTerms) {
      if (!term) continue;
      const termLower = term.toLowerCase().trim();

      // Skip very short terms to avoid false positives
      if (termLower.length < 3) continue;

      for (const [mapKey, url] of Object.entries(vehicleImageMap)) {
        const mapKeyLower = mapKey.toLowerCase();

        // Direct substring matches
        if (
          termLower.includes(mapKeyLower) ||
          mapKeyLower.includes(termLower)
        ) {
          console.log(
            `[VehicleImage] Substring match found: "${term}" matched with "${mapKey}"`
          );
          return url;
        }

        // Word-by-word matching
        const termWords = termLower
          .split(/\s+/)
          .filter((word) => word.length > 2);
        const mapWords = mapKeyLower
          .split(/\s+/)
          .filter((word) => word.length > 2);

        // Check if any significant words match
        for (const termWord of termWords) {
          for (const mapWord of mapWords) {
            if (
              termWord === mapWord ||
              termWord.includes(mapWord) ||
              mapWord.includes(termWord)
            ) {
              console.log(
                `[VehicleImage] Word match found: "${termWord}" (from "${term}") matched with "${mapWord}" (from "${mapKey}")`
              );
              return url;
            }
          }
        }
      }
    }

    console.log(
      `[VehicleImage] No match found for any search terms: ${searchTerms.join(
        ", "
      )}`
    );
    return null;
  }

  // Helper function to make images work with CORS proxy
  proxifyImageUrl(imageUrl) {
    if (!imageUrl) return null;

    // Use a CORS proxy to bypass cross-origin restrictions
    const corsProxies = [
      "https://corsproxy.io/?",
      "https://api.allorigins.win/raw?url=",
      "https://cors-anywhere.herokuapp.com/",
    ];

    // Try the first proxy
    return corsProxies[0] + encodeURIComponent(imageUrl);
  }

  getBrandImageUrl(brandImagePath, brandName) {
    // If the brand image path starts with "data/", it's a game file path that won't work in browser
    if (brandImagePath && brandImagePath.startsWith("data/")) {
      console.log(
        `[VehicleImage] Game file path detected: ${brandImagePath}, using brand fallback`
      );
      return null; // Return null so we fall back to icons
    }

    // If it's already a web URL, return it
    if (
      brandImagePath &&
      (brandImagePath.startsWith("http://") ||
        brandImagePath.startsWith("https://"))
    ) {
      return brandImagePath;
    }

    // For brands without web images, we could add specific brand logo URLs here
    const brandImageMap = {
      "John Deere":
        "https://logos-world.net/wp-content/uploads/2020/11/John-Deere-Logo.png",
      Volvo:
        "https://logos-world.net/wp-content/uploads/2020/04/Volvo-Logo.png",
      JCB: "https://logos-world.net/wp-content/uploads/2020/12/JCB-Logo.png",
      Manitou:
        "https://logos-world.net/wp-content/uploads/2023/08/Manitou-Logo.png",
      International:
        "https://logos-world.net/wp-content/uploads/2023/01/International-Logo.png",
      // Add more brand logos as needed
    };

    return brandImageMap[brandName] || null;
  }

  // Vehicle Management Methods
  async loadVehicles() {
    try {
      const response = await fetch("/api/vehicles");
      if (response.ok) {
        const allVehicles = await response.json();
        // Filter to only show player-owned vehicles (ownerFarmId: 1)
        this.vehicles = allVehicles
          ? allVehicles.filter((v) => v.ownerFarmId === 1)
          : [];
        this.updateVehicleSummaryCards();
        this.renderVehicleCards(this.vehicles);
      } else {
        console.error("Failed to load vehicles:", response.statusText);
        this.vehicles = [];
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      this.vehicles = [];
    }
  }

  updateVehicleSummaryCards() {
    const vehicles = this.vehicles || [];
    // Filter out storage items for summary counts
    const displayVehicles = vehicles.filter((v) => !this.isStorageItem(v));
    const totalCount = displayVehicles.length;

    const lowFuelCount = displayVehicles.filter((v) => {
      // Skip fuel calculations for vehicles that don't use traditional fuel
      const skipFuelTypes = ["highPressureWasher", "High Pressure Washer"];
      if (!v.isMotorized || skipFuelTypes.includes(v.typeName)) return false;

      // Check fuel from multiple sources like in createVehicleCard
      let fuelPercentage = 0;
      if (v.fuelCapacity > 0 && v.fuelLevel > 0) {
        fuelPercentage = (v.fuelLevel / v.fuelCapacity) * 100;
      } else if (v.fillLevels && v.fillLevels["DIESEL"]) {
        const diesel = v.fillLevels["DIESEL"];
        fuelPercentage =
          diesel.capacity > 0 ? (diesel.level / diesel.capacity) * 100 : 0;
      }

      return fuelPercentage < 25;
    }).length;

    const damagedCount = displayVehicles.filter((v) => v.damage > 0.2).length;

    this.setElementText("total-vehicles-count", totalCount);
    this.setElementText("low-fuel-count", lowFuelCount);
    this.setElementText("damaged-vehicles-count", damagedCount);
  }

  renderVehicleCards(vehicles) {
    const grid = document.getElementById("vehicles-grid");
    if (!grid) return;

    if (!vehicles || vehicles.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-truck fs-1 text-muted mb-3"></i>
          <h4 class="text-muted">No Vehicles Found</h4>
          <p class="text-muted">No vehicles are currently available in your farm.</p>
        </div>
      `;
      return;
    }

    // Filter out storage items (pallets and bigBags) from display
    const displayVehicles = vehicles.filter(
      (vehicle) => !this.isStorageItem(vehicle)
    );

    if (displayVehicles.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-truck fs-1 text-muted mb-3"></i>
          <h4 class="text-muted">No Vehicles Found</h4>
          <p class="text-muted">Only storage items (pallets/bigBags) are available. These are hidden from vehicle display.</p>
        </div>
      `;
      return;
    }

    const cards = displayVehicles
      .map((vehicle) => this.createVehicleCard(vehicle))
      .join("");
    grid.innerHTML = cards;
  }

  createVehicleCard(vehicle) {
    const brandName =
      typeof vehicle.brand === "object"
        ? vehicle.brand.title || vehicle.brand.name
        : vehicle.brand;
    const brandImagePath =
      typeof vehicle.brand === "object" && vehicle.brand.image
        ? vehicle.brand.image
        : null;

    // Generate vehicle display data for CSS styling
    const vehicleDisplay = this.generateVehicleDisplay(
      vehicle.name,
      brandName,
      vehicle.typeName
    );

    // Calculate fuel percentage - check multiple possible fuel sources
    // Skip fuel display for vehicles that don't use traditional fuel
    const skipFuelTypes = ["highPressureWasher", "High Pressure Washer"];
    let fuelPercentage = 0;
    const shouldShowFuel =
      vehicle.isMotorized && !skipFuelTypes.includes(vehicle.typeName);

    if (shouldShowFuel) {
      if (vehicle.fuelCapacity > 0 && vehicle.fuelLevel > 0) {
        fuelPercentage = Math.round(
          (vehicle.fuelLevel / vehicle.fuelCapacity) * 100
        );
      } else if (vehicle.fillLevels && vehicle.fillLevels["DIESEL"]) {
        const diesel = vehicle.fillLevels["DIESEL"];
        fuelPercentage =
          diesel.capacity > 0
            ? Math.round((diesel.level / diesel.capacity) * 100)
            : 0;
      }
    }
    const damagePercentage = Math.round(vehicle.damage * 100);
    const statusIcon = vehicle.engineOn
      ? "bi-play-circle-fill text-success"
      : "bi-pause-circle text-muted";
    const vehicleIcon = this.getVehicleIcon(
      vehicle.vehicleType,
      vehicle.typeName
    );

    // Check if this is a storage item (pallet, bigBag)
    const isStorageItem = ["bigbag", "pallet"].includes(
      vehicle.typeName?.toLowerCase()
    );

    // Fill levels summary
    const fillSummary =
      Object.keys(vehicle.fillLevels || {}).length > 0
        ? Object.entries(vehicle.fillLevels)
            .map(([type, data]) => {
              const percentage =
                data.capacity > 0
                  ? Math.round((data.level / data.capacity) * 100)
                  : 0;
              return `<small class="text-muted d-block">${type}: ${percentage}%</small>`;
            })
            .join("")
        : '<small class="text-muted">No cargo</small>';

    return `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card bg-secondary h-100 vehicle-card" data-vehicle-id="${
          vehicle.id
        }">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <div class="me-3 d-flex align-items-center">
                <i class="bi ${vehicleIcon} fs-4 text-farm-accent me-2"></i>
                ${
                  vehicleDisplay.isImage
                    ? `<div class="vehicle-display-container" style="width: 80px; height: 60px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 6px rgba(0,0,0,0.15); position: relative; overflow: hidden; background: #f8f9fa; cursor: pointer;"
                          onclick="dashboard.showVehicleImage('${vehicleDisplay.imageUrl}', '${vehicleDisplay.displayText}', '${vehicle.brand}')">
                       <img src="${vehicleDisplay.imageUrl}" alt="${vehicleDisplay.displayText}" style="max-width: 76px; max-height: 56px; object-fit: contain; border-radius: 4px; transition: transform 0.2s ease;"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'" />
                       <div style="display: none; color: #495057; font-size: 10px; font-weight: bold; text-align: center; padding: 2px; line-height: 1.1; word-wrap: break-word; max-width: 76px; background: #e9ecef; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 7px;">
                         ${vehicleDisplay.displayText}
                       </div>
                       <div style="position: absolute; top: 2px; right: 2px; opacity: 0.7; transition: opacity 0.2s ease;">
                         <i class="bi bi-zoom-in text-dark" style="font-size: 12px;"></i>
                       </div>
                     </div>`
                    : `<div class="vehicle-display-container" style="width: 80px; height: 60px; border-radius: 8px; background: ${vehicleDisplay.background}; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 6px rgba(0,0,0,0.15); position: relative; overflow: hidden;">
                       <div style="color: ${vehicleDisplay.textColor}; font-size: 10px; font-weight: bold; text-align: center; padding: 2px; line-height: 1.1; word-wrap: break-word; max-width: 76px;">
                         ${vehicleDisplay.displayText}
                       </div>
                       <div style="position: absolute; top: 2px; right: 2px; width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.2);"></div>
                       <div style="position: absolute; bottom: 2px; left: 2px; width: 16px; height: 2px; background: rgba(255,255,255,0.3); border-radius: 1px;"></div>
                     </div>`
                }
              </div>
              <div>
                <h6 class="mb-0 text-truncate" style="max-width: 140px;" title="${
                  vehicle.name
                }">
                  ${vehicle.name}
                </h6>
                <small class="text-muted">${brandName}</small>
              </div>
            </div>
            <i class="bi ${statusIcon} fs-5"></i>
          </div>

          <div class="card-body">
            ${
              !isStorageItem
                ? `
              <div class="row g-2 mb-3">
                <div class="col-12">
                  <div class="d-flex align-items-center">
                    <i class="bi bi-clock text-farm-accent me-2"></i>
                    <div>
                      <small class="text-muted d-block">Operating Time</small>
                      <strong>${this.formatOperatingTime(
                        vehicle.operatingTime || 0
                      )}</strong>
                    </div>
                  </div>
                </div>
              </div>
            `
                : ""
            }

            ${
              shouldShowFuel
                ? `
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <small class="text-muted">
                    <i class="bi bi-fuel-pump me-1"></i>Fuel
                  </small>
                  <small class="text-muted">${fuelPercentage}%</small>
                </div>
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar ${this.getFuelBarColor(
                    fuelPercentage
                  )}"
                       style="width: ${fuelPercentage}%"></div>
                </div>
              </div>
            `
                : ""
            }

            ${
              !isStorageItem
                ? `
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <small class="text-muted">
                    <i class="bi bi-wrench me-1"></i>Condition
                  </small>
                  <small class="text-muted">${100 - damagePercentage}%</small>
                </div>
                <div class="progress" style="height: 6px;">
                  <div class="progress-bar ${this.getDamageBarColor(
                    damagePercentage
                  )}"
                       style="width: ${100 - damagePercentage}%"></div>
                </div>
              </div>
            `
                : ""
            }

            <div class="mb-2">
              <small class="text-muted d-block mb-1">
                <i class="bi bi-box me-1"></i>Cargo Status
              </small>
              ${fillSummary}
            </div>

            ${
              vehicle.attachedImplementsCount > 0
                ? `
              <div class="mb-2">
                <small class="text-muted">
                  <i class="bi bi-link-45deg me-1"></i>
                  ${vehicle.attachedImplementsCount} implement(s) attached
                </small>
              </div>
            `
                : ""
            }
          </div>

          <div class="card-footer">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                <i class="bi bi-geo-alt me-1"></i>
                ${Math.round(vehicle.position?.x || 0)}, ${Math.round(
      vehicle.position?.z || 0
    )}
              </small>
              <div>
                <span class="badge ${this.getVehicleTypeBadge(
                  vehicle.vehicleType,
                  vehicle.typeName
                )}">
                  ${vehicle.typeName || vehicle.vehicleType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getVehicleIcon(vehicleType, typeName = "") {
    // More specific icons based on vehicle type and typeName
    const typeNameLower = typeName.toLowerCase();

    // Check specific type names first for more accurate icons
    if (
      typeNameLower.includes("locomotive") ||
      typeNameLower.includes("train")
    ) {
      return "bi-train-front";
    } else if (
      typeNameLower.includes("telehandler") ||
      typeNameLower.includes("teleHandler")
    ) {
      return "bi-ladder";
    } else if (
      typeNameLower.includes("excavator") ||
      typeNameLower.includes("forestryexcavator")
    ) {
      return "bi-cone-striped";
    } else if (
      typeNameLower.includes("car") ||
      typeNameLower.includes("pickup")
    ) {
      return "bi-car-front";
    } else if (
      typeNameLower.includes("washer") ||
      typeNameLower.includes("pressure")
    ) {
      return "bi-droplet";
    } else if (
      typeNameLower.includes("pallet") ||
      typeNameLower.includes("bigbag")
    ) {
      return "bi-box";
    } else if (
      typeNameLower.includes("trailer") &&
      typeNameLower.includes("train")
    ) {
      return "bi-train-freight-front";
    }

    // Fallback to general vehicle type icons
    const icons = {
      motorized: "bi-truck",
      tractor: "bi-truck",
      trailer: "bi-box-seam",
      harvester: "bi-scissors",
      cultivator: "bi-gear-wide-connected",
      implement: "bi-wrench",
      unknown: "bi-question-circle",
    };
    return icons[vehicleType] || icons.unknown;
  }

  getFuelBarColor(percentage) {
    if (percentage > 75) return "bg-success";
    if (percentage > 25) return "bg-warning";
    return "bg-danger";
  }

  getDamageBarColor(damagePercentage) {
    if (damagePercentage > 50) return "bg-danger";
    if (damagePercentage > 20) return "bg-warning";
    return "bg-success";
  }

  // Helper function to check if a vehicle is a storage item (pallet/bigBag)
  isStorageItem(vehicle) {
    if (!vehicle || !vehicle.typeName) return false;
    const typeName = vehicle.typeName.toLowerCase();
    const isStorage = (
      typeName.includes("pallet") ||
      typeName.includes("bigbag") ||
      typeName.includes("big bag")
    );
    
    if (isStorage) {
      console.log(`[Vehicle Filter] Hiding storage item: ${vehicle.name} (${vehicle.typeName})`);
    }
    
    return isStorage;
  }

  getVehicleTypeBadge(vehicleType, typeName = "") {
    const typeNameLower = typeName.toLowerCase();

    // More specific badges based on typeName
    if (
      typeNameLower.includes("locomotive") ||
      typeNameLower.includes("train")
    ) {
      return "bg-primary";
    } else if (typeNameLower.includes("telehandler")) {
      return "bg-warning";
    } else if (
      typeNameLower.includes("excavator") ||
      typeNameLower.includes("forestry")
    ) {
      return "bg-danger";
    } else if (
      typeNameLower.includes("car") ||
      typeNameLower.includes("pickup")
    ) {
      return "bg-info";
    } else if (
      typeNameLower.includes("pallet") ||
      typeNameLower.includes("bigbag")
    ) {
      return "bg-light text-dark";
    } else if (
      typeNameLower.includes("washer") ||
      typeNameLower.includes("pressure")
    ) {
      return "bg-info";
    }

    // Fallback to general vehicle type badges
    const badges = {
      motorized: "bg-success",
      tractor: "bg-success",
      trailer: "bg-secondary",
      harvester: "bg-warning",
      cultivator: "bg-primary",
      implement: "bg-secondary",
      unknown: "bg-dark",
    };
    return badges[vehicleType] || badges.unknown;
  }

  toggleVehicleFilters() {
    const panel = document.getElementById("vehicle-filters-panel");
    const button = document.getElementById("vehicle-filter-toggle-btn");

    if (panel && button) {
      const isHidden = panel.classList.contains("d-none");
      if (isHidden) {
        panel.classList.remove("d-none");
        button.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Filters';
      } else {
        panel.classList.add("d-none");
        button.innerHTML = '<i class="bi bi-chevron-down"></i> Show Filters';
      }
    }
  }

  applyVehicleFilters() {
    const typeFilter =
      document.getElementById("vehicle-type-filter")?.value || "";
    const fuelFilter =
      document.getElementById("vehicle-fuel-filter")?.value || "";
    const statusFilter =
      document.getElementById("vehicle-status-filter")?.value || "";

    // Start by filtering to only show player-owned vehicles (ownerFarmId: 1) and exclude storage items
    let filteredVehicles = [...(this.vehicles || [])].filter(
      (v) => v.ownerFarmId === 1 && !this.isStorageItem(v)
    );

    // Apply type filter with improved matching
    if (typeFilter) {
      filteredVehicles = filteredVehicles.filter((v) => {
        const vehicleType = v.vehicleType || "unknown";

        // Direct match first
        if (vehicleType === typeFilter) {
          return true;
        }

        // Handle legacy/alternative mappings
        if (typeFilter === "tractor" && vehicleType === "motorized") {
          // Identify tractors within motorized vehicles
          const brandName =
            typeof v.brand === "object"
              ? v.brand.title || v.brand.name
              : v.brand;
          const typeName = v.typeName || "";
          return (
            typeName.toLowerCase().includes("tractor") ||
            brandName?.toLowerCase().includes("john deere") ||
            brandName?.toLowerCase().includes("johndeere") ||
            brandName?.toLowerCase().includes("mccormick")
          );
        }

        return false;
      });

      console.log(
        `[Filter] Applied type filter "${typeFilter}", found ${filteredVehicles.length} vehicles`
      );
    }

    // Apply fuel filter
    if (fuelFilter) {
      filteredVehicles = filteredVehicles.filter((v) => {
        // Skip fuel calculations for vehicles that don't use traditional fuel
        const skipFuelTypes = ["highPressureWasher", "High Pressure Washer"];
        if (!v.isMotorized || skipFuelTypes.includes(v.typeName)) {
          return fuelFilter === "empty"; // High pressure washers are considered "empty" for filtering
        }

        if (v.fuelCapacity === 0) return fuelFilter === "empty";
        const fuelPercentage = (v.fuelLevel / v.fuelCapacity) * 100;

        switch (fuelFilter) {
          case "empty":
            return fuelPercentage === 0;
          case "low":
            return fuelPercentage > 0 && fuelPercentage < 25;
          case "medium":
            return fuelPercentage >= 25 && fuelPercentage <= 75;
          case "full":
            return fuelPercentage > 75;
          default:
            return true;
        }
      });
    }

    // Apply status filter
    if (statusFilter) {
      filteredVehicles = filteredVehicles.filter((v) => {
        switch (statusFilter) {
          case "active":
            return v.engineOn || v.speed > 0;
          case "inactive":
            return !v.engineOn && v.speed === 0;
          case "damaged":
            return v.damage > 0.1;
          default:
            return true;
        }
      });
    }

    this.renderVehicleCards(filteredVehicles);
  }

  filterVehiclesBySummaryCard(filterType) {
    // Reset all filters first
    document.getElementById("vehicle-type-filter").value = "";
    document.getElementById("vehicle-fuel-filter").value = "";
    document.getElementById("vehicle-status-filter").value = "";

    // Apply the specific filter based on the summary card clicked, excluding storage items
    let filteredVehicles = [...(this.vehicles || [])].filter(
      (v) => !this.isStorageItem(v)
    );

    switch (filterType) {
      case "all":
        // Show all vehicles (no additional filtering needed)
        break;

      case "low-fuel":
        filteredVehicles = filteredVehicles.filter((v) => {
          // Skip fuel calculations for vehicles that don't use traditional fuel
          const skipFuelTypes = ["highPressureWasher", "High Pressure Washer"];
          if (!v.isMotorized || skipFuelTypes.includes(v.typeName))
            return false;

          // Check fuel from multiple sources like in summary cards
          let fuelPercentage = 0;
          if (v.fuelCapacity > 0 && v.fuelLevel > 0) {
            fuelPercentage = (v.fuelLevel / v.fuelCapacity) * 100;
          } else if (v.fillLevels && v.fillLevels["DIESEL"]) {
            const diesel = v.fillLevels["DIESEL"];
            fuelPercentage =
              diesel.capacity > 0 ? (diesel.level / diesel.capacity) * 100 : 0;
          }

          return fuelPercentage < 25;
        });

        // Update the fuel filter dropdown to show what's selected
        document.getElementById("vehicle-fuel-filter").value = "low";
        break;

      case "damaged":
        filteredVehicles = filteredVehicles.filter((v) => v.damage > 0.2);

        // Update the status filter dropdown to show what's selected
        document.getElementById("vehicle-status-filter").value = "damaged";
        break;
    }

    console.log(
      `[SummaryCardFilter] Applied filter "${filterType}", showing ${filteredVehicles.length} vehicles`
    );
    this.renderVehicleCards(filteredVehicles);

    // Scroll to the vehicles grid
    const vehiclesGrid = document.getElementById("vehicles-grid");
    if (vehiclesGrid) {
      vehiclesGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  showVehicleImage(imageUrl, vehicleName, brandName) {
    // Set modal content
    const modalImage = document.getElementById("vehicleModalImage");
    const modalTitle = document.getElementById("vehicleModalTitle");
    const modalInfo = document.getElementById("vehicleModalInfo");

    if (modalImage && modalTitle) {
      modalImage.src = imageUrl;
      modalImage.alt = vehicleName;
      modalTitle.textContent = vehicleName;

      if (modalInfo) {
        modalInfo.innerHTML = `
          <i class="bi bi-info-circle me-1"></i>
          ${
            brandName && brandName !== "Unknown" ? `${brandName} - ` : ""
          }${vehicleName}
        `;
      }
    }

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("vehicleImageModal")
    );
    modal.show();
  }

  // Field Management Methods
  async loadFields() {
    try {
      const response = await fetch(`${this.apiUrl}/api/fields`);

      if (!response.ok) {
        // Handle 404 and 503 differently - these usually mean data isn't ready yet
        if (response.status === 404 || response.status === 503) {
          this.showFieldsWaitingState();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const allFields = await response.json();

      // Filter to only show owned fields
      this.fields = allFields.filter((field) => field.isOwned === true);

      // Clear any retry interval since we successfully loaded data
      if (this.fieldRetryInterval) {
        clearInterval(this.fieldRetryInterval);
        this.fieldRetryInterval = null;
      }

      this.updateFieldsList();
      this.updateFieldStats();
    } catch (error) {
      console.error("[Fields] Error loading fields:", error);
      this.showFieldsErrorState(error);
    }
  }

  showFieldsWaitingState() {
    document.getElementById("fields-list").innerHTML = `
      <div class="col-12 text-center p-5">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <h5 class="text-muted mb-2">Waiting for Field Data</h5>
        <p class="text-muted mb-3">Make sure Farming Simulator 25 is running with the FarmDashboard mod enabled.</p>
        <small class="text-muted">Field data will appear automatically once available.</small>
      </div>
    `;

    // Set up periodic retry every 3 seconds when in waiting state
    if (!this.fieldRetryInterval) {
      this.fieldRetryInterval = setInterval(() => {
        if (this.currentSection === "fields") {
          this.loadFields();
        } else {
          // Clear interval if user navigated away
          clearInterval(this.fieldRetryInterval);
          this.fieldRetryInterval = null;
        }
      }, 3000);
    }
  }

  showFieldsErrorState(error) {
    document.getElementById("fields-list").innerHTML = `
      <div class="col-12 text-center p-5">
        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
        <h5 class="text-warning mt-3">Connection Error</h5>
        <p class="text-muted">Unable to connect to the game data server.</p>
        <button class="btn btn-primary" onclick="dashboard.loadFields()">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }

  updateFieldStats() {
    if (!this.fields || this.fields.length === 0) {
      document.getElementById("total-fields-count").textContent = "0";
      document.getElementById("total-area").textContent = "0";
      document.getElementById("fields-need-work").textContent = "0";
      document.getElementById("fields-harvest-ready").textContent = "0";
      return;
    }

    const totalArea = this.fields.reduce(
      (sum, field) => sum + (field.hectares || 0),
      0
    );
    const needsWork = this.fields.filter((f) => f.needsWork).length;
    const harvestReady = this.fields.filter((f) => f.harvestReady).length;

    document.getElementById("total-fields-count").textContent =
      this.fields.length;
    document.getElementById("total-area").textContent = totalArea.toFixed(1);
    document.getElementById("fields-need-work").textContent = needsWork;
    document.getElementById("fields-harvest-ready").textContent = harvestReady;

    // Also update the main dashboard field count
    const fieldCountElement = document.getElementById("field-count");
    if (fieldCountElement) {
      const fieldCount = this.fields.length;
      fieldCountElement.textContent = `${fieldCount} Field${
        fieldCount !== 1 ? "s" : ""
      }`;
    }
  }

  updateFieldsList() {
    const fieldsContainer = document.getElementById("fields-list");

    if (!fieldsContainer) {
      return;
    }

    if (!this.fields || this.fields.length === 0) {
      fieldsContainer.innerHTML = `
        <div class="col-12 text-center p-5">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <p class="mt-3 text-muted">No fields found. Start by purchasing farmland!</p>
        </div>
      `;
      return;
    }

    let fieldsHTML = "";

    this.fields.forEach((field, index) => {
      try {
        const statusBadge = this.getFieldStatusBadge(field);
        const progressBar = this.getFieldProgressBar(field);
        const suggestions = this.getFieldSuggestions(field);
        const conditionIcons = this.getFieldConditionIcons(field);

        fieldsHTML += `
          <div class="col-md-6 col-lg-4 mb-4 field-card"
               data-field-id="${field.id || index}"
               data-crop="${field.fruitType || ""}"
               data-status="${
                 field.harvestReady
                   ? "harvest"
                   : field.needsWork
                   ? "needswork"
                   : (field.growthState || 0) > 0
                   ? "growing"
                   : "empty"
               }">
            <div class="card bg-secondary h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="bi bi-geo-alt-fill text-primary"></i> ${
                    field.name || `Field ${field.id || index + 1}`
                  }
                </h5>
                ${statusBadge}
              </div>
              <div class="card-body">
                <div class="row mb-2">
                  <div class="col-6">
                    <small class="text-muted">Size:</small><br>
                    <strong>${(field.hectares || 0).toFixed(2)} ha</strong>
                  </div>
                  <div class="col-6">
                    <small class="text-muted">Crop:</small><br>
                    <strong>${
                      field.fruitType === "unknown"
                        ? "Not Available"
                        : field.fruitType || "Empty"
                    }</strong>
                  </div>
                </div>

                ${progressBar}

                <div class="mt-3">
                  <small class="text-muted d-block mb-2">Field Conditions:</small>
                  ${conditionIcons}
                </div>

                ${suggestions}
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        console.error(
          `[Fields] Error processing field ${index}:`,
          error,
          field
        );
      }
    });

    fieldsContainer.innerHTML = fieldsHTML;
  }

  getFieldStatusBadge(field) {
    if (!field)
      return '<span class="badge bg-secondary text-white">Unknown</span>';

    if (field.harvestReady) {
      return '<span class="badge bg-success text-white">Ready to Harvest</span>';
    } else if (field.needsWork) {
      return '<span class="badge bg-warning text-dark">Needs Work</span>';
    } else if (field.growthState && field.growthState > 0) {
      return '<span class="badge bg-info text-white">Growing</span>';
    } else {
      return '<span class="badge bg-secondary text-white">Empty</span>';
    }
  }

  getFieldProgressBar(field) {
    if (!field || !field.growthState || field.growthState === 0) {
      return "";
    }

    const percentage = field.growthStatePercentage || 0;
    const barClass = field.harvestReady ? "bg-success" : "bg-info";

    return `
      <div class="mt-2">
        <small class="text-muted">Growth Progress:</small>
        <div class="progress mt-1" style="height: 20px;">
          <div class="progress-bar ${barClass}" role="progressbar"
               style="width: ${percentage}%"
               aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
            ${percentage}%
          </div>
        </div>
      </div>
    `;
  }

  getFieldConditionIcons(field) {
    if (!field) return "";

    const conditions = [];

    // Fertilizer
    const fertLevel = field.fertilizationLevel || 0;
    const fertPercent = (fertLevel / 2) * 100;
    const fertColor =
      fertLevel >= 2 ? "success" : fertLevel >= 1 ? "warning" : "danger";
    conditions.push({
      name: "Fertilizer",
      level: fertLevel,
      max: 2,
      percent: fertPercent,
      color: fertColor,
      icon: "bi-droplet-fill",
      display: `${fertLevel}/2`,
    });

    // Lime
    const limeLevel = field.limeLevel || 0;
    const limePercent = limeLevel >= 1 ? 100 : 0;
    const limeColor = limeLevel >= 1 ? "success" : "danger";
    conditions.push({
      name: "Lime",
      level: limeLevel,
      max: 1,
      percent: limePercent,
      color: limeColor,
      icon: "bi-circle-fill",
      display: limeLevel >= 1 ? "Applied" : "Needed",
    });

    // Plow
    const plowLevel = field.plowLevel || 0;
    const plowPercent = plowLevel >= 1 ? 100 : 0;
    const plowColor = plowLevel >= 1 ? "success" : "warning";
    conditions.push({
      name: "Plowing",
      level: plowLevel,
      max: 1,
      percent: plowPercent,
      color: plowColor,
      icon: "bi-grip-horizontal",
      display: plowLevel >= 1 ? "Done" : "Needed",
    });

    // Weeds
    const weedLevel = field.weedLevel || 0;
    const weedPercent = Math.round(weedLevel * 100);
    const weedColor =
      weedPercent === 0
        ? "secondary"
        : weedLevel > 0.5
        ? "danger"
        : weedLevel > 0.2
        ? "warning"
        : "success";
    conditions.push({
      name: "Weeds",
      level: weedLevel,
      max: 1,
      percent: weedPercent,
      color: weedColor,
      icon: "bi-flower3",
      display: `${weedPercent}%`,
    });

    let html = '<div class="row g-2">';
    conditions.forEach((condition) => {
      html += `
        <div class="col-6">
          <div class="d-flex align-items-center mb-1">
            <i class="bi ${condition.icon} text-${condition.color} me-1"></i>
            <small class="text-muted">${condition.name}:</small>
            <strong class="ms-auto text-${condition.color}">${
        condition.display
      }</strong>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar bg-${condition.color}"
                 style="width: ${
                   condition.name === "Weeds"
                     ? condition.percent === 0
                       ? 100
                       : 100 - condition.percent
                     : condition.percent
                 }%">
            </div>
          </div>
        </div>
      `;
    });
    html += "</div>";

    return html;
  }

  getFieldSuggestions(field) {
    if (!field || !field.suggestions || field.suggestions.length === 0) {
      return "";
    }

    const topSuggestion = field.suggestions[0];
    if (!topSuggestion || !topSuggestion.action) {
      return "";
    }

    const iconClass =
      topSuggestion.type === "harvest"
        ? "bi-basket-fill text-success"
        : topSuggestion.type === "planting"
        ? "bi-seed text-info"
        : topSuggestion.type === "preparation"
        ? "bi-tools text-warning"
        : "bi-wrench text-warning";

    return `
      <div class="mt-3 p-2 bg-dark rounded">
        <small class="text-muted">Suggested Action:</small><br>
        <i class="bi ${iconClass}"></i> <strong>${
      topSuggestion.action
    }</strong><br>
        <small class="text-muted">${
          topSuggestion.reason || "No details available"
        }</small>
      </div>
    `;
  }

  filterFields(filterType, buttonElement = null) {
    const cards = document.querySelectorAll(".field-card");

    // Update button states - find the button that was clicked
    const filterButtons = document.querySelectorAll(".btn-group button");
    filterButtons.forEach((btn) => {
      btn.classList.remove("active");
      if (
        btn.textContent.toLowerCase().includes(filterType) ||
        (filterType === "all" && btn.textContent.toLowerCase().includes("all"))
      ) {
        btn.classList.add("active");
      }
    });

    let visibleCount = 0;
    cards.forEach((card) => {
      const status = card.dataset.status;

      if (filterType === "all") {
        card.style.display = "block";
        visibleCount++;
      } else if (filterType === status) {
        card.style.display = "block";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    console.log("[Fields] Filtered to", visibleCount, "visible fields");
  }

  sortFields(sortType) {
    if (!this.fields) return;

    switch (sortType) {
      case "id":
        this.fields.sort((a, b) => a.id - b.id);
        break;
      case "size":
        this.fields.sort((a, b) => b.hectares - a.hectares);
        break;
      case "crop":
        this.fields.sort((a, b) =>
          (a.fruitType || "ZZZ").localeCompare(b.fruitType || "ZZZ")
        );
        break;
      case "status":
        this.fields.sort((a, b) => {
          // Priority: harvest ready > needs work > growing > empty
          const getPriority = (field) => {
            if (field.harvestReady) return 0;
            if (field.needsWork) return 1;
            if (field.growthState > 0) return 2;
            return 3;
          };
          return getPriority(a) - getPriority(b);
        });
        break;
    }

    this.updateFieldsList();
  }

  searchFields(searchTerm) {
    const cards = document.querySelectorAll(".field-card");
    const term = searchTerm.toLowerCase();

    cards.forEach((card) => {
      const fieldId = card.dataset.fieldId;
      const field = this.fields.find((f) => f.id == fieldId);

      if (!field) {
        card.style.display = "none";
        return;
      }

      const searchableText = `
        ${field.name}
        ${field.fruitType}
        ${field.hectares}
        ${field.harvestReady ? "harvest" : ""}
        ${field.needsWork ? "work" : ""}
      `.toLowerCase();

      if (searchableText.includes(term)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  // Economy Management Methods
  async loadEconomyData() {
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

  showMarketPricesPlaceholder() {
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

  updateFinancialSummary(data) {
    let money = 0;
    let loan = 0;
    let totalPurchases = 0;
    let netWorth = 0;

    // Try to get data from finance collector first (now returns single object)
    if (
      data.finance &&
      typeof data.finance === "object" &&
      Object.keys(data.finance).length > 0
    ) {
      const farmFinance = data.finance;
      money = farmFinance.money || 0;
      loan = farmFinance.loan || 0;
      totalPurchases =
        (farmFinance.vehicles?.totalValue || 0) +
        (farmFinance.buildings?.totalValue || 0) +
        (farmFinance.animals?.totalValue || 0) +
        (farmFinance.land?.totalValue || 0);
      netWorth = farmFinance.netWorth || farmFinance.totalAssets - loan;
    } else {
      // Fallback to basic data structure
      money = data.money || 0;
      loan =
        data.farmInfo && data.farmInfo.length > 1
          ? data.farmInfo[1].loan || 0
          : 0;
      totalPurchases = this.calculateTotalPurchases(data.vehicles || []);
      netWorth = money + totalPurchases - loan;
    }

    document.getElementById("current-money").textContent =
      this.formatCurrency(money);
    document.getElementById("total-purchases").textContent =
      this.formatCurrency(totalPurchases);
    document.getElementById("outstanding-loan").textContent =
      this.formatCurrency(loan);
    document.getElementById("net-worth").textContent =
      this.formatCurrency(netWorth);
  }

  calculateTotalPurchases(vehicles) {
    return vehicles
      .filter((v) => v.ownerFarmId === 1) // Only owned vehicles
      .reduce((total, vehicle) => total + (vehicle.price || 0), 0);
  }

  updatePurchasesList(vehicles) {
    const purchasesContainer = document.getElementById("purchases-list");
    if (!purchasesContainer) return;

    const ownedVehicles = vehicles.filter((v) => v.ownerFarmId === 1);

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

  updateMarketPrices(economyData) {
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

  displayMarketPrices(marketData) {
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
  
  formatCropName(name) {
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
  
  shouldSkipCropName(name) {
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
  
  
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toFixed(0);
    }
  }
  
  searchMarket(searchTerm) {
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
  
  updateSearchResults(searchTerm, cropCards, locationItems) {
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
  
  createPriceCard(name, priceInfo) {
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

  calculateCondition(damage) {
    const condition = Math.max(0, 100 - damage * 100);
    if (condition >= 80) return { text: "Excellent", class: "bg-success" };
    if (condition >= 60) return { text: "Good", class: "bg-info" };
    if (condition >= 40) return { text: "Fair", class: "bg-warning text-dark" };
    return { text: "Poor", class: "bg-danger" };
  }

  getVehicleIcon(type) {
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

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Filter and search methods
  filterPurchases(type) {
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

  sortPurchases(sortBy) {
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

  searchCrops(searchTerm) {
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

  // Test method to debug field loading
  testFields() {
    // Force reload
    this.loadFields();

    // Also test with mock data
    setTimeout(() => {
      this.fields = [
        {
          id: 1,
          name: "Test Field 1",
          hectares: 2.5,
          fruitType: "WHEAT",
          harvestReady: false,
          needsWork: true,
          growthState: 3,
          growthStatePercentage: 60,
          fertilizationLevel: 1,
          limeLevel: 2,
          plowLevel: 1,
          weedLevel: 0.2,
          suggestions: [
            {
              type: "maintenance",
              action: "Apply fertilizer",
              reason: "Low fertilization level",
            },
          ],
        },
      ];
      this.updateFieldsList();
      this.updateFieldStats();
    }, 2000);
  }
}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener("DOMContentLoaded", () => {
  dashboard = new LivestockDashboard();
  window.dashboard = dashboard; // Make dashboard available globally for realtime connector
});
