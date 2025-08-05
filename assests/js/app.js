class LivestockDashboard {
  constructor() {
    this.animals = [];
    this.filteredAnimals = [];
    this.savedFolderData = null;
    this.dataTable = null;
    this.placeables = [];
    this.pastures = [];
    this.playerFarms = [];
    this.selectedFarm = null;
    this.selectedFarmId = null;
    this.gameTime = null;
    this.activeFilters = {};
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabs();
    this.setupURLRouting();
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

    if (!this.savedFolderData) {
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

      if (this.savedFolderData.placeablesData) {
        this.parsePlaceablesData(this.savedFolderData.placeablesData);
      }

      if (this.savedFolderData.environmentData) {
        this.parseEnvironmentData(this.savedFolderData.environmentData);
      }

      // Update landing page data (always safe to update)
      this.updateLandingPageCounts();

      // Only refresh section-specific data if we're currently viewing that section
      if (currentSection === "livestock") {
        this.updateSummaryCards();
        this.renderAnimalsTable();
      }

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

  showInfoMessage(message) {
    this.showAlert(message, "info");
  }

  showSuccessMessage(message) {
    this.showAlert(message, "success");
  }

  storeDataForComparison() {
    // Store current data state for comparison after refresh - deep copy to prevent reference issues
    this.preRefreshData = {
      animals: this.animals ? JSON.parse(JSON.stringify(this.animals)) : [],
      pastures: this.pastures ? JSON.parse(JSON.stringify(this.pastures)) : [],
      playerFarms: this.playerFarms ? JSON.parse(JSON.stringify(this.playerFarms)) : [],
      gameTime: this.gameTime,
      timestamp: new Date().toISOString()
    };
  }

  // Data normalization helpers to prevent false positives from parsing inconsistencies
  normalizeNumericValue(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  normalizeBooleanValue(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
  }

  normalizeStringValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  compareDataAndShowChanges() {
    if (!this.preRefreshData) {
      return; // No comparison data available
    }

    const changes = this.calculateDataChanges();
    
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
      gameTime: this.gameTime
    };

    const changes = {
      livestock: this.compareLivestock(oldData.animals, newData.animals),
      warnings: this.compareWarnings(oldData.pastures, newData.pastures),
      statistics: this.compareStatistics(oldData, newData),
      gameTime: {
        old: oldData.gameTime,
        new: newData.gameTime,
        changed: oldData.gameTime !== newData.gameTime
      },
      refreshTime: new Date().toISOString()
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
      changes.gameTime.changed ||
      changes.statistics.livestockCount.changed ||
      changes.statistics.pastureCount.changed
    );
  }

  compareLivestock(oldAnimals, newAnimals) {
    // Defensive coding - ensure arrays exist and have id property
    if (!Array.isArray(oldAnimals)) oldAnimals = [];
    if (!Array.isArray(newAnimals)) newAnimals = [];
    
    const oldMap = new Map(oldAnimals.filter(a => a && a.id).map(animal => [animal.id, animal]));
    const newMap = new Map(newAnimals.filter(a => a && a.id).map(animal => [animal.id, animal]));

    const added = newAnimals.filter(animal => animal && animal.id && !oldMap.has(animal.id));
    const removed = oldAnimals.filter(animal => animal && animal.id && !newMap.has(animal.id));
    const updated = [];

    // Check for updates in existing animals
    newAnimals.forEach(newAnimal => {
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
            new: Math.round(newHealth) 
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
            new: Math.round(newAge * 100) / 100 
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
        const oldLocation = this.normalizeStringValue(oldAnimal.pastureId || oldAnimal.location);
        const newLocation = this.normalizeStringValue(newAnimal.pastureId || newAnimal.location);
        if (oldLocation !== newLocation && (oldLocation || newLocation)) {
          changes.location = { 
            old: oldLocation || 'Free roaming', 
            new: newLocation || 'Free roaming' 
          };
        }

        // Only add to updated list if there are meaningful changes
        if (Object.keys(changes).length > 0) {
          updated.push({
            animal: newAnimal,
            changes: changes
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
    
    const oldWarnings = oldPastures.flatMap(p => 
      (p && p.allWarnings && Array.isArray(p.allWarnings)) ? 
        p.allWarnings.map(w => ({ 
          ...w, 
          pastureId: p.id || 'unknown',
          pastureName: p.name || 'Unknown Pasture'
        })) : []
    );
    const newWarnings = newPastures.flatMap(p => 
      (p && p.allWarnings && Array.isArray(p.allWarnings)) ? 
        p.allWarnings.map(w => ({ 
          ...w, 
          pastureId: p.id || 'unknown',
          pastureName: p.name || 'Unknown Pasture'
        })) : []
    );

    // More robust comparison - normalize warning messages and include warning type
    const normalizeWarning = (w) => {
      const message = w.message || w.text || w.toString();
      const type = w.type || 'general';
      return `${w.pastureId}-${type}-${message.toLowerCase().trim()}`;
    };

    const oldWarningStrings = new Set(oldWarnings.map(normalizeWarning));
    const newWarningStrings = new Set(newWarnings.map(normalizeWarning));

    const newWarningsList = newWarnings.filter(w => 
      !oldWarningStrings.has(normalizeWarning(w))
    );
    const resolvedWarningsList = oldWarnings.filter(w => 
      !newWarningStrings.has(normalizeWarning(w))
    );

    return {
      new: newWarningsList,
      resolved: resolvedWarningsList,
      total: { old: oldWarnings.length, new: newWarnings.length }
    };
  }

  compareStatistics(oldData, newData) {
    return {
      livestockCount: {
        old: oldData.animals.length,
        new: newData.animals.length,
        changed: oldData.animals.length !== newData.animals.length
      },
      pastureCount: {
        old: oldData.pastures.length,
        new: newData.pastures.length,
        changed: oldData.pastures.length !== newData.pastures.length
      },
      farmsCount: {
        old: oldData.playerFarms.length,
        new: newData.playerFarms.length,
        changed: oldData.playerFarms.length !== newData.playerFarms.length
      }
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
    const modal = new bootstrap.Modal(document.getElementById('dataChangesModal'));
    modal.show();
  }

  displayNoChangesModal(changes) {
    // Populate summary cards with zeros
    const summaryContainer = document.getElementById('changesSummaryCards');
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
    document.getElementById('livestockChangesContent').innerHTML = 
      '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No livestock changes detected.</div>';
    
    document.getElementById('warningsChangesContent').innerHTML = 
      '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No warning changes detected.</div>';

    // Show game time if it exists, or no changes message
    const container = document.getElementById('statisticsChangesContent');
    let content = '';
    
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
      content = '<div class="text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i>No statistics changes detected.</div>';
    }
    
    container.innerHTML = content;
  }

  populateChangesSummary(changes) {
    const summaryContainer = document.getElementById('changesSummaryCards');
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
    const container = document.getElementById('livestockChangesContent');
    let content = '';

    // New animals
    if (livestockChanges.added.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-success"><i class="bi bi-plus-circle me-1"></i>New Animals (${livestockChanges.added.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.added.forEach(animal => {
        const displayName = this.formatAnimalType(animal.subType);
        content += `
          <li class="list-group-item bg-farm-success bg-opacity-10 border-farm-success">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || 'Unnamed'}</strong> - ${displayName}
                <br><small class="text-muted">Age: ${animal.age} months, Health: ${animal.health}%</small>
                ${animal.isPregnant ? '<br><small class="text-warning">🤰 Pregnant</small>' : ''}
                ${animal.isLactating ? '<br><small class="text-info">🥛 Lactating</small>' : ''}
              </div>
              <span class="badge bg-success">NEW</span>
            </div>
          </li>
        `;
      });
      content += '</ul></div>';
    }

    // Removed animals
    if (livestockChanges.removed.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-danger"><i class="bi bi-dash-circle me-1"></i>Removed Animals (${livestockChanges.removed.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.removed.forEach(animal => {
        const displayName = this.formatAnimalType(animal.subType);
        content += `
          <li class="list-group-item bg-farm-danger bg-opacity-10 border-farm-danger">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || 'Unnamed'}</strong> - ${displayName}
                <br><small class="text-muted">Age: ${animal.age} months, Health: ${animal.health}%</small>
              </div>
              <span class="badge bg-danger">REMOVED</span>
            </div>
          </li>
        `;
      });
      content += '</ul></div>';
    }

    // Updated animals
    if (livestockChanges.updated.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-warning"><i class="bi bi-arrow-repeat me-1"></i>Updated Animals (${livestockChanges.updated.length})</h6>
          <ul class="list-group">
      `;
      livestockChanges.updated.forEach(update => {
        const animal = update.animal;
        const changes = update.changes;
        const displayName = this.formatAnimalType(animal.subType);
        
        let changesList = [];
        Object.keys(changes).forEach(key => {
          const change = changes[key];
          let label = key.charAt(0).toUpperCase() + key.slice(1);
          if (key === 'pregnancy') label = 'Pregnancy';
          if (key === 'lactating') label = 'Lactating';
          
          changesList.push(`${label}: ${change.old} → ${change.new}`);
        });

        content += `
          <li class="list-group-item bg-farm-warning bg-opacity-10 border-farm-warning">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${animal.name || 'Unnamed'}</strong> - ${displayName}
                <br><small class="text-muted">${changesList.join(', ')}</small>
              </div>
              <span class="badge bg-warning text-dark">UPDATED</span>
            </div>
          </li>
        `;
      });
      content += '</ul></div>';
    }

    if (content === '') {
      content = '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No livestock changes detected.</div>';
    }

    container.innerHTML = content;
  }

  populateWarningsChanges(warningsChanges) {
    const container = document.getElementById('warningsChangesContent');
    let content = '';

    // New warnings
    if (warningsChanges.new.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-danger"><i class="bi bi-exclamation-triangle me-1"></i>New Warnings (${warningsChanges.new.length})</h6>
      `;
      warningsChanges.new.forEach(warning => {
        // Try to find the actual pasture name from current pastures
        const pasture = this.pastures.find(p => p.id === warning.pastureId);
        const pastureName = pasture ? pasture.name : `Pasture ${warning.pastureId}`;
        
        content += `
          <div class="alert alert-warning mb-2">
            <strong>${pastureName}:</strong> ${warning.message || warning.text || warning}
          </div>
        `;
      });
      content += '</div>';
    }

    // Resolved warnings
    if (warningsChanges.resolved.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-success"><i class="bi bi-check-circle me-1"></i>Resolved Warnings (${warningsChanges.resolved.length})</h6>
      `;
      warningsChanges.resolved.forEach(warning => {
        // Try to find the actual pasture name from current pastures
        const pasture = this.pastures.find(p => p.id === warning.pastureId);
        const pastureName = pasture ? pasture.name : `Pasture ${warning.pastureId}`;
        
        content += `
          <div class="alert alert-success mb-2">
            <strong>${pastureName}:</strong> ${warning.message || warning.text || warning}
          </div>
        `;
      });
      content += '</div>';
    }

    if (content === '') {
      content = '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No warning changes detected.</div>';
    }

    container.innerHTML = content;
  }

  populateStatisticsChanges(stats, gameTime) {
    const container = document.getElementById('statisticsChangesContent');
    let content = '';

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
        label: 'Livestock Count',
        old: stats.livestockCount.old,
        new: stats.livestockCount.new
      });
    }
    if (stats.pastureCount.changed) {
      statChanges.push({
        label: 'Pasture Count',
        old: stats.pastureCount.old,
        new: stats.pastureCount.new
      });
    }
    if (stats.farmsCount.changed) {
      statChanges.push({
        label: 'Farms Count',
        old: stats.farmsCount.old,
        new: stats.farmsCount.new
      });
    }

    if (statChanges.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-farm-accent"><i class="bi bi-graph-up me-1"></i>Statistics Changes</h6>
          <div class="row">
      `;
      statChanges.forEach(stat => {
        const changeType = stat.new > stat.old ? 'success' : 'danger';
        const icon = stat.new > stat.old ? 'arrow-up' : 'arrow-down';
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
      content += '</div></div>';
    }

    if (content === '') {
      content = '<div class="text-center text-muted"><i class="bi bi-info-circle me-1"></i>No statistics changes detected.</div>';
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
            throw new Error("Failed to parse placeables.xml: " + parseError.message);
          }
        }
        if (environmentContent) {
          try {
            this.parseEnvironmentData(environmentContent);
          } catch (parseError) {
            console.error("Error parsing environment data:", parseError);
            throw new Error("Failed to parse environment.xml: " + parseError.message);
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
    } catch (error) {
      console.error("Error in handleFolderSelection:", error);
      console.error("Error stack:", error.stack);
      
      // Provide more specific error messages
      let errorMessage = "Error processing save data: ";
      if (error.name === "SyntaxError") {
        errorMessage += "Invalid XML file format. Please check your save files.";
      } else if (error.message && error.message.includes("storage")) {
        errorMessage += "Unable to save data to browser storage. File may be too large.";
      } else if (error.message && error.message.includes("comparison")) {
        errorMessage += "Error comparing data changes. Data processed successfully.";
        // Still continue with the process if it's just a comparison error
        this.preRefreshData = null; // Clear comparison data
        return;
      } else {
        errorMessage += error.message || "Unknown error occurred. Please try again.";
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
    // No need to parse animalSystem.xml - all data comes from placeables

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

          animals.forEach((animal) => {
            const animalId = animal.getAttribute("id");
            const animalName =
              animal.getAttribute("name") || `Animal #${animalId}`;
            const animalSubType = animal.getAttribute("subType") || "Unknown";

            if (animalId) {
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
    if (!this.gameTime) {
      // Check if environment.xml wasn't found or parsed
      if (!this.savedFolderData?.environmentData) {
        return "Time: environment.xml not found";
      }
      return "Time: Unable to parse environment data";
    }
    return `Day ${this.gameTime.currentDay} - ${this.formatGameTime(
      this.gameTime.dayTime
    )}`;
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
    document.getElementById("folder-selection").classList.add("d-none");
    document.getElementById("landing-page").classList.remove("d-none");
    this.showNavbar(); // Make sure navbar is visible
    this.updateLandingPageCounts();
    this.updateNavbar();

    // Handle any URL hash navigation after data is loaded
    this.handleHashChange();
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

    // TODO: Update other counts when we implement those sections
    document.getElementById("vehicle-count").textContent = "Coming Soon";
    document.getElementById("field-count").textContent = "Coming Soon";

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
    document.getElementById("section-content").innerHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-truck me-2"></i>
                        Vehicle Management
                    </h2>
                    <p class="lead text-muted">Coming soon - Vehicle fleet management and maintenance tracking</p>
                </div>
            </div>
        `;
    document.getElementById("section-content").classList.remove("d-none");
  }

  showFieldsSection() {
    document.getElementById("section-content").innerHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-geo-alt me-2"></i>
                        Field Management
                    </h2>
                    <p class="lead text-muted">Coming soon - Crop monitoring and field management</p>
                </div>
            </div>
        `;
    document.getElementById("section-content").classList.remove("d-none");
  }

  showEconomySection() {
    document.getElementById("section-content").innerHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-graph-up me-2"></i>
                        Economic Dashboard
                    </h2>
                    <p class="lead text-muted">Coming soon - Market prices and financial analytics</p>
                </div>
            </div>
        `;
    document.getElementById("section-content").classList.remove("d-none");
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

            <!-- Livestock Data Table Modal -->
            <div class="modal fade" id="pasturelivestock-modal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header border-bottom border-secondary">
                            <h5 class="modal-title" id="pastureModal-title">
                                <i class="bi bi-table me-2"></i>Pasture Livestock
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="pasture-livestock-table-container">
                                <!-- Table will be populated here -->
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

    // First try to use placeables data if available
    if (this.placeables && this.placeables.length > 0) {
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
                ).toFixed(1)
              : 0;

          // Check for birth warnings (pregnant animals due within 1 month)
          const birthWarnings = this.calculateBirthWarnings(pastureAnimals);

          // Check for condition reports
          const conditionReport = this.calculateConditionReport(pastureAnimals);

          // Food availability (mock data - would need to be parsed from XML if available)
          const foodReport = this.calculateFoodReport(placeable);

          // Calculate all warnings for this pasture
          const allWarnings = this.calculateAllPastureWarnings(
            placeable,
            pastureAnimals,
            conditionReport,
            foodReport
          );

          const pastureData = {
            id: placeable.uniqueId,
            name: placeable.name,
            animals: pastureAnimals,
            animalCount: pastureAnimals.length,
            avgHealth: parseFloat(avgHealth),
            birthWarnings: birthWarnings,
            conditionReport: conditionReport,
            foodReport: foodReport,
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
              ).toFixed(1)
            : 0;

        // Check for birth warnings (pregnant animals due within 1 month)
        const birthWarnings = this.calculateBirthWarnings(pastureAnimals);

        // Check for condition reports
        const conditionReport = this.calculateConditionReport(pastureAnimals);

        // Food availability (mock data - would need to be parsed from XML if available)
        const foodReport = this.calculateFoodReport(locationData);

        // Calculate all warnings for this pasture
        const allWarnings = this.calculateAllPastureWarnings(
          locationData,
          pastureAnimals,
          conditionReport,
          foodReport
        );

        const pastureData = {
          id: locationData.uniqueId,
          name: locationData.name,
          animals: pastureAnimals,
          animalCount: pastureAnimals.length,
          avgHealth: parseFloat(avgHealth),
          birthWarnings: birthWarnings,
          conditionReport: conditionReport,
          foodReport: foodReport,
          allWarnings: allWarnings,
          farmId: locationData.farmId || "Unknown",
          capacity: this.estimatePastureCapacity(locationData.name),
        };

        this.pastures.push(pastureData);
      });
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

  calculateConditionReport(animals) {
    // Calculate productivity, milk, straw, manure based on animal data
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
    };
  }

  calculateFoodReport(placeable) {
    // Mock food data - in a real implementation, this would be parsed from placeable XML
    // These values would need to be extracted from the placeable's food storage data
    return {
      totalCapacity: 1000, // Would be parsed from XML
      totalMixedRation: Math.floor(Math.random() * 500), // Mock data
      hay: Math.floor(Math.random() * 300),
      silage: Math.floor(Math.random() * 400),
      grass: Math.floor(Math.random() * 200),
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
      // Based on real game data analysis: adjusting density to match actual game values
      // User reported: app shows 181, game shows 289 → ratio of 1.597
      // Adjusting: 0.01 * 1.597 = 0.01597 ≈ 0.016
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

  calculateAllPastureWarnings(pasture, animals, conditionReport, foodReport) {
    const warnings = [];

    // 1. Capacity Warning (>90% full)
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

    // 2. Low Food Warning (<20% of any food type)
    const foodTypes = ["totalMixedRation", "hay", "silage", "grass"];
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

    // 3. Health Warnings (animals with health < 70%)
    const sickAnimals = animals.filter((a) => a.health < 70);
    if (sickAnimals.length > 0) {
      const criticalAnimals = sickAnimals.filter((a) => a.health < 20);
      warnings.push({
        type: "health",
        severity: criticalAnimals.length > 0 ? "danger" : "warning",
        message: `${sickAnimals.length} sick animals (${criticalAnimals.length} critical)`,
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

    // 5. Manure Warning (high production needs collection)
    if (conditionReport.manure > animals.length * 2) {
      warnings.push({
        type: "maintenance",
        severity: "warning",
        message: `High manure production: ${conditionReport.manure} units/day`,
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
          message: `Breeding ratio: 1 male to ${ratio.toFixed(0)} females`,
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
                            ${animal.health.toFixed(1)}%
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
                            ).toFixed(0)}% (${animal.health.toFixed(
      1
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
                        <strong>Final Value:</strong>
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
    };
    return titles[type] || "Warning";
  }

  updatePastureDisplay() {
    if (!this.pastures) {
      this.parsePastureData();
    }

    // Update summary cards
    const totalPastures = this.pastures.length;
    const totalLivestock = this.pastures.reduce(
      (sum, pasture) => sum + pasture.animalCount,
      0
    );
    const totalBirthWarnings = this.pastures.reduce(
      (sum, pasture) => sum + pasture.birthWarnings.length,
      0
    );
    const totalAllWarnings = this.pastures.reduce(
      (sum, pasture) => sum + pasture.allWarnings.length,
      0
    );
    const avgHealth =
      totalLivestock > 0
        ? (
            this.pastures.reduce(
              (sum, pasture) => sum + pasture.avgHealth * pasture.animalCount,
              0
            ) / totalLivestock
          ).toFixed(1)
        : 0;

    document.getElementById("total-pastures-count").textContent = totalPastures;
    document.getElementById("pasture-livestock-count").textContent =
      totalLivestock;
    document.getElementById("birth-warnings-count").textContent =
      totalBirthWarnings;
    document.getElementById("pasture-avg-health").textContent = avgHealth + "%";

    // Update pastures list
    this.renderPasturesList();

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
                    <h6 class="mb-0">
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
                                <span><strong>Animals:</strong> ${
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
                                <i class="bi bi-exclamation-triangle me-2 text-farm-warning"></i>
                                <span><strong>All Warnings:</strong> ${
                                  pasture.allWarnings.length
                                }</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-speedometer2 me-2 text-farm-info"></i>
                                <span><strong>Productivity:</strong> ${
                                  pasture.conditionReport.productivity
                                }%</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-droplet me-2 text-primary"></i>
                                <span><strong>Milk:</strong> ${
                                  pasture.conditionReport.milk
                                }L/day</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-recycle me-2 text-warning"></i>
                                <span><strong>Manure:</strong> ${
                                  pasture.conditionReport.manure
                                }/day</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-basket me-2 text-success"></i>
                                <span><strong>Food Capacity:</strong> ${
                                  pasture.foodReport.totalCapacity
                                }L</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-menu-up me-2 text-muted"></i>
                                <span><strong>Mixed Ration:</strong> ${
                                  pasture.foodReport.totalMixedRation
                                }L</span>
                            </div>
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
    const pasture = this.pastures.find((p) => p.id === pastureId);
    if (!pasture) return;

    // Create detailed pasture modal
    const modalHTML = `
            <div class="modal fade" id="pasture-details-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header border-bottom border-secondary">
                            <h5 class="modal-title">
                                <i class="bi bi-house-door me-2"></i>${pasture.name} - Details
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card bg-secondary">
                                        <div class="card-header">
                                            <h6 class="mb-0">Condition Report</h6>
                                        </div>
                                        <div class="card-body">
                                            <table class="table table-sm table-borderless table-dark">
                                                <tr><td>Productivity:</td><td>${pasture.conditionReport.productivity}%</td></tr>
                                                <tr><td>Milk Production:</td><td>${pasture.conditionReport.milk}L/day</td></tr>
                                                <tr><td>Straw Consumption:</td><td>${pasture.conditionReport.straw}/day</td></tr>
                                                <tr><td>Manure Production:</td><td>${pasture.conditionReport.manure}/day</td></tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card bg-secondary">
                                        <div class="card-header">
                                            <h6 class="mb-0">Food Availability</h6>
                                        </div>
                                        <div class="card-body">
                                            <table class="table table-sm table-borderless table-dark">
                                                <tr><td>Total Capacity:</td><td>${pasture.foodReport.totalCapacity}L</td></tr>
                                                <tr><td>Mixed Ration:</td><td>${pasture.foodReport.totalMixedRation}L</td></tr>
                                                <tr><td>Hay:</td><td>${pasture.foodReport.hay}L</td></tr>
                                                <tr><td>Silage:</td><td>${pasture.foodReport.silage}L</td></tr>
                                                <tr><td>Grass:</td><td>${pasture.foodReport.grass}L</td></tr>
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
                                            <p><strong>Total Animals:</strong> ${pasture.animalCount}</p>
                                            <p><strong>Average Health:</strong> ${pasture.avgHealth}%</p>
                                            <p><strong>Birth Warnings:</strong> ${pasture.birthWarnings.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
    const pasture = this.pastures.find((p) => p.id === pastureId);
    if (!pasture) return;

    this.renderPastureLivestockTable(
      pasture.animals,
      `${pasture.name} Livestock`
    );
    const modal = new bootstrap.Modal(
      document.getElementById("pasturelivestock-modal")
    );
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
                            <th>Name</th>
                            <th>Type</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Health</th>
                            <th>Weight</th>
                            <th>Reproduction</th>
                            <th>Status</th>
                            <th>Location</th>
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
                                    <td>${
                                      animal.name || `Animal #${animal.id}`
                                    }</td>
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
                                    <td>${this.formatLocation(
                                      animal.location,
                                      animal.locationType
                                    )}</td>
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

  updateSummaryCards() {
    const totalCount = this.animals.length;
    const lactatingCount = this.animals.filter((a) => a.isLactating).length;
    const pregnantCount = this.animals.filter((a) => a.isPregnant).length;
    const avgHealth =
      totalCount > 0
        ? (
            this.animals.reduce((sum, a) => sum + a.health, 0) / totalCount
          ).toFixed(1)
        : 0;

    document.getElementById("total-count").textContent = totalCount;
    document.getElementById("lactating-count").textContent = lactatingCount;
    document.getElementById("pregnant-count").textContent = pregnantCount;
    document.getElementById("avg-health").textContent = avgHealth + "%";
  }

  renderAnimalsTable() {
    // Destroy existing DataTable if it exists
    if (this.dataTable) {
      this.dataTable.destroy();
    }

    // Prepare data for DataTables
    const tableData = this.animals.map((animal) => {
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
                    <span>${animal.health.toFixed(1)}%</span>
                </div>
            `;

      return [
        `<code class="text-muted">${animal.id}</code>`,
        `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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

    // Clear existing table body
    document.getElementById("animals-tbody").innerHTML = "";

    // Initialize DataTable (removed built-in export buttons)
    this.dataTable = $("#animals-table").DataTable({
      data: tableData,
      pageLength: 25,
      responsive: true,
      order: [[1, "asc"]], // Sort by name by default (now column 1)
      columnDefs: [
        {
          targets: [0], // ID column - smaller width
          width: "80px",
        },
        {
          targets: [5], // Health column (shifted by 1)
          orderable: false,
        },
        {
          targets: [8], // Status column (shifted by 1)
          orderable: false,
        },
        {
          targets: [10], // Actions column (shifted by 1)
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
    const animal = this.animals.find((a) => a.id === animalId);
    if (!animal) {
      console.error("Animal not found:", animalId);
      return;
    }

    const modalTitle = document.getElementById("animalDetailsModalLabel");
    const modalContent = document.getElementById("animalDetailsContent");

    modalTitle.innerHTML = `<i class="bi bi-clipboard-data me-2"></i>${
      animal.name || `Animal #${animal.id}`
    }`;

    // Create comprehensive animal details
    const detailsHTML = `
            <div class="row">
                <div class="col-md-4">
                    <!-- Livestock Tag Section -->
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-tag-fill me-2"></i>ID Tag</h6>
                        </div>
                        <div class="card-body text-center">
                            <div class="livestock-tag">
                                <img src="assests/img/tag.png" alt="Livestock Tag" />
                                <div class="tag-id">${animal.id}</div>
                            </div>
                            <small class="text-muted mt-2 d-block">Farm ID: ${
                              animal.id
                            }</small>
                        </div>
                    </div>
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
                                        <tr><td><strong>ID:</strong></td><td>${
                                          animal.id
                                        }</td></tr>
                                        <tr><td><strong>Type:</strong></td><td>${this.formatAnimalType(
                                          animal.subType
                                        )}</td></tr>
                                        <tr><td><strong>Gender:</strong></td><td>${this.capitalize(
                                          animal.gender
                                        )}</td></tr>
                                        <tr><td><strong>Age:</strong></td><td>${
                                          animal.age
                                        } months</td></tr>
                                        <tr><td><strong>Variation:</strong></td><td>${
                                          animal.variation
                                        }</td></tr>
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
                                        <tr><td><strong>Health:</strong></td><td>${animal.health.toFixed(
                                          1
                                        )}%</td></tr>
                                        <tr><td><strong>Weight:</strong></td><td>${animal.weight.toFixed(
                                          1
                                        )} kg</td></tr>
                                        <tr><td><strong>Reproduction:</strong></td><td>${(
                                          animal.reproduction * 100
                                        ).toFixed(1)}%</td></tr>
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
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-heart me-2"></i>Reproduction Status</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        <tr><td><strong>Parent:</strong></td><td>${
                                          animal.isParent ? "Yes" : "No"
                                        }</td></tr>
                                        <tr><td><strong>Pregnant:</strong></td><td>${
                                          animal.isPregnant ? "Yes" : "No"
                                        }</td></tr>
                                        <tr><td><strong>Lactating:</strong></td><td>${
                                          animal.isLactating ? "Yes" : "No"
                                        }</td></tr>
                                        <tr><td><strong>Since Last Birth:</strong></td><td>${
                                          animal.monthsSinceLastBirth
                                        } months</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        ${
                                          animal.isPregnant
                                            ? this.getPregnancyDetails(animal)
                                            : ""
                                        }
                                        <tr><td><strong>Mother ID:</strong></td><td>${
                                          animal.motherId !== "-1"
                                            ? animal.motherId
                                            : "Unknown"
                                        }</td></tr>
                                        <tr><td><strong>Father ID:</strong></td><td>${
                                          animal.fatherId !== "-1"
                                            ? animal.fatherId
                                            : "Unknown"
                                        }</td></tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Location & Farm</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Location:</strong></td><td>${
                                  animal.location
                                }</td></tr>
                                <tr><td><strong>Location Type:</strong></td><td>${
                                  animal.locationType
                                }</td></tr>
                                <tr><td><strong>Farm ID:</strong></td><td>${
                                  animal.farmId
                                }</td></tr>
                            </table>
                        </div>
                    </div>
                </div>

                ${
                  animal.genetics
                    ? `
                <div class="col-md-6">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-dna me-2"></i>Genetics</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Metabolism:</strong></td><td>${animal.genetics.metabolism.toFixed(
                                  2
                                )}x</td></tr>
                                <tr><td><strong>Quality:</strong></td><td>${animal.genetics.quality.toFixed(
                                  2
                                )}x</td></tr>
                                <tr><td><strong>Health:</strong></td><td>${animal.genetics.health.toFixed(
                                  2
                                )}x</td></tr>
                                <tr><td><strong>Fertility:</strong></td><td>${animal.genetics.fertility.toFixed(
                                  2
                                )}x</td></tr>
                                <tr><td><strong>Productivity:</strong></td><td>${animal.genetics.productivity.toFixed(
                                  2
                                )}x</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                `
                    : ""
                }
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
      Health: `${animal.health.toFixed(1)}%`,
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
                        <span>${animal.health.toFixed(1)}%</span>
                    </div>
                `;

        return [
          `<code class="text-muted">${animal.id}</code>`,
          `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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
      if (!animal.genetics) return false;

      const healthPercent = animal.health;
      // Convert genetics multipliers (0.0-2.0+) to percentage scale (0-200%) for filtering
      const metabolismPercent = animal.genetics.metabolism * 100;
      const fertilityPercent = animal.genetics.fertility * 100;
      const qualityPercent = animal.genetics.quality * 100;
      const productivityPercent = animal.genetics.productivity * 100;

      return (
        healthPercent >= filters.healthMin &&
        healthPercent <= filters.healthMax &&
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
                    <span>${animal.health.toFixed(1)}%</span>
                </div>
            `;

      return [
        `<code class="text-muted">${animal.id}</code>`,
        `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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
}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener("DOMContentLoaded", () => {
  dashboard = new LivestockDashboard();
});
