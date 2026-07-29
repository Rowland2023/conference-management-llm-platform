/**
 * @file PostgresSessionRepository.js
 *
 * PostgreSQL Session Repository.
 */

export class PostgresSessionRepository {

    constructor({

        db,

        logger = console,

    }) {

        if (!db || typeof db !== "function") {

            throw new Error(
                "PostgresSessionRepository requires a Knex instance."
            );

        }

        this.db = db;
        this.logger = logger;

    }

    _getClient(trx) {

        return trx || this.db;

    }

    async createSession({

        sessionId,

        userId,

        refreshTokenHash,

        ipAddress = null,

        userAgent = null,

        expiresAt,

        trx = null,

    }) {

        const client =
            this._getClient(trx);

        await client("user_sessions")

            .insert({

                id:
                    sessionId,

                user_id:
                    userId,

                refresh_token_hash:
                    refreshTokenHash,

                ip_address:
                    ipAddress,

                user_agent:
                    userAgent,

                expires_at:
                    expiresAt,

                created_at:
                    new Date(),

            });

    }

    async findById(

        sessionId,

        trx = null

    ) {

        const client =
            this._getClient(trx);

        return client("user_sessions")

            .where({

                id:
                    sessionId,

            })

            .first();

    }

    async findActiveSession(

        sessionId,

        trx = null

    ) {

        const client =
            this._getClient(trx);

        return client("user_sessions")

            .where({

                id:
                    sessionId,

            })

            .whereNull(
                "revoked_at"
            )

            .where(
                "expires_at",
                ">",
                new Date()
            )

            .first();

    }

    async revokeSession(

        sessionId,

        trx = null

    ) {

        const client =
            this._getClient(trx);

        await client("user_sessions")

            .where({

                id:
                    sessionId,

            })

            .update({

                revoked_at:
                    new Date(),

            });

    }

    async revokeAllUserSessions(

        userId,

        trx = null

    ) {

        const client =
            this._getClient(trx);

        await client("user_sessions")

            .where({

                user_id:
                    userId,

            })

            .whereNull(
                "revoked_at"
            )

            .update({

                revoked_at:
                    new Date(),

            });

    }

    async deleteExpiredSessions() {

        return this.db("user_sessions")

            .where(

                "expires_at",

                "<",

                new Date()

            )

            .delete();

    }

}