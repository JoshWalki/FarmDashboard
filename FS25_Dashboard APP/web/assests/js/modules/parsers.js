export function parseFarmsData(xmlContent) {
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

export function proceedWithDataLoading() {
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

export function parsePlaceablesData(xmlContent) {
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

export function parseEnvironmentData(xmlContent) {
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

export function parseRealisticLivestockData(animalSystemXml) {
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

export function updateAnimalLocations(placeablesXml) {
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

export function parseAnimalData(xmlContent) {
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
    const locationInfo = this.locationMap?.get(animalData.id);
    if (locationInfo) {
      animalData.location = locationInfo.building;
      animalData.locationType = locationInfo.type;
    } else {
      // Fallback: try to match by farm ID and animal type
      const farmBuildings = this.farmBuildingMap?.get(animalData.farmId);
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
    if (this.playerAnimalIds?.has(animalData.id) || !this.playerAnimalIds) {
      this.animals.push(animalData);
    } else {
    }
  });

  this.filteredAnimals = [...this.animals];
  const farmName = this.selectedFarm ? this.selectedFarm.name : "All Farms";
}