// src/authentication/domain/repositories/RefreshTokenRepository.js

export class RefreshTokenRepository {

    async findByTokenHash(tokenHash) {

        throw new Error(
            "RefreshTokenRepository.findByTokenHash() must be implemented."
        );

    }

    async save(refreshToken) {

        throw new Error(
            "RefreshTokenRepository.save() must be implemented."
        );

    }

    async revoke(tokenHash) {

        throw new Error(
            "RefreshTokenRepository.revoke() must be implemented."
        );

    }

    async revokeAllForUser(userId) {

        throw new Error(
            "RefreshTokenRepository.revokeAllForUser() must be implemented."
        );

    }

}