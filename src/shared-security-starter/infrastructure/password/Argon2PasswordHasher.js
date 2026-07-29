/**
 * @file Argon2PasswordHasher.js
 *
 * Password hashing adapter.
 *
 * Responsibilities:
 * - Hash passwords
 * - Verify passwords
 * - Determine when a password hash should be upgraded
 */

import argon2 from "argon2";

export class Argon2PasswordHasher {

    constructor({

        memoryCost = 65536,

        timeCost = 3,

        parallelism = 1,

        hashLength = 32,

    } = {}) {

        this.options = {

            type: argon2.argon2id,

            memoryCost,

            timeCost,

            parallelism,

            hashLength,

        };

    }

    /**
     * Hash a plaintext password.
     *
     * @param {string} password
     * @returns {Promise<string>}
     */
    async hash(password) {

        if (!password) {

            throw new Error(
                "Password is required."
            );

        }

        return argon2.hash(
            password,
            this.options
        );

    }

    /**
     * Verify plaintext against hash.
     *
     * @param {string} password
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    async verify(password, hash) {

        if (!password || !hash) {

            return false;

        }

        return argon2.verify(
            hash,
            password
        );

    }

    /**
     * Determines whether an existing hash
     * should be upgraded.
     *
     * Useful after increasing security settings.
     *
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    async needsRehash(hash) {

        if (!hash) {

            throw new Error(
                "Hash is required."
            );

        }

        return argon2.needsRehash(
            hash,
            this.options
        );

    }

}