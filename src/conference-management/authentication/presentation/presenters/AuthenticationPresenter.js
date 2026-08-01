// src/authentication/presentation/presenters/AuthenticationPresenter.js

export class AuthenticationPresenter {

    static success(tokens) {

        return {

            accessToken:
                tokens.accessToken,

            refreshToken:
                tokens.refreshToken,

            tokenType:
                tokens.tokenType,

            accessTokenExpiresAt:
                tokens.accessTokenExpiresAt,

            refreshTokenExpiresAt:
                tokens.refreshTokenExpiresAt,

        };

    }

}