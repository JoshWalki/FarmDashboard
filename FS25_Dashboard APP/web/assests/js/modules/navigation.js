export function setupEventListeners() {
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

export function setupURLRouting() {
  // Handle hash change events for navigation
  window.addEventListener("hashchange", () => {
    this.handleHashChange();
  });

  // Handle initial load with hash
  if (window.location.hash) {
    this.handleHashChange();
  }
}

export function handleHashChange() {
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

export function setupTabs() {
  // Bootstrap handles tab switching automatically, no custom code needed
}

export function switchTab(tabName) {
  // Bootstrap handles this automatically with data-bs-toggle="pill"
}

export function showNavbar() {
  document.getElementById("main-navbar").classList.remove("d-none");
  this.updateNavbar();
}

export function hideNavbar() {
  document.getElementById("main-navbar").classList.add("d-none");
}

export function updateNavbar() {
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

export function getCurrentSection() {
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

export function showInfoMessage(message) {
  this.showAlert(message, "info");
}

export function showSuccessMessage(message) {
  this.showAlert(message, "success");
}

export function showAlert(message, type) {
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

export function showDashboard() {
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

export function updateLandingPageCounts() {
  // Update livestock count
  const livestockCount = this.animals ? this.animals.length : 0;
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

export function showLanding() {
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

export function showSection(sectionName) {
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

export function showFarmSelectionModal() {
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

export function selectFarm(farm) {
  this.selectedFarm = farm;
  this.selectedFarmId = farm.internalId;

  // Update the dropdown selector and proceed with data loading
  this.populateFarmSelector();
  this.proceedWithDataLoading();
}

export function populateFarmSelector() {
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