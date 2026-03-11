export function showVehiclesSection() {
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

            <div class="row" id="vehicles-grid">
                </div>
        `;

  document.getElementById("section-content").innerHTML = vehiclesHTML;
  document.getElementById("section-content").classList.remove("d-none");

  // Load and display vehicles
  this.loadVehicles();
}

// Generate vehicle display using local images
export function generateVehicleDisplay(vehicleName, brandName, typeName) {
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
export function getLocalVehicleImage(vehicleName, brandName, typeName) {
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
export function findVehicleImageDynamic(vehicleName, brandName, typeName) {
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
    
    // User-provided extensive image files list
    const imageFiles = [
      "_10_FS25_Massey_Ferguson_MF_5700_S.png",
      "_100_FS25_Albutt_Bale_Spike.png",
      "_101_FS25_Albutt_Bale_King.png",
      "_102_200px-FS25_Albutt_F155A_Bale_Fork.png",
      "_103_FS25_Albutt_Manure_Fork.png",
      "_104_FS25_Albutt_Fork_with_Grapple.png",
      "_105_FS25_Albutt_Roundbale_Fork.png",
      "_106_FS25_Albutt_Bale_Handler.png",
      "_107_FS25_Albutt_Log_Fork.png",
      "_108_FS25_Albutt_Silage_Cutter.png",
      "_109_FS25_GÖWEIL_Bale_Handler_RBG_FL.png",
      "_11_FS25_Antonio_Carraro_Tony_10900_TTR.png",
      "_110_FS25_GÖWEIL_Bale_Handler_BTGQU_FL.png",
      "_111_FS25_Quicke_BIG_BAG_LIFTER_-_SINGLE.png",
      "_112_FS25_Quicke_BIG_BAG_LIFTER_-_DUAL.png",
      "_113_FS25_Fliegl_Ruby_2000.png",
      "_114_FS25_Manitou_MLT_841-145_PS%2B.png",
      "_115_FS25_JCB_541-70_AGRI_PRO.png",
      "_116_FS25_Sennebogen_340G_icon.png",
      "_117_FS25_Fendt_Cargo_T740.png",
      "_118_FS25_Merlo_MF44.9CS-170-CVTRONIC.png",
      "_119_FS25_Schäffer_9660_T-2.png",
      "_12_FS25_Antonio_Carraro_Mach_4R.png",
      "_120_FS25_MAGSI_Universal_Bucket.png",
      "_121_FS25_MAGSI_Pallet_Fork.png",
      "_122_FS25_MAGSI_Bale_Fork.png",
      "_123_FS25_MAGSI_Wrapped_Bale_Handler.png",
      "_124_FS25_MAGSI_Manure_Fork.png",
      "_125_FS25_MAGSI_Log_Fork.png",
      "_126_FS25_GÖWEIL_Bale_Handler_RBG_TL.png",
      "_127_FS25_GÖWEIL_Bale_Handler_BTGQU_TL.png",
      "_128_200px-FS25_Albutt_F155A_TL.png",
      "_129_FS25_JCB_435S_icon.png",
      "_13_FS25_Fendt_300_Vario.png",
      "_130_FS25_Volvo_L120H.png",
      "_131_FS25_Volvo_L120H_Electric_Conversion.png",
      "_132_FS25_Volvo_L180H.png",
      "_133_FS25_McCormack_High-Dump_Bucket.png",
      "_134_FS25_MAGSI_Pallet_Fork_WL.png",
      "_135_FS25_MAGSI_Log_Fork_WL.png",
      "_136_FS25_McCormack_Bale_Fork.png",
      "_137_200px-FS25_Albutt_F155A_WL.png",
      "_138_FS25_Albutt_SitePro.png",
      "_139_FS25_Albutt_Silage_Fork.png",
      "_14_FS25_John_Deere_3650.png",
      "_140_FS25_Volvo_Pallet_Fork.png",
      "_141_FS25_Volvo_Big_Bag_Lifter.png",
      "_142_FS25_Volvo_Rock_Bucket_-_Spade_Nose.png",
      "_143_FS25_Volvo_General_Purpose_Bucket_-_Heavy_Duty.png",
      "_144_FS25_Volvo_High_Tip_Bucket.png",
      "_145_FS25_Volvo_Pallet_Fork_L180H.png",
      "_146_FS25_Volvo_Big_Bag_Lifter_L180H.png",
      "_147_FS25_Volvo_Unloading_Grapple_L180H.png",
      "_148_FS25_Volvo_Rock_Bucket_-_Spade_Nose_L180H.png",
      "_149_FS25_Volvo_General_Purpose_Bucket_-_Heavy_Duty_L180H.png",
      "_15_FS25_Zetor_FORTERRA_HSX.png",
      "_150_FS25_Volvo_High_Tip_Bucket_L180H.png",
      "_151_FS25_New_Holland_L318.png",
      "_152_FS25_Kubota_SVL_97-2.png",
      "_153_FS25_Paladin_High-Dump_Bucket.png",
      "_154_FS25_Paladin_Pallet_Fork.png",
      "_155_FS25_Paladin_Bale_Spear.png",
      "_156_FS25_Paladin_Wrapped_Bale_Handler.png",
      "_157_FS25_Paladin_Manure_Fork.png",
      "_158_FS25_Paladin_Brush_%26_Log_Fork.png",
      "_159_FS25_Paladin_Stump_Grinder.png",
      "_16_FS25_Iseki_TJW.png",
      "_160_FS25_Paladin_SFB_750.png",
      "_161_FS25_Jungheinrich_EFG_S50.png",
      "_162_FS25_Manitou_M50-4.png",
      "_163_FS25_Salek_ANS-1900.png",
      "_164_FS25_Farmtech_EDK_650.png",
      "_165_FS25_Krampe_HALFPIPE_HP_20.png",
      "_166_FS25_Farmtech_DDK_2400.png",
      "_167_FS25_Rudolph_DK_280_RP.png",
      "_168_FS25_Rudolph_TDK_301_RP.png",
      "_169_FS25_Rudolph_TDK_301_RA.png",
      "_17_FS25_Fendt_500_Vario.png",
      "_170_FS25_Brantner_Z_18051-2_XXL_Power_Flex.png",
      "_171_FS25_Krampe_Big_Body_750_S.png",
      "_172_FS25_Brantner_DD_24073-2_XXL.png",
      "_173_FS25_Fliegl_ASW_271.png",
      "_174_FS25_Brantner_TR_34090-2_PT%2B.png",
      "_175_FS25_Krampe_RamBody_AS_750%2B.png",
      "_176_FS25_Kaweco_Radium_255.png",
      "_177_FS25_KRONE_GX_520.png",
      "_178_FS25_BERGMANN_HTW_65.png",
      "_179_FS25_Fliegl_Büffel.png",
      "_18_FS25_Lindner_Lintrac_130.png",
      "_180_FS25_Hawe_KUW_2000.png",
      "_181_FS25_Demco_850_Single_Auger_Grain_Cart.png",
      "_182_FS25_BERGMANN_GTW_330.png",
      "_183_FS25_J%26M_X-Tended_Reach_1112.png",
      "_184_FS25_Convey-All_CST_1550.png",
      "_185_FS25_Elmer's_Manufacturing_HaulMaster.png",
      "_186_FS25_Hawe_SUW_5000.png",
      "_187_FS25_BERGMANN_RRW_500.png",
      "_188_FS25_AMITYTECH_Crop_Chaser_1000.png",
      "_189_FS25_Walkabout_WMB_4000.png",
      "_19_FS25_Same_Virtus_135_RVShift.png",
      "_190_FS25_Brandt_2500_DXT.png",
      "_191_FS25_ANNABURGER_HTS_22B.79.png",
      "_192_FS25_ANNABURGER_AW_22.17.png",
      "_193_FS25_ANNABURGER_AW_22.07.png",
      "_194_FS25_ANNABURGER_AW_22.16.png",
      "_195_FS25_ANNABURGER_AW_22.27.png",
      "_196_FS25_Farmtech_DPW_1800.png",
      "_197_FS25_Kröger_PWO_24.png",
      "_198_FS25_KRONE_Trailer_Profi_Liner.png",
      "_199_FS25_Fliegl_DTS_5.9.png",
      "_20_FS25_DEUTZ-FAHR_6C_RVShift.png",
      "_200_FS25_Demco_Steel_Drop_Deck.png",
      "_201_FS25_LODE_KING_Renown_Drop_Deck.png",
      "_202_FS25_Schwarzmüller_Low_Loader_4A.png",
      "_203_FS25_Brandt_H550_Beavertail.png",
      "_204_FS25_LODE_KING_Distinction_Triple_Hopper.png",
      "_205_FS25_Krampe_SKS_30-1050.png",
      "_206_FS25_LODE_KING_Prestige_Super-B.png",
      "_207_FS25_PITTS_Trailers_LT40-8L.png",
      "_208_FS25_Trout_River_Live_Bottom_Rear_Lift.png",
      "_209_FS25_PÖTTINGER_SERVO_25.png",
      "_21_200px-FS25_CLAAS_ARION_550-530.png",
      "_210_FS25_AGROMASZ_POV_5_XL.png",
      "_211_FS25_PÖTTINGER_SERVO_T_6000_P.png",
      "_212_FS25_LEMKEN_Titan_18.png",
      "_213_FS25_Kverneland_PW_100_-_12.png",
      "_214_FS25_Knoche_ECO-CULTIVATOR_300.png",
      "_215_FS25_John_Deere_980.png",
      "_216_FS25_AMAZONE_Cenio_4000_Super.png",
      "_217_FS25_AGROMASZ_GRIZZLY_X4.png",
      "_218_FS25_LEMKEN_Smaragd_9-500K.png",
      "_219_FS25_Treffler_TGA_560.png",
      "_22_FS25_Massey_Ferguson_MF_7S.png",
      "_220_200px-FS25_HORSCH_Finer_6_SL.png",
      "_221_FS25_PÖTTINGER_TERRIA_6040.png",
      "_222_200px-FS25_Väderstad_TopDown_600.png",
      "_223_FS25_KUHN_PROLANDER_7500.png",
      "_224_FS25_HORSCH_Tiger_8_MT.png",
      "_225_FS25_LEMKEN_Koralin_9-840.png",
      "_226_FS25_Einböck_TAIFUN_900_RP58.png",
      "_227_FS25_Väderstad_NZ_Extreme_1425.png",
      "_228_FS25_Summers_Superchisel_CP2050.png",
      "_229_FS25_Salek_TB-100.png",
      "_23_200px-FS25_Fiat_160-90_DT.png",
      "_230_FS25_Knoche_CROSSMAX_300.png",
      "_231_FS25_Unia_ARES_XL.png",
      "_232_FS25_Väderstad_Carrier_XL_625.png",
      "_233_FS25_Dalbo_Powerchain_800.png",
      "_234_FS25_PÖTTINGER_Terradisc_10001T.png",
      "_235_FS25_Farmet_Softer_11_PS.png",
      "_236_FS25_KINZE_Mach_Till_412.png",
      "_237_FS25_Bednar_SWIFTERDISC_XE_18400_MEGA.png",
      "_238_FS25_Salford_Independent_Series_1260.png",
      "_239_FS25_HORSCH_Kredo_3.png",
      "_24_FS25_Challenger_MT600_Series.png",
      "_240_FS25_KUHN_HR_6040_RCS.png",
      "_241_FS25_Bednar_KATOR_KN_8000Q_PROFI.png",
      "_242_FS25_Salek_AKP-122.png",
      "_243_FS25_AGRISEM_Disc-O-Vigne_V.png",
      "_244_FS25_ALPEGO_K-DYNO_5-200.png",
      "_245_FS25_ALPEGO_K-FORCE_400.png",
      "_246_FS25_AGRISEM_Combiplow_Gold.png",
      "_247_FS25_ALPEGO_K-EXTREME_11-500.png",
      "_248_FS25_Salek_MUL-1000.png",
      "_249_FS25_TMC_Cancela_TPN_140.png",
      "_25_FS25_AGCO_White_8010_Series.png",
      "_250_FS25_TMC_Cancela_TDE-220.png",
      "_251_FS25_Knoche_SPEEDMAX_300.png",
      "_252_FS25_TMC_Cancela_TMS2-300D.png",
      "_253_FS25_Knoche_SPEEDMAX_560.png",
      "_254_FS25_Bednar_MULCHER_MM_7000.png",
      "_255_FS25_HORSCH_Cultro_12_TC.png",
      "_256_FS25_Farmax_Rapide_450_Trailed.png",
      "_257_FS25_ELHO_Scorpio_550.png",
      "_258_FS25_HORSCH_Versa_3_KR.png",
      "_259_FS25_Unia_FENIX_3000-4.png",
      "_26_FS25_Zetor_CRYSTAL_HD.png",
      "_260_FS25_Great_Plains_SOLID_STAND_1500.png",
      "_261_FS25_AGROMASZ_AQUILA_DRIVE_400.png",
      "_262_200px-FS25_PÖTTINGER_AEROSEM_VT_5000_DD.png",
      "_263_FS25_KUHN_HR_6040_RCS_%2B_BTFR_6030.png",
      "_264_FS25_Bednar_Omega_OO_6000_FL.png",
      "_265_FS25_KUHN_ESPRO_6000_RC.png",
      "_266_FS25_Köckerling_Ultima_800.png",
      "_267_FS25_Novag_T-ForcePlus_950.png",
      "_268_FS25_LEMKEN_Solitair_12.png",
      "_269_FS25_AMAZONE_Citan_15001-C.png",
      "_27_FS25_Kubota_M8_SERIES.png",
      "_270_FS25_Väderstad_Seed_Hawk_84.png",
      "_271_FS25_MZURI_PRO-TIL_4T_Xzact.png",
      "_272_FS25_AMAZONE_Precea_4500-2C_Super.png",
      "_273_FS25_KUHN_MAXIMA_3_TI_L.png",
      "_274_FS25_HORSCH_Maestro_9.75_RX.png",
      "_275_FS25_Grimme_MATRIX_1800.png",
      "_276_FS25_Kverneland_Optima_RS.png",
      "_277_FS25_HORSCH_Maestro_24.50_SV.png",
      "_278_FS25_KINZE_4905_Blue_Drive.png",
      "_279_FS25_Väderstad_Tempo_K24.png",
      "_28_FS25_John_Deere_6R_Series.png",
      "_280_FS25_KUHN_TF_1512.png",
      "_281_FS25_HORSCH_Partner_1600_FT.png",
      "_282_FS25_Väderstad_PD_1000.png",
      "_283_FS25_Hardi_MEGA_1200L.png",
      "_284_FS25_Hardi_MEGA_1200L_Tank.png",
      "_285_FS25_Hardi_AEON_5200_DELTA_FORCE.png",
      "_286_FS25_AMAZONE_UX_5201_Super.png",
      "_287_FS25_Agrio_DINO_II.png",
      "_288_FS25_Agrifac_Condor_Endurance_II.png",
      "_289_FS25_Fendt_Rogator_900.png",
      "_29_FS25_Fendt_700_Vario.png",
      "_290_FS25_Farmtech_Variofex_750.png",
      "_291_FS25_Brantner_TA_12050_Power_Spread_%2B.png",
      "_292_FS25_Hawe_DST_16.png",
      "_293_FS25_BERGMANN_TSW_6240_W.png",
      "_294_FS25_Samson_Agro_US_235_Dynamic.png",
      "_295_FS25_Salek_RZK_300H.png",
      "_296_FS25_AMAZONE_ZA-TS_3200.png",
      "_297_FS25_BREDAL_K105.png",
      "_298_FS25_AMAZONE_ZG-TS_10001.png",
      "_299_FS25_Salford_9620_Air_Boom_Applicator.png",
      "_3_FS25_Landini_REX_4_GT.png",
      "_30_FS25_Valtra_T_Series.png",
      "_300_FS25_Farmtech_Supercis_800.png",
      "_301_FS25_Fliegl_PFW_18000_MaxxLine_Plus.png",
      "_302_FS25_Kaweco_Profi_II.png",
      "_303_FS25_Samson_Agro_PG_II_28_Genesis.png",
      "_304_FS25_Kotte_PQ_32.000.png",
      "_305_FS25_OXBO_AT5105.png",
      "_306_FS25_GEA_EL48-6D-4800.png",
      "_307_FS25_GEA_EL48-8D-7900.png",
      "_308_FS25_Zunhammer_Vibro.png",
      "_309_FS25_Samson_Agro_SD_700.png",
      "_31_FS25_Case_IH_Puma_AFS_Connect.png",
      "_310_FS25_Bomech_Trac-Pack.png",
      "_311_FS25_Bomech_Multi_Profi_21-15.png",
      "_312_FS25_Bomech_Multi_4XL.png",
      "_313_FS25_Samson_Agro_SBH4_36.png",
      "_314_FS25_Zunhammer_ULT_18.png",
      "_315_FS25_Zunhammer_ULT_24.png",
      "_316_FS25_Kotte_TSA_30000.png",
      "_317_FS25_Kotte_FRC_65.png",
      "_318_FS25_GEA_STR-447.png",
      "_319_FS25_Gorenc_Puler_600.png",
      "_32_FS25_New_Holland_T7_LWB_PLMI.png",
      "_320_FS25_PÖTTINGER_ROTOCARE_V_12400.png",
      "_321_FS25_Einböck_PNEUMATICSTAR-PRO_1200.png",
      "_322_FS25_Elmer's_Manufacturing_Super_7.png",
      "_323_FS25_Einböck_AEROSTAR-CLASSIC_XXL_2400.png",
      "_324_FS25_Väderstad_Rexius_1230.png",
      "_325_FS25_Brandt_LandRoller_591A.png",
      "_326_FS25_Massey_Ferguson_MF_8570.png",
      "_327_FS25_CLAAS_EVION_450.png",
      "_328_FS25_Massey_Ferguson_Beta_7360_AL4.png",
      "_329_FS25_Fendt_5275_C_SL.png",
      "_33_FS25_STEYR_Absolut_CVT.png",
      "_330_200px-FS25_New_Holland_CH7.70.png",
      "_331_FS25_Case_IH_Axial-Flow_7150.png",
      "_332_FS25_John_Deere_S7.png",
      "_333_FS25_CLAAS_LEXION_6900.png",
      "_334_FS25_John_Deere_X9_1100.png",
      "_335_FS25_CLAAS_LEXION_8000.png",
      "_336_FS25_New_Holland_CR11.png",
      "_337_FS25_New_Holland_CR11_Gold_Edition.png",
      "_338_FS25_Case_IH_AF11.png",
      "_339_FS25_Massey_Ferguson_MF_8570_Header.png",
      "_34_FS25_DEUTZ-FAHR_AgroStar_8.31.png",
      "_340_FS25_CLAAS_VARIO_620.png",
      "_341_FS25_Massey_Ferguson_FreeFlow_25FT.png",
      "_342_FS25_Fendt_FreeFlow_25FT.png",
      "_343_200px-FS25_New_Holland_SuperFlex_25FT.png",
      "_344_FS25_Case_IH_3020_TerraFlex_25FT.png",
      "_345_200px-FS25_New_Holland_Varifeed_28FT.png",
      "_346_FS25_Case_IH_3050_TerraFlex_28FT.png",
      "_347_FS25_John_Deere_RDF35.png",
      "_348_FS25_CLAAS_CONVIO_FLEX_1080.png",
      "_349_FS25_John_Deere_HD45X.png",
      "_35_FS25_DEUTZ-FAHR_Series_7_TTV_HD.png",
      "_350_FS25_CLAAS_CONVIO_FLEX_1380.png",
      "_351_FS25_John_Deere_HD50F.png",
      "_352_FS25_MacDon_FD250_FlexDraper®.png",
      "_353_FS25_Case_IH_FD250_FlexDraper®.png",
      "_354_FS25_New_Holland_FD250_FlexDraper®.png",
      "_355_FS25_New_Holland_FD250_FlexDraper®_Gold_Edition.png",
      "_356_FS25_MacDon_FD140_FlexDraper®.png",
      "_357_200px-FS25_New_Holland_980CR_8-30.png",
      "_358_FS25_Case_IH_4408.png",
      "_359_FS25_Capello_Diamant_8.png",
      "_36_FS25_McCormick_X8_VT-Drive.png",
      "_360_FS25_GERINGHOFF_NorthStar_1230_FB.png",
      "_361_FS25_Case_IH_4418_N.png",
      "_362_FS25_New_Holland_980CR_18-30.png",
      "_363_FS25_John_Deere_C16F.png",
      "_364_FS25_GERINGHOFF_NorthStar_1830.png",
      "_365_FS25_GERINGHOFF_SunLite_40.png",
      "_366_FS25_GERINGHOFF_MiloStar_1630.png",
      "_367_FS25_MacDon_PW8.png",
      "_368_FS25_Massey_Ferguson_MF_8570_Trailer.png",
      "_369_FS25_Nardi_N20T.png",
      "_37_200px-FS25_John_Deere_6R_Series_230-250.png",
      "_370_FS25_Nardi_N40BX.png",
      "_371_FS25_Nardi_N70-30.png",
      "_372_FS25_Nardi_N60-35.png",
      "_373_FS25_Nardi_N70-40.png",
      "_374_FS25_Nardi_N60-45.png",
      "_375_FS25_Demco_HDHT_52.png",
      "_376_FS25_MacDon_M1240_icon_v2.png",
      "_377_FS25_MacDon_D140XL.png",
      "_378_FS25_MacDon_R216_SP.png",
      "_379_FS25_Lacotec_LH_II.png",
      "_38_FS25_DEUTZ-FAHR_Series_8_TTV.png",
      "_380_FS25_Fendt_Katana.png",
      "_381_FS25_John_Deere_9000_Series.png",
      "_382_FS25_New_Holland_FR_780.png",
      "_383_FS25_CLAAS_JAGUAR_990_TERRA_TRAC.png",
      "_384_FS25_KRONE_BiG_X_1180.png",
      "_385_FS25_CLAAS_PICK_UP_300.png",
      "_386_FS25_KEMPER_3003.png",
      "_387_FS25_John_Deere_639_Premium.png",
      "_388_FS25_KRONE_EasyFlow_300_S.png",
      "_389_FS25_CLAAS_DIRECT_DISC_500.png",
      "_39_FS25_Versatile_Nemesis.png",
      "_390_FS25_KRONE_XDisc_620.png",
      "_391_FS25_New_Holland_130FB.png",
      "_392_FS25_KEMPER_345_Plus.png",
      "_393_FS25_John_Deere_345_Plus.png",
      "_394_FS25_New_Holland_450_SFI.png",
      "_395_FS25_KEMPER_360_Plus.png",
      "_396_FS25_John_Deere_360_Plus.png",
      "_397_FS25_New_Holland_600_SFI.png",
      "_398_FS25_KEMPER_375_Plus.png",
      "_399_FS25_John_Deere_375_Plus.png",
      "_4_FS25_New_Holland_TK4.80_Methane_Power.png",
      "_40_FS25_Valtra_S_Series.png",
      "_400_FS25_New_Holland_750_SFI.png",
      "_401_FS25_KEMPER_390_Plus.png",
      "_402_FS25_John_Deere_390_Plus.png",
      "_403_FS25_CLAAS_ORBIS_900.png",
      "_404_FS25_KRONE_X-Collect_900-3.png",
      "_405_FS25_CLAAS_DIRECT_DISC_500_TRAILER.png",
      "_406_FS25_KEMPER_Comfort_Support_Wheel.png",
      "_407_FS25_KRONE_XDisc_620_Trailer.png",
      "_408_FS25_Holaras_MES_400.png",
      "_409_FS25_Holaras_Stego_485_Pro.png",
      "_41_FS25_Massey_Ferguson_MF_9S.png",
      "_410_FS25_KUHN_GMD_3123_F.png",
      "_411_FS25_Samasz_KDF_341_S.png",
      "_412_FS25_Samasz_XT_390.png",
      "_413_FS25_Vermeer_TM_1410.png",
      "_414_FS25_ELHO_Duett_7300.png",
      "_415_FS25_KUHN_GMD_8730-FF.png",
      "_416_FS25_Samasz_KDD_941_STH.png",
      "_417_FS25_KRONE_BiG_M_450.png",
      "_418_FS25_PÖTTINGER_ALPINHIT_4.4_H.png",
      "_419_FS25_KRONE_Vendro_820_Highland.png",
      "_42_FS25_Fendt_900_Vario.png",
      "_420_FS25_Samasz_P8_-_890.png",
      "_421_FS25_PÖTTINGER_HIT_16.18_T.png",
      "_422_FS25_SIP_Favorit_254.png",
      "_423_FS25_SIP_Air_300_F_Alp.png",
      "_424_FS25_KUHN_GA_4731.png",
      "_425_FS25_Reiter_Respiro_R7_RD.png",
      "_426_FS25_Samasz_Z2-840_H.png",
      "_427_FS25_KRONE_Swadro_TS_970.png",
      "_428_FS25_Anderson_Group_MERGEPRO_915.png",
      "_429_FS25_PÖTTINGER_TOP_1403_C.png",
      "_43_FS25_John_Deere_7R_Series.png",
      "_430_FS25_PÖTTINGER_BOSS_ALPIN_251.png",
      "_431_FS25_PÖTTINGER_FARO_4010_D.png",
      "_432_FS25_Schuitemaker_Rapide_580V.png",
      "_433_FS25_Fendt_Tigo_75_VR_D.png",
      "_434_FS25_PÖTTINGER_JUMBO_8450_DB.png",
      "_435_FS25_BERGMANN_SHUTTLE_490_S.png",
      "_436_FS25_Dalbo_MaxiRoll_630_Greenline.png",
      "_437_FS25_Massey_Ferguson_MF_1840.png",
      "_438_FS25_KUHN_SB_1290_iD.png",
      "_439_FS25_CLAAS_QUADRANT_5300_FC.png",
      "_44_FS25_John_Deere_8R_Series.png",
      "_440_FS25_Massey_Ferguson_MF_2370_Ultra_HD.png",
      "_441_FS25_Fendt_Squadra_1290_N_UD.png",
      "_442_FS25_KRONE_BiG_Pack_1290_HDP_VC.png",
      "_443_FS25_GÖWEIL_G-1_F125.png",
      "_444_200px-FS25_GÖWEIL_G-1_F125_Kombi.png",
      "_445_FS25_New_Holland_Pro-Belt_165.png",
      "_446_FS25_Case_IH_RB_456_HD_Pro.png",
      "_447_FS25_KUHN_VB_3190.png",
      "_448_FS25_KRONE_VariPack_V_190_XC_Plus.png",
      "_449_FS25_John_Deere_C441R.png",
      "_45_FS25_New_Holland_T8_GENESIS_Series.png",
      "_450_FS25_Massey_Ferguson_MF_RB_4160V_Protec.png",
      "_451_FS25_Fendt_Rotana_160_V_Combi.png",
      "_452_FS25_GÖWEIL_VARIO-Master_V140.png",
      "_453_FS25_Anderson_Group_BioBaler_WB-55.png",
      "_454_FS25_Vermeer_ZR5-1200.png",
      "_455_FS25_Fliegl_Schmetterling.png",
      "_456_FS25_Anderson_Group_RBM2000.png",
      "_457_FS25_Arcusin_Multipack_D14.png",
      "_458_FS25_Arcusin_FSX_63.72.png",
      "_459_FS25_GÖWEIL_G1015.png",
      "_46_FS25_John_Deere_8RT_Series.png",
      "_460_FS25_GÖWEIL_G5020.png",
      "_461_FS25_Anderson_Group_HYBRID_X_XTRACTOR.png",
      "_462_FS25_KUHN_SW_4014.png",
      "_463_200px-FS25_GÖWEIL_G4010_Q_Profi.png",
      "_464_FS25_Anderson_Group_Bumper.png",
      "_465_FS25_AMITYTECH_3750_Defoliator.png",
      "_466_FS25_AMITYTECH_2720_Harvester_Scrub.png",
      "_467_FS25_AGRIFAC_LightTraxx.png",
      "_468_FS25_HOLMER_Terra_Dos_5-40_icon.png",
      "_469_FS25_Ropa_Tiger_6S.png",
      "_47_FS25_John_Deere_8RX_Series.png",
      "_470_FS25_HOLMER_HR_6.png",
      "_471_FS25_Ropa_RR-XL_9x45.png",
      "_472_FS25_Ropa_RR-XL_9x45_Trailer.png",
      "_473_FS25_Ropa_Maus_5.png",
      "_474_FS25_Grimme_GL_420.png",
      "_475_FS25_Grimme_Prios_440.png",
      "_476_FS25_Grimme_GL_860_Compacta.png",
      "_477_FS25_Ropa_Keiler_2_RK22.png",
      "_478_FS25_Grimme_Evo_290.png",
      "_479_FS25_Grimme_Ventor_4150.png",
      "_48_FS25_Case_IH_Magnum_AFS_Connect_Series.png",
      "_480_FS25_Grimme_GF_400.png",
      "_481_FS25_Grimme_GF_800.png",
      "_482_FS25_Kverneland_Miniair_Nova_Rigid.png",
      "_483_FS25_Kverneland_Miniair_Nova_Fold.png",
      "_484_FS25_Dewulf_P3CL_Profi.png",
      "_485_FS25_Dewulf_P3K_Profi.png",
      "_486_FS25_Dewulf_GBC.png",
      "_487_FS25_Dewulf_ZKIVSE.png",
      "_488_FS25_Oxbo_MKB-4TR_icon.png",
      "_489_FS25_OXBO_BP2140e.png",
      "_49_FS25_Fendt_1000_Vario.png",
      "_490_FS25_OXBO_EPD540e.png",
      "_491_FS25_Iseki_PRJ8D.png",
      "_492_FS25_Iseki_HJ6130.png",
      "_493_FS25_Gessner_Industries_Single_Row_Billet_Planter.png",
      "_494_FS25_Gessner_Industries_Two_Row_Billet_Planter.png",
      "_495_FS25_Case_IH_Austoft_8800_Multi-Row.png",
      "_496_FS25_TT_Colossus_10.000.png",
      "_497_FS25_Massey_Ferguson_MF_3012.png",
      "_498_FS25_Case_IH_Module_Express_635.png",
      "_499_FS25_John_Deere_CP690.png",
      "_5_FS25_Rigitrac_SKH_60.png",
      "_50_FS25_John_Deere_9R_Series.png",
      "_500_FS25_McCormack_Cotton_Wheelie_Grab.png",
      "_501_FS25_Lizard_Module_4.png",
      "_502_FS25_McCormack_Cotton_Tag_Trailer.png",
      "_503_FS25_Lizard_Module_X_Semi.png",
      "_504_FS25_Grégoire_GL.png",
      "_505_FS25_New_Holland_Braud_9090X_Olive.png",
      "_506_FS25_ERO_Grapeliner_Series_7000.png",
      "_507_FS25_New_Holland_Braud_9070L.png",
      "_508_FS25_Fuhrmann_MRWK_6000.png",
      "_509_FS25_Fuhrmann_LWS_12000.png",
      "_51_FS25_Fendt_1100_Vario_MT.png",
      "_510_FS25_Provitis_MP_122_OCEA.png",
      "_511_FS25_Hardi_MERCURY_4000L.png",
      "_512_FS25_KUHN_RA_142.png",
      "_513_FS25_FARESIN_PF_2.24_Plus.png",
      "_514_FS25_SILOKING_TrailedLine_4.0_System_1000%2B.png",
      "_515_FS25_KUHN_SPW_INTENSE_25.2_CL.png",
      "_516_FS25_FARESIN_Leader_PF_2.26_Plus_Ecomode.png",
      "_517_FS25_Abi_550.png",
      "_518_FS25_Abi_1600.png",
      "_519_FS25_Lizard_MKS_8.png",
      "_52_FS25_John_Deere_9RX_Series.png",
      "_520_FS25_Lizard_MKS_32.png",
      "_521_FS25_Kingston_Trailers_Belvedere.png",
      "_522_FS25_Fliegl_Noah_TTW_140.png",
      "_523_FS25_Wilson_Trailer_Silverstar.png",
      "_524_FS25_KUHN_PRIMOR_15070_M.png",
      "_525_FS25_Elmer's_Manufacturing_Ravage.png",
      "_526_FS25_John_Deere_843L-II.png",
      "_527_200px-FS25_John_Deere_1270G.png",
      "_528_FS25_Komatsu_951.png",
      "_529_FS25_IMPEX_Hannibal_T50.png",
      "_53_FS25_CLAAS_XERION_12.png",
      "_530_FS25_Pfanzelt_Felix.png",
      "_531_FS25_John_Deere_848L-II.png",
      "_532_FS25_PONSSE_Bison_Active_Frame.png",
      "_533_FS25_Rottne_F20D.png",
      "_534_FS25_Volvo_EC250DL.png",
      "_535_FS25_Volvo_EC380DL.png",
      "_536_FS25_WesttecH_WOODCRACKER®_G1650.png",
      "_537_FS25_TMC_Cancela_THX-180.png",
      "_538_FS25_WesttecH_WOODCRACKER®_C550.png",
      "_539_FS25_Risutec_SKB-240.png",
      "_54_FS25_Case_IH_Steiger_715_Quadtrac.png",
      "_540_FS25_Kesla_144ND.png",
      "_541_FS25_Pfanzelt_P13_4272.png",
      "_542_FS25_Riedler_Fahrzeugbau_RUH327.png",
      "_543_FS25_Heizomat_HM_10-500_KF.png",
      "_544_FS25_JENZ_HEM_922_DQ_Cobra_hybrid.png",
      "_545_FS25_TMC_Cancela_TFR_250.png",
      "_546_FS25_Tajfun_EGV_65_AHK_SG.png",
      "_547_200px-FS25_Pfanzelt_DW_P_186.png",
      "_548_FS25_Koller_Forsttechnik_K_300-T_%2B_SKA_1-Z.png",
      "_549_FS25_Koller_Forsttechnik_K_307c-H_%2B_ECKO_FLEX.png",
      "_55_FS25_Versatile_MFWD.png",
      "_550_FS25_Damcon_PL-75.png",
      "_551_FS25_Prinoth_SF900.png",
      "_552_FS25_Pfanzelt_Pm_Trac_III.png",
      "_553_FS25_Volvo_L200H_High_Lift.png",
      "_554_FS25_Sennebogen_835_G_Hybrid.png",
      "_555_FS25_Tenwinkel_Top_450.png",
      "_556_FS25_CLAAS_W_600.png",
      "_557_FS25_Tenwinkel_FGB_600.png",
      "_558_FS25_AGCO_650.png",
      "_559_FS25_Tenwinkel_PAC-750.png",
      "_56_FS25_Ford_976_Versatile.png",
      "_560_FS25_CLAAS_W_900.png",
      "_561_FS25_John_Deere_PickUp_900.png",
      "_562_FS25_Tenwinkel_PAC-1000.png",
      "_563_FS25_Case_IH_1000.png",
      "_564_FS25_New_Holland_1000.png",
      "_565_FS25_STEYR_1000.png",
      "_566_FS25_AGCO_1100.png",
      "_567_FS25_John_Deere_PickUp_1150.png",
      "_568_FS25_Tenwinkel_GUSSCOM_1250.png",
      "_569_FS25_AGCO_1500.png",
      "_57_FS25_Versatile_976.png",
      "_570_FS25_Tenwinkel_PAC-1500.png",
      "_571_FS25_CLAAS_W_1800.png",
      "_572_FS25_John_Deere_PickUp_1800.png",
      "_573_FS25_AGCO_2300.png",
      "_574_FS25_Tenwinkel_B2500.png",
      "_575_FS25_Fendt_3300.png",
      "_576_FS25_John_Deere_Laforge_EZ_1700.png",
      "_577_200px-FS25_Lizard_S-710.png",
      "_578_FS25_Grimme_TC_816.png",
      "_579_FS25_Grimme_SL_80-22_Quantum.png",
      "_58_FS25_Ford_1156_Versatile.png",
      "_580_FS25_Grimme_RH_24-60.png",
      "_581_FS25_MERIDIAN_TL_12-39.png",
      "_582_FS25_Convey-All_1690.png",
      "_583_FS25_Samasz_JUMP_320.png",
      "_584_FS25_BREDAL_SG2000.png",
      "_585_FS25_Samasz_Tornado_252.png",
      "_586_FS25_NEXAT_Wide-Span.png",
      "_587_FS25_Wienhoff_Slurry_Module.png",
      "_588_FS25_Evers_Agro_Toric_NX_1400.png",
      "_589_FS25_NEXAT_Seedhopper.png",
      "_59_FS25_Versatile_1156.png",
      "_590_FS25_Väderstad_Carrier_NX.png",
      "_591_FS25_Väderstad_Inspire_NX.png",
      "_592_FS25_Väderstad_Tempo_NX27.png",
      "_593_FS25_Einböck_CHOPSTAR-MAX.png",
      "_594_FS25_Dammann_SFP22056_-_PROFI-CLASS.png",
      "_595_FS25_NEXAT_Nexco.png",
      "_596_FS25_GERINGHOFF_XtremeFlex_Razor_50FT.png",
      "_597_FS25_GERINGHOFF_Patriot_RotaDisc_2030“B.png",
      "_598_FS25_STEMA_TRIUS.png",
      "_599_FS25_WIFO_HMZ_340-3000.png",
      "_6_FS25_Zetor_PROXIMA_HS.png",
      "_60_FS25_Versatile_1080_Big_Roy.png",
      "_600_FS25_Krampe_Dolly_10L.png",
      "_601_FS25_Thunder_Creek_Equipment_FST_990.png",
      "_602_FS25_Husqvarna_550_XP.png",
      "_603_FS25_STIHL_MS_261.png",
      "_604_FS25_Jonsered_CS_2252.png",
      "_605_FS25_McCulloch_CS_410.png",
      "_606_FS25_STIHL_Markingspray_Blue.png",
      "_607_FS25_STIHL_Markingspray_Green.png",
      "_608_FS25_STIHL_Markingspray_Orange.png",
      "_609_FS25_STIHL_Markingspray_Red.png",
      "_61_FS25_Versatile_DeltaTrack.png",
      "_610_FS25_STIHL_Markingspray_Pink.png",
      "_611_FS25_STIHL_Markingspray_White.png",
      "_612_FS25_STIHL_Markingspray_Yellow.png",
      "_613_FS25_Kärcher_HDS_9-18-4M.png",
      "_614_FS25_Brielmaier_29_EFI.png",
      "_62_FS25_Lizard_Dragon.png",
      "_63_FS25_INTERNATIONAL_CV_Series.png",
      "_64_FS25_INTERNATIONAL_Transtar_II_Eagle.png",
      "_65_FS25_Mack_Trucks_Anthem_6x4.png",
      "_66_FS25_Mack_Trucks_Black_Anthem_6x4.png",
      "_67_FS25_Volvo_FH_Electric.png",
      "_68_FS25_Mack_Trucks_Super-Liner_6x4.png",
      "_69_FS25_Volvo_VNX_300.png",
      "_7_FS25_Fendt_200_V_Vario.png",
      "_70_FS25_Volvo_FH16.png",
      "_71_FS25_Riedler_Fahrzeugbau_FH16_RUL-HKR.png",
      "_72_FS25_International_LT_Series.png",
      "_73_FS25_Aprilia_RX_125.png",
      "_74_FS25_APE_50.png",
      "_75_FS25_Kubota_RTV-XG850_SIDEKICK.png",
      "_76_FS25_Antonio_Carraro_Tigrecar_3200_GST.png",
      "_77_FS25_Kubota_RTV-X1180W-H.png",
      "_78_FS25_INTERNATIONAL_Series_200.png",
      "_79_FS25_Skoda_Kodiaq.png",
      "_8_200px-FS25_Case_IH_Farmall_C_Series.png",
      "_80_200px-FS25_Skoda_Enyaq_Coupe_RS_iV.png",
      "_81_FS25_Lizard_Pickup_2017.png",
      "_82_FS25_Prinoth_Leitwolf_Agripower.png",
      "_83_FS25_Ropa_NawaRo-Maus.png",
      "_84_FS25_Schäffer_23E.png",
      "_85_FS25_Kubota_R640.png",
      "_86_FS25_Quicke_Q4M.png",
      "_87_FS25_Hauer_XB_150.png",
      "_88_FS25_Quicke_Q6M.png",
      "_89_FS25_Hauer_XB_190.png",
      "_9_FS25_CLAAS_ARION_470-410.png",
      "_90_200px-FS25_Case_IH_L630.png",
      "_91_FS25_John_Deere_663R.png",
      "_92_200px-FS25_John_Deere_683R.png",
      "_93_FS25_Quicke_Q7M.png",
      "_94_200px-FS25_CLAAS_FL_140.png",
      "_95_FS25_Kubota_M77.png",
      "_96_FS25_John_Deere_700M.png",
      "_97_FS25_Versatile_V7.png",
      "_98_FS25_Albutt_Universal_Bucket.png",
      "_99_FS25_Albutt_Pallet_Fork.png"
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
export function formatOperatingTime(operatingTimeMs) {
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
export function getVehicleWikiImage(vehicleName, brandName, typeName) {
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
export function proxifyImageUrl(imageUrl) {
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

export function getBrandImageUrl(brandImagePath, brandName) {
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
export async function loadVehicles() {
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

export function updateVehicleSummaryCards() {
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

export function renderVehicleCards(vehicles) {
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

export function createVehicleCard(vehicle) {
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

export function getVehicleIcon(vehicleType, typeName = "") {
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

export function getFuelBarColor(percentage) {
  if (percentage > 75) return "bg-success";
  if (percentage > 25) return "bg-warning";
  return "bg-danger";
}

export function getDamageBarColor(damagePercentage) {
  if (damagePercentage > 50) return "bg-danger";
  if (damagePercentage > 20) return "bg-warning";
  return "bg-success";
}

// Helper function to check if a vehicle is a storage item (pallet/bigBag)
export function isStorageItem(vehicle) {
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

export function getVehicleTypeBadge(vehicleType, typeName = "") {
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

export function toggleVehicleFilters() {
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

export function applyVehicleFilters() {
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

export function filterVehiclesBySummaryCard(filterType) {
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

export function setElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

export function showVehicleImage(imageUrl, vehicleName, brandName) {
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