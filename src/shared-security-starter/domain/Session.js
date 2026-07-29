/**
 * @file Session.js
 *
 * Refresh Token Session Aggregate.
 */

import { randomUUID } from "node:crypto";

export class Session {

    constructor({

        id = randomUUID(),

        userId,

        refreshTokenHash,

        ipAddress = null,

        userAgent = null,

        expiresAt,

        revokedAt = null,

        createdAt = new Date(),

    }) {

        if (!userId) {
            throw new Error("Session requires userId.");
        }

        if (!refreshTokenHash) {
            throw new Error(
                "Session requires refreshTokenHash."
            );
        }

        if (!(expiresAt instanceof Date)) {
            throw new Error(
                "expiresAt must be a Date."
            );
        }

        this.id = id;

        this.userId = userId;

        this.refreshTokenHash = refreshTokenHash;

        this.ipAddress = ipAddress;

        this.userAgent = userAgent;

        this.expiresAt = expiresAt;

        this.revokedAt = revokedAt;

        this.createdAt = createdAt;
    }

    //--------------------------------------------------
    // Domain Behavior
    //--------------------------------------------------

    revoke() {

        if (!this.revokedAt) {
            this.revokedAt = new Date();
        }

    }

    rotate(newRefreshTokenHash, newExpiresAt) {

        if (!newRefreshTokenHash) {

            throw new Error(
                "New refresh token hash is required."
            );

        }

        if (!(newExpiresAt instanceof Date)) {

            throw new Error(
                "newExpiresAt must be a Date."
            );

        }

        this.refreshTokenHash = newRefreshTokenHash;

        this.expiresAt = newExpiresAt;

        this.revokedAt = null;

    }

    //--------------------------------------------------
    // State
    //--------------------------------------------------

    isExpired(now = new Date()) {

        return now >= this.expiresAt;

    }

    isRevoked() {

        return this.revokedAt !== null;

    }

    isActive(now = new Date()) {

        return !this.isExpired(now) &&
               !this.isRevoked();

    }

    //--------------------------------------------------

    matchesRefreshTokenHash(hash) {

        return this.refreshTokenHash === hash;

    }

    //--------------------------------------------------

    toJSON() {

        return {

            id: this.id,

            userId: this.userId,

            ipAddress: this.ipAddress,

            userAgent: this.userAgent,

            expiresAt: this.expiresAt,

            revokedAt: this.revokedAt,

            createdAt: this.createdAt,

        };

    }

}