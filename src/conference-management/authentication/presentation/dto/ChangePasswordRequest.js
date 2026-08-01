// src/authentication/presentation/dto/ChangePasswordRequest.js

export class ChangePasswordRequest {

    constructor({

        currentPassword,

        newPassword,

    }) {

        this.currentPassword =
            currentPassword;

        this.newPassword =
            newPassword;

        Object.freeze(this);

    }

    static fromHttp(req) {

        return new ChangePasswordRequest({

            currentPassword:
                req.body.currentPassword,

            newPassword:
                req.body.newPassword,

        });

    }

}