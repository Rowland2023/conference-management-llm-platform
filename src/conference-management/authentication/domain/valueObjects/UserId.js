// src/authentication/domain/valueObjects/UserId.js

export class UserId {

    constructor(value) {

        if (value == null) {
            throw new Error(
                "UserId is required."
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                "UserId must be a string."
            );
        }

        const normalized =
            value.trim();

        if (normalized.length === 0) {
            throw new Error(
                "UserId cannot be empty."
            );
        }

        this.value = normalized;

        Object.freeze(this);

    }

    equals(other) {

        return (
            other instanceof UserId &&
            this.value === other.value
        );

    }

    toString() {

        return this.value;

    }

}