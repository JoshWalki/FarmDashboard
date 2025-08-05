class LivestockDashboard {
    constructor() {
        this.animals = [];
        this.filteredAnimals = [];
        this.savedFolderData = null;
        this.dataTable = null;
        this.placeables = [];
        this.playerFarms = [];
        this.selectedFarm = null;
        this.selectedFarmId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.loadSavedFolder();
    }

    // Storage utility functions (using localStorage for larger capacity)
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    deleteStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error deleting from localStorage:', error);
        }
    }

    setupEventListeners() {
        const folderInput = document.getElementById('folder-input');
        const clearFolderBtn = document.getElementById('clear-folder-btn');

        folderInput.addEventListener('change', (e) => this.handleFolderSelection(e));
        clearFolderBtn.addEventListener('click', () => this.clearSavedData());
    }

    clearSavedData() {
        if (confirm('Are you sure you want to clear the saved folder data?')) {
            this.deleteStorage('livestockFolderData');
            document.getElementById('folder-path').textContent = 'No folder selected';
            document.getElementById('clear-folder-btn').classList.add('d-none');
            document.getElementById('folder-selection').classList.remove('d-none');
            document.getElementById('dashboard-content').classList.add('d-none');
            this.animals = [];
            this.filteredAnimals = [];
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }
            this.showSuccessMessage('Saved folder data cleared successfully!');
        }
    }

    async loadSavedFolder() {
        const savedData = this.getStorage('livestockFolderData');
        if (savedData) {
            try {
                this.savedFolderData = savedData;
                document.getElementById('folder-path').textContent = this.savedFolderData.folderName + ' (saved)';

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
                        this.showDashboard();
                    }
                    document.getElementById('clear-folder-btn').classList.remove('d-none');
                    this.showSuccessMessage('Previous folder data loaded successfully!');
                }
            } catch (error) {
                console.error('Error loading saved folder data:', error);
                this.deleteStorage('livestockFolderData');
            }
        }
    }

    showInfoMessage(message) {
        this.showAlert(message, 'info');
    }

    showSuccessMessage(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-fixed`;
        alertDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, type === 'success' ? 3000 : 4000);
    }

    setupTabs() {
        // Bootstrap handles tab switching automatically, no custom code needed
    }

    switchTab(tabName) {
        // Bootstrap handles this automatically with data-bs-toggle="pill"
    }

    async handleFolderSelection(event) {
        const files = Array.from(event.target.files);
        const animalSystemFile = files.find(file => file.name === 'animalSystem.xml');
        const placeablesFile = files.find(file => file.name === 'placeables.xml');
        const farmsFile = files.find(file => file.name === 'farms.xml');

        if (!animalSystemFile) {
            alert('animalSystem.xml not found in selected folder. Please select a valid save folder.');
            return;
        }

        const folderName = animalSystemFile.webkitRelativePath.split('/')[0];
        document.getElementById('folder-path').textContent = folderName;

        try {
            const xmlContent = await this.readFileAsText(animalSystemFile);
            let placeablesContent = null;
            let farmsContent = null;

            if (placeablesFile) {
                placeablesContent = await this.readFileAsText(placeablesFile);
            }

            if (farmsFile) {
                farmsContent = await this.readFileAsText(farmsFile);
            }

            // Save folder data to localStorage (much larger capacity than cookies)
            const folderData = {
                folderName: folderName,
                xmlData: xmlContent,
                placeablesData: placeablesContent,
                farmsData: farmsContent,
                lastUpdated: new Date().toISOString()
            };

            if (this.setStorage('livestockFolderData', folderData)) {
                this.showSuccessMessage('Folder data saved! It will auto-load on refresh.');
            } else {
                this.showInfoMessage('Data loaded but could not be saved (too large for storage).');
            }

            // Store the folder data for later processing
            this.savedFolderData = folderData;

            if (farmsContent) {
                this.parseFarmsData(farmsContent);
                // Farm parsing will handle showing modal or proceeding directly
            } else {
                // No farms data - proceed with placeables data only
                if (placeablesContent) {
                    this.parsePlaceablesData(placeablesContent);
                }
                this.showDashboard();
            }
            document.getElementById('clear-folder-btn').classList.remove('d-none');
        } catch (error) {
            console.error('Error reading animal data:', error);
            alert('Error reading animal data. Please check the file format.');
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
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.error('XML parsing error in farms:', parseError.textContent);
            return;
        }

        const farmElements = xmlDoc.querySelectorAll('farm');
        this.playerFarms = [];

        farmElements.forEach(farm => {
            const farmId = farm.getAttribute('farmId');
            const farmName = farm.getAttribute('name') || `Farm ${farmId}`;

            // Check if this farm has players (indicating it's a player farm)
            const players = farm.querySelector('players');
            if (players && players.children.length > 0) {
                // Get the internal farm ID from statistics
                const statisticsElement = farm.querySelector('statistics');
                let internalFarmId = farmId;
                if (statisticsElement) {
                    const farmIdElement = statisticsElement.querySelector('farmId');
                    if (farmIdElement) {
                        internalFarmId = farmIdElement.textContent;
                    }
                }

                this.playerFarms.push({
                    id: farmId, // External farm ID (used by placeables)
                    internalId: internalFarmId, // Internal farm ID (used by animals)
                    name: farmName,
                    isDefault: this.playerFarms.length === 0 // First farm is default
                });
            }
        });

        // Set the default selected farm (first player farm)
        if (this.playerFarms.length > 0) {
            this.selectedFarm = this.playerFarms[0]; // Store the entire farm object
            this.selectedFarmId = this.playerFarms[0].internalId; // Keep for backward compatibility
        }

        console.log(`Found ${this.playerFarms.length} player farms:`, this.playerFarms);
        console.log(`Selected farm ID: ${this.selectedFarmId}`);

        // Proceed directly with data loading since we no longer need farm selection
        this.proceedWithDataLoading();
    }

    showFarmSelectionModal() {
        const farmList = document.getElementById('farm-selection-list');
        farmList.innerHTML = '';

        this.playerFarms.forEach((farm, index) => {
            const farmOption = document.createElement('button');
            farmOption.className = `list-group-item list-group-item-action bg-secondary text-light d-flex justify-content-between align-items-center`;
            farmOption.innerHTML = `
                <div>
                    <h6 class="mb-1">${farm.name}</h6>
                    <small class="text-muted">Farm ID: ${farm.id} (Internal: ${farm.internalId})</small>
                </div>
                <i class="bi bi-arrow-right"></i>
            `;

            farmOption.addEventListener('click', () => {
                this.selectFarm(farm);
                const modal = bootstrap.Modal.getInstance(document.getElementById('farmSelectionModal'));
                modal.hide();
            });

            farmList.appendChild(farmOption);
        });

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('farmSelectionModal'));
        modal.show();
    }

    selectFarm(farm) {
        this.selectedFarm = farm;
        this.selectedFarmId = farm.internalId;
        console.log(`Farm selected: ${farm.name} (Internal: ${farm.internalId}, External: ${farm.id})`);

        // Update the dropdown selector and proceed with data loading
        this.populateFarmSelector();
        this.proceedWithDataLoading();
    }

    proceedWithDataLoading() {
        // Parse placeables data which contains all the animal data we need
        if (this.savedFolderData.placeablesData) {
            this.parsePlaceablesData(this.savedFolderData.placeablesData);
        }
        // No need to parse animalSystem.xml - all data comes from placeables
        this.showDashboard();
    }

    populateFarmSelector() {
        const farmSelect = document.getElementById('farm-select');
        const farmSelector = document.getElementById('farm-selector');

        if (this.playerFarms.length > 0) {
            // Always show farm selector when farms are available
            farmSelector.style.display = 'block';
            farmSelect.innerHTML = '';

            this.playerFarms.forEach(farm => {
                const option = document.createElement('option');
                option.value = farm.internalId;
                option.textContent = farm.name;
                option.selected = farm.internalId === this.selectedFarmId;
                farmSelect.appendChild(option);
            });
        } else {
            farmSelector.style.display = 'none';
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
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.error('XML parsing error in placeables:', parseError.textContent);
            return;
        }

        const placeableElements = xmlDoc.querySelectorAll('placeable');
        this.placeables = [];
        this.animals = []; // Reset animals array - we'll populate it from placeables
        let totalAnimalsInBuildings = 0;

        placeableElements.forEach(placeable => {
            const uniqueId = placeable.getAttribute('uniqueId') || '';
            const name = placeable.getAttribute('name') || '';
            const farmId = placeable.getAttribute('farmId') || '';
            const filename = placeable.getAttribute('filename') || '';

            // Check if this is a livestock building (has husbandryAnimals section)
            const husbandryAnimals = placeable.querySelector('husbandryAnimals');
            if (husbandryAnimals) {
                console.log(`\n=== LIVESTOCK BUILDING FOUND ===`);
                console.log(`Building Name: "${name}"`);
                console.log(`UniqueId: "${uniqueId}"`);
                console.log(`Filename: "${filename}"`);
                console.log(`Building Farm ID: "${farmId}"`);
                console.log(`Selected Farm: "${this.selectedFarm?.name}" (External: ${this.selectedFarm?.id})`);

                // Only process buildings that belong to the selected player farm
                const selectedExternalFarmId = this.selectedFarm?.id;
                if (String(farmId) !== String(selectedExternalFarmId)) {
                    console.log(`⚠️ Skipping AI-owned building "${name}" (Farm ID: ${farmId} vs Player: ${selectedExternalFarmId})`);
                    return;
                }

                console.log(`✓ Processing player-owned building: "${name}"`);

                // Parse all animals from clusters within husbandryAnimals
                const clusters = husbandryAnimals.querySelectorAll('clusters');
                let buildingAnimalCount = 0;

                clusters.forEach((cluster, clusterIndex) => {
                    const animals = cluster.querySelectorAll('animal');
                    console.log(`  Cluster ${clusterIndex + 1}: Found ${animals.length} animals`);

                    animals.forEach(animal => {
                        const animalId = animal.getAttribute('id');
                        const animalName = animal.getAttribute('name') || 'Unnamed';
                        const animalSubType = animal.getAttribute('subType') || 'Unknown';

                        if (animalId) {
                            // Use the placeable's name as the building name
                            const buildingName = name || 'Livestock Building';

                            // Create the full animal data object directly from placeables.xml
                            const animalData = {
                                id: animalId,
                                name: animalName,
                                age: parseInt(animal.getAttribute('age')) || 0,
                                health: parseFloat(animal.getAttribute('health')) || 0,
                                monthsSinceLastBirth: parseInt(animal.getAttribute('monthsSinceLastBirth')) || 0,
                                gender: animal.getAttribute('gender') || 'Unknown',
                                subType: animalSubType,
                                reproduction: parseFloat(animal.getAttribute('reproduction')) || 0,
                                isParent: animal.getAttribute('isParent') === 'true',
                                isPregnant: animal.getAttribute('isPregnant') === 'true',
                                isLactating: animal.getAttribute('isLactating') === 'true',
                                farmId: animal.getAttribute('farmId') || 'Unknown',
                                motherId: animal.getAttribute('motherId') || '-1',
                                fatherId: animal.getAttribute('fatherId') || '-1',
                                weight: parseFloat(animal.getAttribute('weight')) || 0,
                                variation: parseInt(animal.getAttribute('variation')) || 1,
                                location: buildingName,
                                locationType: 'Livestock Building',
                                type: animalSubType.split('_')[0], // Extract animal type (COW, PIG, etc.)
                                genetics: null
                            };

                            // Parse genetics data if available
                            const geneticsElement = animal.querySelector('genetics');
                            if (geneticsElement) {
                                animalData.genetics = {
                                    metabolism: parseFloat(geneticsElement.getAttribute('metabolism')) || 0,
                                    quality: parseFloat(geneticsElement.getAttribute('quality')) || 0,
                                    health: parseFloat(geneticsElement.getAttribute('health')) || 0,
                                    fertility: parseFloat(geneticsElement.getAttribute('fertility')) || 0,
                                    productivity: parseFloat(geneticsElement.getAttribute('productivity')) || 0
                                };
                            }

                            // Add directly to animals array
                            this.animals.push(animalData);
                            buildingAnimalCount++;
                            totalAnimalsInBuildings++;

                            console.log(`    ✓ Animal: ${animalName} (${animalId}) - ${animalSubType} in ${buildingName}`);
                        }
                    });
                });

                if (buildingAnimalCount > 0) {
                    this.placeables.push({
                        uniqueId: uniqueId,
                        name: name || 'Livestock Building',
                        type: 'Livestock Building',
                        farmId: farmId,
                        animalCount: buildingAnimalCount
                    });

                    console.log(`  📍 Building "${name}" total animals: ${buildingAnimalCount}`);
                }
            }
        });

        this.filteredAnimals = [...this.animals];

        console.log(`\n=== ANIMAL PARSING SUMMARY ===`);
        console.log(`Found ${this.placeables.length} livestock buildings`);
        console.log(`Total animals loaded: ${this.animals.length}`);
        console.log(`Selected farm: ${this.selectedFarm?.name}`);

        // Show animal types breakdown
        const animalTypes = {};
        this.animals.forEach(animal => {
            const type = animal.type;
            animalTypes[type] = (animalTypes[type] || 0) + 1;
        });
        console.log(`Animal types found:`, animalTypes);

        // Show building breakdown
        const buildingBreakdown = {};
        this.animals.forEach(animal => {
            const building = animal.location;
            buildingBreakdown[building] = (buildingBreakdown[building] || 0) + 1;
        });
        console.log(`Animals per building:`, buildingBreakdown);
        console.log('=== END PARSING SUMMARY ===\n');
    }

    parseAnimalData(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML parsing error: ' + parseError.textContent);
        }

        const animalElements = xmlDoc.querySelectorAll('animal');
        this.animals = [];
        let totalAnimalsProcessed = 0;

        animalElements.forEach(animal => {
            totalAnimalsProcessed++;
            const animalData = {
                id: animal.getAttribute('id') || 'Unknown',
                name: animal.getAttribute('name') || 'Unnamed',
                age: parseInt(animal.getAttribute('age')) || 0,
                health: parseFloat(animal.getAttribute('health')) || 0,
                monthsSinceLastBirth: parseInt(animal.getAttribute('monthsSinceLastBirth')) || 0,
                gender: animal.getAttribute('gender') || 'Unknown',
                subType: animal.getAttribute('subType') || 'Unknown',
                reproduction: parseFloat(animal.getAttribute('reproduction')) || 0,
                isParent: animal.getAttribute('isParent') === 'true',
                isPregnant: animal.getAttribute('isPregnant') === 'true',
                isLactating: animal.getAttribute('isLactating') === 'true',
                farmId: animal.getAttribute('farmId') || 'Unknown',
                motherId: animal.getAttribute('motherId') || '-1',
                fatherId: animal.getAttribute('fatherId') || '-1',
                weight: parseFloat(animal.getAttribute('weight')) || 0,
                variation: parseInt(animal.getAttribute('variation')) || 1,
                genetics: null
            };

            // Parse genetics data if available
            const geneticsElement = animal.querySelector('genetics');
            if (geneticsElement) {
                animalData.genetics = {
                    metabolism: parseFloat(geneticsElement.getAttribute('metabolism')) || 0,
                    quality: parseFloat(geneticsElement.getAttribute('quality')) || 0,
                    health: parseFloat(geneticsElement.getAttribute('health')) || 0,
                    fertility: parseFloat(geneticsElement.getAttribute('fertility')) || 0,
                    productivity: parseFloat(geneticsElement.getAttribute('productivity')) || 0
                };
            }

            // Extract animal type from subType (e.g., "COW_HEREFORD" -> "COW")
            animalData.type = animalData.subType.split('_')[0];

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
                    const matchingBuilding = farmBuildings.find(building =>
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
                    animalData.location = 'Farm Field';
                    animalData.locationType = 'Open Range';
                }
            }

            // Only include animals that are found in player's livestock buildings
            if (this.playerAnimalIds.has(animalData.id)) {
                console.log(`✓ Including animal ${animalData.name} from buildings`);
                this.animals.push(animalData);
            } else {
                console.log(`✗ Excluding animal ${animalData.name} - not found in livestock buildings`);
            }
        });

        this.filteredAnimals = [...this.animals];
        const farmName = this.selectedFarm ? this.selectedFarm.name : 'All Farms';

        console.log(`\n=== ANIMAL PARSING SUMMARY ===`);
        console.log(`Total animals in animalSystem.xml: ${totalAnimalsProcessed}`);
        console.log(`Player-owned animals found: ${this.animals.length}`);
        console.log(`Farm: ${farmName} (Internal ID: ${this.selectedFarmId}, External ID: ${this.selectedFarm?.id})`);

        // Show animal types breakdown
        const animalTypes = {};
        this.animals.forEach(animal => {
            const type = animal.type;
            animalTypes[type] = (animalTypes[type] || 0) + 1;
        });
        console.log(`Animal types owned:`, animalTypes);
        console.log('=== END ANIMAL SUMMARY ===\n');
    }

    showDashboard() {
        document.getElementById('folder-selection').classList.add('d-none');
        document.getElementById('landing-page').classList.remove('d-none');
        document.getElementById('back-home-btn').classList.add('d-none'); // Hide back button on landing page
        this.updateLandingPageCounts();
    }

    updateLandingPageCounts() {
        // Update livestock count
        const livestockCount = this.animals.length;
        document.getElementById('livestock-count').textContent = `${livestockCount} Animals`;

        // TODO: Update other counts when we implement those sections
        document.getElementById('vehicle-count').textContent = 'Coming Soon';
        document.getElementById('field-count').textContent = 'Coming Soon';
        document.getElementById('property-count').textContent = 'Coming Soon';
    }

    showLanding() {
        document.getElementById('section-content').classList.add('d-none');
        document.getElementById('dashboard-content').classList.add('d-none');
        document.getElementById('landing-page').classList.remove('d-none');
        document.getElementById('back-home-btn').classList.add('d-none'); // Hide back button on landing page
    }

    showSection(sectionName) {
        document.getElementById('landing-page').classList.add('d-none');
        document.getElementById('section-content').classList.add('d-none');
        document.getElementById('back-home-btn').classList.remove('d-none'); // Show back button when in sections

        switch(sectionName) {
            case 'livestock':
                // Show the existing livestock dashboard
                document.getElementById('dashboard-content').classList.remove('d-none');
                this.updateSummaryCards();
                this.renderAnimalsTable();
                break;
            case 'vehicles':
                this.showVehiclesSection();
                break;
            case 'fields':
                this.showFieldsSection();
                break;
            case 'economy':
                this.showEconomySection();
                break;
            case 'properties':
                this.showPropertiesSection();
                break;
            case 'statistics':
                this.showStatisticsSection();
                break;
            default:
                document.getElementById('section-content').innerHTML = `
                    <div class="text-center">
                        <h3 class="text-warning">Section Under Development</h3>
                        <p class="text-muted">The ${sectionName} section is coming soon!</p>
                    </div>
                `;
                document.getElementById('section-content').classList.remove('d-none');
        }
    }

    showVehiclesSection() {
        document.getElementById('section-content').innerHTML = `
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
        document.getElementById('section-content').classList.remove('d-none');
    }

    showFieldsSection() {
        document.getElementById('section-content').innerHTML = `
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
        document.getElementById('section-content').classList.remove('d-none');
    }

    showEconomySection() {
        document.getElementById('section-content').innerHTML = `
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
        document.getElementById('section-content').classList.remove('d-none');
    }

    showPropertiesSection() {
        document.getElementById('section-content').innerHTML = `
            <div class="row mb-4">
                <div class="col-12 text-center">
                    <h2 class="text-farm-accent">
                        <i class="bi bi-building me-2"></i>
                        Property Management
                    </h2>
                    <p class="lead text-muted">Coming soon - Building and infrastructure management</p>
                </div>
            </div>
        `;
        document.getElementById('section-content').classList.remove('d-none');
    }

    showStatisticsSection() {
        document.getElementById('section-content').innerHTML = `
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
        document.getElementById('section-content').classList.remove('d-none');
    }

    updateSummaryCards() {
        const totalCount = this.animals.length;
        const lactatingCount = this.animals.filter(a => a.isLactating).length;
        const pregnantCount = this.animals.filter(a => a.isPregnant).length;
        const avgHealth = totalCount > 0
            ? (this.animals.reduce((sum, a) => sum + a.health, 0) / totalCount).toFixed(1)
            : 0;

        document.getElementById('total-count').textContent = totalCount;
        document.getElementById('lactating-count').textContent = lactatingCount;
        document.getElementById('pregnant-count').textContent = pregnantCount;
        document.getElementById('avg-health').textContent = avgHealth + '%';
    }

    renderAnimalsTable() {
        // Destroy existing DataTable if it exists
        if (this.dataTable) {
            this.dataTable.destroy();
        }

        // Prepare data for DataTables
        const tableData = this.animals.map(animal => {
            // Create status badges
            const statusBadges = [];
            if (animal.health === 0) statusBadges.push('<span class="badge bg-danger">Error</span>');
            if (animal.isPregnant) statusBadges.push('<span class="badge status-pregnant">Pregnant</span>');
            if (animal.isLactating) statusBadges.push('<span class="badge status-lactating">Lactating</span>');
            if (animal.isParent) statusBadges.push('<span class="badge status-parent">Parent</span>');

            // Create health bar
            const healthClass = this.getHealthClass(animal.health);
            const healthBar = `
                <div style="display: flex; align-items: center;">
                    <div class="health-bar">
                        <div class="health-fill ${healthClass}" style="width: ${animal.health}%"></div>
                    </div>
                    <span>${animal.health.toFixed(1)}%</span>
                </div>
            `;

            return [
                `<strong>${animal.name}</strong>`,
                this.formatAnimalType(animal.subType),
                `${animal.age} months`,
                this.capitalize(animal.gender),
                healthBar,
                `${animal.weight.toFixed(1)} kg`,
                `${animal.reproduction.toFixed(1)}%`,
                statusBadges.join(' ') || '-',
                this.formatLocation(animal.location, animal.locationType),
                `<button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')">
                    <i class="bi bi-eye me-1"></i>Details
                </button>`
            ];
        });

        // Clear existing table body
        document.getElementById('animals-tbody').innerHTML = '';

        // Initialize DataTable (removed built-in export buttons)
        this.dataTable = $('#animals-table').DataTable({
            data: tableData,
            pageLength: 25,
            responsive: true,
            order: [[0, 'asc']], // Sort by name by default
            columnDefs: [
                {
                    targets: [4], // Health column
                    orderable: false
                },
                {
                    targets: [7], // Status column
                    orderable: false
                },
                {
                    targets: [9], // Actions column
                    orderable: false
                }
            ],
            dom: '<"d-none"B>frtip', // Hidden buttons for export functionality
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            language: {
                search: "Search animals:",
                lengthMenu: "Show _MENU_ animals per page",
                info: "Showing _START_ to _END_ of _TOTAL_ animals",
                emptyTable: "No animals found"
            }
        });
    }

    getHealthClass(health) {
        if (health >= 80) return 'health-excellent';
        if (health >= 60) return 'health-good';
        if (health >= 40) return 'health-average';
        if (health >= 20) return 'health-poor';
        return 'health-critical';
    }

    formatAnimalType(subType) {
        // Convert "COW_HEREFORD" to "Hereford Cow"
        const parts = subType.split('_');
        if (parts.length > 1) {
            const type = parts[0].toLowerCase();
            const breed = parts.slice(1).join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            return `${breed} ${this.capitalize(type)}`;
        }
        return this.capitalize(subType);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    formatLocation(location, locationType) {
        if (!location || location === 'Unknown') {
            return '<span class="badge bg-secondary">Unknown Location</span>';
        }

        // Determine badge color based on location type
        let badgeClass = 'bg-secondary';
        let icon = 'bi-house';

        if (locationType && locationType.includes('Cow')) {
            badgeClass = 'bg-success';
            icon = 'bi-building';
        } else if (locationType && locationType.includes('Pig')) {
            badgeClass = 'bg-warning text-dark';
            icon = 'bi-building';
        } else if (locationType && locationType.includes('Chicken')) {
            badgeClass = 'bg-info';
            icon = 'bi-house-door';
        } else if (locationType && locationType.includes('Sheep')) {
            badgeClass = 'bg-primary';
            icon = 'bi-tree';
        }

        return `<span class="badge ${badgeClass}" title="${locationType}">
                    <i class="${icon} me-1"></i>${location}
                </span>`;
    }

    showAnimalDetails(animalId) {
        const animal = this.animals.find(a => a.id === animalId);
        if (!animal) {
            console.error('Animal not found:', animalId);
            return;
        }

        const modalTitle = document.getElementById('animalDetailsModalLabel');
        const modalContent = document.getElementById('animalDetailsContent');

        modalTitle.innerHTML = `<i class="bi bi-clipboard-data me-2"></i>${animal.name || 'Unnamed Animal'}`;

        // Create comprehensive animal details
        const detailsHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Basic Information</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Name:</strong></td><td>${animal.name || 'Unnamed'}</td></tr>
                                <tr><td><strong>ID:</strong></td><td>${animal.id}</td></tr>
                                <tr><td><strong>Type:</strong></td><td>${this.formatAnimalType(animal.subType)}</td></tr>
                                <tr><td><strong>Gender:</strong></td><td>${this.capitalize(animal.gender)}</td></tr>
                                <tr><td><strong>Age:</strong></td><td>${animal.age} months</td></tr>
                                <tr><td><strong>Variation:</strong></td><td>${animal.variation}</td></tr>
                            </table>
                        </div>
                    </div>

                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-heart-pulse me-2"></i>Health & Physical</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Health:</strong></td><td>${animal.health.toFixed(1)}%</td></tr>
                                <tr><td><strong>Weight:</strong></td><td>${animal.weight.toFixed(1)} kg</td></tr>
                                <tr><td><strong>Reproduction:</strong></td><td>${(animal.reproduction * 100).toFixed(1)}%</td></tr>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-heart me-2"></i>Reproduction Status</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Parent:</strong></td><td>${animal.isParent ? 'Yes' : 'No'}</td></tr>
                                <tr><td><strong>Pregnant:</strong></td><td>${animal.isPregnant ? 'Yes' : 'No'}</td></tr>
                                <tr><td><strong>Lactating:</strong></td><td>${animal.isLactating ? 'Yes' : 'No'}</td></tr>
                                <tr><td><strong>Months Since Birth:</strong></td><td>${animal.monthsSinceLastBirth}</td></tr>
                                <tr><td><strong>Mother ID:</strong></td><td>${animal.motherId !== '-1' ? animal.motherId : 'Unknown'}</td></tr>
                                <tr><td><strong>Father ID:</strong></td><td>${animal.fatherId !== '-1' ? animal.fatherId : 'Unknown'}</td></tr>
                            </table>
                        </div>
                    </div>

                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Location & Farm</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Location:</strong></td><td>${animal.location}</td></tr>
                                <tr><td><strong>Location Type:</strong></td><td>${animal.locationType}</td></tr>
                                <tr><td><strong>Farm ID:</strong></td><td>${animal.farmId}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            ${animal.genetics ? `
            <div class="card bg-secondary">
                <div class="card-header">
                    <h6 class="mb-0"><i class="bi bi-dna me-2"></i>Genetics</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Metabolism:</strong></td><td>${(animal.genetics.metabolism * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Quality:</strong></td><td>${(animal.genetics.quality * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Health:</strong></td><td>${(animal.genetics.health * 100).toFixed(1)}%</td></tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Fertility:</strong></td><td>${(animal.genetics.fertility * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Productivity:</strong></td><td>${(animal.genetics.productivity * 100).toFixed(1)}%</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        modalContent.innerHTML = detailsHTML;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('animalDetailsModal'));
        modal.show();
    }

    showExportModal() {
        const modal = new bootstrap.Modal(document.getElementById('exportDataModal'));
        modal.show();
    }

    exportData(format) {
        // Hide the export modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportDataModal'));
        modal.hide();

        // Prepare data for export
        const exportData = this.animals.map(animal => ({
            Name: animal.name || 'Unnamed',
            Type: this.formatAnimalType(animal.subType),
            Age: `${animal.age} months`,
            Gender: this.capitalize(animal.gender),
            Health: `${animal.health.toFixed(1)}%`,
            Weight: `${animal.weight.toFixed(1)} kg`,
            Reproduction: `${animal.reproduction.toFixed(1)}%`,
            Status: [
                animal.health === 0 ? 'Error' : '',
                animal.isPregnant ? 'Pregnant' : '',
                animal.isLactating ? 'Lactating' : '',
                animal.isParent ? 'Parent' : ''
            ].filter(s => s).join(', ') || 'Normal',
            Location: animal.location,
            'Farm ID': animal.farmId,
            'Animal ID': animal.id,
            'Mother ID': animal.motherId !== '-1' ? animal.motherId : '',
            'Father ID': animal.fatherId !== '-1' ? animal.fatherId : ''
        }));

        // Use DataTables built-in export functionality
        switch(format) {
            case 'csv':
                this.dataTable.button('.buttons-csv').trigger();
                break;
            case 'excel':
                this.dataTable.button('.buttons-excel').trigger();
                break;
            case 'pdf':
                this.dataTable.button('.buttons-pdf').trigger();
                break;
            case 'print':
                this.dataTable.button('.buttons-print').trigger();
                break;
            default:
                console.error('Unknown export format:', format);
        }

        this.showSuccessMessage(`Export started in ${format.toUpperCase()} format!`);
    }

    filterAnimals(filterType) {
        // Store current active filter
        this.activeFilter = filterType;

        // Reset all animals to show initially (use this.animals as the source)
        let filteredAnimals = [...this.animals];

        // Apply the filter based on type
        switch(filterType) {
            case 'all':
                // Show all animals - no filtering needed
                break;
            case 'lactating':
                filteredAnimals = this.animals.filter(animal => animal.isLactating);
                break;
            case 'pregnant':
                filteredAnimals = this.animals.filter(animal => animal.isPregnant);
                break;
            case 'health':
                // Sort by health (highest to lowest) for health filter
                filteredAnimals = [...this.animals].sort((a, b) => b.health - a.health);
                break;
            default:
                console.warn('Unknown filter type:', filterType);
                break;
        }

        // Update the DataTable with filtered data
        if (this.dataTable) {
            // Clear current search to avoid conflicts
            this.dataTable.search('').draw();

            // Prepare filtered data for DataTable
            const tableData = filteredAnimals.map(animal => {
                // Create status badges
                const statusBadges = [];
                if (animal.health === 0) statusBadges.push('<span class="badge bg-danger">Error</span>');
                if (animal.isPregnant) statusBadges.push('<span class="badge status-pregnant">Pregnant</span>');
                if (animal.isLactating) statusBadges.push('<span class="badge status-lactating">Lactating</span>');
                if (animal.isParent) statusBadges.push('<span class="badge status-parent">Parent</span>');

                // Create health bar
                const healthClass = this.getHealthClass(animal.health);
                const healthBar = `
                    <div style="display: flex; align-items: center;">
                        <div class="health-bar">
                            <div class="health-fill ${healthClass}" style="width: ${animal.health}%"></div>
                        </div>
                        <span>${animal.health.toFixed(1)}%</span>
                    </div>
                `;

                return [
                    `<strong>${animal.name}</strong>`,
                    this.formatAnimalType(animal.subType),
                    `${animal.age} months`,
                    this.capitalize(animal.gender),
                    healthBar,
                    `${animal.weight.toFixed(1)} kg`,
                    `${animal.reproduction.toFixed(1)}%`,
                    statusBadges.join(' ') || '-',
                    this.formatLocation(animal.location, animal.locationType),
                    `<button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')">
                        <i class="bi bi-eye me-1"></i>Details
                    </button>`
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
            'all': `Showing all ${filteredAnimals.length} animals`,
            'lactating': `Showing ${filteredAnimals.length} lactating animals`,
            'pregnant': `Showing ${filteredAnimals.length} pregnant animals`,
            'health': `Showing all animals sorted by health`
        };

        this.showInfoMessage(filterMessages[filterType] || `Filter applied: ${filterType}`);
    }

    updateSummaryCardStates(activeFilter) {
        // Remove active state from all cards
        document.querySelectorAll('.summary-card-clickable').forEach(card => {
            card.classList.remove('summary-card-active');
        });

        // Add active state to the clicked card
        const activeCard = document.querySelector(`[data-filter="${activeFilter}"]`);
        if (activeCard) {
            activeCard.classList.add('summary-card-active');
        }
    }

}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new LivestockDashboard();
});