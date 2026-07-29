/**
 * @file PostgresUserRepository.js
 *
 * PostgreSQL implementation of the User Repository.
 */

export class PostgresUserRepository {

    constructor({

        db,

        logger = console,

    }) {

        if (!db || typeof db !== "function") {

            throw new Error(
                "PostgresUserRepository requires a Knex instance."
            );

        }

        this.db = db;
        this.logger = logger;

    }

    _getClient(trx) {

        return trx || this.db;

    }

    async save(user, trx = null) {

        const client =
            this._getClient(trx);

        const data = {

            id: user.id,

            email: user.email,

            password_hash:
                user.passwordHash,

            first_name:
                user.firstName ?? null,

            last_name:
                user.lastName ?? null,

            role:
                user.role,

            status:
                user.status,

            created_at:
                user.createdAt,

            updated_at:
                user.updatedAt,

        };

        const exists =
            await client("users")

                .where({ id: user.id })

                .first();

        if (exists) {

            await client("users")

                .where({ id: user.id })

                .update(data);

        } else {

            await client("users")
                .insert(data);

        }

        return user;

    }

    async findById(id, trx = null) {

        const client =
            this._getClient(trx);

        return client("users")

            .where({ id })

            .first();

    }

    async findByEmail(email, trx = null) {

        const client =
            this._getClient(trx);

        return client("users")

            .whereRaw(
                "LOWER(email)=LOWER(?)",
                [email]
            )

            .first();

    }

    async existsByEmail(email, trx = null) {

        const user =
            await this.findByEmail(
                email,
                trx
            );

        return !!user;

    }

    async delete(id, trx = null) {

        const client =
            this._getClient(trx);

        await client("users")

            .where({ id })

            .delete();

    }

}