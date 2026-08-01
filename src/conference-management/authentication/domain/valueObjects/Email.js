// src/authentication/domain/valueObjects/Email.js

export class Email {

    constructor(value) {

        if (value == null) {
            throw new Error(
                "Email is required."
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                "Email must be a string."
            );
        }

        const normalized =
            value
                .trim()
                .toLowerCase();

        if (normalized.length === 0) {
            throw new Error(
                "Email cannot be empty."
            );
        }

        if (!Email.isValid(normalized)) {
            throw new Error(
                "Invalid email address."
            );
        }

        this.value = normalized;

        Object.freeze(this);

    }

    static isValid(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);

    }

    equals(other) {

        return (
            other instanceof Email &&
            this.value === other.value
        );

    }

    toString() {

        return this.value;

    }

}