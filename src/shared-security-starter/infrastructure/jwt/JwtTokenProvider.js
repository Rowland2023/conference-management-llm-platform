/**
 * @file JwtTokenProvider.js
 *
 * JWT Token Provider.
 *
 * Responsibilities:
 * - Generate access tokens
 * - Generate refresh tokens
 * - Verify tokens
 * - Decode tokens
 */

import jwt from "jsonwebtoken";

export class JwtTokenProvider {

    constructor({

        accessSecret = process.env.JWT_ACCESS_SECRET,

        refreshSecret = process.env.JWT_REFRESH_SECRET,

        accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m",

        refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d",

    } = {}) {

        if (!accessSecret) {
            throw new Error(
                "JWT_ACCESS_SECRET is required."
            );
        }

        if (!refreshSecret) {
            throw new Error(
                "JWT_REFRESH_SECRET is required."
            );
        }

        this.accessSecret = accessSecret;

        this.refreshSecret = refreshSecret;

        this.accessExpiresIn = accessExpiresIn;

        this.refreshExpiresIn = refreshExpiresIn;
    }

    //----------------------------------------------------------
    // Access Token
    //----------------------------------------------------------

    generateAccessToken(user) {

        if (!user?.id) {
            throw new Error(
                "User id is required."
            );
        }

        return jwt.sign(
            {
                sub: user.id,

                email: user.email,

                role: user.role,

                type: "access",
            },

            this.accessSecret,

            {
                expiresIn: this.accessExpiresIn,
            }
        );
    }

    verifyAccessToken(token) {

        return jwt.verify(
            token,
            this.accessSecret
        );
    }

    //----------------------------------------------------------
    // Refresh Token
    //----------------------------------------------------------

    generateRefreshToken(session) {

        if (!session?.id) {
            throw new Error(
                "Session id is required."
            );
        }

        return jwt.sign(
            {
                sub: session.userId,

                sid: session.id,

                type: "refresh",
            },

            this.refreshSecret,

            {
                expiresIn: this.refreshExpiresIn,
            }
        );
    }

    verifyRefreshToken(token) {

        return jwt.verify(
            token,
            this.refreshSecret
        );
    }

    //----------------------------------------------------------
    // Generic
    //----------------------------------------------------------

    decode(token) {

        return jwt.decode(token);

    }

}