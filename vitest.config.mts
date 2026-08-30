/**
 * Vitest Configuration for RDI Indirect Inventory v6.70
 * 
 * Test setup for unit tests covering validation, state management,
 * and transaction logic. CDN-deployed Firebase app adapted for
 * Vitest jsdom environment.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // Project root for file resolution
  root: './',

  // Test file pattern
  test: {
    filename: {
      // Allow test files in tests/ unit directory
      pattern: 'tests/unit/**/*.test',
      // Also allow tests in root with .test.ts/tsx extension
      extensions: ['.test.js', '.test.ts', '.test.mts'],
    },
    // Don't auto-run, run via npm test or npx vitest
    autoRun: false,
  },

  // Resolve extensions
  resolve: {
    alias: {
      '@/*': resolve('./utils'),
      '@tests/*': resolve('./tests'),
    },
    extensions: ['.js', '.mjs'],
  },

  // Server configuration for jsdom environment
  testEnvironment: 'jsdom',

  // CSS handling for test environment
  css: {
    transformer: 'vitest-transform-css',
  },

  // Mock module settings
  mockReset: true,

  // Performance settings
  // Timout default 30 seconds, sufficient for unit tests
  timeout: 30000,

  // coverage configuration
  coverage: {
    // Collect coverage for .js files only
    reporter: ['text', 'json', 'html'],
    // Include all .js files from project root and tests
    directory: './coverage',
    // Report thresholds
    thresholds: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
});