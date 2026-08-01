// src/authentication/infrastructure/persistence/mappers/UserMapper.js

import { User }
    from "../../../domain/entities/User.js";

import { UserId }
    from "../../../domain/valueObjects/UserId.js";

import { Email }
    from "../../../domain/valueObjects/Email.js";

import { PasswordHash }
    from "../../../domain/valueObjects/PasswordHash.js";

import { Role }
    from "../../../domain/valueObjects/Role.js";

export class UserMapper {

    static toDomain(row) {

        if (!row) {
            return null;
        }

        return new User({

            id:
                new UserId(row.id),

            email:
                new Email(row.email),

            passwordHash:
                new PasswordHash(
                    row.password_hash
                ),

            roles:
                JSON.parse(
                    row.roles
                ).map(

                    role =>
                        new Role(role)

                ),

            status:
                row.status,

            emailVerified:
                row.email_verified,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at,

        });

    }

    static toPersistence(user) {

        return {

            id:
                user.id.toString(),

            email:
                user.email.toString(),

            password_hash:
                user.passwordHash.toString(),

            roles:
                JSON.stringify(

                    user.roles.map(

                        role =>
                            role.toString()

                    )

                ),

            status:
                user.status,

            email_verified:
                user.emailVerified,

            created_at:
                user.createdAt,

            updated_at:
                user.updatedAt,

        };

    }

}