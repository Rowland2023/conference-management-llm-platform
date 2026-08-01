// src/authentication/application/useCases/LoginUserUseCase.js

import { Email }
    from "../../domain/valueObjects/Email.js";

import { UserLoggedIn }
    from "../../domain/events/UserLoggedIn.js";

export class LoginUserUseCase {

    constructor({

        userRepository,

        refreshTokenRepository,

        passwordHasher,

        tokenIssuer,

        unitOfWorkFactory,

    }) {

        this.userRepository =
            userRepository;

        this.refreshTokenRepository =
            refreshTokenRepository;

        this.passwordHasher =
            passwordHasher;

        this.tokenIssuer =
            tokenIssuer;

        this.unitOfWorkFactory =
            unitOfWorkFactory;

    }

    async execute({

        email,

        password,

    }) {

        const emailVO =
            new Email(email);

        const user =
            await this.userRepository
                .findByEmail(emailVO);

        if (!user) {

            throw new Error(
                "Invalid email or password."
            );

        }

        if (!user.isActive()) {

            throw new Error(
                "User account is inactive."
            );

        }

        const valid =
            await this.passwordHasher.verify(

                password,

                user.passwordHash,

            );

        if (!valid) {

            throw new Error(
                "Invalid email or password."
            );

        }

        const accessToken =
            await this.tokenIssuer
                .issueAccessToken({

                    userId:
                        user.id.toString(),

                    email:
                        user.email.toString(),

                    roles:
                        user.roles.map(

                            role =>
                                role.toString()

                        ),

                });

        const refreshToken =
            await this.tokenIssuer
                .issueRefreshToken({

                    userId:
                        user.id.toString(),

                });

        user.recordEvent(

            new UserLoggedIn({

                userId:
                    user.id,

            })

        );

        const unitOfWork =
            this.unitOfWorkFactory();

        await unitOfWork.runInTransaction(

            async () => {

                await this.refreshTokenRepository
                    .save(refreshToken);

                await this.userRepository
                    .save(user);

            }

        );

        return {

            accessToken,

            refreshToken,

        };

    }

}