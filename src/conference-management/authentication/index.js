// src/authentication/index.js

export {
    createAuthenticationModule,
} from "./bootstrap/module.js";

export {
    UserRepository,
} from "./domain/repositories/UserRepository.js";

export {
    User,
} from "./domain/entities/User.js";

export {
    UserRegistered,
} from "./domain/events/UserRegistered.js";

export {
    UserLoggedIn,
} from "./domain/events/UserLoggedIn.js";