// src/authentication/domain/repositories/UserRepository.js

export class UserRepository {

    async findById(id) {

        throw new Error(
            "UserRepository.findById() must be implemented."
        );

    }

    async findByEmail(email) {

        throw new Error(
            "UserRepository.findByEmail() must be implemented."
        );

    }

    async existsByEmail(email) {

        throw new Error(
            "UserRepository.existsByEmail() must be implemented."
        );

    }

    async save(user) {

        throw new Error(
            "UserRepository.save() must be implemented."
        );

    }

    async delete(id) {

        throw new Error(
            "UserRepository.delete() must be implemented."
        );

    }

}