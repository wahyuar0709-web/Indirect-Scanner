/**
 * Validation Utility Module
 * Provides comprehensive input validation for the RDI Indirect Inventory application.
 * All validation functions are pure functions with no side effects,
 * designed to be used both client-side and potentially server-side.
 * 
 * MIT License - RDI Indirect Inventory v6.65+
 * 
 * Related Modules:
 * - utils/dom.js - XSS-safe DOM manipulation
 * - utils/state-manager.js - Application state
 * - main.js - Main application entry point
 */

export const validation = {
  /**
   * Validate a transaction payload before writing to Firestore.
   * Ensures all required fields are present, correctly typed,
   * and meet business rules (item ACTIVE, rack required for KELUAR, etc.).
   * 
   * This mirrors the validation logic in firestore.rules baseTrxFieldsValid()
   * but runs client-side first to provide immediate feedback to users.
   * 
   * @param {object} payload - Transaction form payload
   * @param {string} payload.itemId - Item document ID (required)
   * @param {('MASUK'|'KELUAR')} payload.type - Transaction type (required)
   * @param {number} payload.qty - Quantity, must be > 0 (required)
   * @param {string} [payload.rackId] - Rack ID (required for KELUAR, optional for MASUK)
   * @param {string} [payload.vendorId] - Optional vendor ID
   * @param {string} [payload.noSjPo] - Optional SJ/PO number
   * @param {string} [payload.note] - Optional note
   * @param {string} [payload.uom] - Optional unit of measure
   * @param {string} [payload.sourceDate] - Optional source date (migration)
   * @param {string} [payload.sourceCreatedByRaw] - Optional source created by raw (migration)
   * @param {string} [payload.rowNumber] - Optional row number (migration)
   * @param {object} [state] - Optional AppState instance for checking item status
   * @param {object} [firestore] - Optional Firestore instance for exists() checks
   * 
   * @returns {{ valid: boolean; errors: string[]; warnings: string[] }}
   * 
   * @example
   * ```javascript
   * const result = validation.validateTransaction({
   *   itemId: 'ITEM-001',
   *   type: 'MASUK',
   *   qty: 10,
   *   rackId: 'RAK-01'
   * });
   * 
   * if (result.valid) {
   *   // Proceed with Firestore write
   * } else {
   *   // Show errors to user
   *   window.showToast(result.errors.join(', '), 'error');
   * }
   * ```
   */
  validateTransaction(payload: {
    itemId: string;
    type: 'MASUK' | 'KELUAR';
    qty: number;
    rackId?: string;
    vendorId?: string;
    noSjPo?: string;
    note?: string;
    uom?: string;
    sourceDate?: string;
    sourceCreatedByRaw?: string;
    rowNumber?: number;
    state?: import('./state-manager').AppState;
    firestore?: import('firebase/firestore').Firestore;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];
    /** @type {string[]} */
    const warnings: string[] = [];

    // 1. Check required fields exist and are correct types
    if (typeof payload.itemId !== 'string' || payload.itemId.trim().length === 0) {
      errors.push('Item ID wajib diisi sebagai string non-kosong');
    }

    if (typeof payload.type !== 'string' || !['MASUK', 'KELUAR'].includes(payload.type)) {
      errors.push('Type wajib "MASUK" atau "KELUAR"');
    }

    if (typeof payload.qty !== 'number' || payload.qty <= 0) {
      errors.push('Qty harus number dan lebih besar dari 0');
    }

    // 2. Validate item status (if state provided)
    if (payload.state) {
      /** @type {object|undefined} */
      const item = payload.state.getItemByCode(payload.itemId) || 
                   payload.state.getItemById(payload.itemId);

      if (item && item.status && item.status !== 'ACTIVE') {
        errors.push(`Item tidak bisa ditransaksi karena status: ${item.status}`);
      }
    }

    // 3. Validate rack requirements
    // KELUAR wajib memiliki rackId string non-kosong
    // MASUK boleh tanpa rackId
    if (payload.type === 'KELUAR') {
      if (!payload.rackId || typeof payload.rackId !== 'string' || payload.rackId.trim().length === 0) {
        errors.push('Rak wajib diisi untuk transaksi KELUAR');
      } else if (payload.state) {
        /** @type {object|undefined} */
        const rack = payload.state.getRackByCode(payload.rackId);
        if (rack && rack.status && rack.status !== 'ACTIVE') {
          warnings.push(`Rak ${payload.rackId} memiliki status ${rack.status}, transaksi mungkin gagal`);
        }
      }
    } else if (payload.type === 'MASUK' && payload.rackId) {
      // MASUK with rackId - validate rack exists and is ACTIVE
      if (payload.state) {
        /** @type {object|undefined} */
        const rack = payload.state.getRackByCode(payload.rackId);
        if (rack && rack.status && rack.status !== 'ACTIVE') {
          warnings.push('Rak bukan ACTIVE — MASUK tanpa rak valid tapi stok per-rak tidak lengkap');
        }
      }
    }

    // 4. Validate migration-specific fields (if present)
    if (payload.sourceSystem && typeof payload.sourceSystem !== 'string') {
      errors.push('sourceSystem harus string jika diisi');
    }
    if (payload.rowNumber !== undefined && (typeof payload.rowNumber !== 'number' || payload.rowNumber <= 0)) {
      errors.push('rowNumber harus number > 0 jika diisi');
    }
    if (payload.rowNumber !== undefined && typeof payload.rowNumber === 'number' && payload.rowNumber !== Math.floor(payload.rowNumber)) {
      warnings.push('rowNumber pecahan (mis. 1.5) tidak akan tereferensikan benar-benar di transaction row identity');
    }

    // 5. Validate qty is integer for pattern matching
    if (payload.qty !== Math.floor(payload.qty) && payload.qty > 0) {
      warnings.push('Qty memiliki nilai desimal—pastikan ini disengaja, qty umumnya integer');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate item code format and existence.
   * Checks that the item code follows expected patterns and exists in master data.
   * 
   * @param {string} itemCode - Item code to validate (e.g., "ITEM-001")
   * @param {object} state - AppState instance for existence check
   * @returns {{ valid: boolean; errors: string[]; warnings: string[] }}
   * 
   * @example
   * ```javascript
   * const result = validation.validateItemCode('ITEM-001', appState);
   * if (result.valid) {
   *   // Proceed with using itemCode
   * }
   * ```
   */
  validateItemCode(itemCode: string, state: import('./state-manager').AppState): { valid: boolean; errors: string[]; warnings: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];
    /** @type {string[]} */
    const warnings: string[] = [];

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      errors.push('Item code wajib berupa string non-kosong');
      return { valid: false, errors, warnings };
    }

    // Check if item exists in master data
    /** @type {object|undefined} */
    const item = state.getItemByCode(itemCode.trim());
    if (!item) {
      errors.push(`Kode item "${itemCode.trim()}" tidak ditemukan di master data`);
    } else {
      // Item exists - check if it's archived
      if (item.status === 'ARCHIVED') {
        warnings.push(`Item "${item.itemCode}" terarsip — transaksi mungkin gagal atau dikoreksi`);
      }
    }

    // Basic format check: should contain alphanumeric characters and hyphens
    if (!/^[A-Z0-9\s\-]+$/i.test(itemCode.trim())) {
      warnings.push('Format kode item disarankan menggunakan format alphanumeric (contoh: ITEM-001)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that an item code is unique (not already in use).
   * Checks against the current master data to prevent duplicates.
   * 
   * @param {string} itemCode - Item code to check for uniqueness
   * @param {object} state - AppState instance containing current items
   * @returns {{ valid: boolean; errors: string[] }}
   * 
   * @example
   * ```javascript
   * const result = validation.checkCodeUniqueness('NEW-ITEM', appState);
   * if (result.valid) {
   *   // Code is unique, safe to use
   * }
   * ```
   */
  checkCodeUniqueness(itemCode: string, state: import('./state-manager').AppState): { valid: boolean; errors: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      errors.push('Item code wajib diisi');
      return { valid: false, errors };
    }

    /** @type {object|undefined} */
    const existing = state.getItemByCode(itemCode.trim());
    if (existing) {
      errors.push(`Kode item "${itemCode.trim()}" sudah terdaftar di master (itemId: ${existing.id || 'unknown'})`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate category code existence and status.
   * 
   * @param {string} categoryCode - Category code to validate
   * @param {object} state - AppState instance
   * @returns {{ valid: boolean; errors: string[] }}
   */
  validateCategoryCode(categoryCode: string, state: import('./state-manager').AppState): { valid: boolean; errors: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];

    if (!categoryCode || typeof categoryCode !== 'string' || categoryCode.trim().length === 0) {
      errors.push('Category code wajib diisi');
      return { valid: false, errors };
    }

    /** @type {object|undefined} */
    const category = state.getCategoryByCode(categoryCode.trim());
    if (!category) {
      errors.push(`Kategori "${categoryCode.trim()}" tidak ditemukan`);
    } else if (category.status && category.status !== 'ACTIVE') {
      warnings.push(`Kategori "${categoryCode.trim()}" status: ${category.status}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate vendor code existence and status.
   * 
   * @param {string} vendorCode - Vendor code to validate
   * @param {object} state - AppState instance
   * @returns {{ valid: boolean; errors: string[] }}
   */
  validateVendorCode(vendorCode: string, state: import('./state-manager').AppState): { valid: boolean; errors: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];

    if (!vendorCode || typeof vendorCode !== 'string' || vendorCode.trim().length === 0) {
      errors.push('Vendor code wajib diisi');
      return { valid: false, errors };
    }

    /** @type {object|undefined} */
    const vendor = state.getVendorByCode(vendorCode.trim());
    if (!vendor) {
      errors.push(`Vendor "${vendorCode.trim()}" tidak ditemukan`);
    } else if (vendor.status && vendor.status !== 'ACTIVE') {
      warnings.push(`Vendor "${vendorCode.trim()}" status: ${vendor.status}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate rack code existence and status.
   * 
   * @param {string} rackCode - Rack code to validate
   * @param {object} state - AppState instance
   * @returns {{ valid: boolean; errors: string[] }}
   */
  validateRackCode(rackCode: string, state: import('./state-manager').AppState): { valid: boolean; errors: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];

    if (!rackCode || typeof rackCode !== 'string' || rackCode.trim().length === 0) {
      errors.push('Rack code wajib diisi');
      return { valid: false, errors };
    }

    /** @type {object|undefined} */
    const rack = state.getRackByCode(rackCode.trim());
    if (!rack) {
      errors.push(`Rak "${rackCode.trim()}" tidak ditemukan`);
    } else if (rack.status && rack.status !== 'ACTIVE') {
      errors.push(`Rak "${rackCode.trim()}" status: ${rack.status} — hanya rak ACTIVE yang boleh digunakan`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate CSV export data to prevent formula injection.
   * Ensures all values that could be interpreted as Excel/Sheets formulas
   * are properly escaped with apostrophe prefix.
   * 
   * @param {*} value - Value to validate/escape
   * @returns {string} Safe CSV-escaped string
   * 
   * @example
   * ```javascript
   * const safe = validation.csvEscapeFormulaInjection('=CMD|"/c calc"');
   * // Returns: "'=CMD|"/c calc"'
   * ```
   */
  csvEscapeFormulaInjection(value:*): string {
    /** @type {string} */
    let s = String(value ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return s;
  }

  /**
   * Validate form field inputs for modal CRUD operations.
   * Checks required fields, format, and length constraints.
   * 
   * @param {object} formData - Form data object
   * @param {string} formData.name - Name field (required, min 2 chars)
   * @param {string} formData.email - Email field (optional, must be valid email format)
   * @param {string} formData.password - Password field (optional, min 6 chars if provided)
   * @param {string} formData.role - Role field (optional, must be enum)
   * @param {string} [formData.roleOptions] - Allowed role options
   * @param {string} [formData.specification] - Specification field (optional)
   * @returns {{ valid: boolean; errors: string[]; warnings: string[] }}
   * 
   * @example
   * ```javascript
   * const result = validation.validateModalForm({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   password: ' rahasia123',
   *   role: 'WAREHOUSE'
   * });
   * ```
   */
  validateModalForm(formData: {
    name: string;
    email?: string;
    password?: string;
    role?: string;
    roleOptions?: string[];
    specification?: string;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    /** @type {string[]} */
    const errors: string[] = [];
    /** @type {string[]} */
    const warnings: string[] = [];

    // Name validation
    if (!formData.name || typeof formData.name !== 'string' || formData.name.trim().length < 2) {
      errors.push('Nama wajib minimal 2 karakter');
    }

    // Email validation (if provided)
    if (formData.email) {
      /** @type {RegExp} */
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        errors.push('Format email tidak valid');
      }
    }

    // Password validation (if provided)
    if (formData.password !== undefined && formData.password !== '') {
      if (formData.password.length < 6) {
        errors.push('Password minimal 6 karakter');
      }
    } else if (formData.password === '') {
      warnings.push('Password dikosongkan — operator akan memreset lewat "Lupa Password"');
    }

    // Role validation (if provided)
    if (formData.role) {
      /** @type {string[]|undefined} */
      const allowedRoles = formData.roleOptions || ['WAREHOUSE', 'VIEWER', 'ADMIN'];
      if (!allowedRoles.includes(formData.role)) {
        errors.push(`Role tidak valid. Pilih dari: ${allowedRoles.join(', ')}`);
      }
    }

    // Specification (optional, just check length if provided)
    if (formData.specification && formData.specification.length > 500) {
      warnings.push('Spesifikasi terlaba panjang (max 500 disarankan)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};