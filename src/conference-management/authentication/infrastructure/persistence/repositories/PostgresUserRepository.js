// src/authentication/infrastructure/persistence/repositories/PostgresUserRepository.js

import { UserRepository }
    from "../../../domain/repositories/UserRepository.js";

import { UserMapper }
    from "../mappers/UserMapper.js";

export class PostgresUserRepository
    extends UserRepository {

    constructor({

        knex,

    }) {

        super();

        this.knex = knex;

    }

    async findById(id) {

        const row =
            await this.knex("users")

                .where({

                    id:
                        id.toString(),

                })

                .first();

        return UserMapper.toDomain(
            row
        );

    }

    async findByEmail(email) {

        const row =
            await this.knex("users")

                .where({

                    email:
                        email.toString(),

                })

                .first();

        return UserMapper.toDomain(
            row
        );

    }

    async existsByEmail(email) {

        const row =
            await this.knex("users")

                .where({

                    email:
                        email.toString(),

                })

                .first();

        return Boolean(row);

    }

    async save(user) {

        const row =
            UserMapper.toPersistence(
                user
            );

        const exists =
            await this.findById(
                user.id
            );

        if (exists) {

            await this.knex("users")

                .where({

                    id:
                        row.id,

                })

                .update(row);

            return;
        }

        await this.knex("users")

            .insert(row);

    }

    async delete(id) {

        await this.knex("users")

            .where({

                id:
                    id.toString(),

            })

            .delete();

    }

}