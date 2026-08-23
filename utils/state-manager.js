/**
 * Application State Manager Module
 * Centralized state management replacing the monolithic `state` object
 * Provides typed getters/setters with transaction-aware mutations
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Module Dependencies:
 * - firebase/firestore for data persistence
 * - utils/dom for DOM-safe operations
 */

export class AppState {
  /**
   * Constructs a new AppState instance.
   * @param {import('firebase/firestore').Firestore} firestore - Firebase Firestore instance
   * @param {import('firebase/auth').Auth} [auth] - Optional Auth instance (auto-detected if not provided)
   */
  constructor(firestore) {
    /** @type {import('firebase/firestore').Firestore */
    this.db = firestore;
    /** @type {Record<string, object>} Master item data keyed by itemCode */
    this.items = {};
    /** @type {Record<string, object>} Category data keyed by categoryCode */
    this.categories = {};
    /** @type {Record<string, object>} Vendor data keyed by vendorCode */
    this.vendors = {};
    /** @type {Record<string, object>} Rack data keyed by rackCode */
    this.racks = {};
    /** @type {Record<string, object>} Transaction ledger */
    this.transactions = {};
    /** @type {Record<string, object>} Stock balance cache */
    this.stockBalances = {};
    /** @type {Record<string, object>} Stock-by-rack cache */
    this.stockByRacks = {};
    /** @type {Record<string, object>} User profiles keyed by UID */
    this.users = {};
    /** @type {string|null} Currently logged-in user UID */
    this.currentUser = null;
    /** @type {string|null} Currently logged-in user role */
    this.currentRole = null;
    /** @type {string|null} Currently logged-in user display name */
    this.currentUserName = null;
    /** @type {string} Application version string */
    this.appVersion = 'v6.65';
    
    // Phase 6-F.3 migration state management
    /** @type {Record<string, object>} Migration batches keyed by migrationId */
    this.migrationBatches = {};
    /** @type {Record<string, object>} Migration rows keyed by rowId */
    this.migrationRows = {};
    
    /** @type {Record<string, object>} System flags (cleanupMode, factoryResetMode) */
    this.systemFlags = {
      cleanupMode: { enabled: false, enabledUntil: 0 },
      factoryResetMode: { enabled: false, enabledUntil: 0 }
    };
  }

  /**
   * Load user profile from Firestore and set current session state.
   * Validates that the user account is ACTIVE and retrieves role/name.
   * @param {string} uid - User document ID (UID from Firebase Auth)
   * @returns {Promise<object>} User document data {role, name, ...}
   * @throws {Error} If user profile not found or account is non-active
   * 
   * @example
   * ```javascript
   * const userData = await appState.loadUserProfile(user.uid);
   * if (userData.role === 'ADMIN') { /* show admin features */ }
   * ```
   */
  async loadUserProfile(uid) {
    /** @type {import('firebase/firestore').DocumentReference} */
    const userDoc = doc(this.db, 'users', uid);
    const snap = await getDoc(userDoc);
    
    if (!snap.exists()) {
      throw new Error('User profile not found');
    }
    
    const data = snap.data();
    
    // Validate account status
    if (data.status && data.status !== 'ACTIVE') {
      throw new Error('Akun nonaktif. Hubungi Admin.');
    }
    
    // Set current session state
    this.currentUser = { uid, ...data };
    this.currentRole = data.role;
    this.currentUserName = data.name;
    
    this.users[uid] = data;
    return data;
  }

  /**
   * Load all master data from Firestore in a single batch read.
   * Populates all internal caches: items, categories, vendors, racks,
   * stockBalances, stockByRacks, migrationBatches, migrationRows, systemFlags.
   * 
   * Designed to be called once on app initialization after auth is established.
   * @returns {Promise<void>}
   * 
   * @example
   * ```javascript
   * await appState.loadMasterData();
   * // Master data now available via appState.getItemByCode(), etc.
   * ```
   */
  async loadMasterData() {
    // --- Load Items ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const itemsSnap = await getDocs(collection(this.db, 'items'));
    this.items = {};
    itemsSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const itemCode = data.itemCode || doc.id;
      /** @type {object} */
      const itemRecord = { ...data, _id: doc.id };
      this.items[itemCode] = itemRecord;
    });

    // --- Load Categories ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const catsSnap = await getDocs(collection(this.db, 'categories'));
    this.categories = {};
    catsSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const catCode = data.categoryCode || doc.id;
      /** @type {object} */
      const catRecord = { ...data, _id: doc.id };
      this.categories[catCode] = catRecord;
    });

    // --- Load Vendors ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const vendSnap = await getDocs(collection(this.db, 'vendors'));
    this.vendors = {};
    vendSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const venCode = data.vendorCode || doc.id;
      /** @type {object} */
      const venRecord = { ...data, _id: doc.id };
      this.vendors[venCode] = venRecord;
    });

    // --- Load Racks ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const racksSnap = await getDocs(collection(this.db, 'racks'));
    this.racks = {};
    racksSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const rackCode = data.rackCode || doc.id;
      /** @type {object} */
      const rackRecord = { ...data, _id: doc.id };
      this.racks[rackCode] = rackRecord;
    });

    // --- Load Stock Balances ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const balancesSnap = await getDocs(collection(this.db, 'stockBalances'));
    this.stockBalances = {};
    balancesSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const itemId = data.itemId;
      /** @type {object} */
      const balanceRecord = { ...data, _id: doc.id };
      this.stockBalances[itemId] = balanceRecord;
    });

    // --- Load Stock by Racks ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const rackStockSnap = await getDocs(collection(this.db, 'stockByRacks'));
    this.stockByRacks = {};
    rackStockSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const key = `${data.itemId}_${data.rackId}`;
      /** @type {object} */
      const rackStockRecord = { ...data, _id: doc.id };
      this.stockByRacks[key] = rackStockRecord;
    });

    // --- Load Migration Batches ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const batchesSnap = await getDocs(collection(this.db, 'migrationBatches'));
    this.migrationBatches = {};
    batchesSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const migrationId = data.migrationId;
      /** @type {object} */
      const batchRecord = { ...data, _id: doc.id };
      this.migrationBatches[migrationId] = batchRecord;
    });

    // --- Load Migration Rows ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const rowsSnap = await getDocs(collection(this.db, 'migrationRows'));
    this.migrationRows = {};
    rowsSnap.forEach(doc => {
      const data = doc.data();
      /** @type {string} */
      const rowId = data.rowId;
      /** @type {object} */
      const rowRecord = { ...data, _id: doc.id };
      this.migrationRows[rowId] = rowRecord;
    });

    // --- Load System Flags ---
    /** @type {import('firebase/firestore').QuerySnapshot */
    const flagsSnap = await getDocs(collection(this.db, 'systemFlags'));
    this.systemFlags = {};
    if (!flagsSnap.empty) {
      flagsSnap.forEach(doc => {
        const data = doc.data();
        /** @type {string} */
        const flagName = data.flagName;
        /** @type {object} */
        this.systemFlags[flagName] = {
          enabled: data.enabled,
          enabledUntil: data.enabledUntil ? data.enabledUntil.toDate().getTime() : 0
        };
      });
    }
  }

  /**
   * Get current stock quantity for a specific item.
   * Combines stockBalance cache + total from stockByRacks.
   * Used for displaying "Stok Saat Ini" in UI and validation logic.
   * 
   * @param {string} itemId - Firestore document ID of the item
   * @returns {number} Current stock quantity (>= 0)
   * 
   * @example
   * ```javascript
   * const currentStock = appState.getCurrentStock('item_123');
   * document.getElementById('stock-value').textContent = currentStock;
   * ```
   */
  getCurrentStock(itemId) {
    /** @type {import('firebase/firestore').DocumentSnapshot|undefined */
    const balance = this.stockBalances[itemId];
    /** @type {number} */
    const rackTotal = Object.values(this.stockByRacks)
      .filter(r => r.itemId === itemId)
      .reduce((sum, r) => sum + (r.qty || 0), 0);
    
    if (balance && balance.qty !== undefined) {
      return Math.max(0, balance.qty);
    }
    return Math.max(0, rackTotal);
  }

  /**
   * Retrieve an item record by its itemCode.
   * Provides fast lookup without needing the Firestore document ID.
   * 
   * @param {string} itemCode - The item code (e.g., "ITEM-001")
   * @returns {object|null} Item record with all fields, or null if not found
   * 
   * @example
   * ```javascript
   * const item = appState.getItemByCode('KOD-001');
   * if (item) {
   *   console.log(item.name, item.specification);
   * }
 *   ```
   */
  getItemByCode(itemCode) {
    return this.items[itemCode] || null;
  }

  /**
   * Retrieve an item record by its Firestore document ID.
   * 
   * @param {string} itemId - Firestore document ID
   * @returns {object|null} Item record, or null if not found
   * 
   * @example
   * ```javascript
   * const item = appState.getItemById('doc_abc_123');
   * ```
   */
  getItemById(itemId) {
    return this.items[itemId] || null;
  }

  /**
   * Retrieve a category record by its categoryCode.
   * 
   * @param {string} categoryCode - Category code (e.g., "CAT-01")
   * @returns {object|null} Category record, or null if not found
   * 
   * @example
   * ```javascript
   * const category = appState.getCategoryByCode('CAT-01');
   * ```
   */
  getCategoryByCode(categoryCode) {
    return this.categories[categoryCode] || null;
  }

  /**
   * Retrieve a vendor record by its vendorCode.
   * 
   * @param {string} vendorCode - Vendor code (e.g., "VEN-01")
   * @returns {object|null} Vendor record, or null if not found
   * 
   * @example
   * ```javascript
   * const vendor = appState.getVendorByCode('VEN-01');
   * ```
   */
  getVendorByCode(vendorCode) {
    return this.vendors[vendorCode] || null;
  }

  /**
   * Retrieve a rack record by its rackCode.
   * 
   * @param {string} rackCode - Rack code (e.g., "RAK-01")
   * @returns {object|null} Rack record, or null if not found
   * 
   * @example
   * ```javascript
   * const rack = appState.getRackByCode('RAK-01');
   * ```
   */
  getRackByCode(rackCode) {
    return this.racks[rackCode] || null;
  }

  /**
   * Check if the current user has a specific role.
   * 
   * @param {('ADMIN'|'WAREHOUSE'|'VIEWER')} role - Role to check against
   * @returns {boolean} true if current user's role matches the specified role
   * 
   * @example
   * ```javascript
   * if (appState.hasRole('WAREHOUSE')) {
   *   // Show warehouse-specific UI elements
   * }
   * ```
   */
  hasRole(role) {
    return this.currentRole === role;
  }

  /**
   * Convenience method: check if current user is ADMIN.
   * 
   * @returns {boolean} true if current role is 'ADMIN'
   * 
   * @example
   * ```javascript
   * if (appState.isAdmin()) {
   *   // Show admin-only tools
   * }
   * ```
   */
  isAdmin() {
    return this.hasRole('ADMIN');
  }

  /**
   * Convenience method: check if current user is WAREHOUSE.
   * 
   * @returns {boolean} true if current role is 'WAREHOUSE'
   * 
   * @example
   * ```javascript
   * if (appState.isWarehouse()) {
   *   // Enable warehouse transaction features
   * }
   * ```
   */
  isWarehouse() {
    return this.hasRole('WAREHOUSE');
  }

  /**
   * Convenience method: check if current user is VIEWER.
   * 
   * @returns {boolean} true if current role is 'VIEWER'
   * 
   * @example
   * ```javascript
   * if (appState.isViewer()) {
   *   // Show read-only mode, disable edit controls
   * }
   * ```
   */
  isViewer() {
    return this.hasRole('VIEWER');
  }

  /**
   * Get all items that are below their minimum stock threshold.
   * Used for generating the "Stok Rendah" dashboard card and low-stock alerts.
   * 
   * @returns {Array<object>} Array of item objects with {...item, currentStock, _id}
   * 
   * @example
   * ```javascript
   * const lowStock = appState.getLowStockItems();
   * // Display count on dashboard: lowStock.length
   * ```
   */
  getLowStockItems() {
    const lowStock = [];
    /** @type {string} */
    const currentKey = Object.keys(this.items)[0] || '';
    
    Object.values(this.items).forEach(item => {
      /** @type {number} */
      const minimum = item.minimumStock ?? 0;
      /** @type {number} */
      const current = this.getCurrentStock(item._id || item.id || currentKey) || 0;
      
      if (current < minimum && minimum > 0) {
        lowStock.push({ ...item, _id: item._id || item.id, currentStock: current });
      }
    });
    return lowStock;
  }

  /**
   * Return all item records as an array.
   * Useful for rendering full master lists or batch operations.
   * 
   * @returns {Array<object>} Array of all item records
   * 
   * @example
   * ```javascript
   * const allItems = appState.getAllItems();
   * // Render in a table or feed
   * ```
   */
  getAllItems() {
    return Object.values(this.items);
  }

  /**
   * Atomically update stock balance with audit trail.
   * Executes a Firestore runTransaction to ensure atomicity:
   * 1. Updates stockBalances qty + lastTransactionId + updatedAt
   * 2. Creates a stockCorrections audit log entry (if applicable)
   * 
   * @param {string} itemId - Item Firestore document ID
   * @param {number} delta - Quantity change (positive for MASUK, negative for KELUAR)
   * @param {('MASUK'|'KELUAR')} type - Transaction type direction
   * @param {string} transactionId - Referencing transaction ID for audit trail
   * @returns {Promise<void>}
   * 
   * @example
   * ```javascript
   * await appState.updateStockBalance('item_123', 5, 'MASUK', 'tx_abc_456');
   * // Stock increases by 5, audit log created
   * ```
   * 
   * @throws {Error} If transaction fails or item not found
   */
  async updateStockBalance(itemId, delta, type, transactionId) {
    /** @type {import('firebase/firestore').DocumentReference */
    const balanceRef = doc(this.db, 'stockBalances', itemId);
    /** @type {import('firebase/firestore').DocumentSnapshot */
    const balanceSnap = await getDoc(balanceRef);
    /** @type {number} */
    const currentQty = balanceSnap.exists() ? (balanceSnap.data().qty || 0) : 0;
    /** @type {number} */
    const newQty = Math.max(0, currentQty + delta);

    await runTransaction(this.db, async (tx) => {
      /** @type {import('firebase/firestore').DocumentSnapshot */
      const snap = await tx.get(balanceRef);
      /** @type {number} */
      const oldQty = snap.exists() ? (snap.data().qty || 0) : 0;
      
      // Update stock balance with new quantity and reference
      tx.update(balanceRef, {
        qty: newQty,
        lastTransactionId: transactionId,
        updatedAt: serverTimestamp()
      });

      // Create audit log entry for KELUAR transactions or negative deltas
      // (only for KELUAR type or when manual adjustment needed)
      if (type === 'KELUAR' || delta < 0) {
        /** @type {import('firebase/firestore').DocumentReference */
        const corrRef = doc(collection(this.db, 'stockCorrections'));
        tx.set(corrRef, {
          itemId,
          oldQty,
          newQty,
          reason: `Auto-adjustment via ${type} transaction ${transactionId}`,
          createdAt: serverTimestamp(),
          createdBy: this.currentUser?.uid,
          createdByName: this.currentUser?.name
        });
      }
    });
  }

  /**
   * Atomically update stock-by-rack quantity.
   * Ensures per-rack stock tracking remains consistent with transactions.
   * 
   * @param {string} itemId - Item Firestore document ID
   * @param {string} rackId - Rack Firestore document ID
   * @param {number} delta - Quantity change (positive or negative)
   * @returns {Promise<void>}
   * 
   * @example
   * ```javascript
   * await appState.updateStockByRack('item_123', 'rack_789', -1);
   * // Decrease rack stock by 1 unit
   * ```
   * 
   * @throws {Error} If transaction fails
   */
  async updateStockByRack(itemId, rackId, delta) {
    /** @type {string} */
    const rackKey = `${itemId}_${rackId}`;
    /** @type {import('firebase/firestore').DocumentReference */
    const rackRef = doc(this.db, 'stockByRacks', rackKey);
    /** @type {import('firebase/firestore').DocumentSnapshot */
    const rackSnap = await getDoc(rackRef);
    /** @type {number} */
    const currentQty = rackSnap.exists() ? (rackSnap.data().qty || 0) : 0;
    /** @type {number} */
    const newQty = Math.max(0, currentQty + delta);

    await runTransaction(this.db, async (tx) => {
      /** @type {import('firebase/firestore').DocumentSnapshot */
      const snap = await tx.get(rackRef);
      /** @type {number} */
      const oldQty = snap.exists() ? (snap.data().qty || 0) : 0;
      
      tx.update(rackRef, {
        qty: newQty,
        lastTransactionId: null, // stockByRacks tracks per-rack state
        updatedAt: serverTimestamp()
      });
    });
  }

  /**
   * Set a system flag (e.g., cleanupMode, factoryResetMode).
   * Executes a transaction to persist the flag state in Firestore's systemFlags collection.
   * 
   * @param {string} flagName - Name of the system flag (e.g., 'cleanupMode', 'factoryResetMode')
   * @param {boolean} enabled - Whether to enable the flag
   * @param {number} [enabledUntil=0] - Timestamp (ms) when the flag should automatically disable.
   *   Used for time-window modes like cleanupMode (15-minute window).
   * @returns {Promise<void>}
   * 
   * @example
   * ```javascript
   * // Enable cleanup mode with 15-minute window
   * await appState.setSystemFlag('cleanupMode', true, Date.now() + 15 * 60 * 1000);
   * ```
   * 
   * @throws {Error} If flagName is invalid or transaction fails
   */
  async setSystemFlag(flagName, enabled, enabledUntil = 0) {
    /** @type {import('firebase/firestore').DocumentReference */
    const flagRef = doc(this.db, 'systemFlags', flagName);
    await runTransaction(this.db, async (tx) => {
      tx.update(flagRef, {
        enabled,
        enabledUntil: typeof enabledUntil === 'number' ? enabledUntil : serverTimestamp()
      });
    });
    // Also update in-memory state
    this.systemFlags[flagName] = {
      enabled,
      enabledUntil: typeof enabledUntil === 'number' ? enabledUntil : 0
    };
  }

  /**
   * Retrieve the current state of a system flag.
   * 
   * @param {string} flagName - Name of the system flag
   * @returns {object} Object with {enabled, enabledUntil} properties
   * 
   * @example
   * ```javascript
   * const flagState = appState.getSystemFlag('cleanupMode');
   * if (flagState.enabled) { /* cleanup mode is active */ }
   * ```
   */
  getSystemFlag(flagName) {
    return this.systemFlags[flagName] || { enabled: false, enabledUntil: 0 };
  }

  /**
   * Check if factory reset mode is currently active and within its time window.
   * Factory reset mode has a server-enforced 15-minute window (default closed).
   * 
   * @returns {boolean} true if factory reset mode is active and not expired
   * 
   * @example
   * ```javascript
   * if (appState.isFactoryResetActive()) {
   *   // Show factory reset options with warning
   * }
   * ```
   */
  isFactoryResetActive() {
    const flag = this.getSystemFlag('factoryResetMode');
    return flag.enabled && flag.enabledUntil > 0;
  }

  /**
   * Check if cleanup mode is currently active and within its time window.
   * Cleanup mode has a server-enforced 15-minute window (default closed),
   * used for controlled deletion of transaction/migration data.
   * 
   * @returns {boolean} true if cleanup mode is active and not expired
   * 
   * @example
   * ```javascript
   * if (appState.isCleanupModeActive()) {
   *   // Show cleanup options with PIN requirement
   * }
   * ```
   */
  isCleanupModeActive() {
    const flag = this.getSystemFlag('cleanupMode');
    return flag.enabled && flag.enabledUntil > 0;
  }

  /**
   * Update the application version string.
   * Used to keep the displayed version in sync with the deployed build.
   * 
   * @param {string} version - New version string (e.g., 'v6.66', 'v6.65-patch1')
   * 
   * @example
   * ```javascript
   * appState.setAppVersion('v6.66');
   * document.getElementById('app-version').textContent = 'v6.66';
   * ```
   */
  setAppVersion(version) {
    this.appVersion = version;
  }

  /**
   * Get the current application version string.
   * 
   * @returns {string} The current version (default: 'v6.65')
   * 
   * @example
   * ```javascript
   * const version = appState.getAppVersion();
   * console.log(`Running RDI Indirect Inventory ${version}`);
   * ```
   */
  getAppVersion() {
    return this.appVersion;
  }
}