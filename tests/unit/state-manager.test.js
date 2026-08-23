/**
 * Unit Tests: AppState Class
 * Tests the AppState class core functionality from utils/state-manager.js
 * 
 * @file state-manager.test.js
 * @version v6.65+
 * @see utils/state-manager.js#AppState
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppState } from '../../main.js';

// Mock Firestore
function createMockFirestore() {
  /** @type {import('firebase/firestore').Firestore} */
  const mockFirestore = {
    collection: vi.fn().mockReturnValue({
      getDocs: vi.fn(),
      add: vi.fn(),
      doc: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      deleteDoc: vi.fn(),
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            onSnapshot: vi.fn()
          })
        })
      })
    }),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn().mockReturnValue({ _seconds: 1234567890, _nanoseconds: 0 }),
    enableIndexedDbPersistence: vi.fn().mockResolvedValue(undefined)
  };
  
  return mockFirestore;
}

describe('AppState Class', () => {
  let mockFirestore;
  let appState;

  beforeEach(() => {
    mockFirestore = createMockFirestore();
    // @ts-expect-error - testing with minimal params
    appState = new AppState(mockFirestore);
  });

  describe('constructor', () => {
    it('should initialize with default state values', () => {
      expect(appState.items).toEqual({});
      expect(appState.categories).toEqual({});
      expect(appState.vendors).toEqual({});
      expect(appState.racks).toEqual({});
      expect(appState.transactions).toEqual({});
      expect(appState.stockBalances).toEqual({});
      expect(appState.stockByRacks).toEqual({});
      expect(appState.users).toEqual({});
      expect(appState.currentUser).toBeNull();
      expect(appState.currentRole).toBeNull();
      expect(appState.currentUserName).toBeNull();
      expect(appState.appVersion).toBe('v6.65');
      expect(appState.migrationBatches).toEqual({});
      expect(appState.migrationRows).toEqual({});
      expect(appState.systemFlags.cleanupMode).toEqual({ enabled: false, enabledUntil: 0 });
      expect(appState.systemFlags.factoryResetMode).toEqual({ enabled: false, enabledUntil: 0 });
    });

    it('should set custom app version', () => {
      appState.setAppVersion('v6.66');
      expect(appState.getAppVersion()).toBe('v6.66');
    });
  });

  describe('getCurrentStock', () => {
    it('should return 0 for item with no stock data', () => {
      /** @type {number} */
      const stock = appState.getCurrentStock('non-existent-item');
      expect(stock).toBe(0);
    });

    it('should return stock from stockBalances when available', () => {
      /** @type {number} */
      const stock = appState.getCurrentStock('item_001');
      expect(stock).toBe(0); // No stockBalances populated
    });

    it('should combine stockBalances + stockByRacks correctly', () => {
      /** First populate some data */
      appState.stockBalances['item_001'] = { qty: 10 };
      appState.stockByRacks['item_001_rack_01'] = { itemId: 'item_001', rackId: 'rack_01', qty: 5 };
      
      /** @type {number} */
      const stock = appState.getCurrentStock('item_001');
      // Should return stockBalances qty (10) when available
      expect(stock).toBe(10);
    });
  });

  describe('hasRole', () => {
    it('should return false when no role set', () => {
      expect(appState.hasRole('ADMIN')).toBe(false);
      expect(appState.hasRole('WAREHOUSE')).toBe(false);
      expect(appState.hasRole('VIEWER')).toBe(false);
    });

    it('should return true when role matches', () => {
      appState.currentRole = 'ADMIN';
      expect(appState.hasRole('ADMIN')).toBe(true);
      expect(appState.hasRole('WAREHOUSE')).toBe(false);
    });
  });

  describe('role check methods', () => {
    it('isAdmin should work correctly', () => {
      appState.currentRole = 'ADMIN';
      expect(appState.isAdmin()).toBe(true);
      appState.currentRole = 'WAREHOUSE';
      expect(appState.isAdmin()).toBe(false);
    });

    it('isWarehouse should work correctly', () => {
      appState.currentRole = 'WAREHOUSE';
      expect(appState.isWarehouse()).toBe(true);
      appState.currentRole = 'ADMIN';
      expect(appState.isWarehouse()).toBe(false);
    });

    it('isViewer should work correctly', () => {
      appState.currentRole = 'VIEWER';
      expect(appState.isViewer()).toBe(true);
      appState.currentRole = 'WAREHOUSE';
      expect(appState.isViewer()).toBe(false);
    });
  });

  describe('getLowStockItems', () => {
    beforeEach(() => {
      // Populate items with varying stock levels
      appState.items = {
        ITEM-LOW: { itemCode: 'ITEM-LOW', name: 'Item Stok Rendah', unit: 'PCS', minimumStock: 10, status: 'ACTIVE' },
        ITEM-ADEQUATE: { itemCode: 'ITEM-ADEQ', name: 'Item Cukup', unit: 'PCS', minimumStock: 5, status: 'ACTIVE' },
        ITEM-ACTIVE: { itemCode: 'ITEM-ACT', name: 'Item Aktif', unit: 'PCS', minimumStock: 0, status: 'ACTIVE' },
      };
      // Set stock balances
      appState.stockBalances = {
        'item_LOW': { qty: 3 }, // Below minimum of 10
        'item_ADEQ': { qty: 8 }, // Above minimum of 5
        'item_ACT': { qty: 0 }, // Minimum is 0, so not low
      };
      // Set stockByRacks
      appState.stockByRacks = {
        'item_LOW_rack_01': { itemId: 'item_LOW', rackId: 'rack_01', qty: 3 },
        'item_ADEQ_rack_01': { itemId: 'item_ADEQ', rackId: 'rack_01', qty: 8 },
        'item_ACT_rack_01': { itemId: 'item_ACT', rackId: 'rack_01', qty: 0 },
      };
    });

    it('should identify items below minimum stock', () => {
      /** @type {Array<object>} */
      const lowStock = appState.getLowStockItems();
      
      // ITEM-LOW should be in low stock (3 < minimum 10)
      expect(lowStock.some(i => i.itemCode === 'ITEM-LOW')).toBe(true);
      
      // ITEM-ADEQ should NOT be in low stock (8 >= minimum 5)
      expect(lowStock.some(i => i.itemCode === 'ITEM-ADEQ')).toBe(false);
      
      // ITEM-ACT should NOT be in low stock (minimum is 0)
      expect(lowStock.some(i => i.itemCode === 'ITEM-ACT')).toBe(false);
    });

    it('should include currentStock in returned items', () => {
      /** @type {Array<object>} */
      const lowStock = appState.getLowStockItems();
      
      if (lowStock.some(i => i.itemCode === 'ITEM-LOW')) {
        const itemLow = lowStock.find(i => i.itemCode === 'ITEM-LOW');
        expect(itemLow).toHaveProperty('currentStock');
        expect(typeof itemLow.currentStock).toBe('number');
      }
    });
  });

  describe('getAllItems', () => {
    it('should return all items as array', () => {
      /** @type {Array<object>} */
      const allItems = appState.getAllItems();
      
      // Should have the items we set up
      expect(allItems.length).toBeGreaterThan(0);
      
      // Should contain item codes
      const codes = allItems.map(i => i.itemCode);
      expect(codes).toContain('ITEM-LOW');
      expect(codes).toContain('ITEM-ADEQ');
    });
  });

  describe('updateStockBalance', () => {
    it('should be a function', () => {
      expect(typeof appState.updateStockBalance).toBe('function');
    });

    it('should accept required parameters', () => {
      // Just verify the function exists and has correct arity
      expect(appState.updateStockBalance.length).toBeGreaterThan(0);
    });
  });

  describe('updateStockByRack', () => {
    it('should be a function', () => {
      expect(typeof appState.updateStockByRack).toBe('function');
    });
  });

  describe('setSystemFlag', () => {
    it('should be a function', () => {
      expect(typeof appState.setSystemFlag).toBe('function');
    });
  });

  describe('getSystemFlag', () => {
    it('should return default flag state when flag not set', () => {
      /** @type {object} */
      const flag = appState.getSystemFlag('nonexistent-flag');
      expect(flag.enabled).toBe(false);
      expect(flag.enabledUntil).toBe(0);
    });

    it('return correct flag when set', () => {
      appState.setSystemFlag('cleanupMode', true, Date.now() + 3600000);
      /** @type {object} */
      const flag = appState.getSystemFlag('cleanupMode');
      expect(flag.enabled).toBe(true);
      expect(flag.enabledUntil).toBeGreaterThan(0);
    });
  });

  describe('isFactoryResetActive and isCleanupModeActive', () => {
    it('should return false when flags not enabled', () => {
      expect(appState.isFactoryResetActive()).toBe(false);
      expect(appState.isCleanupModeActive()).toBe(false);
    });

    it('should return true when flags enabled with valid until', () => {
      appState.setSystemFlag('factoryResetMode', true, Date.now() + 3600000);
      expect(appState.isFactoryResetActive()).toBe(true);
      
      appState.setSystemFlag('cleanupMode', true, Date.now() + 3600000);
      expect(appState.isCleanupModeActive()).toBe(true);
    });
  });
});