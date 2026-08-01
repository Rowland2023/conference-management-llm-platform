// src/authentication/infrastructure/persistence/repositories/PostgresRefreshTokenRepository.js

import { RefreshTokenRepository }
    from "../../../domain/repositories/RefreshTokenRepository.js";

import { RefreshTokenMapper }
    from "../mappers/RefreshTokenMapper.js";

export class PostgresRefreshTokenRepository
    extends RefreshTokenRepository {

    constructor({

        knex,

    }) {

        super();

        this.knex = knex;

    }

    async findById(id) {

        const row =
            await this.knex("refresh_tokens")

                .where({

                    id,

                })

                .first();

        return RefreshTokenMapper.toDomain(
            row
        );

    }

    async findByTokenHash(tokenHash) {

        const row =
            await this.knex("refresh_tokens")

                .where({

                    token_hash:
                        tokenHash,

                })

                .first();

        return RefreshTokenMapper.toDomain(
            row
        );

    }

    async findByUserId(userId) {

        const rows =
            await this.knex("refresh_tokens")

                .where({

                    user_id:
                        userId.toString(),

                });

        return rows.map(

            RefreshTokenMapper.toDomain

        );

    }

    async save(refreshToken) {

        const row =
            RefreshTokenMapper.toPersistence(
                refreshToken
            );

        const exists =
            await this.findById(
                refreshToken.id
            );

        if (exists) {

            await this.knex("refresh_tokens")

                .where({

                    id:
                        row.id,

                })

                .update(row);

            return;

        }

        await this.knex("refresh_tokens")

            .insert(row);

    }

    async delete(id) {

        await this.knex("refresh_tokens")

            .where({

                id,

            })

            .delete();

    }

    async deleteByUserId(userId) {

        await this.knex("refresh_tokens")

            .where({

                user_id:
                    userId.toString(),

            })

            .delete();

    }

    async deleteExpired() {

        await this.knex("refresh_tokens")

            .where(

                "expires_at",

                "<=",

                new Date()

            )

            .delete();

    }

}