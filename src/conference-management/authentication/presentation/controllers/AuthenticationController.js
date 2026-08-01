// src/authentication/presentation/controllers/AuthenticationController.js

import { AuthenticationPresenter }
    from "../presenters/AuthenticationPresenter.js";

export class AuthenticationController {

    constructor({

        registerUser,

        loginUser,

        logoutUser,

        refreshAccessToken,

        changePassword,

        forgotPassword,

        resetPassword,

        verifyEmail,

        getCurrentUser,

    }) {

        this.registerUser =
            registerUser;

        this.loginUser =
            loginUser;

        this.logoutUser =
            logoutUser;

        this.refreshAccessToken =
            refreshAccessToken;

        this.changePassword =
            changePassword;

        this.forgotPassword =
            forgotPassword;

        this.resetPassword =
            resetPassword;

        this.verifyEmail =
            verifyEmail;

        this.getCurrentUser =
            getCurrentUser;

    }

}