// src/authentication/domain/entities/RefreshToken.js

export class RefreshToken {

    constructor({

        id,

        userId,

        tokenHash,

        expiresAt,

        revoked = false,

        createdAt = new Date(),

    }) {

        this.id = id;

        this.userId = userId;

        this.tokenHash = tokenHash;

        this.expiresAt = expiresAt;

        this.revoked = revoked;

        this.createdAt = createdAt;

    }

    revoke() {

        this.revoked = true;

    }

    isExpired() {

        return (
            this.expiresAt <=
            new Date()
        );

    }

    isValid() {

        return (
            !this.revoked &&
            !this.isExpired()
        );

    }

}