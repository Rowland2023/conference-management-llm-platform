// src/authentication/bootstrap/module.js

import { AuthenticationController }
    from "../presentation/controllers/AuthenticationController.js";

    import {
    createAuthenticationModule,
} from "../authentication/index.js";

import { createAuthenticationRouter }
    from "../presentation/routes/authentication.routes.js";

import { LoginUserUseCase }
    from "../application/useCases/LoginUserUseCase.js";

import { RegisterUserUseCase }
    from "../application/useCases/RegisterUserUseCase.js";

import { LogoutUserUseCase }
    from "../application/useCases/LogoutUserUseCase.js";

import { RefreshAccessTokenUseCase }
    from "../application/useCases/RefreshAccessTokenUseCase.js";

import { ChangePasswordUseCase }
    from "../application/useCases/ChangePasswordUseCase.js";

import { GetCurrentUserUseCase }
    from "../application/useCases/GetCurrentUserUseCase.js";

import { PostgresUserRepository }
    from "../infrastructure/persistence/PostgresUserRepository.js";

import { PostgresRefreshTokenRepository }
    from "../infrastructure/persistence/PostgresRefreshTokenRepository.js";

import { BcryptPasswordHasher }
    from "../infrastructure/crypto/BcryptPasswordHasher.js";

import { JwtTokenIssuer }
    from "../infrastructure/tokens/JwtTokenIssuer.js";

export function createAuthenticationModule({

    db,

    config,

    logger,

}) {

    /*
    |--------------------------------------------------------------------------
    | Infrastructure
    |--------------------------------------------------------------------------
    */

    const userRepository =
        new PostgresUserRepository({

            db,

        });

    const refreshTokenRepository =
        new PostgresRefreshTokenRepository({

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

        });

    const loginUserUseCase =
        new LoginUserUseCase({

            userRepository,

            refreshTokenRepository,

            passwordHasher,

            tokenIssuer,

        });

    const logoutUserUseCase =
        new LogoutUserUseCase({

            refreshTokenRepository,

        });

    const refreshAccessTokenUseCase =
        new RefreshAccessTokenUseCase({

            refreshTokenRepository,

            tokenIssuer,

        });

    const changePasswordUseCase =
        new ChangePasswordUseCase({

            userRepository,

            passwordHasher,

        });

    const getCurrentUserUseCase =
        new GetCurrentUserUseCase({

            userRepository,

        });

    /*
    |--------------------------------------------------------------------------
    | Controller
    |--------------------------------------------------------------------------
    */

    const controller =
        new AuthenticationController({

            registerUserUseCase,

            loginUserUseCase,

            logoutUserUseCase,

            refreshAccessTokenUseCase,

            changePasswordUseCase,

            getCurrentUserUseCase,

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
                null, // replace with JwtAuthenticationMiddleware later

        });

    return {

        name:
            "authentication",

        router,

    };

}