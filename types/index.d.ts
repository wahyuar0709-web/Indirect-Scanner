/**
 * TypeScript type definitions index for RDI Indirect Inventory v6.65+
 * Re-exports and aggregates all type definitions from the types directory.
 */

// Re-export Firebase types
export type {
  FirebaseConfigType,
  UserProfile,
  StockBalance,
  StockByRack,
  TransactionPayload,
  MigrationBatch,
  MigrationRow,
  SystemFlags,
  AppStateInterface
} from './firebase';

// Re-export utility types
export type {
  // DOM safe HTML string types (from dom.js)
  DOMHtmlString,
  SafeInnerHTMLConfig
} from '../utils/dom';

// Main application types re-exported from state-manager
export type {
  AppState,
  AppStateInterface
} from '../utils/state-manager';

// Extended Firestore types
export type {
  checkStockConsistency,
  getLastTransactionId
} from '../types/firebase';

// Export the dom namespace type for IDE autocomplete
export namespace dom {
  // DOM utility types
  export interface SafeInnerHTMLConfig {
    expectHTML: boolean; // whether the HTML contains real tags or just text
    escapeEntities: boolean; // whether to escape HTML entities
  }
}