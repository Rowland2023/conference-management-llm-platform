// ledger/application/services/LedgerService.js

export class LedgerService {

    constructor({

        createAccountUseCase,

        createHoldUseCase,

        getLedgerBalanceUseCase,

        postJournalEntryUseCase,

        reverseJournalEntryUseCase,

    }) {

        this.createAccountUseCase =
            createAccountUseCase;

        this.createHoldUseCase =
            createHoldUseCase;

        this.getLedgerBalanceUseCase =
            getLedgerBalanceUseCase;

        this.postJournalEntryUseCase =
            postJournalEntryUseCase;

        this.reverseJournalEntryUseCase =
            reverseJournalEntryUseCase;

    }


    //--------------------------------------------------
    // Accounts
    //--------------------------------------------------

    async createAccount(command) {

        return await this.createAccountUseCase.execute(
            command
        );

    }


    async getAccountBalance(query) {

        return await this.getLedgerBalanceUseCase.execute(
            query
        );

    }


    //--------------------------------------------------
    // Journal Entries
    //--------------------------------------------------

    async postJournalEntry(command) {

        return await this.postJournalEntryUseCase.execute(
            command
        );

    }


    async reverseJournalEntry(command) {

        return await this.reverseJournalEntryUseCase.execute(
            command
        );

    }


    //--------------------------------------------------
    // Holds
    //--------------------------------------------------

    async createHold(command) {

        return await this.createHoldUseCase.execute(
            command
        );

    }

}