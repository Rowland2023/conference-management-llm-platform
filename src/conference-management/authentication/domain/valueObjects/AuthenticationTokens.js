// src/authentication/domain/valueObjects/AuthenticationTokens.js

export class AuthenticationTokens {

    constructor({

        accessToken,

        refreshToken,

        accessTokenExpiresAt,

        refreshTokenExpiresAt,

        tokenType = "Bearer",

    }) {

        if (!accessToken) {

            throw new Error(
                "Access token is required."
            );

        }

        if (!refreshToken) {

            throw new Error(
                "Refresh token is required."
            );

        }

        this.accessToken =
            accessToken;

        this.refreshToken =
            refreshToken;

        this.accessTokenExpiresAt =
            accessTokenExpiresAt;

        this.refreshTokenExpiresAt =
            refreshTokenExpiresAt;

        this.tokenType =
            tokenType;

        Object.freeze(this);

    }

    isAccessTokenExpired() {

        return (
            this.accessTokenExpiresAt <=
            new Date()
        );

    }

    isRefreshTokenExpired() {

        return (
            this.refreshTokenExpiresAt <=
            new Date()
        );

    }

}