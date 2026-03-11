export function updateMilkValues() {
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

export function showPasturesSection() {
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

export function parsePastureData() {
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

export function calculateBirthWarnings(animals) {
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

export function calculateConditionReport(animals, husbandryData) {
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
export function hashCode(str) {
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
export function seededRandom(seed) {
  let currentSeed = seed;
  return function () {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

export function calculateMilkProduction(pasture, animals) {
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

export function calculateFoodReport(husbandryData) {
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

export function estimatePastureCapacity(filename) {
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

export function calculateAllPastureWarnings(pasture, animals, conditionReport, foodReport) {
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

export function showWarningDetails(pastureId, warningIndex) {
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

export function getCapacitySource(pasture) {
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

export function getCapacityCalculationMethod(pasture) {
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

export function hasFencing(pasture) {
  // This would ideally check if the pasture was created with fence calculation
  // For now, we'll use a heuristic based on capacity values
  const filename = pasture.filename || "";
  const estimatedCapacity = this.estimatePastureCapacity(filename);
  return pasture.capacity && pasture.capacity !== estimatedCapacity;
}

export function getWarningTypeTitle(type) {
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

export function updatePastureDisplay() {
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

export function renderPasturesList() {
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

export function showPastureDetails(pastureId) {
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

export function showPastureLivestock(pastureId) {
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

export function showAllPastureLivestock() {
  // Combine all animals from all pastures
  const allAnimals = this.pastures.flatMap((pasture) => pasture.animals);
  this.renderPastureLivestockTable(allAnimals, "All Pasture Livestock");
  const modal = new bootstrap.Modal(
    document.getElementById("pasturelivestock-modal")
  );
  modal.show();
}

export function renderPastureLivestockTable(animals, title) {
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