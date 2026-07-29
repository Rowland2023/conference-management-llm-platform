/**
 * @file User.js
 *
 * User Aggregate Root.
 */

import { randomUUID } from "node:crypto";

const ROLES = Object.freeze({
    USER: "USER",
    ADMIN: "ADMIN",
    ORGANIZER: "ORGANIZER",
});

const STATUSES = Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
});

export class User {

    constructor({

        id = randomUUID(),

        email,

        passwordHash,

        firstName = null,

        lastName = null,

        role = ROLES.USER,

        status = STATUSES.ACTIVE,

        createdAt = new Date(),

        updatedAt = new Date(),

    }) {

        if (!email) {
            throw new Error("User email is required.");
        }

        if (!passwordHash) {
            throw new Error("User passwordHash is required.");
        }

        if (!Object.values(ROLES).includes(role)) {
            throw new Error(`Invalid role: ${role}`);
        }

        if (!Object.values(STATUSES).includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        this.id = id;

        this.email = email.trim().toLowerCase();

        this.passwordHash = passwordHash;

        this.firstName = firstName;

        this.lastName = lastName;

        this.role = role;

        this.status = status;

        this.createdAt = createdAt;

        this.updatedAt = updatedAt;
    }

    //----------------------------------------
    // Domain behavior
    //----------------------------------------

    activate() {

        this.status = STATUSES.ACTIVE;

        this.touch();

    }

    suspend() {

        this.status = STATUSES.SUSPENDED;

        this.touch();

    }

    deactivate() {

        this.status = STATUSES.INACTIVE;

        this.touch();

    }

    updatePassword(passwordHash) {

        if (!passwordHash) {

            throw new Error(
                "Password hash is required."
            );

        }

        this.passwordHash = passwordHash;

        this.touch();

    }

    updateProfile({

        firstName,

        lastName,

    }) {

        if (firstName !== undefined) {

            this.firstName = firstName;

        }

        if (lastName !== undefined) {

            this.lastName = lastName;

        }

        this.touch();

    }

    changeRole(role) {

        if (!Object.values(ROLES).includes(role)) {

            throw new Error(
                `Invalid role: ${role}`
            );

        }

        this.role = role;

        this.touch();

    }

    //----------------------------------------

    isActive() {

        return this.status === STATUSES.ACTIVE;

    }

    isAdmin() {

        return this.role === ROLES.ADMIN;

    }

    isOrganizer() {

        return this.role === ROLES.ORGANIZER;

    }

    //----------------------------------------

    touch() {

        this.updatedAt = new Date();

    }

    //----------------------------------------

    toJSON() {

        return {

            id: this.id,

            email: this.email,

            firstName: this.firstName,

            lastName: this.lastName,

            role: this.role,

            status: this.status,

            createdAt: this.createdAt,

            updatedAt: this.updatedAt,

        };

    }

}

//----------------------------------------
// Static enums
//----------------------------------------

User.ROLES = ROLES;

User.STATUSES = STATUSES;