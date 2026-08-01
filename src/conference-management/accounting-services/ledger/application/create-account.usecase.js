/**
 * Create Account Use Case
 *
 * Application service responsible for opening
 * a ledger account.
 */

export class CreateAccountUseCase {

    constructor({
        accountRepository,
        outboxRepository,
        uow,
        logger,
    }) {

        this.accountRepository =
            accountRepository;

        this.outboxRepository =
            outboxRepository;

        this.uow =
            uow;

        this.logger =
            logger;
    }


    async execute(command) {


        return this.uow.transaction(
            async (trx) => {


                const account =
                    await this.accountRepository.create(
                        {
                            ...command,
                            trx,
                        }
                    );


                if (this.outboxRepository) {

                    await this.outboxRepository.save({

                        aggregateId:
                            account.id,

                        eventName:
                            "AccountCreated",

                        payload:
                            account,

                        trx,

                    });

                }


                this.logger.info(
                    {
                        accountId:
                            account.id,
                    },

                    "Ledger account created."
                );


                return account;

            }
        );

    }

}