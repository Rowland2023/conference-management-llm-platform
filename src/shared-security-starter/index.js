/**
 * @file index.js
 * @description Main entry point and Composition Root for `shared-security-starter`.
 * Exports domain, application, infrastructure, and presentation layers,
 * along with a high-level SDK factory (`createSecuritySDK`) for rapid service bootstrapping.
 */

const Domain = require('./src/domain');
const Application = require('./src/application');
const Infrastructure = require('./src/infrastructure');
const Presentation = require('./src/presentation');

/**
 * Validates configuration parameters during composition.
 * @private
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('[shared-security-starter] Bootstrapping requires a valid configuration object.');
  }

  const { jwt, provider = 'default' } = config;

  if (jwt && !jwt.jwksUri && !jwt.secret) {
    throw new Error('[shared-security-starter] JWT configuration requires either "jwksUri" (RS256) or "secret" (HS256).');
  }

  const validProviders = ['default', 'cognito', 'keycloak', 'auth0'];
  if (!validProviders.includes(provider.toLowerCase())) {
    throw new Error(`[shared-security-starter] Unsupported provider "${provider}". Supported: ${validProviders.join(', ')}.`);
  }
}

/**
 * Resolves the appropriate Identity Provider (IdP) Anti-Corruption Layer adapter.
 * @private
 */
function resolveIdpProvider(providerType, config = {}) {
  const normalized = String(providerType).toLowerCase();

  switch (normalized) {
    case 'cognito':
      return new Infrastructure.CognitoProvider({
        tenantClaim: config.tenantClaim || 'custom:tenant_id',
        userPoolId: config.userPoolId || null,
      });
    case 'keycloak':
      return new Infrastructure.KeycloakProvider({
        customTenantClaim: config.tenantClaim || 'tenant_id',
      });
    case 'auth0':
      return new Infrastructure.Auth0Provider({
        customNamespace: config.customNamespace || 'https://claims.domain.com/',
        tenantClaim: config.tenantClaim || 'org_id',
      });
    default:
      return null;
  }
}

/**
 * Convenience Composition Root Factory to quickly instantiate a complete security context for Express microservices.
 *
 * @param {Object} config
 * @param {'default'|'cognito'|'keycloak'|'auth0'} [config.provider='default'] - Identity Provider type for ACL claim translation
 * @param {Object} [config.jwt]
 * @param {string} [config.jwt.jwksUri] - Remote JWKS endpoint (RS256)
 * @param {string} [config.jwt.secret] - Symmetric key secret (HS256)
 * @param {string} [config.jwt.issuer] - Expected token issuer
 * @param {string} [config.jwt.audience] - Expected token audience
 * @param {string} [config.tenantClaim] - Custom tenant claim key path in JWT
 * @param {Object} [config.database]
 * @param {import('knex').Knex} [config.database.knex] - Knex DB connection for M2M API Keys
 * @param {Object} [config.redis]
 * @param {Object} [config.redis.client] - Configured Redis or ioredis client instance
 * @param {Object} [config.logger] - Operational logger instance (e.g., Winston, Pino)
 *
 * @returns {Object} Instantiated security services and bound Express middleware
 */
function createSecuritySDK(config = {}) {
  validateConfig(config);

  const {
    provider = 'default',
    jwt = {},
    database = {},
    redis = {},
    logger = null,
  } = config;

  // 1. Instantiate Infrastructure Adapters
  const jwtVerifier = jwt.jwksUri || jwt.secret
    ? new Infrastructure.JwtVerifier({
        jwksUri: jwt.jwksUri,
        secret: jwt.secret,
        issuer: jwt.issuer,
        audience: jwt.audience,
      })
    : null;

  const idpProvider = resolveIdpProvider(provider, config);

  const apiKeyHasher = new Infrastructure.ApiKeyHasher();

  const apiKeyRepository = database.knex
    ? new Infrastructure.ApiKeyRepository({ knex: database.knex })
    : null;

  const permissionCache = redis.client
    ? new Infrastructure.PermissionCache({ redisClient: redis.client })
    : null;

  // 2. Instantiate Application Layer Services
  const tokenVerifier = jwtVerifier
    ? new Application.TokenVerifier({
        jwtProvider: idpProvider || jwtVerifier,
        verifierEngine: jwtVerifier,
        logger,
      })
    : null;

  const apiKeyVerifier = apiKeyRepository
    ? new Application.ApiKeyVerifier({ apiKeyRepository, apiKeyHasher, logger })
    : null;

  const permissionService = new Application.PermissionService({ permissionCache });

  const authorizationService = new Application.AuthorizationService({
    permissionService,
    logger,
  });

  // 3. Instantiate and Bind Presentation Layer Middlewares with Operational Telemetry
  const authenticate = tokenVerifier
    ? Presentation.authenticate({ tokenVerifier, logger })
    : null;

  const apiKeyAuth = apiKeyVerifier
    ? Presentation.apiKeyAuth({ apiKeyVerifier, logger })
    : null;

  const authenticateOrApiKey = (tokenVerifier && apiKeyVerifier)
    ? Presentation.authenticateOrApiKey({ tokenVerifier, apiKeyVerifier, logger })
    : null;

  const requirePermission = (scope, options = {}) =>
    Presentation.requirePermission(scope, { logger, ...options });

  const requireRole = (roles, options = {}) =>
    Presentation.requireRole(roles, { logger, ...options });

  const authorize = (permission, resourceExtractor) =>
    Presentation.authorize({ authorizationService, permission, resourceExtractor, logger });

  return Object.freeze({
    // Core Domain & Application Services
    tokenVerifier,
    apiKeyVerifier,
    permissionService,
    authorizationService,

    // Pre-Bound Presentation Middlewares
    middleware: Object.freeze({
      authenticate,
      apiKeyAuth,
      authenticateOrApiKey,
      requirePermission,
      requireRole,
      authorize,
    }),

    // Direct Caching Access
    cache: permissionCache,
  });
}

/**
 * Immutable Module Exports Map
 */
module.exports = Object.freeze({
  // High-Level SDK Composition Root
  createSecuritySDK,

  // Modular Clean Architecture Layers
  Domain,
  Application,
  Infrastructure,
  Presentation,

  // Global Domain Error Classes
  ...(Domain.SecurityErrors || {}),
});