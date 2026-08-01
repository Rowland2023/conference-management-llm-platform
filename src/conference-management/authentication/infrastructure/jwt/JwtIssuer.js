// src/authentication/infrastructure/jwt/JwtTokenIssuer.js

import jwt from "jsonwebtoken";

import crypto from "node:crypto";

import { TokenIssuer }
    from "../../domain/services/TokenIssuer.js";

import { AuthenticationTokens }
    from "../../domain/valueObjects/AuthenticationTokens.js";

export class JwtTokenIssuer
    extends TokenIssuer {

    constructor({

        secret,

        issuer,

        audience,

        accessTokenTtl = "15m",

        refreshTokenTtl = "30d",

    }) {

        super();

        this.secret = secret;

        this.issuer = issuer;

        this.audience = audience;

        this.accessTokenTtl =
            accessTokenTtl;

        this.refreshTokenTtl =
            refreshTokenTtl;

    }

    async issueTokens(user) {

        const accessToken =
            jwt.sign(

                {

                    sub:
                        user.id.toString(),

                    email:
                        user.email.toString(),

                    roles:
                        user.roles.map(

                            role =>
                                role.toString()

                        ),

                },

                this.secret,

                {

                    issuer:
                        this.issuer,

                    audience:
                        this.audience,

                    expiresIn:
                        this.accessTokenTtl,

                }

            );

        const refreshToken =
            crypto.randomUUID();

        return new AuthenticationTokens({

            accessToken,

            refreshToken,

            accessTokenExpiresAt:
                this.calculateExpiry(
                    this.accessTokenTtl
                ),

            refreshTokenExpiresAt:
                this.calculateExpiry(
                    this.refreshTokenTtl
                ),

        });

    }

    async verify(token) {

        return jwt.verify(

            token,

            this.secret,

            {

                issuer:
                    this.issuer,

                audience:
                    this.audience,

            }

        );

    }

    calculateExpiry(ttl) {

        const now =
            new Date();

        if (
            ttl.endsWith("m")
        ) {

            now.setMinutes(

                now.getMinutes() +
                Number(
                    ttl.slice(0, -1)
                )

            );

        } else if (
            ttl.endsWith("h")
        ) {

            now.setHours(

                now.getHours() +
                Number(
                    ttl.slice(0, -1)
                )

            );

        } else if (
            ttl.endsWith("d")
        ) {

            now.setDate(

                now.getDate() +
                Number(
                    ttl.slice(0, -1)
                )

            );

        }

        return now;

    }

}