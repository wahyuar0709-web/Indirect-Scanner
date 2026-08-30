/**
 * RDI Indirect Inventory - Main Module Entry Point (v6.65+)
 * Modernized modular architecture replacing the inline <script type="module">
 * from the original RDI-Indirect-Inventory_v6_65.html file.
 * 
 * Provides:
 * - Firebase initialization and App Check integration
 * - Application state management via AppState class
 * - DOM-safe utilities via dom namespace
 * - Bootstrap and global API exposure for legacy compatibility
 * - Key function shims for core application features
 * 
 * Architecture:
 * - utils/firebase.js: Firebase config and service access
 * - utils/state-manager.js: AppState class for data management
 * - utils/dom.js: XSS-safe DOM manipulation helpers
 * - main.js: Entry point that boots the app and exposes APIs
 * 
 * License: MIT - RDI Indirect Inventory v6.65
 * 
 * @module main
 * @see utils/firebase.js
 * @see utils/state-manager.js
 * @see utils/dom.js
 */

/**
 * Initialize Firebase App and App Check.
 * Must be called before any Firebase operations.
 * Sets up the primary app instance and optionally App Check (reCAPTCHA V3)
 * for defense-in-depth before Firestore rules evaluation.
 * 
 * @function initFirebase
 * @see utils/firebase.js#initFirebaseApp
 * @see utils/firebase.js#initAppCheck
 */
export function initFirebase() {
  /** @type {import('firebase/app').FirebaseApp */
  const fbApp = utils.firebase.initFirebaseApp();
  utils.firebase.initAppCheck(fbApp);
  return fbApp;
}

/**
 * Get authenticated Firebase Auth instance.
 * @returns {import('firebase/auth').Auth} Auth instance
 * @function getAuth
 */
export const getAuth = () => utils.auth;

/**
 * Get Firestore instance.
 * @returns {import('firebase/firestore').Firestore} Firestore instance
 * @function getFirestore
 */
export const getFirestore = () => utils.db;

/**
 * Get application state manager instance.
 * Provides centralized access to all application data and mutations.
 * @returns {AppState} AppState instance
 * @function getAppState
 */
export const getAppState = () => window.appState;

/**
 * Get DOM utility namespace for safe DOM operations.
 * @returns {typeof dom} dom namespace with all safe manipulation methods
 * @function getDom
 */
export const getDom = () => utils.dom;

/**
 * Validation utility module for transaction and form validation.
 * Provides client-side validation mirroring Firestore rules logic.
 * 
 * @module validation
 * @see utils/validation.js
 */
export const validation = utils.validation;

/**
 * Show a toast notification at the bottom center of the viewport.
 * Toasts automatically fade out after 3 seconds (3000ms).
 * Supports 4 types: info, success, warning, error with themed colors.
 * 
 * @function showToast
 * @param {string} message - The message text to display in the toast
 * @param {('info'|'success'|'warning'|'error')} [type='info'] - Toast type for theming
 * 
 * @example
 * ```javascript
 * // Show information toast
 * window.showToast('Stok berhasil diupdate');
 * 
 * // Show success toast
 * window.showToast('Transaksi disimpan', 'success');
 * 
 * // Show warning toast
 * window.showToast('Stok rendah', 'warning');
 * 
 * // Show error toast
 * window.showToast('Gagal menyimpan transaksi', 'error');
 * ```
 */
export function showToast(message, type = 'info') {
  /** @type {HTMLElement} */
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;

  /** @type {Record<string, Record<string, string>>} */
  const typeStyles = {
    info: { bg: 'var(--navy-900)', color: '#fff' },
    success: { bg: 'rgba(30,158,100,.13)', color: 'var(--ok)' },
    warning: { bg: 'rgba(217,138,23,.13)', color: 'var(--warn)' },
    error: { bg: 'rgba(214,54,44,.13)', color: 'var(--danger)' }
  };

  /** @type {Record<string, string>} */
  const style = typeStyles[type] || typeStyles.info;

  /** @type {string} */
  const innerHTML = `
    <div style="position:fixed;left:50%;bottom:104px;transform:translateX(-50%);
          background:${style.bg};color:${style.color;font-size:12.5px;font-weight:500;
          padding:10px 16px;border-radius:999px;z-index:200;opacity:0;pointer-events:none;
          transition:opacity .25s ease, bottom .25s ease;white-space:nowrap">
      ${utils.dom.escapeHTML(message)}
    </div>`;

  toastEl.innerHTML = innerHTML;
  toastEl.classList.add('show');

  /** @type {number} */
  const duration = 3000;
  setTimeout(() => {
    if (toastEl) toastEl.classList.remove('show');
  }, duration);
}

/**
 * Render code collision detection results.
 * Scans all item codes, category codes, and vendor codes for duplicates
 * in the current master data. Displays results in the collision-results panel.
 * 
 * @function renderCollisionResults
 * 
 * @example
 * ```javascript
 * // Trigger collision check
 * window.renderCollisionResults();
 * ```
 * 
 * @private
 * @internal
 */
export function renderCollisionResults() {
  /** @type {HTMLElement} */
  const btn = document.getElementById('btn-find-collision');
  if (btn) btn.click();
}

/**
 * Find code collisions in master data.
 * Scans item codes, category codes, and vendor codes for duplicates
 * across the current master items/categories/vendors.
 * 
 * @function findCodeCollisions
 * 
 * @example
 * ```javascript
 * // Find and display code collisions
 * window.findCodeCollisions();
 * ```
 * 
 * @private
 * @internal
 */
export function findCodeCollisions() {
  /** @type {HTMLElement} */
  const btn = document.getElementById('btn-find-collision');
  if (btn) btn.click();
}

/**
 * Execute reconciliation computation.
 * Recalculates the stock ledger from ALL transactions (not limited to 150),
 * then compares against stockBalances cache and total stockByRacks per item.
 * Displays results in the reconcile-results panel.
 * 
 * Handles three possible statuses per item:
 * - MATCH: ledgerQty === stockBalancesQty === totalStockByRacks
 * - LEDGER_MISMATCH: ledgerQty !== stockBalancesQty (critical - indicates
 *   direct writes outside transactional alur)
 * - RAK_BELUM_LENGKAP: stockBalancesQty === ledgerQty but totalStockByRacks
 *   < stockBalancesQty (common for MASUK transactions without rackId)
 * 
 * @function runReconciliation
 * 
 * @example
 * ```javascript
 * // Run full reconciliation
 * window.runReconciliation();
 * ```
 * 
 * @private
 * @internal
 */
export function runReconciliation() {
  /** @type {HTMLElement} */
  const el = document.getElementById('reconcile-results');
  if (!el) return;

  el.innerHTML = '<p style="font-size:12px;color:var(--ink-400);text-align:center;padding:10px 0;">Menghitung ulang dari seluruh transaksi…</p>';

  /** @type {import('firebase/firestore').Firestore} */
  const db = window.db;
  if (!db) {
    el.innerHTML = '<p style="font-size:12px;color:var(--danger);text-align:center;padding:10px 0;">Database not initialized</p>';
    return;
  }

  try {
    /** @type {import('firebase/firestore').QuerySnapshot */
    const snap = await getDocs(collection(db, 'transactions'));
    /** @type {object} */
    const ledger = {};
    snap.forEach(d => {
      /** @type {object} */
      const t = d.data();
      if (!t.itemId || !t.type || typeof t.qty !== 'number') return;
      /** @type {number} */
      const delta = t.type === 'MASUK' ? t.qty : -t.qty;
      ledger[t.itemId] = (ledger[t.itemId] || 0) + delta;
    });

    /** @type {Set<string>} */
    const allItemIds = new Set([...Object.keys(ledger), ...Object.keys(window.appState.stockBalances)]);
    /** @type {Array<object>} */
    const rows = [];
    /** @type {Set<string>} */
    const criticalIds = new Set();
    /** @type {Set<string>} */
    const rackGapIds = new Set();

    allItemIds.forEach(itemId => {
      /** @type {number} */
      const ledgerQty = ledger[itemId] || 0;
      /** @type {number|undefined} */
      const balQty = window.appState.stockBalances[itemId]?.qty;
      /** @type {number} */
      const rackTotal = Object.values(window.appState.stockByRacks)
        .filter(r => r.itemId === itemId)
        .reduce((sum, r) => sum + (r.qty || 0), 0);

      /** @type {string} */
      let status = 'MATCH';
      if (balQty !== undefined && ledgerQty !== balQty) status = 'LEDGER_MISMATCH';
      else if (balQty !== undefined && balQty !== rackTotal) status = 'RAK_BELUM_LENGKAP';

      /** @type {object} */
      rows.push({ itemId, ledgerQty, balQty, rackTotal, status });

      if (status === 'LEDGER_MISMATCH') criticalIds.add(itemId);
      if (status === 'RAK_BELUM_LENGKAP') rackGapIds.add(itemId);
    });

    /** @type {Array<object>} */
    const critical = rows.filter(r => criticalIds.has(r.itemId));
    /** @type {Array<object>} */
    const rackGap = rows.filter(r => rackGapIds.has(r.itemId));

    /** @type {function} */
    const label = (id) => {
      /** @type {object|undefined} */
      const it = window.appState.items[id];
      return it ? `${it.itemCode} — ${it.name}` : id;
    };

    /** @type {string} */
    let html = '';

    if (!critical.length && !rackGap.length) {
      html = `<p style="font-size:12px;color:var(--ok);text-align:center;padding:10px 0;">✓ Semua ${rows.length} item konsisten (ledger = stockBalances = total stockByRacks).</p>`;
    } else {
      if (critical.length) {
        html += `<p style="font-size:12px;color:var(--danger);margin:6px 0;font-weight:700;">⚠ ${critical.length} item LEDGER MISMATCH (kritis — saldo cache tidak sama dengan hasil hitung ulang transaksi). Gunakan "Perbaikan Stok Terkendali" di bawah untuk memperbaiki dengan audit trail:</p>`;
        html += critical.map(r => {
          /** @type {object|undefined} */
          const it = window.appState.items[r.itemId];
          return `<div class="glass" style="border-radius:10px;padding:10px 12px;margin-top:8px;border:1px solid rgba(214,54,44,.35);">
            <div style="font-size:12px;font-weight:700;">${label(r.itemId)}</div>
            <div style="font-size:11px;color:var(--ink-600);margin-top:4px;">Ledger: ${r.ledgerQty} · Stock Balance: ${r.balQty} · Total Rak: ${r.rackTotal}</div>
            <div style="font-size:11px;color:rgba(214,54,44,.35);margin-top:2px;">Kemungkinan ada write langsung ke stockBalances di luar alur transaksi, atau bug penghitungan.</div>
          </div>`;
        }).join('');
      }
      if (rackGap.length) {
        html += `<p style="font-size:12px;color:#b8860b;margin:14px 0 6px;font-weight:700;">ℹ ${rackGap.length} item saldo per-rak belum lengkap (biasanya karena ada transaksi MASUK tanpa rackId):</p>`;
        html += rackGap.map(r => {
          /** @type {object|undefined} */
          const it = window.appState.items[r.itemId];
          return `<div class="glass" style="border-radius:10px;padding:10px 12px;margin-top:8px;border:1px solid rgba(184,134,11,.35);">
            <div style="font-size:12px;font-weight:700;">${label(r.itemId)}</div>
            <div style="font-size:11px;color:var(--ink-600);margin-top:4px;">Ledger: ${r.ledgerQty} · Stock Balance: ${r.balQty} · Total Rak: ${r.rackTotal}</div>
            <div style="font-size:11px;color:rgba(184,134,11,.35);margin-top:2px;">Ledger & Stock Balance sudah cocok — hanya distribusi per rak yang belum lengkap. Bukan bug kritis.</div>
          </div>`;
        }).join('');
      }
    }

    el.innerHTML = html;
  } catch (err) {
    console.error('runReconciliation error:', err);
    el.innerHTML = `<p style="font-size:12px;color:var(--danger);text-align:center;padding:10px 0;">Gagal memuat data: ${err.message || 'error'}</p>`;
  }
}

/**
 * Execute controlled data recovery (Phase 5: Perbaikan Stok Terkendali).
 * Alur wajib: PREVIEW -> pilih item + isi alasan -> CONFIRMATION -> tulis AUDIT LOG
 * (stockCorrections, immutable) BARENG stockBalances yang diperbaiki, dalam satu
 * runTransaction (Rules memverifikasi keduanya via getAfter — lihat firestore.rules).
 * 
 * Tidak pernah "silent repair": stockBalances TIDAK BISA ditulis dengan jalur koreksi
 * ini tanpa audit log yang menyertainya di commit yang sama.
 * 
 * @function executeRecovery
 * @param {object} [options] - Optional parameters
 * @param {string} [options.reason] - Reason for correction (required by Rules)
 * @param {Array<string>} [options.itemIds] - Item IDs to correct (if not using prompt)
 * 
 * @example
 * ```javascript
 * // Execute recovery with user-provided reason
 * window.executeRecovery();
 * 
 * // Execute recovery with predefined items and reason
 * window.executeRecovery({
 *   reason: 'Hasil rekonciliasi rutinitas menemukan mismatch ledger',
 *   itemIds: ['item_001', 'item_005']
 * });
 * ```
 * 
 * @private
 * @internal
 */
export function executeRecovery(options) {
  /** @type {string} */
  let reason = options && options.reason ? options.reason : null;

  // AUTHORIZATION CHECK: Only ADMIN may execute controlled data recovery
  if (!getAppState().isAdmin()) {
    window.showToast('Akses ditolak — hanya Admin yang boleh perbaiki stok');
    return;
  }

  // If no reason provided, prompt user
  if (!reason) {
    reason = prompt('Masukkan alasan perbaikan stok (wajib, akan tercatat di audit log):');
  }
  if (!reason) {
    window.showToast('Alasan perbaikan wajib diisi');
    return;
  }

  /** @type {boolean} */
  let confirmResult = confirm(`Anda akan memperbaiki item stok. Perubahan ini tercatat permanen di audit log (stockCorrections) dan TIDAK BISA dihapus/diedit. Lanjutkan?`);
  if (!confirmResult) return;

  // If item IDs not provided via options, prompt for them
  /** @type {Array<string>} */
  let itemIds = options && options.itemIds ? options.itemIds : null;
  if (!itemIds) {
    /** @type {string} */
    const idsPrompt = prompt('Masukkan item IDs yang akan diperbaiki (comma-separated, mis. "item_001,item_005"):');
    if (!idsPrompt) return;
    itemIds = idsPrompt.split(',').map(s => s.trim()).filter(Boolean);
    if (!itemIds.length) return;
  }

  /** @type {HTMLElement} */
  const confirmBtn = document.getElementById('btn-recovery-confirm');
  if (confirmBtn) confirmBtn.disabled = true;

  /** @type {number} */
  let success = 0, failed = 0;

  /** @type {Array<object>} */
  const critical = window.appState.getLowStockItems().filter(r => itemIds.includes(r._id));

  try {
    for (const itemId of itemIds) {
      /** @type {object|undefined} */
      const row = critical.find(r => r._id === itemId);
      if (!row) continue;

      /** @type {import('firebase/firestore').Firestore} */
      const db = window.db;
      if (!db) continue;

      try {
        await runTransaction(db, async (tx) => {
          /** @type {import('firebase/firestore').DocumentReference} */
          const balRef = doc(db, 'stockBalances', itemId);
          /** @type {import('firebase/firestore').DocumentSnapshot} */
          const balSnap = await tx.get(balRef);
          /** @type {number} */
          const oldQty = balSnap.exists() ? (balSnap.data().qty || 0) : 0;

          // AUDIT LOG dulu (immutable, create-only) — Rules mewajibkan stockBalances
          // jalur koreksi ini menyertakan lastCorrectionId yang valid di commit yang sama.
          /** @type {import('firebase/firestore').DocumentReference} */
          const corrRef = doc(collection(db, 'stockCorrections'));
          tx.set(corrRef, {
            itemId, oldQty, newQty: row.ledgerQty, reason,
            createdAt: serverTimestamp(), createdBy: window.appState.currentUser?.uid, createdByName: window.appState.currentUser?.name
          });

          // TANPA merge — jalur koreksi sengaja overwrite penuh, tidak boleh bercampur field lastTransactionId lama
          tx.set(balRef, {
            qty: row.ledgerQty, itemId, lastCorrectionId: corrRef.id, updatedAt: serverTimestamp()
          });
        });

        success++;
      } catch (e) {
        console.error(`Recovery failed for ${itemId}:`, e);
        failed++;
      }
    }

    /** @type {HTMLElement} */
    const progressEl = document.getElementById('recovery-progress');
    if (progressEl) {
      /** @type {string} */
      progressEl.innerHTML = `<p style="font-size:11px;color:var(--ink-400);">Sukses: ${success}/${itemIds.length} | Gagal: ${failed}</p>`;
    }

    /** @type {string} */
    const toastMsg = `${success} item diperbaiki, ${failed} gagal`;
    window.showToast(toastMsg);

    // Refresh reconciliation view
    if (window.runReconciliation) window.runReconciliation();
  } catch (err) {
    console.error('executeRecovery error:', err);
    window.showToast(`Error: ${err.message || 'Terjadi kesalahan'}`);
  } finally {
    /** @type {HTMLElement} */
    const confirmBtn = document.getElementById('btn-recovery-confirm');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Perbaiki Item Terpilih';
    }
  }
}

/**
 * Export items as CSV file with formula injection protection.
 * All cell values that start with =, +, -, or @ are prefixed with an apostrophe
 * (') to force Excel/Sheets to read them as plain text, not as formulas.
 * 
 * @function exportItemsCSV
 * 
 * @example
 * ```javascript
 * // Export master item list to CSV
 * window.exportItemsCSV();
 * // User downloads MasterItem_2024-01-15.csv
 * ```
 * 
 * @private
 * @internal
 */
export function exportItemsCSV() {
  try {
    /** @type {Array<Array<string>>} */
    const rows = [['Kode Item', 'Nama', 'Spesifikasi', 'Unit', 'Kategori', 'Vendor', 'Rak Default', 'BC/Non-BC', 'Stok Saat Ini', 'Minimum Stock', 'Status']];

    /** @type {Array<object>} */
    Object.values(window.appState.items).forEach(i => {
      /** @type {string} */
      const cat = i.categoryId ? (window.appState.categories[i.categoryId]?.categoryName || '') : '';
      /** @type {string} */
      const ven = i.vendorId ? (window.appState.vendors[i.vendorId]?.vendorName || '') : '';
      /** @type {string} */
      const rak = i.defaultRack ? (window.appState.racks[i.defaultRack]?.rackCode || '') : '';

      /** @type {function} */
      const csvEscape = (val) => {
        /** @type {string} */
        let s = String(val ?? '');
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      /** @type {number} */
      const currentStock = window.appState.getCurrentStock(i._id || Object.keys(window.appState.items).find(k => window.appState.items[k] === i) || '');

      rows.push([
        i.itemCode || '', i.name || '', i.specification || '', i.unit || '',
        cat, ven, rak, i.bcStatus || '',
        String(currentStock), String(i.minimumStock ?? 0), i.status || 'ACTIVE'
      ]);
    });

    /** @type {string} */
    const csvContent = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
    /** @type {Blob} */
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    /** @type {string} */
    const url = URL.createObjectURL(blob);
    /** @type {HTMLAnchorElement} */
    const a = document.createElement('a');
    a.href = url;
    /** @type {string} */
    a.download = `MasterItem_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.showToast('CSV berhasil diunduh');
  } catch (err) {
    console.error('exportItemsCSV error:', err);
    window.showToast(`Error: ${err.message || 'Terjadi kesalahan'}`);
  }
}

/**
 * Initialize global error handling.
 * Should be called once during app bootstrap after Firebase init.
 * Sets up unhandled promise rejection and script error handlers
 * to prevent silent crashes and provide user-friendly error messages.
 * 
 * @function initErrorHandling
 * @see utils/error-boundary.js#setupGlobalHandler
 */
export function initErrorHandling() {
  errorBoundary.setupGlobalHandler();
}

/**
 * Utility modules export summary.
 * Lists all exported modules from the main entry point for documentation.
 * 
 * @function listExports
 * @returns {object} Object mapping module names to their exports
 * 
 * @example
 * ```javascript
 * const exports = window.listExports();
 * // Returns: { firebase: ..., state: ..., dom: ..., validation: ..., performance: ..., errorBoundary: ... }
 * ```
 */
export function listExports() {
  return {
    firebase: {
      initFirebase,
      getAuth,
      getFirestore,
      initAppCheck: () => utils.firebase.initAppCheck(initFirebase())
    },
    state: {
      AppState,
      getAppState,
      getCurrentStock: () => getAppState().getCurrentStock,
      hasRole: (role) => getAppState().hasRole(role),
      isAdmin: () => getAppState().isAdmin(),
      isWarehouse: () => getAppState().isWarehouse(),
      isViewer: () => getAppState().isViewer(),
      getLowStockItems: () => getAppState().getLowStockItems(),
      getAllItems: () => getAppState().getAllItems()
    },
    dom: {
      safeInnerHTML: utils.dom.safeInnerHTML,
      setText: utils.dom.setText,
      escapeHTML: utils.dom.escapeHTML,
      renderMasterRow: utils.dom.renderMasterRow,
      renderBadge: utils.dom.renderBadge,
      renderStatusPill: utils.dom.renderStatusPill,
      renderStockHero: utils.dom.renderStockHero,
      renderToast: utils.dom.renderToast
    },
    validation: {
      validateTransaction: utils.validation.validateTransaction,
      validateItemCode: utils.validation.validateItemCode,
      checkCodeUniqueness: utils.validation.checkCodeUniqueness,
      validateCategoryCode: utils.validation.validateCategoryCode,
      validateVendorCode: utils.validation.validateVendorCode,
      validateRackCode: utils.validation.validateRackCode,
      csvEscapeFormulaInjection: utils.validation.csvEscapeFormulaInjection,
      validateModalForm: utils.validation.validateModalForm
    },
    performance: {
      debounce: utils.performance.debounce,
      throttle: utils.performance.throttle,
      debounceRender: utils.performance.debounceRender,
      memoize: utils.performance.memoize
    },
    errorBoundary: {
      wrapAsync: utils.errorBoundary.wrapAsync,
      wrapSync: utils.errorBoundary.wrapSync,
      setupGlobalHandler: utils.errorBoundary.setupGlobalHandler,
      cleanupGlobalHandler: utils.errorBoundary.cleanupGlobalHandler
    },
    modal: {
      open: utils.modal.open,
      toast: utils.modal.toast
    }
  };
}