/**
 * @file src/Security/application/AuthService.js
 * @description Staff-grade authentication orchestrator with constant-time password comparison,
 *              brute-force protection, and session tracking.
 */

const crypto = require('crypto');

class AuthService {
  /**
   * Pre-computed dummy bcrypt/argon2 hash used to equalize execution timing
   * when a non-existent email is passed to prevent timing enumeration attacks.
   * @private
   */
  static DUMMY_HASH = '$2b$12$e868d4aB94QG4X4P1V712.QeB04M85M6mG1P9kP53QxS1o4U3gW7a';

  /**
   * @param {Object} params
   * @param {Object} params.userRepository - Gateway for user storage & failure tracking
   * @param {Object} params.passwordHasher - Strategy for bcrypt/argon2 comparison
   * @param {Object} params.tokenProvider - Generator for JWT access and refresh tokens
   * @param {Object} [params.sessionRepository] - Optional storage for active refresh token families/sessions
   * @param {Object} [params.logger] - Logger instance
   */
  constructor({
    userRepository,
    passwordHasher,
    tokenProvider,
    sessionRepository = null,
    logger = null,
  }) {
    if (!userRepository || !passwordHasher || !tokenProvider) {
      throw new Error('[AuthService] Missing required dependencies (userRepository, passwordHasher, tokenProvider).');
    }

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenProvider = tokenProvider;
    this.sessionRepository = sessionRepository;
    this.logger = logger;
  }

  /**
   * Hashes a raw token string (e.g., refresh token) for secure storage.
   * @private
   */
  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Authenticates user credentials, applies timing defense, updates security counters,
   * and issues access/refresh tokens.
   *
   * @param {string} email - User login email
   * @param {string} password - Raw password
   * @param {Object} [metadata={}] - Request metadata (ipAddress, userAgent)
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: Object }>}
   */
  async authenticate(email, password, metadata = {}) {
    if (!email || !password) {
      throw new Error('Authentication failed: Invalid credentials.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(cleanEmail);

    // Timing Defense: Use actual user hash OR pre-computed dummy hash
    const targetHash = user ? user.passwordHash : AuthService.DUMMY_HASH;

    // Execute expensive hash comparison in all paths to eliminate timing side-channel
    const isPasswordValid = await this.passwordHasher.compare(password, targetHash);

    // If user does not exist or password mismatch occurred
    if (!user || !isPasswordValid) {
      if (user && typeof this.userRepository.incrementFailedAttempts === 'function') {
        await this.userRepository.incrementFailedAttempts(user.id);
      }

      if (this.logger) {
        this.logger.warn(`[AuthService] Failed login attempt for email: ${cleanEmail}`);
      }

      // Universal sanitized error message
      throw new Error('Authentication failed: Invalid credentials.');
    }

    // Account state assertions
    if (user.isLocked) {
      if (this.logger) {
        this.logger.warn(`[AuthService] Login blocked: User account '${user.id}' is locked.`);
      }
      throw new Error('Authentication failed: Account is locked or suspended.');
    }

    // Reset failed attempt counter on successful login
    if (typeof this.userRepository.resetFailedAttempts === 'function') {
      await this.userRepository.resetFailedAttempts(user.id);
    }

    // Unique session ID for token rotation and revocation support
    const sessionId = crypto.randomUUID();

    // 1. Build Access Token Payload
    const accessPayload = {
      sub: user.id,
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      tenantId: user.tenantId || null,
      sid: sessionId,
    };

    const accessToken = await this.tokenProvider.generateAccessToken(accessPayload);

    // 2. Build Refresh Token Payload
    const refreshPayload = {
      sub: user.id,
      sid: sessionId,
      jti: crypto.randomUUID(),
    };

    const refreshToken = await this.tokenProvider.generateRefreshToken(refreshPayload);

    // 3. Register active session/refresh token in store if present
    if (this.sessionRepository) {
      await this.sessionRepository.createSession({
        sessionId,
        userId: user.id,
        refreshTokenHash: this._hashToken(refreshToken),
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
      });
    }

    if (this.logger) {
      this.logger.info(`[AuthService] User '${user.id}' successfully authenticated (Session: ${sessionId}).`);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [],
        tenantId: user.tenantId || null,
      },
    };
  }
}

module.exports = AuthService;