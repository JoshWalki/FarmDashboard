/**
 * Fields Module - Withered/Harvested Integration Build
 * FIXED: Syntax error removed & Filter Buttons updated.
 */

let currentFields = [];

export function showFieldsSection() {
    const fieldsHTML = `
        <div class="row mb-4">
            <div class="col-12 text-center">
                <h2 class="text-farm-accent">
                    <i class="bi bi-geo-alt me-2"></i>
                    Field Management
                </h2>
                <p class="lead text-muted">Monitor your fields, crops, and soil conditions</p>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-farm-primary text-white border-0">
                    <div class="card-body text-center">
                        <h5 class="card-title">Total Fields</h5>
                        <h2 class="display-4" id="total-fields-count">0</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white border-0">
                    <div class="card-body text-center">
                        <h5 class="card-title">Total Area</h5>
                        <h2 class="display-4" id="total-area">0</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white border-0">
                    <div class="card-body text-center">
                        <h5 class="card-title">Needs Work</h5>
                        <h2 class="display-4" id="fields-need-work">0</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white border-0">
                    <div class="card-body text-center">
                        <h5 class="card-title">Harvest Ready</h5>
                        <h2 class="display-4" id="fields-harvest-ready">0</h2>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-6">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary active" onclick="dashboard.filterFields('all')">All</button>
                    <button class="btn btn-outline-success" onclick="dashboard.filterFields('harvest')">Harvest</button>
                    <button class="btn btn-outline-warning" onclick="dashboard.filterFields('needswork')">Needs Work</button>
                    <button class="btn btn-outline-info" onclick="dashboard.filterFields('growing')">Growing</button>
                </div>
            </div>
            <div class="col-md-6">
                <div class="input-group">
                    <span class="input-group-text bg-secondary text-white"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control bg-secondary border-secondary text-white" 
                           id="field-search" placeholder="Search fields..." onkeyup="dashboard.searchFields(this.value)">
                </div>
            </div>
        </div>

        <div class="row" id="fields-list">
            <div class="col-12 text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-3 text-muted">Loading field data...</p>
            </div>
        </div>
    `;

    document.getElementById("section-content").innerHTML = fieldsHTML;
    document.getElementById("section-content").classList.remove("d-none");
    
    loadFields();
}

export async function loadFields() {
    try {
        const apiBaseURL = (window.dashboard && window.dashboard.getAPIBaseURL) 
            ? window.dashboard.getAPIBaseURL() 
            : "http://127.0.0.1:8766";
            
        const response = await fetch(`${apiBaseURL}/api/fields`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        
        let rawFields = Array.isArray(data) ? data : (data.fields || data);
        if (typeof rawFields === 'object' && !Array.isArray(rawFields)) {
            rawFields = Object.values(rawFields);
        }

        currentFields = rawFields.filter((field) => field && field.isOwned === true);

        updateFieldsList();
        updateFieldStats();
    } catch (error) {
        console.error("[Fields] Error loading fields:", error);
    }
}

export function updateFieldStats() {
    if (!Array.isArray(currentFields)) return;

    const totalArea = currentFields.reduce((sum, field) => sum + (field.hectares || 0), 0);
    const needsWork = currentFields.filter((f) => f.needsWork || f.isWithered).length;
    const harvestReady = currentFields.filter((f) => f.harvestReady).length;

    const totalFieldsEl = document.getElementById("total-fields-count");
    const totalAreaEl = document.getElementById("total-area");
    const needsWorkEl = document.getElementById("fields-need-work");
    const harvestReadyEl = document.getElementById("fields-harvest-ready");

    if (totalFieldsEl) totalFieldsEl.textContent = currentFields.length;
    if (totalAreaEl) totalAreaEl.textContent = totalArea.toFixed(1);
    if (needsWorkEl) needsWorkEl.textContent = needsWork;
    if (harvestReadyEl) harvestReadyEl.textContent = harvestReady;
}

export function updateFieldsList() {
    const container = document.getElementById("fields-list");
    if (!container) return;

    if (!Array.isArray(currentFields)) {
        if (currentFields && typeof currentFields === 'object') {
            currentFields = Object.values(currentFields);
        } else {
            currentFields = [];
        }
    }

    if (currentFields.length === 0) {
        container.innerHTML = '<div class="col-12 text-center p-5 text-muted">No owned fields found.</div>';
        return;
    }

    let html = "";
    currentFields.forEach((field) => {
        const statusBadge = getFieldStatusBadge(field);
        const progressBar = getFieldProgressBar(field);
        const conditionIcons = getFieldConditionIcons(field);
        const suggestions = getFieldSuggestions(field);

        html += `
            <div class="col-md-6 col-lg-4 mb-4 field-card" data-status="${field.harvestReady ? 'harvest' : ((field.needsWork || field.isWithered) ? 'needswork' : (field.growthState > 0 ? 'growing' : 'empty'))}">
                <div class="card bg-secondary h-100 shadow-sm">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-geo-alt-fill text-primary"></i> ${field.name || 'Field ' + field.id}</h5>
                        ${statusBadge}
                    </div>
                    <div class="card-body">
                        <div class="row mb-2">
                            <div class="col-6"><small class="text-muted">Area:</small><br><strong>${(field.hectares || 0).toFixed(2)} ha</strong></div>
                            <div class="col-6"><small class="text-muted">Crop:</small><br><strong>${field.fruitType || "Empty"}</strong></div>
                        </div>
                        ${progressBar}
                        <div class="mt-3">${conditionIcons}</div>
                        ${suggestions}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

export function getFieldProgressBar(field) {
    if (field.isWithered) {
        return `
            <div class="mt-2">
                <div class="progress mt-1" style="height: 20px; background-color: #2c2c2c;">
                    <div class="progress-bar" style="width: 100%; background-color: #8b0000; color: white; font-weight: bold;">
                        Withered
                    </div>
                </div>
            </div>`;
    }
    
    if (field.isHarvested) {
        return `
            <div class="mt-2">
                <div class="progress mt-1" style="height: 20px; background-color: #2c2c2c;">
                    <div class="progress-bar" style="width: 100%; background-color: #a1887f; color: white; font-weight: bold;">
                        Harvested / Cut
                    </div>
                </div>
            </div>`;
    }

    if (!field.growthState || field.growthState === 0) {
        return `
            <div class="mt-2">
                <div class="progress mt-1" style="height: 20px; background-color: #2c2c2c;">
                    <div class="progress-bar" style="width: 100%; background-color: #6d4c41; color: white; font-weight: bold;">Empty / Cultivated</div>
                </div>
            </div>`;
    }

    const percentage = field.growthStatePercentage || 0;
    const maxState = field.maxGrowthState || 1;
    const curState = field.growthState || 1;
    
    let color = "";
    let text = "";
    let textColor = "white";

    if (field.harvestReady) {
        color = "#ff9800"; 
        text = "Ready to Harvest";
        textColor = "black";
    } else {
        text = `Stage ${curState}/${maxState}`;
        
        if (percentage < 25) {
            color = "#58b4e5"; 
            textColor = "black";
        } else if (percentage < 50) {
            color = "#8ce258"; 
            textColor = "black";
        } else if (percentage < 80) {
            color = "#59b52a"; 
        } else {
            color = "#327411"; 
        }
    }

    return `
        <div class="mt-2">
            <div class="progress mt-1" style="height: 20px; background-color: #2c2c2c;">
                <div class="progress-bar" style="width: ${field.harvestReady ? 100 : percentage}%; background-color: ${color}; color: ${textColor}; font-weight: bold;">
                    ${text}
                </div>
            </div>
        </div>`;
}

export function getFieldConditionIcons(field) {
    const nRatio = field.targetNitrogen > 0 ? (field.nitrogenLevel / field.targetNitrogen) : 0;
    let nColor = "#6c757d"; 
    let nProgress = 0;
    
    if (field.isPrecisionFarming && field.isScanned) {
        nProgress = Math.min(100, nRatio * 100);
        if (nRatio < 0.25) nColor = "#dc3545"; 
        else if (nRatio < 0.60) nColor = "#fd7e14"; 
        else if (nRatio < 0.90) nColor = "#ffc107"; 
        else if (nRatio <= 1.10) nColor = "#198754"; 
        else if (nRatio <= 1.30) nColor = "#0dcaf0"; 
        else nColor = "#0d6efd"; 
    } else if (!field.isPrecisionFarming) {
        nProgress = (field.fertilizationLevel / 2) * 100;
        nColor = field.fertilizationLevel === 0 ? "#dc3545" : field.fertilizationLevel === 1 ? "#ffc107" : "#198754";
    }

    const phRatio = field.targetPh > 0 ? (field.phValue / field.targetPh) : 0;
    let phColor = "#6c757d"; 
    let phProgress = 0;

    if (field.isPrecisionFarming && field.isScanned) {
        phProgress = Math.min(100, (field.phValue / 7.5) * 100);
        if (phRatio < 0.80) phColor = "#dc3545"; 
        else if (phRatio < 0.90) phColor = "#fd7e14"; 
        else if (phRatio < 0.98) phColor = "#ffc107"; 
        else if (phRatio <= 1.05) phColor = "#198754"; 
        else if (phRatio <= 1.15) phColor = "#0dcaf0"; 
        else phColor = "#0d6efd"; 
    } else if (!field.isPrecisionFarming) {
        phProgress = field.needsLime ? 0 : 100;
        phColor = field.needsLime ? "#dc3545" : "#198754";
    }

    return `
        <div class="row g-2">
            <div class="col-6">
                <small class="text-muted">Nitrogen</small><br>
                <strong style="color: ${nColor}; font-size: 0.8rem;">${field.nitrogenText || '0 kg/ha'}</strong>
                <div class="progress" style="height: 4px; background: #2c2c2c;">
                    <div class="progress-bar" style="width: ${nProgress}%; background-color: ${nColor} !important;"></div>
                </div>
            </div>
            <div class="col-6">
                <small class="text-muted">pH Level</small><br>
                <strong style="color: ${phColor}; font-size: 0.8rem;">${field.limeText || '6.0 pH'}</strong>
                <div class="progress" style="height: 4px; background: #2c2c2c;">
                    <div class="progress-bar" style="width: ${phProgress}%; background-color: ${phColor} !important;"></div>
                </div>
            </div>
        </div>`;
}

export function getFieldStatusBadge(field) {
    if (field.isWithered) return '<span class="badge bg-danger text-white">Withered</span>';
    if (field.isHarvested) return '<span class="badge" style="background-color: #8d6e63; color: white;">Harvested</span>';
    if (field.harvestReady) return '<span class="badge" style="background-color: #ff9800; color: black;">Ready</span>';
    if (field.needsWork) return '<span class="badge bg-warning text-dark">Needs Work</span>';
    if (field.growthState > 0) return '<span class="badge bg-info text-dark">Growing</span>';
    return '<span class="badge bg-dark border border-secondary">Empty</span>';
}

// FIXED: Added check for valid suggestion data
export function getFieldSuggestions(field) {
    if (!field.suggestions || !Array.isArray(field.suggestions) || field.suggestions.length === 0) return "";
    
    const top = field.suggestions[0];
    if (!top || !top.action) return ""; // Final check to prevent crash

    return `
        <div class="mt-3 p-2 bg-dark rounded border-start border-warning border-3">
            <small class="text-muted d-block">Recommended Action:</small>
            <span class="text-warning fw-bold" style="font-size: 0.85rem;">
                <i class="bi bi-tools me-1"></i>${top.action}
            </span>
            ${top.reason ? `<span class="d-block text-light small mt-1 opacity-75"><i class="bi bi-info-circle me-1"></i>${top.reason}</span>` : ''}
        </div>`;
}

export function filterFields(type) {
    const cards = document.querySelectorAll(".field-card");
    const buttons = document.querySelectorAll('[onclick^="dashboard.filterFields"]');
    
    // Safely remove active class from all buttons
    buttons.forEach(b => b.classList.remove("active"));
    
    // Set active class safely without crashing
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add("active");
    }

    cards.forEach(card => {
        if (type === 'all' || card.dataset.status === type) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

export function searchFields(term) {
    const query = term.toLowerCase();
    document.querySelectorAll(".field-card").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? "block" : "none";
    });
}

export function showFieldsErrorState() {}