// src/conference-management/authentication/boostrap/module.js

import { AuthenticationController }
    from "../presentation/controllers/AuthenticationController.js";

import { createAuthenticationRouter }
    from "../presentation/routes/authentication.routes.js";

import { LoginUserUseCase }
    from "../application/use-cases/LoginUseCase.js";

import { RegisterUserUseCase }
    from "../application/use-cases/RegisterUserUseCase.js";

import { PostgresUserRepository }
    from "../infrastructure/persistence/repositories/PostgresUserRepository.js";

import { PostgresRefreshTokenRepository }
    from "../infrastructure/persistence/repositories/PostgresRefreshTokenRepository.js";

import { BcryptPasswordHasher }
    from "../infrastructure/crypto/BcryptPasswordHasher.js";

import { JwtTokenIssuer }
    from "../infrastructure/jwt/JwtIssuer.js";


export function createAuthenticationModule({

    db,

    config,

    unitOfWorkFactory,

    logger,

}) {

    /*
    |--------------------------------------------------------------------------
    | Infrastructure
    |--------------------------------------------------------------------------
    */

    const userRepository =
        new PostgresUserRepository({

            knex:
                db,

        });


    const refreshTokenRepository =
        new PostgresRefreshTokenRepository({

            knex:
                db,

        });


    const passwordHasher =
        new BcryptPasswordHasher();


    const tokenIssuer =
        new JwtTokenIssuer({

            secret:
                config.security.jwt.secret,

            issuer:
                config.security.jwt.issuer,

            audience:
                config.security.jwt.audience,

        });


    /*
    |--------------------------------------------------------------------------
    | Use Cases
    |--------------------------------------------------------------------------
    */

    const registerUserUseCase =
        new RegisterUserUseCase({

            userRepository,

            passwordHasher,

            unitOfWorkFactory,

        });


    const loginUserUseCase =
        new LoginUserUseCase({

            userRepository,

            refreshTokenRepository,

            passwordHasher,

            tokenIssuer,

            unitOfWorkFactory,

        });


    /*
    |--------------------------------------------------------------------------
    | Controller
    |--------------------------------------------------------------------------
    */

    const controller =
        new AuthenticationController({

            registerUser:
                registerUserUseCase,

            loginUser:
                loginUserUseCase,

        });


    /*
    |--------------------------------------------------------------------------
    | Router
    |--------------------------------------------------------------------------
    */

    const router =
        createAuthenticationRouter({

            controller,

            authenticate:
                null,

        });


    logger?.info(
        {
            module:
                "authentication",
        },
        "Authentication module initialized"
    );


    return {

        name:
            "authentication",

        router,

    };

}
