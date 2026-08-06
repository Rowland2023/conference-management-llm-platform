// shared/application/use_cases/QueryUseCase.js

import { BaseUseCase }
    from "./BaseUseCase.js";

import { Result }
    from "../dto/result.js";


export class QueryUseCase extends BaseUseCase {

    constructor({

        logger,

    } = {}) {

        super({

            logger,

        });

    }


    async execute(query) {

        try {

            const data =
                await this.doExecute(query);

            return Result.success(
                data
            );

        }

        catch (error) {

            this.error(error);

            return Result.failure(
                error.message
            );

        }

    }


    /**
     * Executes a read-only query.
     *
     * Must be implemented by subclasses.
     *
     * @abstract
     * @param {Object} query
     * @returns {Promise<any>}
     */
    async doExecute(query) {

        throw new Error(

            `${this.constructor.name} must implement doExecute().`

        );

    }

}