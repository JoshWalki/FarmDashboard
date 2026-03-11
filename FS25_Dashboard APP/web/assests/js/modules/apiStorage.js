/**
 * API & Storage Module
 * Handles all data fetching and Multi-Server state management
 */

const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.includes('/api/') && !resource.includes('serverId=')) {
        let serverId = window.dashboard ? window.dashboard.activeServerId : localStorage.getItem('dashboard_active_server');
        if (serverId) {
            const separator = resource.includes('?') ? '&' : '?';
            resource = `${resource}${separator}serverId=${serverId}`;
        }
    }
    return originalFetch(resource, config);
};

const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);
    Object.defineProperty(ws, 'onmessage', {
        set: function(func) {
            this._onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    let serverId = window.dashboard ? window.dashboard.activeServerId : localStorage.getItem('dashboard_active_server');
                    if (data.serverId && serverId && data.serverId !== serverId) return; 
                } catch(e) {}
                if (func) func.call(this, event);
            };
        },
        get: function() { return this._onmessage; }
    });
    return ws;
};

export function getAPIBaseURL() {
  return "http://127.0.0.1:8766";
}

export async function loadServersAndTabs() {
    try {
        const apiBaseURL = this.getAPIBaseURL();
        const response = await originalFetch(`${apiBaseURL}/api/servers`);
        
        if (response.ok) {
            this.availableServers = await response.json();
            if (this.availableServers.length > 0) {
                const savedServerId = localStorage.getItem('dashboard_active_server');
                if (savedServerId && this.availableServers.find(s => s.id === savedServerId)) {
                    this.activeServerId = savedServerId;
                } else {
                    this.activeServerId = this.availableServers[0].id;
                    localStorage.setItem('dashboard_active_server', this.activeServerId);
                }
                this.renderServerTabs();
            } else {
                const container = document.getElementById("server-tabs-container");
                if(container) container.innerHTML = '<span class="badge bg-danger">No Servers Found</span>';
            }
        }
    } catch (error) {
        console.error("[API] Error loading servers:", error);
    }
}

export function renderServerTabs() {
    const container = document.getElementById("server-tabs-container");
    if (!container) return;
    
    let html = '<div class="btn-group shadow-sm" role="group">';
    this.availableServers.forEach(server => {
        const isActive = server.id === this.activeServerId ? 'btn-farm-accent text-dark' : 'btn-outline-light';
        html += `<button type="button" class="btn ${isActive} btn-sm fw-bold" onclick="dashboard.switchServer('${server.id}')">
                    <i class="bi bi-hdd-network me-1"></i>${server.name}
                 </button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

export function switchServer(serverId) {
    if (this.activeServerId === serverId) return;
    localStorage.setItem('dashboard_active_server', serverId);
    
    // Fast snappy fade-out
    document.body.style.transition = 'opacity 0.15s ease-in-out';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
        window.location.reload();
    }, 150);
}

export async function checkAPIAvailability() {
  try {
    await this.loadServersAndTabs();
    const apiBaseURL = this.getAPIBaseURL();
    const response = await fetch(`${apiBaseURL}/api/status`);
    if (response.ok) {
      const loaded = await this.tryLoadApiData();
      if (loaded) {
        this.isDataLoaded = true;
        document.getElementById("folder-selection").classList.add("d-none");
        document.getElementById("landing-page").classList.remove("d-none");
        document.getElementById("main-navbar").classList.remove("d-none");
        if (this.updateLandingPageCounts) this.updateLandingPageCounts();
        if (window.location.hash) this.handleHashChange();
        return;
      }
    }
  } catch (error) {}
  this.loadSavedFolder();
}

export async function tryLoadApiData() {
  try {
    if (!this.activeServerId) return false;
    const apiBaseURL = this.getAPIBaseURL();
    const response = await fetch(`${apiBaseURL}/api/data`);
    if (response.ok) {
      const data = await response.json();
      if (data.error) return true; 

      this.fields = data.fields || [];
      this.vehicles = data.vehicles || [];
      this.economy = data.economy || {};
      this.finance = data.finance || {};
      this.weather = data.weather || {};
      this.production = data.production || {};
      this.pastures = data.pastures || [];
      
      this.farms = data.farmInfo || [];
      let savedFarmId = localStorage.getItem(`dashboard_active_farm_${this.activeServerId}`);
      if (savedFarmId && this.farms.find(f => f.id === parseInt(savedFarmId))) {
          this.activeFarmId = parseInt(savedFarmId);
      } else if (this.farms.length > 0) {
          const defaultFarm = this.farms.find(f => f.id > 0) || this.farms[0];
          this.activeFarmId = defaultFarm.id;
      }
      this.renderFarmDropdown();

      if (data.animals && Array.isArray(data.animals) && data.animals.length > 0) {
        const allAnimals = [];
        data.animals.forEach((building) => {
          if (building.animals && Array.isArray(building.animals)) allAnimals.push(...building.animals);
        });
        const uniqueAnimals = [];
        const seenIds = new Set();
        allAnimals.forEach((animal) => {
          if (!seenIds.has(animal.id)) {
            seenIds.add(animal.id);
            uniqueAnimals.push(animal);
          }
        });
        this.animals = uniqueAnimals;
      } else {
        this.animals = [];
      }
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export function setStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; }
}

export function getStorage(key) {
  try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : null; } catch (error) { return null; }
}

export function deleteStorage(key) {
  try { localStorage.removeItem(key); } catch (error) {}
}

export function clearSavedData() {
  if (confirm("Are you sure you want to clear the saved folder data?")) {
    this.deleteStorage("livestockFolderData");
    document.getElementById("folder-path").textContent = "No folder selected";
    const clearBtn = document.getElementById("clear-folder-btn");
    if (clearBtn) clearBtn.classList.add("d-none");
    document.getElementById("folder-selection").classList.remove("d-none");
    document.getElementById("dashboard-content").classList.add("d-none");
    this.animals = [];
    this.filteredAnimals = [];
    this.lastAnimalsDataHash = null;
    if (this.dataTable) { this.dataTable.destroy(); this.dataTable = null; }
  }
}

export function unloadData() {
  if (confirm("Are you sure you want to unload all farm data?")) {
    this.deleteStorage("livestockFolderData");
    document.getElementById("folder-path").textContent = "No folder selected";
    document.getElementById("clear-folder-btn").classList.add("d-none");
    document.getElementById("main-navbar").classList.add("d-none");
    document.getElementById("folder-selection").classList.remove("d-none");
    document.getElementById("landing-page").classList.add("d-none");
    document.getElementById("dashboard-content").classList.add("d-none");
    document.getElementById("section-content").classList.add("d-none");
    this.animals = []; this.filteredAnimals = []; this.lastAnimalsDataHash = null;
    this.placeables = []; this.playerFarms = []; this.selectedFarm = null; this.selectedFarmId = null; this.savedFolderData = null;
    if (this.dataTable) { this.dataTable.destroy(); this.dataTable = null; }
  }
}

export function refreshData() {
  if (!this.savedFolderData) return;
  const modal = new bootstrap.Modal(document.getElementById("refreshDataModal"));
  modal.show();
}

export function confirmRefreshData(useFiles) {
  if (useFiles) {
    this.storeDataForComparison();
    this.isRefreshing = true;
    document.getElementById("folder-input").click();
  } else {
    this.storeDataForComparison();
    const currentSection = this.getCurrentSection();
    this.isRefreshing = true;
    if (this.savedFolderData.farmsData) this.parseFarmsData(this.savedFolderData.farmsData);
    this.tryLoadApiData().then(() => {
      if (!this.animals || this.animals.length === 0) {
        if (this.savedFolderData.xmlData) this.parseRealisticLivestockData(this.savedFolderData.xmlData);
        else if (this.savedFolderData.placeablesData) this.parsePlaceablesData(this.savedFolderData.placeablesData);
      }
      this.updateLandingPageCounts();
      if (currentSection === "livestock") { this.updateSummaryCards(); this.renderAnimalsTable(); }
    });
    if (this.savedFolderData.environmentData) this.parseEnvironmentData(this.savedFolderData.environmentData);
    this.isRefreshing = false;
    try { this.compareDataAndShowChanges(); } catch (comparisonError) { this.preRefreshData = null; }
  }
}

export async function loadSavedFolder() {
  const savedData = this.getStorage("livestockFolderData");
  if (savedData) {
    try {
      this.savedFolderData = savedData;
      document.getElementById("folder-path").textContent = this.savedFolderData.folderName + " (saved)";
      if (this.savedFolderData.xmlData) {
        if (this.savedFolderData.farmsData) this.parseFarmsData(this.savedFolderData.farmsData);
        else {
          if (this.savedFolderData.placeablesData) this.parsePlaceablesData(this.savedFolderData.placeablesData);
          if (this.savedFolderData.environmentData) this.parseEnvironmentData(this.savedFolderData.environmentData);
          this.showDashboard();
        }
        document.getElementById("clear-folder-btn").classList.remove("d-none");
        this.showNavbar();
      }
    } catch (error) { this.deleteStorage("livestockFolderData"); }
  }
}

export async function handleFolderSelection(event) {
  const files = Array.from(event.target.files);
  const animalSystemFile = files.find((file) => file.name === "animalSystem.xml");
  const placeablesFile = files.find((file) => file.name === "placeables.xml");
  const farmsFile = files.find((file) => file.name === "farms.xml");
  const environmentFile = files.find((file) => file.name === "environment.xml");
  if (!animalSystemFile) { alert("animalSystem.xml not found."); return; }
  const folderName = animalSystemFile.webkitRelativePath.split("/")[0];
  document.getElementById("folder-path").textContent = folderName;
  try {
    const xmlContent = await this.readFileAsText(animalSystemFile);
    let placeablesContent = placeablesFile ? await this.readFileAsText(placeablesFile) : null;
    let farmsContent = farmsFile ? await this.readFileAsText(farmsFile) : null;
    let environmentContent = environmentFile ? await this.readFileAsText(environmentFile) : null;
    const folderData = { folderName: folderName, xmlData: xmlContent, placeablesData: placeablesContent, farmsData: farmsContent, environmentData: environmentContent, lastUpdated: new Date().toISOString() };
    this.setStorage("livestockFolderData", folderData);
    this.savedFolderData = folderData;
    const wasRefreshing = this.isRefreshing;
    const currentSection = wasRefreshing ? this.getCurrentSection() : null;
    if (farmsContent) this.parseFarmsData(farmsContent);
    else {
      if (placeablesContent) this.parsePlaceablesData(placeablesContent);
      if (environmentContent) this.parseEnvironmentData(environmentContent);
      if (!wasRefreshing) this.showDashboard();
    }
    document.getElementById("clear-folder-btn").classList.remove("d-none");
    this.showNavbar();
    if (wasRefreshing) {
      this.updateLandingPageCounts();
      if (currentSection === "livestock") { this.updateSummaryCards(); this.renderAnimalsTable(); }
      this.isRefreshing = false;
      if (this.preRefreshData) this.compareDataAndShowChanges();
    }
  } catch (error) { this.isRefreshing = false; this.preRefreshData = null; }
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export function renderFarmDropdown() {
    const container = document.getElementById("farm-dropdown-container");
    if (!container || !this.farms || this.farms.length === 0) return;
    const playerFarms = this.farms.filter(f => f.id > 0);
    if (playerFarms.length === 0) {
        container.classList.remove("d-flex"); container.classList.add("d-none"); return;
    }
    container.classList.remove("d-none"); container.classList.add("d-flex");
    let currentFarm = playerFarms.find(f => f.id === this.activeFarmId) || playerFarms[0];
    let html = `
        <div class="dropdown">
            <button class="btn btn-farm-accent btn-sm dropdown-toggle fw-bold text-dark" type="button" id="farmDropdownBtn" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-house-door me-1"></i>${currentFarm.name}
            </button>
            <ul class="dropdown-menu dropdown-menu-dark shadow border-farm-accent" aria-labelledby="farmDropdownBtn">
    `;
    playerFarms.forEach(farm => {
        const isActive = farm.id === this.activeFarmId ? 'active bg-farm-accent text-dark fw-bold' : '';
        html += `<li><a class="dropdown-item ${isActive}" href="#" onclick="dashboard.switchFarm(${farm.id}, event)">${farm.name}</a></li>`;
    });
    html += `</ul></div>`;
    container.innerHTML = html;
}

export function switchFarm(farmId, event) {
    if (event) event.preventDefault();
    if (this.activeFarmId === farmId) return;
    this.activeFarmId = farmId;
    localStorage.setItem(`dashboard_active_farm_${this.activeServerId}`, farmId);
    this.renderFarmDropdown();

    const sectionContent = document.getElementById("section-content");
    const dashboardContent = document.getElementById("dashboard-content");
    
    // Snappy fade-out 0.15s
    if (sectionContent) { sectionContent.style.transition = 'opacity 0.15s ease-in-out'; sectionContent.style.opacity = '0'; }
    if (dashboardContent) { dashboardContent.style.transition = 'opacity 0.15s ease-in-out'; dashboardContent.style.opacity = '0'; }

    setTimeout(() => {
        const currentSection = this.getCurrentSection ? this.getCurrentSection() : null;
        if (currentSection && currentSection !== 'landing') {
            if(this.showSection) this.showSection(currentSection);
        } else {
            if(this.updateLandingPageCounts) this.updateLandingPageCounts();
        }
        if (sectionContent) sectionContent.style.opacity = '1';
        if (dashboardContent) dashboardContent.style.opacity = '1';
        
        setTimeout(() => {
            if (sectionContent) { sectionContent.style.transition = ''; sectionContent.style.opacity = ''; }
            if (dashboardContent) { dashboardContent.style.transition = ''; dashboardContent.style.opacity = ''; }
        }, 150);
    }, 150);
}