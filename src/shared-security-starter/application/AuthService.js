/**
 * @file src/shared-security-starter/application/AuthService.js
 * @description Staff-grade authentication orchestrator with constant-time password comparison,
 *              brute-force protection, and session tracking.
 */

import crypto from "crypto";

export class AuthService {

  /**
   * Pre-computed dummy bcrypt/argon2 hash used to equalize execution timing.
   * @private
   */
  static DUMMY_HASH =
    "$2b$12$e868d4aB94QG4X4P1V712.QeB04M85M6mG1P9kP53QxS1o4U3gW7a";



  constructor({
    userRepository,
    passwordHasher,
    tokenProvider,
    sessionRepository = null,
    logger = null,
  }) {

    if (!userRepository || !passwordHasher || !tokenProvider) {
      throw new Error(
        "[AuthService] Missing required dependencies (userRepository, passwordHasher, tokenProvider)."
      );
    }


    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenProvider = tokenProvider;
    this.sessionRepository = sessionRepository;
    this.logger = logger;

  }





  /**
   * Hashes raw token for secure persistence.
   */
  _hashToken(token) {

    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

  }





  /**
   * Authenticates credentials and issues access/refresh tokens.
   */
  async authenticate(
    email,
    password,
    metadata = {}
  ) {


    if (!email || !password) {
      throw new Error(
        "Authentication failed: Invalid credentials."
      );
    }



    const cleanEmail =
      email
        .toLowerCase()
        .trim();



    const user =
      await this.userRepository.findByEmail(
        cleanEmail
      );



    /*
      Timing defense:
      Always execute password hash comparison.
      If user does not exist, compare against dummy hash.
    */
    const targetHash =
      user
        ? user.passwordHash
        : AuthService.DUMMY_HASH;



    const isPasswordValid =
      await this.passwordHasher.compare(
        password,
        targetHash
      );




    if (!user || !isPasswordValid) {


      if (
        user &&
        typeof this.userRepository.incrementFailedAttempts === "function"
      ) {

        await this.userRepository.incrementFailedAttempts(
          user.id
        );

      }



      this.logger?.warn?.(
        `[AuthService] Failed login attempt for email: ${cleanEmail}`
      );



      throw new Error(
        "Authentication failed: Invalid credentials."
      );

    }





    if (user.isLocked) {


      this.logger?.warn?.(
        `[AuthService] Login blocked: User account '${user.id}' is locked.`
      );



      throw new Error(
        "Authentication failed: Account is locked or suspended."
      );

    }





    if (
      typeof this.userRepository.resetFailedAttempts === "function"
    ) {

      await this.userRepository.resetFailedAttempts(
        user.id
      );

    }





    const sessionId =
      crypto.randomUUID();





    const accessPayload = {

      sub: user.id,

      roles:
        Array.isArray(user.roles)
          ? user.roles
          : [],


      permissions:
        Array.isArray(user.permissions)
          ? user.permissions
          : [],


      tenantId:
        user.tenantId || null,


      sid: sessionId,

    };





    const accessToken =
      await this.tokenProvider.generateAccessToken(
        accessPayload
      );





    const refreshPayload = {

      sub: user.id,

      sid: sessionId,

      jti: crypto.randomUUID(),

    };





    const refreshToken =
      await this.tokenProvider.generateRefreshToken(
        refreshPayload
      );






    if (this.sessionRepository) {


      await this.sessionRepository.createSession({

        sessionId,

        userId: user.id,

        refreshTokenHash:
          this._hashToken(refreshToken),


        ipAddress:
          metadata.ipAddress || null,


        userAgent:
          metadata.userAgent || null,


        expiresAt:
          new Date(
            Date.now() +
            7 * 24 * 60 * 60 * 1000
          ),

      });

    }





    this.logger?.info?.(
      `[AuthService] User '${user.id}' successfully authenticated (Session: ${sessionId}).`
    );





    return {

      accessToken,

      refreshToken,

      user: {

        id: user.id,

        email: user.email,

        roles:
          Array.isArray(user.roles)
            ? user.roles
            : [],


        tenantId:
          user.tenantId || null,

      },

    };

  }

}