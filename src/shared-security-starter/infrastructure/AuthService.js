/**
 * @file AuthService.js
 *
 * Authentication Application Service.
 */

import { User } from "../domain/User.js";
import { Session } from "../domain/Session.js";

export class AuthService {

    constructor({

        userRepository,

        sessionRepository,

        passwordHasher,

        tokenProvider,

        logger = console,

    }) {

        if (!userRepository) {
            throw new Error(
                "AuthService requires userRepository."
            );
        }

        if (!sessionRepository) {
            throw new Error(
                "AuthService requires sessionRepository."
            );
        }

        if (!passwordHasher) {
            throw new Error(
                "AuthService requires passwordHasher."
            );
        }

        if (!tokenProvider) {
            throw new Error(
                "AuthService requires tokenProvider."
            );
        }

        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordHasher = passwordHasher;
        this.tokenProvider = tokenProvider;
        this.logger = logger;
    }

    //------------------------------------------------------
    // Register
    //------------------------------------------------------

    async register({

        email,

        password,

        firstName,

        lastName,

        role = "USER",

    }) {

        const existing =
            await this.userRepository.findByEmail(email);

        if (existing) {

            throw new Error(
                "Email already exists."
            );

        }

        const passwordHash =
            await this.passwordHasher.hash(password);

        const user =
            new User({

                email,

                passwordHash,

                firstName,

                lastName,

                role,

            });

        await this.userRepository.create(user);

        this.logger.info?.(
            "User registered.",
            {
                userId: user.id,
            }
        );

        return user;
    }

    //------------------------------------------------------
    // Login
    //------------------------------------------------------

    async login({

        email,

        password,

        ipAddress,

        userAgent,

    }) {

        const record =
            await this.userRepository.findByEmail(email);

        if (!record) {

            throw new Error(
                "Invalid credentials."
            );

        }

        const valid =
            await this.passwordHasher.verify(
                password,
                record.password_hash
            );

        if (!valid) {

            throw new Error(
                "Invalid credentials."
            );

        }

        const user =
            new User({

                id: record.id,

                email: record.email,

                passwordHash: record.password_hash,

                firstName: record.first_name,

                lastName: record.last_name,

                role: record.role,

                active: record.active,

                createdAt: record.created_at,

                updatedAt: record.updated_at,

            });

        const refreshTokenHash =
            await this.passwordHasher.hash(
                crypto.randomUUID()
            );

        const session =
            new Session({

                userId: user.id,

                refreshTokenHash,

                ipAddress,

                userAgent,

                expiresAt: new Date(
                    Date.now() +
                    1000 * 60 * 60 * 24 * 30
                ),

            });

        await this.sessionRepository.createSession({

            sessionId: session.id,

            userId: session.userId,

            refreshTokenHash: session.refreshTokenHash,

            ipAddress: session.ipAddress,

            userAgent: session.userAgent,

            expiresAt: session.expiresAt,

        });

        const accessToken =
            this.tokenProvider.generateAccessToken(user);

        const refreshToken =
            this.tokenProvider.generateRefreshToken(session);

        return {

            user: user.toJSON(),

            accessToken,

            refreshToken,

        };

    }

    //------------------------------------------------------
    // Refresh
    //------------------------------------------------------

    async refresh(refreshToken) {

        const payload =
            this.tokenProvider.verifyRefreshToken(
                refreshToken
            );

        const session =
            await this.sessionRepository.findActiveSession(
                payload.sid
            );

        if (!session) {

            throw new Error(
                "Session expired."
            );

        }

        const user =
            await this.userRepository.findById(
                payload.sub
            );

        if (!user) {

            throw new Error(
                "User not found."
            );

        }

        const accessToken =
            this.tokenProvider.generateAccessToken({

                id: user.id,

                email: user.email,

                role: user.role,

            });

        return {

            accessToken,

        };

    }

    //------------------------------------------------------
    // Logout
    //------------------------------------------------------

    async logout(sessionId) {

        await this.sessionRepository.revokeSession(
            sessionId
        );

        this.logger.info?.(
            "User logged out.",
            {
                sessionId,
            }
        );

    }

    //------------------------------------------------------
    // Password Change
    //------------------------------------------------------

    async changePassword({

        userId,

        currentPassword,

        newPassword,

    }) {

        const user =
            await this.userRepository.findById(userId);

        if (!user) {

            throw new Error(
                "User not found."
            );

        }

        const valid =
            await this.passwordHasher.verify(

                currentPassword,

                user.password_hash

            );

        if (!valid) {

            throw new Error(
                "Current password is incorrect."
            );

        }

        const newHash =
            await this.passwordHasher.hash(
                newPassword
            );

        await this.userRepository.updatePassword(

            userId,

            newHash

        );

        this.logger.info?.(
            "Password changed.",
            {
                userId,
            }
        );

    }

}