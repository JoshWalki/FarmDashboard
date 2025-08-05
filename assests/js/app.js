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

    unloadData() {
        if (confirm('Are you sure you want to unload all farm data? This will clear the stored save folder and return to the selection screen.')) {
            this.deleteStorage('livestockFolderData');
            document.getElementById('folder-path').textContent = 'No folder selected';
            document.getElementById('clear-folder-btn').classList.add('d-none');
            document.getElementById('main-navbar').classList.add('d-none');
            document.getElementById('folder-selection').classList.remove('d-none');
            document.getElementById('landing-page').classList.add('d-none');
            document.getElementById('dashboard-content').classList.add('d-none');
            document.getElementById('section-content').classList.add('d-none');
            
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
            
            this.showSuccessMessage('All farm data unloaded successfully!');
        }
    }

    refreshData() {
        if (!this.savedFolderData) {
            this.showInfoMessage('No folder data to refresh. Please select a save folder first.');
            return;
        }

        // Show the refresh modal instead of browser popup
        const modal = new bootstrap.Modal(document.getElementById('refreshDataModal'));
        modal.show();
    }

    confirmRefreshData(useFiles) {
        if (useFiles) {
            // Trigger the folder selection dialog to get fresh files
            this.isRefreshing = true;
            document.getElementById('folder-input').click();
        } else {
            // Just refresh the display with existing cached data
            this.showInfoMessage('Refreshing display with cached data...');
            
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
            if (currentSection === 'livestock') {
                this.updateSummaryCards();
                this.renderAnimalsTable();
            }
            
            // Clear refresh flag
            this.isRefreshing = false;
            
            this.showSuccessMessage('Display refreshed with cached data');
        }
    }

    showNavbar() {
        document.getElementById('main-navbar').classList.remove('d-none');
        this.updateNavbar();
    }

    hideNavbar() {
        document.getElementById('main-navbar').classList.add('d-none');
    }

    updateNavbar() {
        const currentSection = this.getCurrentSection();
        const sectionTitleElement = document.getElementById('navbar-section-title');
        const homeButton = document.getElementById('nav-home-btn');
        const gameTimeElement = document.getElementById('navbar-game-time');
        
        // Update section title and show/hide home button
        switch(currentSection) {
            case 'landing':
                sectionTitleElement.textContent = 'Farm Dashboard';
                homeButton.classList.add('d-none');
                break;
            case 'livestock':
                sectionTitleElement.textContent = 'Livestock Management';
                homeButton.classList.remove('d-none');
                break;
            case 'other-section':
                sectionTitleElement.textContent = 'Farm Management';
                homeButton.classList.remove('d-none');
                break;
            default:
                sectionTitleElement.textContent = 'Farm Dashboard';
                homeButton.classList.add('d-none');
        }

        // Update game time in navbar
        if (this.gameTime) {
            const timeSpan = gameTimeElement.querySelector('span');
            timeSpan.textContent = this.getGameTimeDisplay();
            gameTimeElement.classList.remove('d-none');
        } else {
            gameTimeElement.classList.add('d-none');
        }
    }

    getCurrentSection() {
        if (!document.getElementById('landing-page').classList.contains('d-none')) {
            return 'landing';
        }
        if (!document.getElementById('dashboard-content').classList.contains('d-none')) {
            return 'livestock';
        }
        if (!document.getElementById('section-content').classList.contains('d-none')) {
            return 'other-section';
        }
        return null;
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
                        if (this.savedFolderData.environmentData) {
                            this.parseEnvironmentData(this.savedFolderData.environmentData);
                        }
                        this.showDashboard();
                    }
                    document.getElementById('clear-folder-btn').classList.remove('d-none');
                    this.showNavbar();
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
        // Create or get the toast container
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
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

        const alertDiv = document.createElement('div');
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
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        toastContainer.appendChild(alertDiv);

        // Add click handler for close button
        const closeBtn = alertDiv.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 150);
        });

        // Auto-remove after timeout
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 150);
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
        const environmentFile = files.find(file => file.name === 'environment.xml');

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
                lastUpdated: new Date().toISOString()
            };

            if (this.setStorage('livestockFolderData', folderData)) {
                this.showSuccessMessage('Folder data saved! It will auto-load on refresh.');
            } else {
                this.showInfoMessage('Data loaded but could not be saved (too large for storage).');
            }

            // Store the folder data for later processing
            this.savedFolderData = folderData;

            // Check if this is a refresh operation (preserve current view)
            const wasRefreshing = this.isRefreshing;
            const currentSection = wasRefreshing ? this.getCurrentSection() : null;

            if (farmsContent) {
                this.parseFarmsData(farmsContent);
                // Farm parsing will handle showing modal or proceeding directly
            } else {
                // No farms data - proceed with placeables data only
                if (placeablesContent) {
                    this.parsePlaceablesData(placeablesContent);
                }
                if (environmentContent) {
                    this.parseEnvironmentData(environmentContent);
                }
                
                // Only show dashboard if not refreshing, otherwise preserve current view
                if (!wasRefreshing) {
                    this.showDashboard();
                }
            }
            
            document.getElementById('clear-folder-btn').classList.remove('d-none');
            this.showNavbar();
            
            // Update displays if refreshing
            if (wasRefreshing) {
                this.updateLandingPageCounts();
                if (currentSection === 'livestock') {
                    this.updateSummaryCards();
                    this.renderAnimalsTable();
                }
                this.isRefreshing = false;
            }
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
        // Only call proceedWithDataLoading if we're not in a refresh operation
        if (!this.isRefreshing) {
            this.proceedWithDataLoading();
        }
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
            if (currentSection === 'livestock') {
                this.updateSummaryCards();
                this.renderAnimalsTable();
            }
        }
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
                
                // Extract capacity information from various possible locations
                const maxAnimals = husbandryAnimals.getAttribute('maxAnimals') || 
                                 husbandryAnimals.getAttribute('maxAnimalCount') || 
                                 husbandryAnimals.getAttribute('capacity') ||
                                 husbandryAnimals.getAttribute('animalLimit') ||
                                 husbandryAnimals.getAttribute('maxNumAnimals') ||
                                 husbandryAnimals.getAttribute('numAnimalsMax') ||
                                 placeable.getAttribute('capacity') ||
                                 placeable.getAttribute('maxAnimals') ||
                                 placeable.getAttribute('animalCapacity');
                
                // Check child elements for capacity - look for more possible element names
                const animalLimitElement = husbandryAnimals.querySelector('animalLimit') || 
                                          husbandryAnimals.querySelector('maxAnimals') ||
                                          husbandryAnimals.querySelector('capacity') ||
                                          husbandryAnimals.querySelector('maxNumAnimals') ||
                                          husbandryAnimals.querySelector('numAnimalsMax') ||
                                          husbandryAnimals.querySelector('animalCapacity');
                const animalLimitFromElement = animalLimitElement ? animalLimitElement.textContent : null;
                
                // Check for custom fencing and calculate area-based capacity
                const husbandryFence = placeable.querySelector('husbandryFence');
                let fenceCapacity = null;
                if (husbandryFence) {
                    const fence = husbandryFence.querySelector('fence');
                    if (fence) {
                        const segments = fence.querySelectorAll('segment');
                        if (segments.length > 0) {
                            const fenceResult = this.calculateFenceCapacity(segments);
                            if (fenceResult && typeof fenceResult === 'object') {
                                fenceCapacity = fenceResult.capacity;
                                console.log(`🔷 Custom fence found with ${segments.length} segments, calculated capacity: ${fenceCapacity}`);
                                // Store calculation details for later use
                                window.fenceCalculationDetails = window.fenceCalculationDetails || {};
                                window.fenceCalculationDetails[uniqueId] = fenceResult.calculationDetails;
                            } else {
                                fenceCapacity = fenceResult; // Handle old return format
                            }
                        }
                    }
                }
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
                        const animalName = animal.getAttribute('name') || `Animal #${animalId}`;
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
                    // Store all animals for this building
                    const placeableName = name || 'Livestock Building';
                    const buildingAnimals = this.animals.filter(animal => animal.location === placeableName);
                    
                    // Extract capacity information from multiple sources (prioritize fence calculation)
                    const attributeCapacity = maxAnimals ? parseInt(maxAnimals) : 
                                           animalLimitFromElement ? parseInt(animalLimitFromElement) : null;
                    const estimatedCapacity = this.estimatePastureCapacity(filename);
                    const finalCapacity = fenceCapacity || attributeCapacity || estimatedCapacity;
                    
                    // Log capacity information for debugging
                    if (fenceCapacity) {
                        console.log(`✅ Using fence-calculated capacity for ${placeableName}: ${fenceCapacity} (estimated was ${estimatedCapacity})`);
                    } else if (attributeCapacity && attributeCapacity !== estimatedCapacity) {
                        console.log(`✅ Found attribute capacity for ${placeableName}: ${attributeCapacity} (estimated was ${estimatedCapacity})`);
                    }

                    this.placeables.push({
                        uniqueId: uniqueId,
                        name: placeableName,
                        type: 'Livestock Building',
                        farmId: farmId,
                        filename: filename,
                        animalCount: buildingAnimalCount,
                        animals: buildingAnimals,
                        capacity: finalCapacity
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

    parseEnvironmentData(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.error('XML parsing error in environment:', parseError.textContent);
            return;
        }

        console.log('Environment XML structure:', xmlDoc.documentElement);

        // Try different possible root elements
        let environmentElement = xmlDoc.querySelector('environment');
        if (!environmentElement) {
            environmentElement = xmlDoc.documentElement; // Use root element if no 'environment' tag
        }

        if (environmentElement) {
            console.log('Environment element found:', environmentElement.tagName);
            
            // Try to find dayTime and currentDay elements
            const dayTimeElement = environmentElement.querySelector('dayTime') || 
                                 environmentElement.querySelector('currentDayTime') ||
                                 environmentElement.querySelector('time');
            const currentDayElement = environmentElement.querySelector('currentDay') || 
                                    environmentElement.querySelector('day');

            console.log('DayTime element:', dayTimeElement);
            console.log('CurrentDay element:', currentDayElement);

            if (dayTimeElement || currentDayElement) {
                this.gameTime = {
                    dayTime: dayTimeElement ? parseFloat(dayTimeElement.textContent) : 0,
                    currentDay: currentDayElement ? parseInt(currentDayElement.textContent) : 1
                };

                console.log(`✓ Game Time parsed - Day: ${this.gameTime.currentDay}, Time: ${this.formatGameTime(this.gameTime.dayTime)}`);
            } else {
                console.log('No time elements found in environment data');
                // List all child elements for debugging
                const children = Array.from(environmentElement.children);
                console.log('Available elements:', children.map(el => el.tagName));
            }
        } else {
            console.log('No environment element found in XML');
        }
    }

    formatGameTime(dayTimeMinutes) {
        const hours = Math.floor(dayTimeMinutes / 60);
        const minutes = Math.floor(dayTimeMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    getGameTimeDisplay() {
        if (!this.gameTime) {
            // Check if environment.xml wasn't found or parsed
            if (!this.savedFolderData?.environmentData) {
                return 'Time: environment.xml not found';
            }
            return 'Time: Unable to parse environment data';
        }
        return `Day ${this.gameTime.currentDay} - ${this.formatGameTime(this.gameTime.dayTime)}`;
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
        this.showNavbar(); // Make sure navbar is visible
        this.updateLandingPageCounts();
        this.updateNavbar();
    }

    updateLandingPageCounts() {
        // Update livestock count
        const livestockCount = this.animals.length;
        document.getElementById('livestock-count').textContent = `${livestockCount} Animals`;

        // Update game time display
        const gameTimeElement = document.getElementById('game-time-display');
        if (gameTimeElement) {
            gameTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${this.getGameTimeDisplay()}`;
        }

        // TODO: Update other counts when we implement those sections
        document.getElementById('vehicle-count').textContent = 'Coming Soon';
        document.getElementById('field-count').textContent = 'Coming Soon';
        
        // Update pasture count (replaced property-count)
        const pastureCountElement = document.getElementById('pasture-count');
        if (pastureCountElement) {
            // Initialize pastures if not already done
            if (!this.pastures) {
                this.parsePastureData();
            }
            pastureCountElement.textContent = `${this.pastures ? this.pastures.length : 0} Pastures`;
            
            // Update warning badge on dashboard
            const totalAllWarnings = this.pastures ? this.pastures.reduce((sum, pasture) => sum + pasture.allWarnings.length, 0) : 0;
            const warningBadge = document.getElementById('pasture-warnings-badge');
            const warningCount = document.getElementById('pasture-warnings-count');
            if (warningBadge && warningCount) {
                if (totalAllWarnings > 0) {
                    warningCount.textContent = totalAllWarnings;
                    warningBadge.classList.remove('d-none');
                } else {
                    warningBadge.classList.add('d-none');
                }
            }
        }
    }

    showLanding() {
        document.getElementById('section-content').classList.add('d-none');
        document.getElementById('dashboard-content').classList.add('d-none');
        document.getElementById('landing-page').classList.remove('d-none');
        this.updateNavbar();
    }

    showSection(sectionName) {
        document.getElementById('landing-page').classList.add('d-none');
        document.getElementById('section-content').classList.add('d-none');

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
            case 'pastures':
                this.showPasturesSection();
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
        
        // Update navbar after section change
        this.updateNavbar();
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
                    <div class="card bg-farm-success">
                        <div class="card-body text-center">
                            <h5 class="card-title">Total Pastures</h5>
                            <h2 class="display-4" id="total-pastures-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-info">
                        <div class="card-body text-center">
                            <h5 class="card-title">Active Livestock</h5>
                            <h2 class="display-4" id="pasture-livestock-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-warning">
                        <div class="card-body text-center">
                            <h5 class="card-title">Birth Warnings</h5>
                            <h2 class="display-4" id="birth-warnings-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-farm-secondary">
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
        
        document.getElementById('section-content').innerHTML = pasturesHTML;
        document.getElementById('section-content').classList.remove('d-none');
        
        // Update pasture data display
        this.updatePastureDisplay();
        this.updateNavbar('Pastures');
    }
    
    parsePastureData() {
        // Initialize pastures array if not exists
        if (!this.pastures) {
            this.pastures = [];
        }
        
        this.pastures = [];
        
        // First try to use placeables data if available
        if (this.placeables && this.placeables.length > 0) {
            this.placeables.forEach(placeable => {
                // Check if this is a livestock building with animals
                if (placeable.type === 'Livestock Building' && placeable.animals && placeable.animals.length > 0) {
                    const pastureAnimals = placeable.animals;
                    
                    // Calculate pasture statistics
                    const avgHealth = pastureAnimals.length > 0 
                        ? (pastureAnimals.reduce((sum, animal) => sum + animal.health, 0) / pastureAnimals.length).toFixed(1)
                        : 0;
                    
                    // Check for birth warnings (pregnant animals due within 1 month)
                    const birthWarnings = this.calculateBirthWarnings(pastureAnimals);
                    
                    // Check for condition reports
                    const conditionReport = this.calculateConditionReport(pastureAnimals);
                    
                    // Food availability (mock data - would need to be parsed from XML if available)
                    const foodReport = this.calculateFoodReport(placeable);
                    
                    // Calculate all warnings for this pasture
                    const allWarnings = this.calculateAllPastureWarnings(placeable, pastureAnimals, conditionReport, foodReport);
                    
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
                        farmId: placeable.farmId || 'Unknown',
                        filename: placeable.filename,
                        capacity: placeable.capacity || this.estimatePastureCapacity(placeable.filename)
                    };
                    
                    this.pastures.push(pastureData);
                }
            });
        } else if (this.animals && this.animals.length > 0) {
            // Fallback: Group animals by location if placeables not available
            const animalsByLocation = {};
            
            this.animals.forEach(animal => {
                const location = animal.location || 'Unknown';
                if (location !== 'Unknown' && animal.locationType === 'Livestock Building') {
                    if (!animalsByLocation[location]) {
                        animalsByLocation[location] = {
                            name: location,
                            animals: [],
                            uniqueId: `pasture_${location.replace(/\s+/g, '_')}`,
                            farmId: animal.farmId
                        };
                    }
                    animalsByLocation[location].animals.push(animal);
                }
            });
            
            // Convert to pastures array
            Object.values(animalsByLocation).forEach(locationData => {
                const pastureAnimals = locationData.animals;
                    
                // Calculate pasture statistics
                const avgHealth = pastureAnimals.length > 0 
                    ? (pastureAnimals.reduce((sum, animal) => sum + animal.health, 0) / pastureAnimals.length).toFixed(1)
                    : 0;
                
                // Check for birth warnings (pregnant animals due within 1 month)
                const birthWarnings = this.calculateBirthWarnings(pastureAnimals);
                
                // Check for condition reports
                const conditionReport = this.calculateConditionReport(pastureAnimals);
                
                // Food availability (mock data - would need to be parsed from XML if available)
                const foodReport = this.calculateFoodReport(locationData);
                
                // Calculate all warnings for this pasture
                const allWarnings = this.calculateAllPastureWarnings(locationData, pastureAnimals, conditionReport, foodReport);
                
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
                    farmId: locationData.farmId || 'Unknown',
                    capacity: this.estimatePastureCapacity(locationData.name)
                };
                
                this.pastures.push(pastureData);
            });
        }
        
        console.log(`Parsed ${this.pastures.length} pastures with livestock`);
    }
    
    calculateBirthWarnings(animals) {
        const warnings = [];
        const hasBull = animals.some(animal => 
            animal.gender?.toLowerCase() === 'male' && 
            (animal.subType?.includes('COW') || animal.subType?.includes('BULL'))
        );
        
        animals.forEach(animal => {
            if (animal.isPregnant) {
                // Calculate estimated due date based on our pregnancy calculation
                const animalType = animal.type || animal.subType.split('_')[0];
                const gestationPeriods = {
                    'COW': 9, 'PIG': 4, 'SHEEP': 5, 'GOAT': 5, 'HORSE': 11, 'CHICKEN': 1
                };
                const gestationMonths = gestationPeriods[animalType] || 6;
                const reproductionPercent = animal.reproduction * 100;
                
                let pregnancyProgress = 0;
                if (reproductionPercent > 80) pregnancyProgress = 0.8;
                else if (reproductionPercent > 60) pregnancyProgress = 0.6;
                else if (reproductionPercent > 40) pregnancyProgress = 0.4;
                else pregnancyProgress = 0.2;
                
                const monthsRemaining = Math.max(0, Math.round(gestationMonths * (1 - pregnancyProgress)));
                
                if (monthsRemaining <= 1) {
                    warnings.push({
                        animalId: animal.id,
                        animalName: animal.name || `Animal #${animal.id}`,
                        type: 'birth_due',
                        message: `${animal.name || `Animal #${animal.id}`} due to give birth soon`,
                        monthsRemaining: monthsRemaining
                    });
                }
            }
            
            // Check for young animals with bull present
            if (hasBull && animal.age < 11 && animal.gender?.toLowerCase() === 'female') {
                warnings.push({
                    animalId: animal.id,
                    animalName: animal.name || `Animal #${animal.id}`,
                    type: 'breeding_risk',
                    message: `Young female ${animal.name || `#${animal.id}`} (${animal.age} months) with bull present`,
                    age: animal.age
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
        
        animals.forEach(animal => {
            if (animal.genetics) {
                totalProductivity += animal.genetics.productivity * 100;
            }
            
            // Estimate milk production for lactating cows
            if (animal.isLactating && animal.subType?.includes('COW')) {
                milkProduction += 20; // Base milk per day per cow
            }
            
            // Estimate straw consumption (1 straw per animal per day)
            strawConsumption += 1;
            
            // Estimate manure production (based on animal size)
            if (animal.subType?.includes('COW')) manureProduction += 3;
            else if (animal.subType?.includes('PIG')) manureProduction += 2;
            else manureProduction += 1;
        });
        
        return {
            productivity: animals.length > 0 ? (totalProductivity / animals.length).toFixed(1) : 0,
            milk: milkProduction,
            straw: strawConsumption,
            manure: manureProduction
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
            grass: Math.floor(Math.random() * 200)
        };
    }
    
    estimatePastureCapacity(filename) {
        // Estimate capacity based on building type from filename
        if (!filename) return 20; // Default capacity
        
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes('cowbarnbig') || lowerFilename.includes('large')) return 80;
        if (lowerFilename.includes('cowbarnmedium') || lowerFilename.includes('medium')) return 45;
        if (lowerFilename.includes('cowbarnsmall') || lowerFilename.includes('small')) return 15;
        if (lowerFilename.includes('chickencoop')) return 30;
        if (lowerFilename.includes('pigbarn')) return 25;
        if (lowerFilename.includes('sheepbarn')) return 25;
        if (lowerFilename.includes('horsestable')) return 10;
        return 20; // Default for unknown types
    }

    calculateFenceCapacity(segments) {
        try {
            // Extract coordinates from fence segments
            const coordinates = [];
            
            segments.forEach(segment => {
                const start = segment.getAttribute('start');
                const end = segment.getAttribute('end');
                
                if (start) {
                    const [x, y, z] = start.split(' ').map(parseFloat);
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
                console.warn('Insufficient coordinates for area calculation');
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
            
            console.log(`Fence area calculation: ${area.toFixed(1)} sq meters = ${capacity} animal capacity`);
            
            const finalCapacity = Math.max(capacity, 5); // Minimum capacity of 5 animals
            
            // Store calculation details for later use in warning modals
            return {
                capacity: finalCapacity,
                calculationDetails: {
                    area: area,
                    segmentCount: segments.length,
                    animalsPerSqMeter: animalsPerSquareMeter,
                    rawCapacity: capacity
                }
            };
            
        } catch (error) {
            console.error('Error calculating fence capacity:', error);
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
                type: 'capacity',
                severity: capacityPercent >= 100 ? 'danger' : 'warning',
                message: `At ${capacityPercent.toFixed(0)}% capacity (${animals.length}/${capacity})`,
                icon: 'bi-exclamation-triangle-fill',
                affectedAnimals: animals, // All animals are affected by overcrowding
                details: {
                    currentAnimals: animals.length,
                    maxCapacity: capacity,
                    utilizationPercent: capacityPercent,
                    availableSpace: Math.max(0, capacity - animals.length),
                    capacitySource: this.getCapacitySource(pasture),
                    calculationMethod: this.getCapacityCalculationMethod(pasture)
                }
            });
        }
        
        // 2. Low Food Warning (<20% of any food type)
        const foodTypes = ['totalMixedRation', 'hay', 'silage', 'grass'];
        foodTypes.forEach(foodType => {
            const amount = foodReport[foodType];
            const capacity = foodReport.totalCapacity;
            const percent = (amount / capacity) * 100;
            if (percent < 20) {
                warnings.push({
                    type: 'food',
                    severity: percent < 10 ? 'danger' : 'warning',
                    message: `Low ${foodType}: ${percent.toFixed(0)}% remaining`,
                    icon: 'bi-basket'
                });
            }
        });
        
        // 3. Health Warnings (animals with health < 70%)
        const sickAnimals = animals.filter(a => a.health < 70);
        if (sickAnimals.length > 0) {
            const criticalAnimals = sickAnimals.filter(a => a.health < 20);
            warnings.push({
                type: 'health',
                severity: criticalAnimals.length > 0 ? 'danger' : 'warning',
                message: `${sickAnimals.length} sick animals (${criticalAnimals.length} critical)`,
                icon: 'bi-heart-pulse',
                affectedAnimals: sickAnimals,
                details: {
                    total: sickAnimals.length,
                    critical: criticalAnimals.length,
                    warning: sickAnimals.length - criticalAnimals.length
                }
            });
        }
        
        // 4. Production Warnings
        // High milk production warning (lactating cows need attention)
        const lactatingCows = animals.filter(a => a.isLactating && a.subType?.includes('COW'));
        if (lactatingCows.length > 5) {
            warnings.push({
                type: 'production',
                severity: 'info',
                message: `High milk production: ${conditionReport.milk}L/day from ${lactatingCows.length} cows`,
                icon: 'bi-droplet-fill',
                affectedAnimals: lactatingCows,
                details: {
                    totalProduction: conditionReport.milk,
                    cowCount: lactatingCows.length
                }
            });
        }
        
        // 5. Manure Warning (high production needs collection)
        if (conditionReport.manure > animals.length * 2) {
            warnings.push({
                type: 'maintenance',
                severity: 'warning',
                message: `High manure production: ${conditionReport.manure} units/day`,
                icon: 'bi-recycle'
            });
        }
        
        // 6. Breeding Management Warning
        const maleAnimals = animals.filter(a => a.gender?.toLowerCase() === 'male');
        const femaleAnimals = animals.filter(a => a.gender?.toLowerCase() === 'female');
        if (maleAnimals.length > 0 && femaleAnimals.length > 10) {
            const ratio = femaleAnimals.length / maleAnimals.length;
            if (ratio > 20) {
                warnings.push({
                    type: 'breeding',
                    severity: 'info',
                    message: `Breeding ratio: 1 male to ${ratio.toFixed(0)} females`,
                    icon: 'bi-gender-ambiguous'
                });
            }
        }
        
        // 7. Age Warning (too many old animals)
        const oldAnimals = animals.filter(a => {
            const lifeExpectancy = {
                'COW': 240, 'PIG': 180, 'SHEEP': 144, 'GOAT': 168, 'HORSE': 360, 'CHICKEN': 96
            };
            const type = a.type || a.subType?.split('_')[0];
            const maxAge = lifeExpectancy[type] || 200;
            return a.age > maxAge * 0.8;
        });
        if (oldAnimals.length > animals.length * 0.3) {
            warnings.push({
                type: 'age',
                severity: 'warning',
                message: `${oldAnimals.length} aging animals need replacement planning`,
                icon: 'bi-clock-history',
                affectedAnimals: oldAnimals,
                details: {
                    total: oldAnimals.length,
                    percentage: Math.round((oldAnimals.length / animals.length) * 100)
                }
            });
        }
        
        // 8. Dairy Optimization Warning
        const dairyAnimals = animals.filter(a => 
            a.isLactating && 
            (a.subType?.includes('COW') || a.subType?.includes('GOAT') || a.subType?.includes('SHEEP'))
        );
        
        if (dairyAnimals.length > 0) {
            // Find animals that could be offspring (young animals of same type)
            const potentialOffspring = [];
            
            dairyAnimals.forEach(mother => {
                const motherType = mother.subType?.split('_')[0] || mother.type;
                
                // Look for young animals of the same type that could be offspring
                const youngOfSameType = animals.filter(animal => {
                    const animalType = animal.subType?.split('_')[0] || animal.type;
                    return animalType === motherType && 
                           animal.age < 12 && // Less than 12 months old
                           animal.id !== mother.id && // Not the mother herself
                           !animal.isLactating; // Not lactating (so likely offspring)
                });
                
                if (youngOfSameType.length > 0) {
                    potentialOffspring.push({
                        mother: mother,
                        offspring: youngOfSameType,
                        type: motherType
                    });
                }
            });
            
            if (potentialOffspring.length > 0) {
                const totalOffspring = potentialOffspring.reduce((sum, pair) => sum + pair.offspring.length, 0);
                const totalMothers = potentialOffspring.length;
                
                warnings.push({
                    type: 'dairy_optimization',
                    severity: 'info',
                    message: `${totalMothers} lactating mothers with ${totalOffspring} young animals - separate for optimal milk production`,
                    icon: 'bi-droplet-half',
                    affectedAnimals: [...potentialOffspring.map(p => p.mother), ...potentialOffspring.flatMap(p => p.offspring)],
                    details: {
                        motherOffspringPairs: potentialOffspring,
                        totalMothers: totalMothers,
                        totalOffspring: totalOffspring,
                        potentialMilkGain: totalMothers * 15 // Estimated additional liters per day
                    }
                });
            }
        }
        
        return warnings;
    }

    showWarningDetails(pastureId, warningIndex) {
        const pasture = this.pastures.find(p => p.id === pastureId);
        if (!pasture || !pasture.allWarnings[warningIndex]) {
            console.error('Warning not found');
            return;
        }

        const warning = pasture.allWarnings[warningIndex];
        const modal = new bootstrap.Modal(document.getElementById('warningModal'));
        const content = document.getElementById('warningDetailsContent');
        
        // Update modal title
        document.getElementById('warningModalLabel').innerHTML = `
            <i class="bi bi-${warning.icon} me-2 text-${warning.severity === 'danger' ? 'danger' : warning.severity}"></i>
            ${this.getWarningTypeTitle(warning.type)} - ${pasture.name}
        `;
        
        let detailsHTML = `
            <div class="alert alert-${warning.severity === 'danger' ? 'danger' : warning.severity === 'warning' ? 'warning' : 'info'} mb-4">
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
            
            warning.affectedAnimals.forEach(animal => {
                const displayName = animal.name && animal.name.trim() !== '' ? animal.name : `#${animal.id}`;
                const healthClass = this.getHealthClass(animal.health);
                const statusBadges = [];
                
                if (animal.health < 20) statusBadges.push('<span class="badge bg-danger">Critical</span>');
                else if (animal.health < 50) statusBadges.push('<span class="badge bg-warning">Poor</span>');
                if (animal.isPregnant) statusBadges.push('<span class="badge status-pregnant">Pregnant</span>');
                if (animal.isLactating) statusBadges.push('<span class="badge status-lactating">Lactating</span>');
                
                detailsHTML += `
                    <tr>
                        <td>${animal.id}</td>
                        <td>${displayName}</td>
                        <td>${animal.subType || animal.type || 'Unknown'}</td>
                        <td>
                            <div class="health-bar">
                                <div class="health-fill ${healthClass}" style="width: ${animal.health}%"></div>
                            </div>
                            ${animal.health.toFixed(1)}%
                        </td>
                        <td>${animal.age || 0} months</td>
                        <td>${statusBadges.join(' ') || '<span class="badge bg-success">Normal</span>'}</td>
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
                case 'health':
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
                case 'production':
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
                case 'age':
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
                case 'capacity':
                    detailsHTML += `
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-danger">${warning.details.currentAnimals}</h5>
                                    <small>Current Animals</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-info">${warning.details.maxCapacity}</h5>
                                    <small>Max Capacity</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-warning">${warning.details.utilizationPercent.toFixed(1)}%</h5>
                                    <small>Utilization</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-secondary">
                                <div class="card-body text-center">
                                    <h5 class="text-${warning.details.availableSpace > 0 ? 'success' : 'danger'}">${warning.details.availableSpace}</h5>
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
                                    <p><strong>Source:</strong> ${warning.details.capacitySource}</p>
                                    <p><strong>Method:</strong> ${warning.details.calculationMethod.description}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Formula:</strong> <code>${warning.details.calculationMethod.formula}</code></p>
                                    <p><strong>Details:</strong> ${warning.details.calculationMethod.details}</p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                    `;
                    break;
                case 'dairy_optimization':
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
                            const motherName = pair.mother.name && pair.mother.name.trim() !== '' ? pair.mother.name : `#${pair.mother.id}`;
                            detailsHTML += `
                                <div class="col-md-6 mb-3">
                                    <div class="card bg-dark border-info">
                                        <div class="card-header">
                                            <h6 class="mb-0 text-info">
                                                <i class="bi bi-droplet-fill me-2"></i>
                                                Mother: ${motherName} (${pair.type})
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <p><small class="text-muted">Age: ${pair.mother.age || 0} months | Health: ${pair.mother.health.toFixed(1)}%</small></p>
                                            <h6 class="text-warning mb-2">
                                                <i class="bi bi-arrow-down me-1"></i>
                                                Young Animals (${pair.offspring.length}):
                                            </h6>
                                            <ul class="list-unstyled mb-0">
                                                ${pair.offspring.map(offspring => {
                                                    const offspringName = offspring.name && offspring.name.trim() !== '' ? offspring.name : `#${offspring.id}`;
                                                    return `<li><small>${offspringName} - ${offspring.age || 0} months old</small></li>`;
                                                }).join('')}
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
        if (pasture.filename && pasture.filename.includes('cowbarn')) {
            return 'Building Type (Cow Barn)';
        } else if (pasture.filename && pasture.filename.includes('pigbarn')) {
            return 'Building Type (Pig Barn)';
        } else if (pasture.filename && pasture.filename.includes('chickencoop')) {
            return 'Building Type (Chicken Coop)';
        } else if (pasture.filename && pasture.filename.includes('sheepbarn')) {
            return 'Building Type (Sheep Barn)';
        } else if (pasture.filename && pasture.filename.includes('horsestable')) {
            return 'Building Type (Horse Stable)';
        } else if (this.hasFencing(pasture)) {
            return 'Custom Fence Area';
        } else {
            return 'Default Estimate';
        }
    }

    getCapacityCalculationMethod(pasture) {
        if (this.hasFencing(pasture)) {
            const fenceDetails = window.fenceCalculationDetails?.[pasture.id];
            if (fenceDetails) {
                return {
                    type: 'fence_area',
                    description: 'Calculated from custom fence perimeter using polygon area formula',
                    formula: `${fenceDetails.area.toFixed(1)} sq meters × ${fenceDetails.animalsPerSqMeter} animals/sq meter = ${fenceDetails.rawCapacity} animals (min 5)`,
                    details: `Shoelace formula applied to ${fenceDetails.segmentCount} fence segments. Final capacity: ${pasture.capacity} animals`
                };
            } else {
                return {
                    type: 'fence_area',
                    description: 'Calculated from custom fence perimeter using polygon area formula',
                    formula: 'Area (sq meters) × 0.01 animals/sq meter = Capacity',
                    details: 'Uses shoelace formula to calculate enclosed area from fence coordinates'
                };
            }
        } else {
            const filename = pasture.filename || '';
            const estimatedCapacity = this.estimatePastureCapacity(filename);
            return {
                type: 'building_estimate',
                description: 'Estimated based on building type from filename',
                formula: `Standard building type → ${estimatedCapacity} animals`,
                details: `Building: ${filename || 'Unknown'} → Standard capacity for this building type`
            };
        }
    }

    hasFencing(pasture) {
        // This would ideally check if the pasture was created with fence calculation
        // For now, we'll use a heuristic based on capacity values
        const filename = pasture.filename || '';
        const estimatedCapacity = this.estimatePastureCapacity(filename);
        return pasture.capacity && pasture.capacity !== estimatedCapacity;
    }

    getWarningTypeTitle(type) {
        const titles = {
            'health': 'Health Warning',
            'capacity': 'Capacity Warning', 
            'food': 'Food Warning',
            'production': 'Production Notice',
            'maintenance': 'Maintenance Required',
            'breeding': 'Breeding Notice',
            'age': 'Age Management',
            'dairy_optimization': 'Dairy Optimization'
        };
        return titles[type] || 'Warning';
    }
    
    updatePastureDisplay() {
        if (!this.pastures) {
            this.parsePastureData();
        }
        
        // Update summary cards
        const totalPastures = this.pastures.length;
        const totalLivestock = this.pastures.reduce((sum, pasture) => sum + pasture.animalCount, 0);
        const totalBirthWarnings = this.pastures.reduce((sum, pasture) => sum + pasture.birthWarnings.length, 0);
        const totalAllWarnings = this.pastures.reduce((sum, pasture) => sum + pasture.allWarnings.length, 0);
        const avgHealth = totalLivestock > 0 
            ? (this.pastures.reduce((sum, pasture) => sum + (pasture.avgHealth * pasture.animalCount), 0) / totalLivestock).toFixed(1)
            : 0;
        
        document.getElementById('total-pastures-count').textContent = totalPastures;
        document.getElementById('pasture-livestock-count').textContent = totalLivestock;
        document.getElementById('birth-warnings-count').textContent = totalBirthWarnings;
        document.getElementById('pasture-avg-health').textContent = avgHealth + '%';
        
        // Update pastures list
        this.renderPasturesList();
        
        // Update main dashboard count
        const pastureCountElement = document.getElementById('pasture-count');
        if (pastureCountElement) {
            pastureCountElement.textContent = `${totalPastures} Pastures`;
        }
        
        // Update warning badge on dashboard
        const warningBadge = document.getElementById('pasture-warnings-badge');
        const warningCount = document.getElementById('pasture-warnings-count');
        if (warningBadge && warningCount) {
            if (totalAllWarnings > 0) {
                warningCount.textContent = totalAllWarnings;
                warningBadge.classList.remove('d-none');
            } else {
                warningBadge.classList.add('d-none');
            }
        }
    }
    
    renderPasturesList() {
        const pasturesContainer = document.getElementById('pastures-list');
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
        
        const pasturesHTML = this.pastures.map(pasture => `
            <div class="card bg-dark mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="bi bi-house-door me-2"></i>
                        ${pasture.name}
                    </h6>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-info btn-sm" onclick="dashboard.showPastureDetails('${pasture.id}')">
                            <i class="bi bi-eye me-1"></i>Details
                        </button>
                        <button class="btn btn-outline-success btn-sm" onclick="dashboard.showPastureLivestock('${pasture.id}')">
                            <i class="bi bi-table me-1"></i>Livestock
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-list-ol me-2 text-farm-accent"></i>
                                <span><strong>Animals:</strong> ${pasture.animalCount}</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-heart-pulse me-2 text-farm-success"></i>
                                <span><strong>Avg Health:</strong> ${pasture.avgHealth}%</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-exclamation-triangle me-2 text-farm-warning"></i>
                                <span><strong>All Warnings:</strong> ${pasture.allWarnings.length}</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-speedometer2 me-2 text-farm-info"></i>
                                <span><strong>Productivity:</strong> ${pasture.conditionReport.productivity}%</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-droplet me-2 text-primary"></i>
                                <span><strong>Milk:</strong> ${pasture.conditionReport.milk}L/day</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">  
                                <i class="bi bi-recycle me-2 text-warning"></i>
                                <span><strong>Manure:</strong> ${pasture.conditionReport.manure}/day</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-basket me-2 text-success"></i>
                                <span><strong>Food Capacity:</strong> ${pasture.foodReport.totalCapacity}L</span>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="bi bi-menu-up me-2 text-muted"></i>
                                <span><strong>Mixed Ration:</strong> ${pasture.foodReport.totalMixedRation}L</span>
                            </div>
                        </div>
                    </div>
                    
                    ${pasture.allWarnings.length > 0 ? `
                        <div class="mt-3">
                            <h6 class="text-warning">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                Active Warnings
                            </h6>
                            <div class="row">
                                ${pasture.allWarnings.map((warning, index) => `
                                    <div class="col-md-6 mb-2">
                                        <div class="alert alert-${warning.severity === 'danger' ? 'danger' : warning.severity === 'warning' ? 'warning' : 'info'} alert-sm py-2 warning-clickable" 
                                             style="cursor: pointer;" 
                                             onclick="dashboard.showWarningDetails('${pasture.id}', ${index})">
                                            <i class="bi bi-${warning.icon} me-2"></i>
                                            ${warning.message}
                                            <i class="bi bi-chevron-right float-end"></i>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        pasturesContainer.innerHTML = pasturesHTML;
    }
    
    showPastureDetails(pastureId) {
        const pasture = this.pastures.find(p => p.id === pastureId);
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
        const existingModal = document.getElementById('pasture-details-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body and show
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('pasture-details-modal'));
        modal.show();
    }
    
    showPastureLivestock(pastureId) {
        const pasture = this.pastures.find(p => p.id === pastureId);
        if (!pasture) return;
        
        this.renderPastureLivestockTable(pasture.animals, `${pasture.name} Livestock`);
        const modal = new bootstrap.Modal(document.getElementById('pasturelivestock-modal'));
        modal.show();
    }
    
    showAllPastureLivestock() {
        // Combine all animals from all pastures
        const allAnimals = this.pastures.flatMap(pasture => pasture.animals);
        this.renderPastureLivestockTable(allAnimals, 'All Pasture Livestock');
        const modal = new bootstrap.Modal(document.getElementById('pasturelivestock-modal'));
        modal.show();
    }
    
    renderPastureLivestockTable(animals, title) {
        const modalTitle = document.getElementById('pastureModal-title');
        const tableContainer = document.getElementById('pasture-livestock-table-container');
        
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
                        ${animals.map(animal => {
                            const statusBadges = [];
                            if (animal.health === 0) statusBadges.push('<span class="badge bg-danger">Error</span>');
                            if (animal.isPregnant) statusBadges.push('<span class="badge status-pregnant">Pregnant</span>');
                            if (animal.isLactating) statusBadges.push('<span class="badge status-lactating">Lactating</span>');
                            if (animal.isParent) statusBadges.push('<span class="badge status-parent">Parent</span>');
                            
                            const healthClass = this.getHealthClass(animal.health);
                            const healthBar = `
                                <div style="display: flex; align-items: center;">
                                    <div class="health-bar">
                                        <div class="health-fill ${healthClass}" style="width: ${animal.health}%"></div>
                                    </div>
                                    <span class="ms-2">${animal.health.toFixed(1)}%</span>
                                </div>
                            `;
                            
                            return `
                                <tr>
                                    <td><small class="text-muted">#${animal.id}</small></td>
                                    <td>${animal.name || `Animal #${animal.id}`}</td>
                                    <td>${this.formatAnimalType(animal.subType)}</td>
                                    <td>${this.capitalize(animal.gender)}</td>
                                    <td>${animal.age} months</td>
                                    <td>${healthBar}</td>
                                    <td>${animal.weight.toFixed(1)} kg</td>
                                    <td>${(animal.reproduction * 100).toFixed(1)}%</td>
                                    <td>${statusBadges.join(' ') || '-'}</td>
                                    <td>${this.formatLocation(animal.location, animal.locationType)}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-success" onclick="dashboard.showAnimalDetails('${animal.id}')">
                                            <i class="bi bi-eye me-1"></i>Details
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        tableContainer.innerHTML = tableHTML;
        
        // Initialize DataTable for the pasture livestock table
        setTimeout(() => {
            $('#pasture-livestock-table').DataTable({
                pageLength: 25,
                responsive: true,
                order: [[1, 'asc']], // Sort by name by default
                language: {
                    search: "Search animals:",
                    lengthMenu: "Show _MENU_ animals per page",
                    info: "Showing _START_ to _END_ of _TOTAL_ animals",
                    emptyTable: "No animals found"
                }
            });
        }, 100);
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
                `<code class="text-muted">${animal.id}</code>`,
                `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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
            order: [[1, 'asc']], // Sort by name by default (now column 1)
            columnDefs: [
                {
                    targets: [0], // ID column - smaller width
                    width: '80px'
                },
                {
                    targets: [5], // Health column (shifted by 1)
                    orderable: false
                },
                {
                    targets: [8], // Status column (shifted by 1)
                    orderable: false
                },
                {
                    targets: [10], // Actions column (shifted by 1)
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
        
        // Initialize sliders for the first time or after table recreation
        this.initializeSliders();
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

        modalTitle.innerHTML = `<i class="bi bi-clipboard-data me-2"></i>${animal.name || `Animal #${animal.id}`}`;

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
                            <small class="text-muted mt-2 d-block">Farm ID: ${animal.id}</small>
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
                                        <tr><td><strong>Name:</strong></td><td>${animal.name || `Animal #${animal.id}`}</td></tr>
                                        <tr><td><strong>ID:</strong></td><td>${animal.id}</td></tr>
                                        <tr><td><strong>Type:</strong></td><td>${this.formatAnimalType(animal.subType)}</td></tr>
                                        <tr><td><strong>Gender:</strong></td><td>${this.capitalize(animal.gender)}</td></tr>
                                        <tr><td><strong>Age:</strong></td><td>${animal.age} months</td></tr>
                                        <tr><td><strong>Variation:</strong></td><td>${animal.variation}</td></tr>
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
                                        <tr><td><strong>Health:</strong></td><td>${animal.health.toFixed(1)}%</td></tr>
                                        <tr><td><strong>Weight:</strong></td><td>${animal.weight.toFixed(1)} kg</td></tr>
                                        <tr><td><strong>Reproduction:</strong></td><td>${(animal.reproduction * 100).toFixed(1)}%</td></tr>
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
                                        <tr><td><strong>Parent:</strong></td><td>${animal.isParent ? 'Yes' : 'No'}</td></tr>
                                        <tr><td><strong>Pregnant:</strong></td><td>${animal.isPregnant ? 'Yes' : 'No'}</td></tr>
                                        <tr><td><strong>Lactating:</strong></td><td>${animal.isLactating ? 'Yes' : 'No'}</td></tr>
                                        <tr><td><strong>Months Since Birth:</strong></td><td>${animal.monthsSinceLastBirth}</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <table class="table table-sm table-borderless table-dark text-light">
                                        ${animal.isPregnant ? this.getPregnancyDetails(animal) : ''}
                                        <tr><td><strong>Mother ID:</strong></td><td>${animal.motherId !== '-1' ? animal.motherId : 'Unknown'}</td></tr>
                                        <tr><td><strong>Father ID:</strong></td><td>${animal.fatherId !== '-1' ? animal.fatherId : 'Unknown'}</td></tr>
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
                                <tr><td><strong>Location:</strong></td><td>${animal.location}</td></tr>
                                <tr><td><strong>Location Type:</strong></td><td>${animal.locationType}</td></tr>
                                <tr><td><strong>Farm ID:</strong></td><td>${animal.farmId}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                ${animal.genetics ? `
                <div class="col-md-6">
                    <div class="card bg-secondary mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-dna me-2"></i>Genetics</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless table-dark text-light">
                                <tr><td><strong>Metabolism:</strong></td><td>${(animal.genetics.metabolism * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Quality:</strong></td><td>${(animal.genetics.quality * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Health:</strong></td><td>${(animal.genetics.health * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Fertility:</strong></td><td>${(animal.genetics.fertility * 100).toFixed(1)}%</td></tr>
                                <tr><td><strong>Productivity:</strong></td><td>${(animal.genetics.productivity * 100).toFixed(1)}%</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
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
            Name: animal.name || `Animal #${animal.id}`,
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
                    `<code class="text-muted">${animal.id}</code>`,
                    `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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

    // Filter Management Functions
    toggleFilters() {
        const panel = document.getElementById('filters-panel');
        const toggleBtn = document.getElementById('filter-toggle-btn');
        
        if (panel.classList.contains('d-none')) {
            panel.classList.remove('d-none');
            toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Filters';
        } else {
            panel.classList.add('d-none');
            toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i> Show Filters';
        }
    }

    resetFilters() {
        // Clear all filter inputs
        document.getElementById('age-min').value = '';
        document.getElementById('age-max').value = '';
        document.getElementById('weight-min').value = '';
        document.getElementById('weight-max').value = '';
        
        // Reset slider values to full range
        const sliderTypes = ['health', 'metabolism', 'fertility', 'quality', 'productivity'];
        sliderTypes.forEach(type => {
            const minSlider = document.getElementById(`${type}-min`);
            const maxSlider = document.getElementById(`${type}-max`);
            if (minSlider && maxSlider) {
                minSlider.value = 0;
                maxSlider.value = 100;
            }
        });
        
        // Update slider displays and fills
        this.updateSliderDisplays();
        
        // Reset active filters
        this.activeFilters = {};
        
        // Hide active filters display
        document.getElementById('active-filters').style.display = 'none';
        
        // Apply filters (which will show all animals)
        this.applyFilters();
        
        this.showSuccessMessage('All filters cleared');
    }

    applyFilters(isSliderChange = false) {
        // Collect filter values
        const filters = {
            ageMin: parseFloat(document.getElementById('age-min').value) || null,
            ageMax: parseFloat(document.getElementById('age-max').value) || null,
            weightMin: parseFloat(document.getElementById('weight-min').value) || null,
            weightMax: parseFloat(document.getElementById('weight-max').value) || null,
            healthMin: parseFloat(document.getElementById('health-min').value) || 0,
            healthMax: parseFloat(document.getElementById('health-max').value) || 100,
            metabolismMin: parseFloat(document.getElementById('metabolism-min').value) || 0,
            metabolismMax: parseFloat(document.getElementById('metabolism-max').value) || 100,
            fertilityMin: parseFloat(document.getElementById('fertility-min').value) || 0,
            fertilityMax: parseFloat(document.getElementById('fertility-max').value) || 100,
            qualityMin: parseFloat(document.getElementById('quality-min').value) || 0,
            qualityMax: parseFloat(document.getElementById('quality-max').value) || 100,
            productivityMin: parseFloat(document.getElementById('productivity-min').value) || 0,
            productivityMax: parseFloat(document.getElementById('productivity-max').value) || 100
        };

        // Store active filters for display
        this.activeFilters = filters;

        // Filter animals
        let filteredAnimals = [...this.animals];

        // Apply age filter
        if (filters.ageMin !== null) {
            filteredAnimals = filteredAnimals.filter(animal => animal.age >= filters.ageMin);
        }
        if (filters.ageMax !== null) {
            filteredAnimals = filteredAnimals.filter(animal => animal.age <= filters.ageMax);
        }

        // Apply weight filter
        if (filters.weightMin !== null) {
            filteredAnimals = filteredAnimals.filter(animal => animal.weight >= filters.weightMin);
        }
        if (filters.weightMax !== null) {
            filteredAnimals = filteredAnimals.filter(animal => animal.weight <= filters.weightMax);
        }

        // Apply genetics filters with range sliders
        filteredAnimals = filteredAnimals.filter(animal => {
            if (!animal.genetics) return false;
            
            const healthPercent = animal.health;
            const metabolismPercent = animal.genetics.metabolism * 100;
            const fertilityPercent = animal.genetics.fertility * 100;
            const qualityPercent = animal.genetics.quality * 100;
            const productivityPercent = animal.genetics.productivity * 100;
            
            return (
                healthPercent >= filters.healthMin && healthPercent <= filters.healthMax &&
                metabolismPercent >= filters.metabolismMin && metabolismPercent <= filters.metabolismMax &&
                fertilityPercent >= filters.fertilityMin && fertilityPercent <= filters.fertilityMax &&
                qualityPercent >= filters.qualityMin && qualityPercent <= filters.qualityMax &&
                productivityPercent >= filters.productivityMin && productivityPercent <= filters.productivityMax
            );
        });

        // Update table with filtered results
        this.updateTableWithFilteredAnimals(filteredAnimals);
        
        // Update active filters display
        this.updateActiveFiltersDisplay();
        
        // Show result message only if not from slider change
        if (!isSliderChange) {
            this.showInfoMessage(`Showing ${filteredAnimals.length} of ${this.animals.length} animals`);
        }
    }

    // Slider Management Functions
    initializeSliders() {
        const sliderTypes = ['health', 'metabolism', 'fertility', 'quality', 'productivity'];
        
        // Initialize debounce timer
        this.filterDebounceTimer = null;
        
        sliderTypes.forEach(type => {
            const minSlider = document.getElementById(`${type}-min`);
            const maxSlider = document.getElementById(`${type}-max`);
            const fillElement = document.getElementById(`${type}-fill`);
            
            if (minSlider && maxSlider && fillElement) {
                // Set initial values
                minSlider.value = 0;
                maxSlider.value = 100;
                
                // Add event listeners
                minSlider.addEventListener('input', () => this.handleSliderChange(type, 'min'));
                maxSlider.addEventListener('input', () => this.handleSliderChange(type, 'max'));
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
            if (position === 'min' && minVal > maxVal) {
                maxSlider.value = minVal;
                maxVal = minVal;
            }
            
            // Ensure max doesn't go below min
            if (position === 'max' && maxVal < minVal) {
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
        const sliderTypes = ['health', 'metabolism', 'fertility', 'quality', 'productivity'];
        
        sliderTypes.forEach(type => {
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
            const leftPercent = minVal;
            const rightPercent = 100 - maxVal;
            
            // Update the fill bar to show selected range
            fillElement.style.left = `${leftPercent}%`;
            fillElement.style.right = `${rightPercent}%`;
            
            // Add visual feedback for active ranges
            if (minVal > 0 || maxVal < 100) {
                fillElement.style.opacity = '1';
                fillElement.parentElement.classList.add('filter-active');
            } else {
                fillElement.style.opacity = '0.3';
                fillElement.parentElement.classList.remove('filter-active');
            }
        }
    }
    
    getPregnancyDetails(animal) {
        // Get gestation period based on animal type
        const gestationPeriods = {
            'COW': 9,      // 9 months
            'PIG': 4,      // 4 months  
            'SHEEP': 5,    // 5 months
            'GOAT': 5,     // 5 months
            'HORSE': 11,   // 11 months
            'CHICKEN': 1   // 1 month (21 days)
        };
        
        // Expected offspring counts based on animal type
        const expectedOffspring = {
            'COW': 1,
            'PIG': '8-12',
            'SHEEP': '1-2', 
            'GOAT': '1-2',
            'HORSE': 1,
            'CHICKEN': '8-15'
        };
        
        const animalType = animal.type || animal.subType.split('_')[0];
        const gestationMonths = gestationPeriods[animalType] || 6; // Default 6 months if unknown
        const expectedCount = expectedOffspring[animalType] || '1-2';
        
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
        
        const monthsRemaining = Math.max(0, Math.round(gestationMonths * (1 - pregnancyProgress)));
        
        let dueDateText = 'Unknown';
        if (monthsRemaining === 0) {
            dueDateText = '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>Due Soon</span>';
        } else if (monthsRemaining === 1) {
            dueDateText = `~${monthsRemaining} month`;
        } else {
            dueDateText = `~${monthsRemaining} months`;
        }
        
        return `
            <tr><td><strong>Est. Due Date:</strong></td><td>${dueDateText}</td></tr>
            <tr><td><strong>Expected Count:</strong></td><td>${expectedCount}</td></tr>
            <tr><td><strong>Pregnancy Progress:</strong></td><td>${(pregnancyProgress * 100).toFixed(0)}%</td></tr>
        `;
    }

    updateTableWithFilteredAnimals(filteredAnimals) {
        if (!this.dataTable) return;

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
                `<code class="text-muted">${animal.id}</code>`,
                `<strong>${animal.name || `Animal #${animal.id}`}</strong>`,
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

    updateActiveFiltersDisplay() {
        const activeFiltersDiv = document.getElementById('active-filters');
        const activeFiltersList = document.getElementById('active-filters-list');
        
        const filterDisplays = [];

        // Age filter
        if (this.activeFilters.ageMin !== null || this.activeFilters.ageMax !== null) {
            let ageText = 'Age: ';
            if (this.activeFilters.ageMin !== null && this.activeFilters.ageMax !== null) {
                ageText += `${this.activeFilters.ageMin}-${this.activeFilters.ageMax} months`;
            } else if (this.activeFilters.ageMin !== null) {
                ageText += `≥${this.activeFilters.ageMin} months`;
            } else {
                ageText += `≤${this.activeFilters.ageMax} months`;
            }
            filterDisplays.push(`<span class="badge bg-farm-primary me-1">${ageText}</span>`);
        }

        // Weight filter
        if (this.activeFilters.weightMin !== null || this.activeFilters.weightMax !== null) {
            let weightText = 'Weight: ';
            if (this.activeFilters.weightMin !== null && this.activeFilters.weightMax !== null) {
                weightText += `${this.activeFilters.weightMin}-${this.activeFilters.weightMax} kg`;
            } else if (this.activeFilters.weightMin !== null) {
                weightText += `≥${this.activeFilters.weightMin} kg`;
            } else {
                weightText += `≤${this.activeFilters.weightMax} kg`;
            }
            filterDisplays.push(`<span class="badge bg-farm-primary me-1">${weightText}</span>`);
        }

        // Genetics filters
        const geneticsFilters = ['health', 'metabolism', 'fertility', 'quality', 'productivity'];
        geneticsFilters.forEach(filter => {
            if (this.activeFilters[filter]) {
                const displayName = filter.charAt(0).toUpperCase() + filter.slice(1);
                const rating = this.activeFilters[filter].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                filterDisplays.push(`<span class="badge bg-farm-accent text-dark me-1">${displayName}: ${rating}</span>`);
            }
        });

        if (filterDisplays.length > 0) {
            activeFiltersList.innerHTML = filterDisplays.join('');
            activeFiltersDiv.style.display = 'block';
        } else {
            activeFiltersDiv.style.display = 'none';
        }
    }

}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new LivestockDashboard();
});