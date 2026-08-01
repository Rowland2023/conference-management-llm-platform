// src/authentication/presentation/dto/LoginRequest.js

import { Email }
    from "../../domain/valueObjects/Email.js";

export class LoginRequest {

    constructor({

        email,

        password,

    }) {

        this.email =
            email;

        this.password =
            password;

        Object.freeze(this);

    }

    static fromHttp(req) {

        return new LoginRequest({

            email:
                new Email(
                    req.body.email
                ),

            password:
                req.body.password,

        });

    }

}