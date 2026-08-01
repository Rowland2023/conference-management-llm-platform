// src/authentication/presentation/routes/authentication.routes.js

import { Router }
    from "express";

import { asyncHandler }
    from "../utils/asyncHandler.js";

export function createAuthenticationRouter({

    controller,

    authenticate,

}) {

    const router =
        Router();

    /*
    |--------------------------------------------------------------------------
    | Public Endpoints
    |--------------------------------------------------------------------------
    */

    router.post(

        "/auth/register",

        asyncHandler(

            controller.register.bind(
                controller
            )

        )

    );

    router.post(

        "/auth/login",

        asyncHandler(

            controller.login.bind(
                controller
            )

        )

    );

    router.post(

        "/auth/refresh",

        asyncHandler(

            controller.refreshToken.bind(
                controller
            )

        )

    );

    router.post(

        "/auth/forgot-password",

        asyncHandler(

            controller.forgotPassword.bind(
                controller
            )

        )

    );

    router.post(

        "/auth/reset-password",

        asyncHandler(

            controller.resetPassword.bind(
                controller
            )

        )

    );

    router.get(

        "/auth/verify-email",

        asyncHandler(

            controller.verifyEmail.bind(
                controller
            )

        )

    );

    /*
    |--------------------------------------------------------------------------
    | Protected Endpoints
    |--------------------------------------------------------------------------
    */

    router.post(

        "/auth/logout",

        authenticate,

        asyncHandler(

            controller.logout.bind(
                controller
            )

        )

    );

    router.post(

        "/auth/change-password",

        authenticate,

        asyncHandler(

            controller.changePassword.bind(
                controller
            )

        )

    );

    router.get(

        "/auth/me",

        authenticate,

        asyncHandler(

            controller.me.bind(
                controller
            )

        )

    );

    return router;

}