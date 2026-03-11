export function storeDataForComparison() {
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
export function normalizeNumericValue(value) {
  if (value === null || value === undefined || value === "") return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

export function normalizeBooleanValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  return Boolean(value);
}

export function normalizeStringValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function compareDataAndShowChanges() {
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

export function calculateDataChanges() {
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

export function hasSignificantChanges(changes) {
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

export function compareLivestock(oldAnimals, newAnimals) {
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

export function compareWarnings(oldPastures, newPastures) {
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

export function compareFoodLevels(oldPastures, newPastures) {
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

export function compareStatistics(oldData, newData) {
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

export function displayChangesModal(changes) {
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

export function displayNoChangesModal(changes) {
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

export function populateChangesSummary(changes) {
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

export function populateLivestockChanges(livestockChanges) {
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

export function populateWarningsChanges(warningsChanges) {
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

export function populateStatisticsChanges(stats, gameTime) {
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

export function showChangeToasts(changes) {
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