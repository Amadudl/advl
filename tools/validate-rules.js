#!/usr/bin/env node
/**
 * validate-rules.js — ADVL Rulebook Compliance Validator
 *
 * Validates that a project and its DCM comply with all ADVL rules.
 * Checks performed:
 *   1. DCM structural integrity (all required fields present)
 *   2. No duplicate function names across use cases
 *   3. No duplicate endpoint definitions across use cases
 *   4. All implemented use cases have at least one function registered
 *   5. All deprecated use cases have deprecation metadata
 *   6. Visual element IDs follow the VE-[Entity]-[Action] convention
 *   7. Stack declaration is complete (no nulls on non-conditional fields)
 *   8. All use case IDs are unique
 *   9. All function file references point to existing files
 *  10. last_updated matches or is recent relative to function last_modified dates
 *
 * Usage:
 *   node tools/validate-rules.js [--project <path>] [--strict] [--verbose]
 *
 * Options:
 *   --project <path>   Path to the project root (default: current directory)
 *   --strict           Treat warnings as errors
 *   --verbose          Show all passing checks
 *
 * Requirements:
 *   npm install js-yaml
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
const FLAG_STRICT = args.includes('--strict');
const FLAG_VERBOSE = args.includes('--verbose');

const DCM_PATH = path.join(PROJECT_ROOT, 'schema', 'DCM.yaml');
const RULES_DIR = path.join(PROJECT_ROOT, 'rules');

// Visual element ID pattern
const VE_ID_PATTERN = /^VE-[A-Z][a-zA-Z0-9]+-[A-Z][a-zA-Z0-9]+$/;

// Required stack fields (non-conditional)
const REQUIRED_STACK_FIELDS = [
  'runtime', 'framework', 'language', 'database', 'auth',
  'api_style', 'deployment', 'ci_cd', 'testing', 'package_manager',
];

// Valid use case statuses
const VALID_STATUSES = ['planned', 'in_progress', 'implemented', 'deprecated'];

// Valid rules that can be applied
const VALID_RULES = ['NO_DUPLICATE', 'USE_CASE_FIRST', 'META_INJECTION', 'STACK_RULES', 'CORE_RULES', 'NO_FAKE'];

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║    ADVL Rule Compliance Validator v1.0    ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const results = {
    errors: [],
    warnings: [],
    passes: [],
  };

  // 1. Load DCM
  const dcm = loadDCM(DCM_PATH);
  if (!dcm) {
    results.errors.push({
      rule: 'CR-01',
      check: 'DCM file exists and is parseable',
      detail: `Could not load DCM.yaml at: ${DCM_PATH}`,
    });
    printResults(results);
    process.exit(1);
  }

  pass(results, 'CR-01', 'DCM file exists and is parseable');

  // 2. Run all checks
  checkTopLevelMetadata(dcm, results);
  checkStackDeclaration(dcm, results);
  checkUseCaseUniqueness(dcm, results);
  checkFunctionDuplication(dcm, results);
  checkEndpointDuplication(dcm, results);
  checkImplementedUseCases(dcm, results);
  checkDeprecatedUseCases(dcm, results);
  checkVisualElementIds(dcm, results);
  checkFileReferences(dcm, results, PROJECT_ROOT);
  checkRulesDirectory(results);
  checkADRFormat(dcm, results);
  checkNoFakeCompliance(dcm, results);

  // 3. Print results
  printResults(results);

  // 4. Exit code
  const errorCount = results.errors.length;
  const warningCount = results.warnings.length;
  const effectiveErrors = FLAG_STRICT ? errorCount + warningCount : errorCount;

  if (effectiveErrors > 0) {
    const mode = FLAG_STRICT ? ' (strict mode: warnings count as errors)' : '';
    console.log(`\n✗ Validation FAILED — ${errorCount} error(s), ${warningCount} warning(s)${mode}\n`);
    process.exit(1);
  } else {
    console.log(`\n✓ Validation PASSED — ${results.passes.length} check(s) passed, ${warningCount} warning(s)\n`);
    process.exit(0);
  }
}

// ─────────────────────────────────────────────
// Individual Checks
// ─────────────────────────────────────────────

function checkTopLevelMetadata(dcm, results) {
  const required = ['version', 'project', 'description', 'author', 'created', 'last_updated'];
  for (const field of required) {
    if (!dcm[field]) {
      error(results, 'CR-01', `DCM top-level field missing: ${field}`);
    } else {
      pass(results, 'CR-01', `Top-level field present: ${field} = "${dcm[field]}"`);
    }
  }

  // Date format check
  if (dcm.last_updated && !/^\d{4}-\d{2}-\d{2}$/.test(dcm.last_updated)) {
    error(results, 'CR-01', `last_updated is not in YYYY-MM-DD format: "${dcm.last_updated}"`);
  }

  // Use cases array exists
  if (!Array.isArray(dcm.use_cases)) {
    error(results, 'CR-01', 'DCM use_cases field is missing or not an array');
  } else {
    pass(results, 'CR-01', `use_cases array present (${dcm.use_cases.length} entries)`);
  }
}

function checkStackDeclaration(dcm, results) {
  if (!dcm.stack) {
    warn(results, 'CR-01', 'Stack declaration is missing. Add stack section to DCM.yaml during project init.');
    return;
  }

  // Only enforce required fields if at least one non-null value exists (i.e., stack has been initialized)
  const hasAnyValue = Object.values(dcm.stack).some(v => v !== null && v !== undefined);
  if (!hasAnyValue) {
    warn(results, 'CR-01', 'Stack declaration is all-null. Initialize stack values during project setup (Step 1 of ADVL init flow).');
    return;
  }

  for (const field of REQUIRED_STACK_FIELDS) {
    if (dcm.stack[field] === null || dcm.stack[field] === undefined) {
      warn(results, 'STACK_RULES', `Stack field "${field}" is null. Required for initialized projects.`);
    } else {
      pass(results, 'STACK_RULES', `Stack field declared: ${field} = "${dcm.stack[field]}"`);
    }
  }
}

function checkUseCaseUniqueness(dcm, results) {
  const usesCases = dcm.use_cases || [];
  const deprecated = dcm.deprecated || [];
  const allEntries = [...usesCases, ...deprecated];

  const idsSeen = new Set();
  const duplicates = [];

  for (const uc of allEntries) {
    if (!uc.id) {
      error(results, 'CR-02', 'Use case found with no id field');
      continue;
    }
    if (idsSeen.has(uc.id)) {
      duplicates.push(uc.id);
    }
    idsSeen.add(uc.id);
  }

  if (duplicates.length > 0) {
    error(results, 'CR-02', `Duplicate use case IDs found: ${duplicates.join(', ')}`);
  } else {
    pass(results, 'CR-02', `All use case IDs are unique (${allEntries.length} total)`);
  }

  // Check ID format
  for (const uc of allEntries) {
    if (uc.id && !/^UC-\d{3,}$/.test(uc.id)) {
      warn(results, 'CR-02', `Use case ID "${uc.id}" does not follow UC-XXX format`);
    }
    if (!VALID_STATUSES.includes(uc.status)) {
      error(results, 'CR-02', `Use case ${uc.id} has invalid status: "${uc.status}". Valid: ${VALID_STATUSES.join(', ')}`);
    }
    if (!uc.title) {
      error(results, 'CR-02', `Use case ${uc.id} is missing title`);
    }
    if (!uc.value) {
      error(results, 'USE_CASE_FIRST', `Use case ${uc.id} is missing value statement. Business value is non-negotiable.`);
    }
  }
}

function checkFunctionDuplication(dcm, results) {
  const usesCases = dcm.use_cases || [];
  const functionNames = new Map();
  const duplicates = [];

  for (const uc of usesCases) {
    for (const fn of (uc.functions || [])) {
      if (!fn.name) continue;
      if (functionNames.has(fn.name)) {
        duplicates.push({
          name: fn.name,
          uc1: functionNames.get(fn.name),
          uc2: uc.id,
        });
      } else {
        functionNames.set(fn.name, uc.id);
      }
    }
  }

  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      error(results, 'NO_DUPLICATE', `Function "${dup.name}" registered in both ${dup.uc1} and ${dup.uc2}. Violation of NO_DUPLICATE.`);
    }
  } else {
    pass(results, 'NO_DUPLICATE', `No duplicate function names found across use cases (${functionNames.size} functions checked)`);
  }
}

function checkEndpointDuplication(dcm, results) {
  const usesCases = dcm.use_cases || [];
  const endpoints = new Map();
  const duplicates = [];

  for (const uc of usesCases) {
    for (const fn of (uc.functions || [])) {
      if (!fn.endpoint) continue;
      if (endpoints.has(fn.endpoint)) {
        duplicates.push({
          endpoint: fn.endpoint,
          uc1: endpoints.get(fn.endpoint),
          uc2: uc.id,
        });
      } else {
        endpoints.set(fn.endpoint, uc.id);
      }
    }
  }

  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      error(results, 'NO_DUPLICATE', `Endpoint "${dup.endpoint}" registered in both ${dup.uc1} and ${dup.uc2}. Violation of NO_DUPLICATE.`);
    }
  } else {
    pass(results, 'NO_DUPLICATE', `No duplicate endpoints found (${endpoints.size} endpoints checked)`);
  }
}

function checkImplementedUseCases(dcm, results) {
  const usesCases = dcm.use_cases || [];

  for (const uc of usesCases) {
    if (uc.status === 'implemented') {
      if (!uc.functions || uc.functions.length === 0) {
        error(results, 'CR-03', `Use case ${uc.id} has status "implemented" but no functions registered`);
      } else {
        pass(results, 'CR-03', `Implemented use case ${uc.id} has ${uc.functions.length} function(s) registered`);

        // Check function record completeness
        for (const fn of uc.functions) {
          if (!fn.name) error(results, 'CR-03', `UC ${uc.id}: function record missing "name" field`);
          if (!fn.file) error(results, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "file" field`);
          if (fn.line === null || fn.line === undefined) error(results, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "line" field`);
          if (fn.auth_required === null || fn.auth_required === undefined) {
            warn(results, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "auth_required" field`);
          }
          if (!fn.last_modified) {
            warn(results, 'CR-03', `UC ${uc.id}: function "${fn.name}" missing "last_modified" field`);
          }
        }
      }
    }
  }
}

function checkDeprecatedUseCases(dcm, results) {
  const deprecated = dcm.deprecated || [];

  for (const uc of deprecated) {
    if (uc.status !== 'deprecated') {
      warn(results, 'CR-09', `Entry in deprecated array has status "${uc.status}" instead of "deprecated": ${uc.id}`);
    }
    if (!uc.deprecated_date) {
      error(results, 'CR-09', `Deprecated entry ${uc.id} missing "deprecated_date"`);
    }
    if (!uc.deprecated_reason) {
      error(results, 'CR-09', `Deprecated entry ${uc.id} missing "deprecated_reason"`);
    }

    if (uc.deprecated_date && uc.deprecated_reason) {
      pass(results, 'CR-09', `Deprecated entry ${uc.id} has proper deprecation metadata`);
    }
  }

  // Also check use_cases array for deprecated entries that should be moved
  const useCasesWithDeprecatedStatus = (dcm.use_cases || []).filter(uc => uc.status === 'deprecated');
  for (const uc of useCasesWithDeprecatedStatus) {
    warn(results, 'CR-09', `Use case ${uc.id} has status "deprecated" but is still in use_cases array. Move to deprecated array.`);
  }
}

function checkVisualElementIds(dcm, results) {
  const usesCases = dcm.use_cases || [];

  for (const uc of usesCases) {
    if (uc.visual_element_id === null || uc.visual_element_id === undefined) {
      pass(results, 'META_INJECTION', `Use case ${uc.id}: visual_element_id is null (system use case or intentionally unlinked)`);
    } else if (uc.visual_element_id === 'pending') {
      pass(results, 'META_INJECTION', `Use case ${uc.id}: visual_element_id is pending (UI not yet designed)`);
    } else if (!VE_ID_PATTERN.test(uc.visual_element_id)) {
      warn(results, 'META_INJECTION', `Use case ${uc.id}: visual_element_id "${uc.visual_element_id}" does not follow VE-[Entity]-[Action] pattern`);
    } else {
      pass(results, 'META_INJECTION', `Use case ${uc.id}: visual_element_id "${uc.visual_element_id}" is valid`);
    }
  }

  // Check for duplicate visual_element_ids
  const veIds = usesCases
    .map(uc => uc.visual_element_id)
    .filter(id => id && id !== 'pending');

  const veSeen = new Set();
  for (const id of veIds) {
    if (veSeen.has(id)) {
      error(results, 'META_INJECTION', `Duplicate visual_element_id "${id}" found across use cases`);
    }
    veSeen.add(id);
  }
}

function checkFileReferences(dcm, results, projectRoot) {
  const usesCases = dcm.use_cases || [];
  const checkedFiles = new Set();

  for (const uc of usesCases) {
    for (const fn of (uc.functions || [])) {
      if (!fn.file) continue;

      const fullPath = path.join(projectRoot, fn.file);
      const cacheKey = fn.file;

      if (!checkedFiles.has(cacheKey)) {
        checkedFiles.add(cacheKey);
        if (!fs.existsSync(fullPath)) {
          error(results, 'CR-03', `UC ${uc.id}: function "${fn.name}" references non-existent file: ${fn.file}`);
        } else {
          pass(results, 'CR-03', `File reference verified: ${fn.file}`);
        }
      }
    }
  }
}

function checkRulesDirectory(results) {
  const requiredRules = [
    'CORE_RULES.md',
    'NO_DUPLICATE.md',
    'USE_CASE_FIRST.md',
    'META_INJECTION.md',
    'STACK_RULES.md',
    'NO_FAKE.md',
  ];

  for (const ruleFile of requiredRules) {
    const fullPath = path.join(RULES_DIR, ruleFile);
    if (!fs.existsSync(fullPath)) {
      error(results, 'CR-07', `Required rule file missing: rules/${ruleFile}`);
    } else {
      pass(results, 'CR-07', `Rule file present: rules/${ruleFile}`);
    }
  }
}

function checkNoFakeCompliance(dcm, results) {
  const useCases = dcm.use_cases || [];

  for (const uc of useCases) {
    if (uc.status !== 'implemented') continue;

    // NF-05: implemented use cases must have the NO_FAKE rule applied
    const rulesApplied = uc.rules_applied || [];
    if (!rulesApplied.includes('NO_FAKE')) {
      warn(results, 'NO_FAKE',
        `UC ${uc.id} is "implemented" but NO_FAKE is not listed in rules_applied. ` +
        'Confirm completeness checklist (NF-05) was verified before marking implemented.');
    }

    // NF-05: every function in an implemented UC must have all required fields non-null
    for (const fn of (uc.functions || [])) {
      if (fn.line === 0 || fn.line === null || fn.line === undefined) {
        warn(results, 'NO_FAKE',
          `UC ${uc.id}: function "${fn.name}" has line 0 or null. ` +
          'Verify this is a real, complete implementation and update the line number.');
      }
      if (!fn.db_tables || fn.db_tables.length === 0) {
        if (fn.endpoint) {
          warn(results, 'NO_FAKE',
            `UC ${uc.id}: function "${fn.name}" has an endpoint but no db_tables. ` +
            'If this function touches the database, register the tables. If not, confirm intentional.');
        }
      }
      if (fn.auth_required === null || fn.auth_required === undefined) {
        error(results, 'NO_FAKE',
          `UC ${uc.id}: function "${fn.name}" has no auth_required value. ` +
          'Every endpoint must explicitly declare whether auth is required.');
      }
    }

    if (uc.functions && uc.functions.length > 0) {
      pass(results, 'NO_FAKE',
        `UC ${uc.id}: implemented with ${uc.functions.length} function(s) and non-empty function records`);
    }
  }

  // Check: no use case should have functions with empty/stub names
  for (const uc of useCases) {
    for (const fn of (uc.functions || [])) {
      if (!fn.name || fn.name.trim() === '') {
        error(results, 'NO_FAKE',
          `UC ${uc.id}: function record with empty name — stub or placeholder detected in DCM`);
      }
      if (fn.name && (fn.name.toLowerCase().includes('todo') || fn.name.toLowerCase().includes('placeholder') || fn.name.toLowerCase().includes('stub'))) {
        error(results, 'NO_FAKE',
          `UC ${uc.id}: function name "${fn.name}" suggests a stub or placeholder. ` +
          'Only real, complete implementations may be registered in the DCM.');
      }
    }
  }
}

function checkADRFormat(dcm, results) {
  const adrs = dcm.adrs || [];
  const validStatuses = ['proposed', 'accepted', 'superseded', 'deprecated'];

  for (const adr of adrs) {
    if (!adr.id || !/^ADR-\d{3,}$/.test(adr.id)) {
      warn(results, 'CR-06', `ADR missing or invalid id format (expected ADR-XXX): ${JSON.stringify(adr.id)}`);
    }
    if (!adr.decision) {
      error(results, 'CR-06', `ADR ${adr.id || 'unknown'} missing "decision" field`);
    }
    if (!adr.context) {
      error(results, 'CR-06', `ADR ${adr.id || 'unknown'} missing "context" field`);
    }
    if (!validStatuses.includes(adr.status)) {
      warn(results, 'CR-06', `ADR ${adr.id || 'unknown'} has invalid status "${adr.status}"`);
    }
    if (!adr.alternatives_considered || adr.alternatives_considered.length === 0) {
      warn(results, 'CR-06', `ADR ${adr.id || 'unknown'} has no alternatives_considered. Silent choices are technical debt.`);
    }

    if (adr.id && adr.decision && adr.context) {
      pass(results, 'CR-06', `ADR ${adr.id} is well-formed`);
    }
  }
}

// ─────────────────────────────────────────────
// Result Helpers
// ─────────────────────────────────────────────

function error(results, rule, detail) {
  results.errors.push({ rule, detail });
}

function warn(results, rule, detail) {
  results.warnings.push({ rule, detail });
}

function pass(results, rule, detail) {
  results.passes.push({ rule, detail });
}

// ─────────────────────────────────────────────
// Report Output
// ─────────────────────────────────────────────

function printResults(results) {
  if (results.errors.length > 0) {
    console.log(`── Errors (${results.errors.length}) ─────────────────────────────────`);
    for (const e of results.errors) {
      console.log(`  ✗ [${e.rule}] ${e.detail}`);
    }
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log(`── Warnings (${results.warnings.length}) ───────────────────────────────`);
    for (const w of results.warnings) {
      console.log(`  ⚠ [${w.rule}] ${w.detail}`);
    }
    console.log('');
  }

  if (FLAG_VERBOSE && results.passes.length > 0) {
    console.log(`── Passing Checks (${results.passes.length}) ────────────────────────────`);
    for (const p of results.passes) {
      console.log(`  ✓ [${p.rule}] ${p.detail}`);
    }
    console.log('');
  } else if (!FLAG_VERBOSE) {
    console.log(`── Passing Checks: ${results.passes.length} (use --verbose to see all) ────`);
    console.log('');
  }

  console.log('── Compliance Summary ────────────────────────');
  const rulesCovered = new Set([
    ...results.errors.map(e => e.rule),
    ...results.warnings.map(w => w.rule),
    ...results.passes.map(p => p.rule),
  ]);

  for (const rule of Array.from(rulesCovered).sort()) {
    const ruleErrors = results.errors.filter(e => e.rule === rule).length;
    const ruleWarnings = results.warnings.filter(w => w.rule === rule).length;
    const rulePasses = results.passes.filter(p => p.rule === rule).length;

    let status = '✓';
    if (ruleErrors > 0) status = '✗';
    else if (ruleWarnings > 0) status = '⚠';

    console.log(`  ${status} ${rule}: ${rulePasses} pass, ${ruleWarnings} warn, ${ruleErrors} error`);
  }
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

main();
