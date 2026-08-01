// src/authentication/infrastructure/persistence/mappers/RefreshTokenMapper.js

import { RefreshToken }
    from "../../../domain/entities/RefreshToken.js";

import { UserId }
    from "../../../domain/valueObjects/UserId.js";

export class RefreshTokenMapper {

    static toDomain(row) {

        if (!row) {
            return null;
        }

        return new RefreshToken({

            id:
                row.id,

            userId:
                new UserId(
                    row.user_id
                ),

            tokenHash:
                row.token_hash,

            expiresAt:
                new Date(
                    row.expires_at
                ),

            revoked:
                Boolean(
                    row.revoked
                ),

            createdAt:
                new Date(
                    row.created_at
                ),

        });

    }

    static toPersistence(refreshToken) {

        return {

            id:
                refreshToken.id,

            user_id:
                refreshToken.userId.toString(),

            token_hash:
                refreshToken.tokenHash,

            expires_at:
                refreshToken.expiresAt,

            revoked:
                refreshToken.revoked,

            created_at:
                refreshToken.createdAt,

        };

    }

}