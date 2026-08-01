// src/authentication/presentation/dto/RegisterRequest.js

import { Email }
    from "../../domain/valueObjects/Email.js";

export class RegisterRequest {

    constructor({

        email,

        password,

        firstName,

        lastName,

    }) {

        this.email =
            email;

        this.password =
            password;

        this.firstName =
            firstName;

        this.lastName =
            lastName;

        Object.freeze(this);

    }

    static fromHttp(req) {

        return new RegisterRequest({

            email:
                new Email(
                    req.body.email
                ),

            password:
                req.body.password,

            firstName:
                req.body.firstName,

            lastName:
                req.body.lastName,

        });

    }

}