// src/authentication/domain/services/TokenIssuer.js

export class TokenIssuer {

    async issueAccessToken(
        payload,
    ) {

        throw new Error(
            "TokenIssuer.issueAccessToken() must be implemented."
        );

    }

    async issueRefreshToken(
        payload,
    ) {

        throw new Error(
            "TokenIssuer.issueRefreshToken() must be implemented."
        );

    }

    async verify(
        token,
    ) {

        throw new Error(
            "TokenIssuer.verify() must be implemented."
        );

    }

}