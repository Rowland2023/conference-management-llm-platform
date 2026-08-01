// src/authentication/domain/entities/User.js

import { UserStatus } from "../valueObjects/UserStatus.js";
import { Role } from "../valueObjects/Role.js";

export class User {

    constructor({

        id,

        email,

        passwordHash,

        roles = [],

        status = UserStatus.PENDING,

        emailVerified = false,

        createdAt = new Date(),

        updatedAt = new Date(),

    }) {

        this.id = id;

        this.email = email;

        this.passwordHash = passwordHash;

        this.roles = [...roles];

        this.status = status;

        this.emailVerified = emailVerified;

        this.createdAt = createdAt;

        this.updatedAt = updatedAt;

    }

    changePassword(passwordHash) {

        this.passwordHash = passwordHash;

        this.touch();

    }

    verifyEmail() {

        this.emailVerified = true;

        this.touch();

    }

    activate() {

        this.status = UserStatus.ACTIVE;

        this.touch();

    }

    suspend() {

        this.status = UserStatus.SUSPENDED;

        this.touch();

    }

    lock() {

        this.status = UserStatus.LOCKED;

        this.touch();

    }

    assignRole(role) {

        if (
            !(role instanceof Role)
        ) {
            throw new Error(
                "Role must be a Role Value Object."
            );
        }

        if (
            this.hasRole(role)
        ) {
            return;
        }

        this.roles.push(role);

        this.touch();

    }

    removeRole(role) {

        this.roles =
            this.roles.filter(

                (existingRole) =>
                    !existingRole.equals(role)

            );

        this.touch();

    }

    hasRole(role) {

        return this.roles.some(

            (existingRole) =>
                existingRole.equals(role)

        );

    }

    isActive() {

        return (
            this.status ===
            UserStatus.ACTIVE
        );

    }

    isLocked() {

        return (
            this.status ===
            UserStatus.LOCKED
        );

    }

    touch() {

        this.updatedAt =
            new Date();

    }

}