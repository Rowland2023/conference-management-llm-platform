// src/authentication/presentation/dto/RefreshTokenRequest.js

export class RefreshTokenRequest {

    constructor({

        refreshToken,

    }) {

        this.refreshToken =
            refreshToken;

        Object.freeze(this);

    }

    static fromHttp(req) {

        return new RefreshTokenRequest({

            refreshToken:
                req.body.refreshToken,

        });

    }

}