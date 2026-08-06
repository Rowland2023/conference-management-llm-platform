// shared/application/use_cases/CommandUseCase.js

import { BaseUseCase }
    from "./BaseUseCase.js";

import { Result }
    from "../dto/result.js";

import { CommandResult }
    from "../dto/CommandResult.js";


export class CommandUseCase extends BaseUseCase {

    constructor({

        transactionManager,

        eventBus,

        logger,

    }) {

        super({

            logger,

        });

        this.transactionManager =
            transactionManager;

        this.eventBus =
            eventBus;

    }


    async execute(command) {

        try {

            const commandResult =
                await this.transactionManager.runInTransaction(

                    async (tx) => {

                        return await this.doExecute(

                            command,

                            tx,

                        );

                    }

                );


            //--------------------------------------------------
            // Validate contract
            //--------------------------------------------------

            if (!(commandResult instanceof CommandResult)) {

                throw new Error(

                    `${this.constructor.name} must return a CommandResult.`

                );

            }


            //--------------------------------------------------
            // Publish Domain Events
            //--------------------------------------------------

            for (const event of commandResult.events) {

                await this.eventBus.publish(

                    event

                );

            }


            //--------------------------------------------------
            // Return Presentation Result
            //--------------------------------------------------

            return Result.success(

                commandResult.data

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
     * Template Method
     *
     * Concrete subclasses must implement this.
     *
     * @param {Object} command
     * @param {Object} tx
     *
     * @returns {Promise<CommandResult>}
     */
    async doExecute(command, tx) {

        throw new Error(

            `${this.constructor.name} must implement doExecute().`

        );

    }

}