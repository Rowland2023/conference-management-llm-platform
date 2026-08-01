// src/authentication/application/useCases/RegisterUserUseCase.js

import { User } from "../../domain/entities/User.js";

import { Email } from "../../domain/valueObjects/Email.js";

import { UserId } from "../../domain/valueObjects/UserId.js";

import { PasswordHash }
    from "../../domain/valueObjects/PasswordHash.js";

import { Role }
    from "../../domain/valueObjects/Role.js";

import { UserStatus }
    from "../../domain/valueObjects/UserStatus.js";

import { UserRegistered }
    from "../../domain/events/UserRegistered.js";

export class RegisterUserUseCase {

    constructor({

        userRepository,

        passwordHasher,

        unitOfWorkFactory,

    }) {

        this.userRepository =
            userRepository;

        this.passwordHasher =
            passwordHasher;

        this.unitOfWorkFactory =
            unitOfWorkFactory;

    }

    async execute({

        email,

        password,

    }) {

        const emailVO =
            new Email(email);

        const exists =
            await this.userRepository
                .existsByEmail(emailVO);

        if (exists) {

            throw new Error(
                "Email already registered."
            );

        }

        const hash =
            await this.passwordHasher
                .hash(password);

        const user =
            new User({

                id:
                    UserId.generate(),

                email:
                    emailVO,

                passwordHash:
                    new PasswordHash(hash),

                roles: [

                    new Role(
                        Role.ATTENDEE
                    ),

                ],

                status:
                    UserStatus.PENDING,

            });

        user.recordEvent(

            new UserRegistered({

                userId:
                    user.id,

                email:
                    user.email,

            })

        );

        const unitOfWork =
            this.unitOfWorkFactory();

        await unitOfWork.runInTransaction(

            async () => {

                await this.userRepository
                    .save(user);

            }

        );

        return {

            id:
                user.id.toString(),

            email:
                user.email.toString(),

        };

    }

}