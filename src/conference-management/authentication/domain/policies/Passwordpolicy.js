// src/authentication/domain/policies/PasswordPolicy.js

export class PasswordPolicy {

    validate(password) {

        if (
            typeof password !== "string"
        ) {

            throw new Error(
                "Password must be a string."
            );

        }

        if (
            password.length < 12
        ) {

            throw new Error(
                "Password must contain at least 12 characters."
            );

        }

        if (
            !/[A-Z]/.test(password)
        ) {

            throw new Error(
                "Password must contain an uppercase letter."
            );

        }

        if (
            !/[a-z]/.test(password)
        ) {

            throw new Error(
                "Password must contain a lowercase letter."
            );

        }

        if (
            !/[0-9]/.test(password)
        ) {

            throw new Error(
                "Password must contain a number."
            );

        }

        if (
            !/[!@#$%^&*]/.test(password)
        ) {

            throw new Error(
                "Password must contain a special character."
            );

        }

    }

}