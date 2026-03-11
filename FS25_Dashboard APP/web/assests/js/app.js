import * as apiStorage from './modules/apiStorage.js';
import * as parsers from './modules/parsers.js';
import * as navigation from './modules/navigation.js';
import * as notifications from './modules/notifications.js';
import * as changes from './modules/changes.js';
import * as livestock from './modules/livestock.js';
import * as pastures from './modules/pastures.js';
import * as vehicles from './modules/vehicles.js';
import * as economy from './modules/economy.js';
import * as fields from './modules/fields.js';
import * as environment from './modules/environment.js';
import * as theming from './modules/theming.js';

class LivestockDashboard {
  constructor() {
    this.animals = [];
    this.fields = [];
    this.placeables = [];
    this.pastures = [];
    this.playerFarms = [];
    this.notificationHistory = [];
    this.maxNotifications = 10;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTabs();
    this.setupURLRouting();
    this.loadNotificationHistory();
    this.checkAPIAvailability();
    this.initTheming();
  }
}

Object.assign(
  LivestockDashboard.prototype,
  apiStorage, parsers, navigation, notifications, 
  changes, livestock, pastures, vehicles, economy, fields, environment, theming
);

let dashboard;
document.addEventListener("DOMContentLoaded", () => {
  dashboard = new LivestockDashboard();
  window.dashboard = dashboard;
});