/**
 * Base class for all Application Use Cases.
 *
 * Provides common logging and helper methods.
 * Concrete CommandUseCase and QueryUseCase extend this class.
 */

export class BaseUseCase {

    constructor({

        logger,

    } = {}) {

        this.logger = logger;

    }

    log(message, metadata = {}) {

        this.logger?.info(

            metadata,

            message,

        );

    }

    warn(message, metadata = {}) {

        this.logger?.warn(

            metadata,

            message,

        );

    }

    error(error, metadata = {}) {

        this.logger?.error(

            {

                error,

                ...metadata,

            },

            error.message,

        );

    }

}