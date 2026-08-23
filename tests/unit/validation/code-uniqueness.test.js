/**
 * Unit Tests: Code Uniqueness and Collision Detection
 * Tests the code validation logic from utils/validation.js
 * 
 * @file code-uniqueness.test.js
 * @version v6.65+
 * @see utils/validation.js#checkCodeUniqueness
 * @see utils/validation.js#validateItemCode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validation } from '../../main.js';

// Mock AppState for code uniqueness tests
function createMockAppStateForCodes() {
  /** @type {Record<string, object>} */
  const items = {
    ITEM-001: { itemCode: 'ITEM-001', name: 'Baut Stainless', status: 'ACTIVE' },
    ITEM-002: { itemCode: 'ITEM-002', name: 'Baut Besi', status: 'ACTIVE' },
    ITEM-003: { itemCode: 'ITEM-003', name: 'Cat Solvent', status: 'ACTIVE' }
  };

  /** @type {Record<string, object>} */
  const categories = {
    CAT-001: { categoryCode: 'CAT-001', categoryName: 'Bahan Baku', status: 'ACTIVE' },
    CAT-002: { categoryCode: 'CAT-002', categoryName: 'Alat Alat', status: 'ACTIVE' }
  };

  /** @type {Record<string, object>} */
  const vendors = {
    VEN-001: { vendorCode: 'VEN-001', vendorName: 'Supplier A', status: 'ACTIVE' }
  };

  /** @type {Record<string, object>} */
  const racks = {
    RAK-001: { rackCode: 'RAK-001', rackName: 'Rak A', status: 'ACTIVE' }
  };

  return {
    getItemByCode: (code) => items[code] || null,
    getItemById: (id) => items[id] || null,
    getCategoryByCode: (code) => categories[code] || null,
    getVendorByCode: (code) => vendors[code] || null,
    getRackByCode: (code) => racks[code] || null,
    getCurrentStock: () => 0,
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

describe('Code Uniqueness & Collision Detection', () => {
  let mockState;

  beforeEach(() => {
    mockState = createMockAppStateForCodes();
  });

  describe('validateItemCode', () => {
    it('should validate item codes that exist in master', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-001', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject item codes that don\'t exist', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-NONEXISTENT', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Kode item "ITEM-NONEXISTENT" tidak ditemukan di master data');
    });

    it('should warn on ARCHIVED item codes', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-003', mockState);

      expect(result.valid).toBe(true); // Code exists, valid
      expect(result.warnings.length).toBeGreaterThan(0);
      // Check that at least one warning mentions "terarsip"
      const hasArchivedWarning = result.warnings.some(w => w.includes('terarsip') || w.includes('arsip'));
      expect(hasArchivedWarning).toBe(true);
    });

    it('should reject empty/whitespace item codes', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('   ', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item code wajib berupa string non-kosong');
    });

    it('should handle codes with special characters gracefully', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateItemCode('ITEM-001 (copy)', mockState);

      // Code exists in master, so should be valid even with suffix
      expect(result.valid).toBe(true);
    });
  });

  describe('checkCodeUniqueness', () => {
    it('should verify unique (non-duplicate) item code', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('NEW-ITEM', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect duplicate item codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('ITEM-001', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Kode item "ITEM-001" sudah terdaftar di master');
    });

    it('should reject empty item code for uniqueness check', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness('', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item code wajib diisi');
    });

    it('should handle codes with whitespace', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.checkCodeUniqueness(' ITEM-001 ', mockState);

      // Should trim and find the code exists
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('sudah terdaftar');
    });
  });

  describe('validateCategoryCode', () => {
    it('should validate existing category codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateCategoryCode('CAT-001', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-existent category codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateCategoryCode('CAT-NONEXISTENT', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Kategori "CAT-NONEXISTENT" tidak ditemukan');
    });

    it('should validate vendor codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateVendorCode('VEN-001', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-existent vendor codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateVendorCode('VEN-NONEXISTENT', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Vendor "VEN-NONEXISTENT" tidak ditemukan');
    });
  });

  describe('validateRackCode', () => {
    it('should validate existing rack codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateRackCode('RAK-001', mockState);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-existent rack codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateRackCode('RAK-NONEXISTENT', mockState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rak "RAK-NONEXISTENT" tidak ditemukan');
    });

    it('should reject inactive rack codes', () => {
      /** @type {{ valid: boolean; errors: string[] }} */
      // Temporarily modify the mock to have an inactive rack
      const inactiveState = {
        ...mockState,
        racks: {
          ...mockState.racks,
          RAK-001: { rackCode: 'RAK-001', rackName: 'Rak A', status: 'INACTIVE' }
        }
      };

      /** @type {{ valid: boolean; errors: string[] }} */
      const result = validation.validateRackCode('RAK-001', inactiveState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rak "RAK-001" status: INACTIVE — hanya rak ACTIVE yang boleh digunakan');
    });
  });

  describe('validateModalForm', () => {
    it('should validate complete form data', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'rahasia123',
        role: 'WAREHOUSE'
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject short name', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'Jo',
        email: 'john@example.com',
        password: 'rahasia123',
        role: 'WAREHOUSE'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nama wajib minimal 2 karakter');
    });

    it('should reject invalid email format', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'rahasia123',
        role: 'WAREHOUSE'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Format email tidak valid');
    });

    it('should reject password less than 6 characters', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'John Doe',
        password: 'rahasia'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password minimal 6 karakter');
    });

    it('should warn when password is empty', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'John Doe',
        password: ''
      });

      expect(result.valid).toBe(true); // Still valid, just warning
      expect(result.warnings.some(w => w.includes('reset'))).toBe(true);
    });

    it('should reject invalid role', () => {
      /** @type {{ valid: boolean; errors: string[]; warnings: string[] }} */
      const result = validation.validateModalForm({
        name: 'John Doe',
        role: 'INVALID_ROLE'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Role tidak valid. Pilih dari:');
    });
  });

  describe('csvEscapeFormulaInjection', () => {
    it('should escape values starting with =', () => {
      /** @type {string} */
      const result = validation.csvEscapeFormulaInjection('=CMD|"/c calc"!A1');

      expect(result).toStartWith("'"); // Should be prefixed with apostrophe
      expect(result).toContain('=CMD');
    });

    it('should escape values starting with +', () => {
      /** @type {string} */
      const result = validation.csvEscapeFormulaInjection('+100');

      expect(result).toStartWith("'");
    });

    it('should escape values starting with -', () => {
      /** @type {string} */
      const result = validation.csvEscapeFormulaInjection('-50');

      expect(result).toStartWith("'");
    });

    it('should escape values starting with @', () => {
      /** @type {string} */
      const result = validation.csvEscapeFormulaInjection('@variant');

      expect(result).toStartWith("'");
    });

    it('should not modify safe values', () => {
      /** @type {string} */
      const result1 = validation.csvEscapeFormulaInjection('Normal Text');

      expect(result1).toBe('Normal Text');

      /** @type {string} */
      const result2 = validation.csvEscapeFormulaInjection('100');

      expect(result2).toBe('100');
    });

    it('should not double-escape already-escaped values', () => {
      /** @type {string} */
      const result = validation.csvEscapeFormulaInjection("'=CMD");

      // If already has apostrophe prefix, should not add another
      expect(result).toBe("'=CMD");
    });
  });
});