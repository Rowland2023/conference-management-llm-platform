/**
 * @file PostgresUserRepository.js
 *
 * PostgreSQL implementation of User Repository.
 */

export class PostgresUserRepository {


    constructor({

        knex,

        logger = console,

    }) {


        if (!knex || typeof knex !== "function") {

            throw new Error(
                "PostgresUserRepository requires a Knex instance."
            );

        }


        this.knex = knex;

        this.logger = logger;

    }





    _getClient(trx) {

        return trx || this.knex;

    }





    async findById(id) {


        const client =
            this._getClient();


        const user =
            await client("users")
                .where({
                    id,
                    deleted_at: null,
                })
                .first();


        return user
            ? this._map(user)
            : null;

    }





    async findByEmail(email) {


        const client =
            this._getClient();


        const user =
            await client("users")
                .where({
                    email,
                    deleted_at: null,
                })
                .first();


        return user
            ? this._map(user)
            : null;

    }





    async existsByEmail(email) {


        const result =
            await this.knex("users")
                .where({
                    email,
                    deleted_at: null,
                })
                .first();


        return Boolean(result);

    }





    async save(user, trx = null) {


        const client =
            this._getClient(trx);


        await client("users")
            .insert({

                id:
                    user.id,

                email:
                    user.email,

                password_hash:
                    user.passwordHash,

                first_name:
                    user.firstName,

                last_name:
                    user.lastName,

                role:
                    user.role,

                created_at:
                    user.createdAt,

                updated_at:
                    user.updatedAt,

            })
            .onConflict("id")
            .merge();


        return user;

    }





    async update(user, trx = null) {


        const client =
            this._getClient(trx);


        await client("users")
            .where({
                id: user.id,
            })
            .update({

                email:
                    user.email,

                password_hash:
                    user.passwordHash,

                first_name:
                    user.firstName,

                last_name:
                    user.lastName,

                role:
                    user.role,

                updated_at:
                    user.updatedAt,

            });


        return user;

    }





    async delete(id) {


        await this.knex("users")
            .where({
                id,
            })
            .update({

                deleted_at:
                    new Date(),

            });

    }





    _map(row) {


        return {

            id:
                row.id,

            email:
                row.email,

            passwordHash:
                row.password_hash,

            firstName:
                row.first_name,

            lastName:
                row.last_name,

            role:
                row.role,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at,

            deletedAt:
                row.deleted_at,

        };

    }

}