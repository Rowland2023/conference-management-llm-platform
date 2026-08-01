// src/authentication/domain/valueObjects/PasswordHash.js

export class PasswordHash {

    constructor(value) {

        if (value == null) {
            throw new Error(
                "PasswordHash is required."
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                "PasswordHash must be a string."
            );
        }

        const normalized =
            value.trim();

        if (normalized.length === 0) {
            throw new Error(
                "PasswordHash cannot be empty."
            );
        }

        this.value = normalized;

        Object.freeze(this);

    }

    equals(other) {

        return (
            other instanceof PasswordHash &&
            this.value === other.value
        );

    }

    toString() {

        return this.value;

    }

}