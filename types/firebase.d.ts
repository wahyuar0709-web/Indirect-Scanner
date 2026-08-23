/**
 * TypeScript type definitions for Firebase services
 * RDI Indirect Inventory v6.65+
 * 
 * These types extend the official Firebase types with
 * application-specific extensions for stock management.
 */

// Extend Firebase firestore DocumentReference with stock-check method
declare module 'firebase/firestore' {
  interface DocumentReference {
    /** 
     * Check stock consistency for a new quantity.
     * @param newQty - The new quantity to validate against ledger
     * @returns Promise<boolean> - true if consistent, false if mismatch
     */
    checkStockConsistency(newQty: number): Promise<boolean>;

    /** 
     * Get the last transaction ID referenced by this document.
     * @returns Promise<string|undefined> - The lastTransactionId or undefined
     */
    getLastTransactionId(): Promise<string | undefined>;
  }
}

// Extend Firebase firestore QuerySnapshot for migration operations
declare module 'firebase/firestore' {
  interface QuerySnapshot {
    /** 
     * Get migration batches document snapshot by ID.
     * @param migrationId - The migration batch ID
     * @returns Promise<import('firebase/firestore').DocumentSnapshot|undefined>
     */
    migrateBatch(migrationId: string): Promise<import('firebase/firestore').DocumentSnapshot | undefined>;

    /** 
     * Get migration rows collection query filtered by migrationId.
     * @returns import('firebase/firestore').Query
     */
    migrateRowsByBatch(migrationId: string): import('firebase/firestore').Query;
  }
}

// Application-specific Firebase configuration type
export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Application auth user profile type (from /users/{uid} collection)
export interface UserProfile {
  uid: string;
  role: 'ADMIN' | 'WAREHOUSE' | 'VIEWER';
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | null;
  createdAt?: import('firebase/firestore').Timestamp;
  createdBy?: string;
  createdByName?: string;
}

// Stock balance document type
export interface StockBalance {
  itemId: string;
  qty: number;
  lastTransactionId: string;
  updatedAt: import('firebase/firestore').Timestamp;
  lastCorrectionId?: string;
}

// Stock by rack document type
export interface StockByRack {
  itemId: string;
  rackId: string;
  qty: number;
  lastTransactionId: string;
  updatedAt: import('firebase/firestore').Timestamp;
}

// Transaction document type (canonical schema)
export interface TransactionPayload {
  itemId: string;
  type: 'MASUK' | 'KELUAR';
  qty: number;
  rackId?: string;
  vendorId?: string;
  noSjPo?: string;
  note?: string;
  createdAt: import('firebase/firestore').Timestamp;
  createdBy: string;
  createdByName: string;
  // Migration-specific fields (optional)
  sourceSystem?: string;
  sourceTransactionId?: string;
  migrationId?: string;
  historicalKind?: 'TRANSACTION' | 'OPENING_BALANCE';
  uom?: string;
  sourceDate?: string;
  sourceCreatedByRaw?: string;
  rowNumber?: number;
}

// Migration batch document type
export interface MigrationBatch {
  migrationId: string;
  sourceSystem: string;
  sourceFileName: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: import('firebase/firestore').Timestamp;
  status: 'VALIDATED' | 'VALIDATION_FAILED' | 'READY_TO_IMPORT' | 'IMPORTING' | 'PARTIAL' | 'IMPORT_FAILED' | 'RECONCILING' | 'COMPLETED' | 'RECONCILIATION_FAILED' | 'CANCELLED';
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  reconciliationStatus?: 'PASS' | 'WARNING' | 'FAILED';
  reconciliationNote?: string;
  reconciliationDetail?: string;
}

// Migration row document type
export interface MigrationRow {
  migrationId: string;
  rowNumber: number;
  sourceTransactionId: string;
  normalizedData: {
    itemId: string;
    rackId?: string;
    uom?: string;
    date?: string;
    createdByRaw?: string;
  };
  itemId: string;
  rackId?: string;
  effectiveType: 'MASUK' | 'KELUAR';
  historicalKind: 'TRANSACTION' | 'OPENING_BALANCE';
  mappingStatus: 'MATCHED' | 'UNMAPPED' | 'AMBIGUOUS';
  validationStatus: 'VALID' | 'WARNING' | 'INVALID';
  validationErrors?: string[];
  validationWarnings?: string[];
  importStatus: 'PENDING' | 'IMPORTED' | 'DUPLICATE' | 'FAILED' | 'BLOCKED';
  transactionId?: string;
  importedAt?: import('firebase/firestore').Timestamp;
}

// Firestore system flags type
export interface SystemFlags {
  cleanupMode: {
    enabled: boolean;
    enabledUntil: number; // timestamp in ms
  };
  factoryResetMode: {
    enabled: boolean;
    enabledUntil: number; // timestamp in ms
  };
}

// App state type (matching AppState class)
export interface AppStateInterface {
  items: Record<string, any>;
  categories: Record<string, any>;
  vendors: Record<string, any>;
  racks: Record<string, any>;
  transactions: Record<string, any>;
  stockBalances: Record<string, any>;
  stockByRacks: Record<string, any>;
  users: Record<string, any>;
  currentUser: object | null;
  currentRole: string | null;
  currentUserName: string | null;
  appVersion: string;
  migrationBatches: Record<string, any>;
  migrationRows: Record<string, any>;
  systemFlags: {
    cleanupMode: { enabled: boolean; enabledUntil: number };
    factoryResetMode: { enabled: boolean; enabledUntil: number };
  };
  getCurrentStock: (itemId: string) => number;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isWarehouse: () => boolean;
  isViewer: () => boolean;
  getLowStockItems: () => Array<any>;
  getAllItems: () => Array<any>;
  updateStockBalance: (itemId: string, delta: number, type: 'MASUK' | 'KELUAR', transactionId: string) => Promise<void>;
  updateStockByRack: (itemId: string, rackId: string, delta: number) => Promise<void>;
  setSystemFlag: (flagName: string, enabled: boolean, enabledUntil?: number) => Promise<void>;
  getSystemFlag: (flagName: string) => { enabled: boolean; enabledUntil: number };
  isFactoryResetActive: () => boolean;
  isCleanupModeActive: () => boolean;
  setAppVersion: (version: string) => void;
  getAppVersion: () => string;
}