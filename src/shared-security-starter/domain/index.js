/**
 * @file src/Security/domain/index.js
 * @description Centralized barrel file exporting pure core domain entities, value objects, and security errors.
 */

// 1. Core Value Objects & Base Entities
const Permission = require('./Permission');
const Role = require('./Role');
const ApiClient = require('./ApiClient');
const Actor = require('./Actor');

// 2. Aggregate In-Flight Execution Context
const AuthContext = require('./AuthContext');

// 3. Specialized Domain Exceptions
const SecurityErrors = require('./SecurityErrors');

/**
 * Immutable export map for Domain Layer components.
 */
const domainExports = Object.freeze({
  // Domain Entities & Aggregates
  Actor,
  ApiClient,
  Role,

  // Value Objects
  Permission,
  AuthContext,

  // Exception Classes (Grouped & Individual)
  SecurityErrors,
  ...(SecurityErrors || {}),
});

module.exports = domainExports;