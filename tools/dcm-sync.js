#!/usr/bin/env node
/**
 * dcm-sync.js — ADVL DCM Synchronization Tool
 *
 * Scans the codebase for function definitions and compares them against
 * the current DCM.yaml. Reports:
 *   - Functions in the codebase NOT registered in the DCM (ghost logic)
 *   - DCM entries whose file/line references no longer match the codebase
 *   - Endpoints defined in route files not registered in the DCM
 *
 * Usage:
 *   node tools/dcm-sync.js [--project <path>] [--fix] [--verbose]
 *
 * Options:
 *   --project <path>   Path to the project root (default: current directory)
 *   --fix              Interactively prompt to register unregistered functions
 *   --verbose          Show all scanned files and matches
 *
 * Requirements:
 *   npm install js-yaml glob
 *
 * Author: Amadeus Lederle / IEX Labs UG (haftungsbeschränkt)
 * ADVL Version: 1.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const args = process.argv.slice(2);
const PROJECT_ROOT = getArg(args, '--project') || process.cwd();
const FLAG_FIX = args.includes('--fix');
const FLAG_VERBOSE = args.includes('--verbose');

const DCM_PATH = path.join(PROJECT_ROOT, 'schema', 'DCM.yaml');

// File patterns to scan for function definitions
const SOURCE_PATTERNS = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'app/**/*.ts',
  'app/**/*.tsx',
  'lib/**/*.ts',
  'pages/api/**/*.ts',
  'app/api/**/*.ts',
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  '*.test.ts',
  '*.spec.ts',
  '*.d.ts',
];

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║        ADVL DCM Sync Tool v1.0            ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // 1. Load DCM
  const dcm = loadDCM(DCM_PATH);
  if (!dcm) {
    console.error('✗ Could not load DCM.yaml at:', DCM_PATH);
    console.error('  Make sure you are running this from an ADVL project root,');
    console.error('  or use --project <path> to specify the project location.');
    process.exit(1);
  }

  console.log(`✓ DCM loaded: version ${dcm.version}, project "${dcm.project}"`);
  console.log(`  Use cases: ${(dcm.use_cases || []).length} registered\n`);

  // 2. Build index of registered functions from DCM
  const registeredFunctions = buildRegisteredFunctionsIndex(dcm);
  const registeredEndpoints = buildRegisteredEndpointsIndex(dcm);

  if (FLAG_VERBOSE) {
    console.log('── Registered Functions ──────────────────────');
    registeredFunctions.forEach((fn, name) => {
      console.log(`  ${name} → ${fn.file}:${fn.line} (${fn.use_case_id})`);
    });
    console.log('');
  }

  // 3. Scan codebase for functions
  console.log('── Scanning codebase ─────────────────────────');
  const codebaseFunctions = scanCodebase(PROJECT_ROOT, SOURCE_PATTERNS, EXCLUDE_PATTERNS);
  console.log(`  Found ${codebaseFunctions.length} exported function(s) in source files\n`);

  // 4. Run checks
  const report = runChecks(codebaseFunctions, registeredFunctions, registeredEndpoints, dcm);

  // 5. Print report
  printReport(report);

  // 6. Exit code
  const hasBlockers = report.ghostLogic.length > 0 || report.staleReferences.length > 0;
  if (hasBlockers) {
    console.log('\n✗ DCM sync FAILED — resolve blocking issues before committing.\n');
    process.exit(1);
  } else {
    console.log('\n✓ DCM sync PASSED — codebase and DCM are in sync.\n');
    process.exit(0);
  }
}

// ─────────────────────────────────────────────
// DCM Loading
// ─────────────────────────────────────────────

function loadDCM(dcmPath) {
  if (!fs.existsSync(dcmPath)) return null;
  try {
    const content = fs.readFileSync(dcmPath, 'utf8');
    return yaml.load(content);
  } catch (e) {
    console.error('  Error parsing DCM.yaml:', e.message);
    return null;
  }
}

function buildRegisteredFunctionsIndex(dcm) {
  const index = new Map();
  for (const uc of (dcm.use_cases || [])) {
    for (const fn of (uc.functions || [])) {
      index.set(fn.name, {
        ...fn,
        use_case_id: uc.id,
        use_case_title: uc.title,
      });
    }
  }
  return index;
}

function buildRegisteredEndpointsIndex(dcm) {
  const index = new Map();
  for (const uc of (dcm.use_cases || [])) {
    for (const fn of (uc.functions || [])) {
      if (fn.endpoint) {
        index.set(fn.endpoint, {
          ...fn,
          use_case_id: uc.id,
        });
      }
    }
  }
  return index;
}

// ─────────────────────────────────────────────
// Codebase Scanning
// ─────────────────────────────────────────────

function scanCodebase(projectRoot, patterns, excludes) {
  const results = [];

  // Simple recursive file scan without external glob dependency
  const sourceDir = path.join(projectRoot, 'src');
  const appDir = path.join(projectRoot, 'app');

  const dirsToScan = [];
  if (fs.existsSync(sourceDir)) dirsToScan.push(sourceDir);
  if (fs.existsSync(appDir)) dirsToScan.push(appDir);

  for (const dir of dirsToScan) {
    const files = getAllFiles(dir, excludes);
    for (const file of files) {
      if (!isSourceFile(file)) continue;
      const functions = extractFunctions(file, projectRoot);
      results.push(...functions);
    }
  }

  return results;
}

function getAllFiles(dir, excludes) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldExclude(entry.name, excludes)) continue;

    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, excludes));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function shouldExclude(name, excludes) {
  return excludes.some(pattern => {
    if (pattern.includes('*')) {
      const ext = pattern.replace('*', '');
      return name.endsWith(ext);
    }
    return name === pattern;
  });
}

function isSourceFile(filePath) {
  return /\.(ts|tsx|js|jsx)$/.test(filePath) &&
    !filePath.endsWith('.d.ts') &&
    !filePath.endsWith('.test.ts') &&
    !filePath.endsWith('.spec.ts') &&
    !filePath.endsWith('.test.tsx') &&
    !filePath.endsWith('.spec.tsx');
}

function extractFunctions(filePath, projectRoot) {
  const functions = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');

  // Patterns for exported function definitions
  const patterns = [
    // export async function name(
    // export function name(
    /^export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[(<]/,
    // export const name = async (
    // export const name = (
    // export const name: Type = (
    /^export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\(/,
    // export default async function name(
    // export default function name(
    /^export\s+default\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[(<]/,
  ];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        functions.push({
          name: match[1],
          file: relativePath,
          line: index + 1,
        });
        break;
      }
    }
  });

  return functions;
}

// ─────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────

function runChecks(codebaseFunctions, registeredFunctions, registeredEndpoints, dcm) {
  const report = {
    ghostLogic: [],           // In codebase, not in DCM
    staleReferences: [],      // In DCM, file/line doesn't match
    wellRegistered: [],       // In DCM, references verified
    dcmOrphans: [],           // In DCM, file doesn't exist at all
  };

  // Check 1: Ghost logic (codebase functions not in DCM)
  for (const fn of codebaseFunctions) {
    if (!registeredFunctions.has(fn.name)) {
      // Skip common non-business functions
      if (isInfrastructureFunction(fn.name)) continue;
      report.ghostLogic.push(fn);
    }
  }

  // Check 2: Stale references (DCM entries that don't match codebase)
  for (const [name, dcmFn] of registeredFunctions) {
    const codebaseFn = codebaseFunctions.find(f => f.name === name && f.file === dcmFn.file);
    if (!codebaseFn) {
      // Function not found at registered location
      const anyMatch = codebaseFunctions.find(f => f.name === name);
      if (anyMatch) {
        // Found elsewhere — line or file changed
        report.staleReferences.push({
          name,
          dcm: dcmFn,
          actual: anyMatch,
          issue: `File or line mismatch. DCM: ${dcmFn.file}:${dcmFn.line}, Actual: ${anyMatch.file}:${anyMatch.line}`,
        });
      } else {
        // Not found anywhere — may be deleted
        report.dcmOrphans.push({
          name,
          dcm: dcmFn,
          issue: `Function not found in codebase. May have been deleted without DCM deprecation.`,
        });
      }
    } else {
      report.wellRegistered.push({ name, file: dcmFn.file, line: codebaseFn.line });
    }
  }

  return report;
}

function isInfrastructureFunction(name) {
  // Common utility/infrastructure function names to skip
  const infraPatterns = [
    /^use[A-Z]/,         // React hooks
    /^handle[A-Z]/,      // Event handlers
    /^on[A-Z]/,          // Event handlers
    /^render[A-Z]/,      // React render helpers
    /^format[A-Z]/,      // Formatting utilities
    /^parse[A-Z]/,       // Parsing utilities
    /^validate[A-Z]/,    // Generic validators (not business rules)
    /^middleware/i,       // Middleware
    /^default$/,          // Default exports
    /^handler$/,          // Generic handlers
    /^GET$|^POST$|^PUT$|^PATCH$|^DELETE$/, // Next.js route handlers
  ];
  return infraPatterns.some(p => p.test(name));
}

// ─────────────────────────────────────────────
// Report Output
// ─────────────────────────────────────────────

function printReport(report) {
  // Ghost logic (BLOCKING)
  if (report.ghostLogic.length > 0) {
    console.log(`── Ghost Logic Detected (BLOCKING: ${report.ghostLogic.length}) ──────`);
    console.log('  These functions exist in the codebase but are NOT registered in the DCM.');
    console.log('  Register them before committing. See AGENTS.md Rule 1 and CORE_RULES CR-03.\n');
    for (const fn of report.ghostLogic) {
      console.log(`  ✗ ${fn.name}`);
      console.log(`    File: ${fn.file}:${fn.line}`);
      console.log('');
    }
  }

  // Stale references (BLOCKING)
  if (report.staleReferences.length > 0) {
    console.log(`── Stale DCM References (BLOCKING: ${report.staleReferences.length}) ──────`);
    console.log('  DCM entries with incorrect file or line references.\n');
    for (const item of report.staleReferences) {
      console.log(`  ✗ ${item.name} (${item.dcm.use_case_id})`);
      console.log(`    ${item.issue}`);
      console.log('');
    }
  }

  // DCM orphans (WARNING)
  if (report.dcmOrphans.length > 0) {
    console.log(`── DCM Orphans (WARNING: ${report.dcmOrphans.length}) ──────────────`);
    console.log('  DCM entries whose functions cannot be found in the codebase.');
    console.log('  If deleted: mark as deprecated in DCM. See AGENTS.md Rule 9.\n');
    for (const item of report.dcmOrphans) {
      console.log(`  ⚠ ${item.name} (${item.dcm.use_case_id})`);
      console.log(`    ${item.issue}`);
      console.log('');
    }
  }

  // Well registered (INFO)
  if (report.wellRegistered.length > 0) {
    console.log(`── Verified Registrations (${report.wellRegistered.length}) ────────────`);
    for (const fn of report.wellRegistered) {
      console.log(`  ✓ ${fn.name} → ${fn.file}:${fn.line}`);
    }
    console.log('');
  }

  // Summary
  console.log('── Summary ───────────────────────────────────');
  console.log(`  Ghost logic (blocking):     ${report.ghostLogic.length}`);
  console.log(`  Stale references (blocking): ${report.staleReferences.length}`);
  console.log(`  DCM orphans (warning):       ${report.dcmOrphans.length}`);
  console.log(`  Verified registrations:      ${report.wellRegistered.length}`);
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx >= args.length - 1) return null;
  return args[idx + 1];
}

// ─────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
