// src/authentication/domain/valueObjects/Role.js

export class Role {

    static ADMIN = "ADMIN";

    static ORGANIZER = "ORGANIZER";

    static SPEAKER = "SPEAKER";

    static ATTENDEE = "ATTENDEE";

    static VALID_ROLES = Object.freeze([

        Role.ADMIN,

        Role.ORGANIZER,

        Role.SPEAKER,

        Role.ATTENDEE,

    ]);

    constructor(value) {

        if (value == null) {
            throw new Error(
                "Role is required."
            );
        }

        if (typeof value !== "string") {
            throw new Error(
                "Role must be a string."
            );
        }

        const normalized =
            value
                .trim()
                .toUpperCase();

        if (
            !Role.VALID_ROLES.includes(
                normalized
            )
        ) {
            throw new Error(
                `Invalid role: ${normalized}.`
            );
        }

        this.value = normalized;

        Object.freeze(this);

    }

    isAdmin() {

        return (
            this.value === Role.ADMIN
        );

    }

    isOrganizer() {

        return (
            this.value === Role.ORGANIZER
        );

    }

    isSpeaker() {

        return (
            this.value === Role.SPEAKER
        );

    }

    isAttendee() {

        return (
            this.value === Role.ATTENDEE
        );

    }

    equals(other) {

        return (
            other instanceof Role &&
            this.value === other.value
        );

    }

    toString() {

        return this.value;

    }

}