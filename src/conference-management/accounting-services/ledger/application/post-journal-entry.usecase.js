import {
  InvalidArgumentError
} from "../../../../shared/application/errors/ApplicationErrors.js";

import {
  UnbalancedEntryError
} from "../domain/error/index.js";

import { JournalEntryPostedEvent } 
from "../domain/events/journal-entry-posted.event.js";


export class PostJournalEntryUseCase {

  constructor({
    journalEntryRepository,
    accountRepository,
    unitOfWork,
    outboxRepository,
    logger,
    metrics
  }) {

    this.journalEntryRepository = journalEntryRepository;
    this.accountRepository = accountRepository;
    this.unitOfWork = unitOfWork;
    this.outboxRepository = outboxRepository;
    this.logger = logger;
    this.metrics = metrics;
  }


  async execute({
    idempotencyKey,
    description,
    lines,
    metadata = {},
    requestedBy
  }) {


    this.validateInput({
      idempotencyKey,
      lines
    });


    const existing =
      await this.journalEntryRepository
        .findByIdempotencyKey(idempotencyKey);


    if (existing) {

      return {
        ...existing,
        isDuplicate: true
      };

    }



    const normalized =
      this.normalizeLines(lines);



    this.validateBalance(normalized);



    try {


      return await this.unitOfWork.execute(async (session)=>{


        const accountIds =
          [
            ...new Set(
              normalized.map(
                line => line.accountId
              )
            )
          ];



        const accounts =
          await this.accountRepository
            .findAndLockByIds(
              accountIds,
              {
                session
              }
            );



        this.validateAccounts(
          accounts,
          accountIds,
          normalized
        );



        const entry =
          await this.journalEntryRepository.create(
            {
              idempotencyKey,

              description,

              currency:
                normalized[0].currency,

              status:
                "POSTED",

              postedAt:
                new Date(),

              metadata,

              lines:
                normalized

            },
            {
              session
            }
          );




        const event =
          new JournalEntryPosted({
            journalEntryId: entry.id,
            amount:
              this.calculateTotal(normalized),
            currency:
              normalized[0].currency,
            requestedBy
          });



        await this.outboxRepository.add(
          event,
          {
            session
          }
        );



        this.logger?.info({

          event:
            "JOURNAL_ENTRY_POSTED",

          entryId:
            entry.id,

          idempotencyKey,

          currency:
            entry.currency

        });



        this.metrics?.increment(
          "ledger.journal_entry.posted",
          1,
          {
            currency:
              entry.currency
          }
        );



        return {

          ...entry,

          isDuplicate:false

        };


      });



    } catch(error){


      if(
        error.code === "23505"
      ){

        const duplicate =
          await this.journalEntryRepository
            .findByIdempotencyKey(
              idempotencyKey
            );


        if(duplicate){

          return {
            ...duplicate,
            isDuplicate:true
          };

        }

      }


      throw error;

    }

  }





  validateInput({
    idempotencyKey,
    lines
  }){


    if(
      !idempotencyKey ||
      typeof idempotencyKey !== "string"
    ){

      throw new InvalidArgumentError(
        "idempotencyKey is required"
      );

    }



    if(
      !Array.isArray(lines) ||
      lines.length < 2
    ){

      throw new InvalidArgumentError(
        "Journal entry requires minimum two lines"
      );

    }

  }





  normalizeLines(lines){


    const currency =
      lines[0].currency;


    return lines.map(
      (line,index)=>{


        if(
          !line.accountId
        ){

          throw new InvalidArgumentError(
            `Missing accountId on line ${index}`
          );

        }



        let amount;


        try {

          amount =
            BigInt(
              line.amountInMinorUnits
            );

        } catch {

          throw new InvalidArgumentError(
            `Invalid amount on line ${index}`
          );

        }



        if(amount <= 0n){

          throw new InvalidArgumentError(
            `Amount must be positive on line ${index}`
          );

        }



        if(
          line.currency !== currency
        ){

          throw new InvalidArgumentError(
            "All lines must use same currency"
          );

        }



        if(
          !["DEBIT","CREDIT"]
            .includes(line.direction)
        ){

          throw new InvalidArgumentError(
            `Invalid direction on line ${index}`
          );

        }



        return {

          accountId:
            line.accountId,

          amountInMinorUnits:
            amount.toString(),

          direction:
            line.direction,

          currency

        };


      }
    );


  }





  validateBalance(lines){


    let debit = 0n;
    let credit = 0n;


    for(const line of lines){


      if(
        line.direction === "DEBIT"
      ){

        debit +=
          BigInt(
            line.amountInMinorUnits
          );

      }


      if(
        line.direction === "CREDIT"
      ){

        credit +=
          BigInt(
            line.amountInMinorUnits
          );

      }


    }



    if(debit !== credit){

      throw new UnbalancedEntryError(
        `Debit ${debit} != Credit ${credit}`
      );

    }


  }





  validateAccounts(
    accounts,
    expectedIds,
    lines
  ){


    if(
      accounts.length !== expectedIds.length
    ){

      throw new InvalidArgumentError(
        "Account does not exist"
      );

    }



    const map =
      new Map(
        accounts.map(
          a=>[
            a.id,
            a
          ]
        )
      );



    for(const line of lines){


      const account =
        map.get(
          line.accountId
        );



      if(
        account.status &&
        account.status !== "ACTIVE"
      ){

        throw new InvalidArgumentError(
          `Account ${account.id} inactive`
        );

      }



      if(
        account.currency &&
        account.currency !== line.currency
      ){

        throw new InvalidArgumentError(
          `Currency mismatch`
        );

      }


    }


  }





  calculateTotal(lines){


    return lines
      .filter(
        l=>l.direction==="DEBIT"
      )
      .reduce(
        (sum,l)=>
          sum +
          BigInt(
            l.amountInMinorUnits
          ),
        0n
      )
      .toString();


  }

}