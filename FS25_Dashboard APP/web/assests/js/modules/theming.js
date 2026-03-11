export function initTheming() {
    // Original defaults based exactly on your CSS
    const defaultColors = { bg: '#121212', panel: '#1a1a1a', primary: '#2d5016', accent: '#daa520' };
    
    this.themes = this.getStorage('dashboard_themes') || {
        global: { ...defaultColors }, livestock: { ...defaultColors },
        vehicles: { ...defaultColors }, fields: { ...defaultColors },
        economy: { ...defaultColors }, pastures: { ...defaultColors }
    };
    
    this.applyThemeVars('global');

    // SMART HOOK: Automatically intercept tab changes without editing navigation.js
    if (this.showSection && !this._themeHookApplied) {
        const originalShowSection = this.showSection;
        this.showSection = function(sectionId) {
            originalShowSection.call(this, sectionId);
            this.applyThemeVars(sectionId); // Change colors to the new tab!
        };
        this._themeHookApplied = true;
    }
}

export function applyThemeVars(tabName) {
    const theme = this.themes[tabName] || this.themes.global;
    const root = document.documentElement;
    
    // Updates your existing CSS variables dynamically
    root.style.setProperty('--farm-darker', theme.bg);
    root.style.setProperty('--farm-dark', theme.panel);
    root.style.setProperty('--farm-primary', theme.primary);
    root.style.setProperty('--farm-accent', theme.accent);
}

export function loadThemeEditor() {
    const selectedTab = document.getElementById('theme-tab-selector').value;
    const theme = this.themes[selectedTab];
    
    document.getElementById('color-bg').value = theme.bg;
    document.getElementById('color-panel').value = theme.panel;
    document.getElementById('color-primary').value = theme.primary;
    document.getElementById('color-accent').value = theme.accent;
}

export function saveCurrentTheme() {
    const selectedTab = document.getElementById('theme-tab-selector').value;
    
    this.themes[selectedTab] = {
        bg: document.getElementById('color-bg').value,
        panel: document.getElementById('color-panel').value,
        primary: document.getElementById('color-primary').value,
        accent: document.getElementById('color-accent').value
    };
    
    this.setStorage('dashboard_themes', this.themes);
    
    // Apply immediately if it's the active tab
    const currentSection = this.getCurrentSection ? this.getCurrentSection() : 'global';
    if (selectedTab === 'global' || selectedTab === currentSection) {
        this.applyThemeVars(selectedTab);
    }
    
    alert(`Theme saved for ${selectedTab}!`);
}

export function applyThemeToAllTabs() {
    if(!confirm("Are you sure you want to overwrite ALL tabs with these current colors?")) return;
    
    const bg = document.getElementById('color-bg').value;
    const panel = document.getElementById('color-panel').value;
    const primary = document.getElementById('color-primary').value;
    const accent = document.getElementById('color-accent').value;
    
    for (let key in this.themes) {
        this.themes[key] = { bg, panel, primary, accent };
    }
    
    this.setStorage('dashboard_themes', this.themes);
    this.applyThemeVars('global');
    alert("Colors copied to all tabs successfully!");
}

export function resetThemeToDefaults() {
    if(!confirm("Reset all colors back to default?")) return;
    this.deleteStorage('dashboard_themes');
    
    const defaultColors = { bg: '#121212', panel: '#1a1a1a', primary: '#2d5016', accent: '#daa520' };
    this.themes = {
        global: { ...defaultColors }, livestock: { ...defaultColors },
        vehicles: { ...defaultColors }, fields: { ...defaultColors },
        economy: { ...defaultColors }, pastures: { ...defaultColors }
    };
    
    this.applyThemeVars('global');
    this.loadThemeEditor();
    alert("Themes reset to default!");
}