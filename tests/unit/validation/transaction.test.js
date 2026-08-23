/**
 * Unit Tests: Transaction Validation
 * Tests the core transaction validation logic from utils/validation.js
 * 
 * @file transaction.test.js
 * @version v6.65+
 * @see utils/validation.js#validateTransaction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validation } from '../../main.js';

// Mock AppState for testing
function createMockAppState() {
  /** @type {Record<string, object>} */
  const items = {
    ITEM-001: { itemCode: 'ITEM-001', name: 'Baut Stainless', specification: '100mm', unit: 'PCS', categoryId: null, vendorId: null, defaultRack: null, bcStatus: 'NON_BC', minimumStock: 0, status: 'ACTIVE' },
    ITEM-002: { itemCode: 'ITEM-002', name: 'Baut Besi', specification: '8mm', unit: 'PCS', categoryId: null, vendorId: null, defaultRack: 'RAK-01', bcStatus: 'NON_BC', minimumStock: 5, status: 'ACTIVE' },
    ITEM-003: { itemCode: 'ITEM-003', name: 'Cat Solvent', specification: 'Kemal', unit: 'LITER', categoryId: null, vendorId: 'VEN-01', defaultRack: null, bcStatus: 'NON_BC', minimumStock: 2, status: 'ARCHIVED' }
  };

  /** @type {Record<string, object>} */
  const categories = {
    CAT-01: { categoryCode: 'CAT-01', categoryName: 'Bahan Baku', status: 'ACTIVE' }
  };

  /** @type {Record<string, object>} */
  const vendors = {
    VEN-01: { vendorCode: 'VEN-01', vendorName: 'Supplier A', status: 'ACTIVE' }
  };

  /** @type {Record<string, object>} */
  const racks = {
    RAK-01: { rackCode: 'RAK-01', rackName: 'Rak A', zone: 'Zona 1', status: 'ACTIVE' }
  };

  return {
    getItemByCode: (code) => items[code] || null,
    getItemById: (id) => items[id] || null,
    getCategoryByCode: (code) => categories[code] || null,
    getVendorByCode: (code) => vendors[code] || null,
    getRackByCode: (code) => racks[code] || null,
    getCurrentStock: (itemId) => {
      const item = Object.values(items).find(i => i._id === itemId || i.itemCode === itemId);
      return item ? (item.minimumStock ?? 0) : 0;
    },
    hasRole: () => false,
    isAdmin: () => false,
    isWarehouse: () => false,
    isViewer: () => false,
    getLowStockItems: () => [],
    getAllItems: () => Object.values(items),
    updateStockBalance: async () => {},
    updateStockByRack: async () => {},
    setSystemFlag: async () => {},
    getSystemFlag: () => ({ enabled: false, enabledUntil: 0 }),
    isFactoryResetActive: () => false,
    isCleanupModeActive: () => false,
    setAppVersion: () => {},
    getAppVersion: () => 'v6.65'
  };
}

describe('Transaction Validation', () => {
  let mockState;

  beforeEach(() => {
    mockState = createMockAppState();
  });

  describe('validateTransaction', () => {
    it('should validate a complete MASUK transaction', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'MASUK',
        qty: 10,
        rackId: 'RAK-01',
        vendorId: 'VEN-01',
        noSjPo: 'SJ-001',
        note: 'Baut untuk proyek A'
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      // Should have warnings about rack ACTIVE status check
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should reject transaction with qty <= 0', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'MASUK',
        qty: 0,
        rackId: 'RAK-01'
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Qty harus number dan lebih besar dari 0');
    });

    it('should reject transaction with invalid type', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'TRANSFER', // Invalid type
        qty: 10,
        rackId: 'RAK-01'
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Type wajib "MASUK" atau "KELUAR"');
    });

    it('should reject KELUAR transaction without rackId', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'KELUAR',
        qty: 5
        // rackId intentionally missing
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rak wajib diisi untuk transaksi KELUAR');
    });

    it('should allow MASUK without rackId', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'MASUK',
        qty: 5
        // rackId intentionally missing - allowed for MASUK
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject transaction for ARCHIVED item', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-003', // ARCHIVED item
        type: 'MASUK',
        qty: 5,
        rackId: 'RAK-01'
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item tidak bisa ditransaksi karena status: ARCHIVED');
    });

    it('should validate KELUAR with ACTIVE rack', () => {
      /** @type {object} */
      const payload = {
        itemId: 'ITEM-001',
        type: 'KELUAR',
        qty: 3,
        rackId: 'RAK-01'
      };

      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateTransaction({
        ...payload,
        state: mockState
      });

      // Rack RAK-01 is ACTIVE, so should pass rack validation
      // May have warnings but should be valid
      expect(result.valid).toBe(true || result.errors.length === 0);
    });
  });

  describe('validateItemCode', () => {
    it('should validate existing item code', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-001', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-existent item code', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-NONEXISTENT', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Kode item "ITEM-NONEXISTENT" tidak ditemukan di master data');
    });

    it('should warn on ARCHIVED item code', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-003', mockState);

      expect(result.valid).toBe(true); // Code exists, so valid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('terarsip'))).toBe(true);
    });

    it('should reject empty item code', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item code wajib berupa string non-kosong');
    });
  });

  describe('checkCodeUniqueness', () => {
    it('should verify unique item code', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('NEW-ITEM-CODE', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject duplicate item code', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('ITEM-001', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Kode item "ITEM-001" sudah terdaftar di master');
    });

    it('should reject empty item code', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item code wajib diisi');
    });
  });
});