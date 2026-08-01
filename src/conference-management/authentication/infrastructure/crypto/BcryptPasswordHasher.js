// src/authentication/infrastructure/crypto/BcryptPasswordHasher.js

import bcrypt from "bcrypt";

import { PasswordHasher }
    from "../../domain/services/PasswordHasher.js";

export class BcryptPasswordHasher
    extends PasswordHasher {

    constructor({

        rounds = 12,

    } = {}) {

        super();

        this.rounds = rounds;

    }

    async hash(password) {

        return bcrypt.hash(

            password,

            this.rounds,

        );

    }

    async verify(
        password,
        passwordHash,
    ) {

        return bcrypt.compare(

            password,

            passwordHash.toString(),

        );

    }

}