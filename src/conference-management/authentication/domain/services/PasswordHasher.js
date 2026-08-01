// src/authentication/domain/services/PasswordHasher.js

export class PasswordHasher {

    async hash(password) {

        throw new Error(
            "PasswordHasher.hash() must be implemented."
        );

    }

    async verify(
        password,
        passwordHash,
    ) {

        throw new Error(
            "PasswordHasher.verify() must be implemented."
        );

    }

}