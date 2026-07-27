import {
  InvalidArgumentError,
  ConflictError,
  NotFoundError
} from "../../../../shared/application/errors/ApplicationErrors.js";

import {
  InvalidStateError
} from "../domain/error/index.js";

import { JournalEntryReversedEvent } from "../domain/events/journal-entry-reversed.event.js";



const toBigInt = (value)=>{

  if(typeof value === "bigint"){
    return value;
  }


  if(
    value === null ||
    value === undefined ||
    value === ""
  ){
    return 0n;
  }


  return BigInt(
    String(value).trim()
  );

};



const hashLines = (lines)=>{

  return lines
    .map(line =>
      [
        line.accountId,
        line.direction,
        toBigInt(line.amountInMinorUnits),
        line.currency
      ].join(":")
    )
    .sort()
    .join("|");

};




export class ReverseJournalEntryUseCase {


  constructor({
    journalEntryRepository,
    accountRepository,
    unitOfWork,
    outboxRepository,
    logger,
    metrics
  }){


    this.journalRepository =
      journalEntryRepository;


    this.accountRepository =
      accountRepository;


    this.unitOfWork =
      unitOfWork;


    this.outboxRepository =
      outboxRepository;


    this.logger =
      logger;


    this.metrics =
      metrics;

  }





  async execute({
    originalEntryId,
    reversalReason,
    idempotencyKey,
    requestedBy
  }){


    this.validateInput({
      originalEntryId,
      reversalReason,
      idempotencyKey
    });



    const existing =
      await this.journalRepository
        .findByIdempotencyKey(
          idempotencyKey
        );



    if(existing){


      if(
        existing.metadata?.reversedEntryId !== originalEntryId
      ){

        throw new ConflictError(
          "Idempotency key already used for another reversal"
        );

      }


      return {
        ...existing,
        isDuplicate:true
      };


    }





    let reversalEntry;



    try {


      reversalEntry =
        await this.unitOfWork.execute(
          async(session)=>{


            const original =
              await this.journalRepository
                .findByIdForUpdate(
                  originalEntryId,
                  {
                    session
                  }
                );



            if(!original){

              throw new NotFoundError(
                `Journal entry ${originalEntryId} not found`
              );

            }




            if(
              original.status !== "POSTED"
            ){

              throw new InvalidStateError(
                `Cannot reverse ${original.status} entry`
              );

            }





            const accountIds =
              [
                ...new Set(
                  original.lines
                    .map(
                      line=>line.accountId
                    )
                )
              ]
              .sort();





            const accounts =
              await this.accountRepository
                .findAndLockByIds(
                  accountIds,
                  {
                    session
                  }
                );





            if(
              accounts.length !== accountIds.length
            ){

              throw new InvalidStateError(
                "Missing account during reversal"
              );

            }





            this.validateAccounts(
              accounts
            );





            const reversalLines =
              this.buildReversalLines(
                original.lines
              );





            const created =
              await this.journalRepository
                .create(
                  {

                    idempotencyKey,

                    description:
                      `REVERSAL OF ${originalEntryId}: ${reversalReason}`,


                    currency:
                      original.currency,


                    status:
                      "POSTED",


                    postedAt:
                      new Date(),


                    metadata:{


                      reversedEntryId:
                        originalEntryId,


                      reversalReason,


                      requestedBy,


                      originalHash:
                        hashLines(
                          original.lines
                        )

                    },


                    lines:
                      reversalLines


                  },
                  {
                    session
                  }
                );





            await this.journalRepository
              .updateStatus(
                originalEntryId,
                "REVERSED",
                {
                  reversalEntryId:
                    created.id
                },
                {
                  session
                }
              );







            const event =
              new JournalEntryReversed({

                originalEntryId,

                reversalEntryId:
                  created.id,

                currency:
                  original.currency

              });






            await this.outboxRepository
              .add(
                event,
                {
                  session
                }
              );





            return created;


          }
        );



    }catch(error){


      if(error.code === "23505"){


        const duplicate =
          await this.journalRepository
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






    this.logger?.info({

      event:
        "LEDGER_ENTRY_REVERSED",

      originalEntryId,

      reversalEntryId:
        reversalEntry.id,

      requestedBy

    });





    this.metrics?.increment(
      "ledger.reversal.count",
      1,
      {
        currency:
          reversalEntry.currency
      }
    );





    return {

      ...reversalEntry,

      isDuplicate:false

    };


  }







  validateInput({
    originalEntryId,
    reversalReason,
    idempotencyKey
  }){


    if(
      !originalEntryId ||
      !idempotencyKey ||
      !reversalReason
    ){

      throw new InvalidArgumentError(
        "originalEntryId, reversalReason and idempotencyKey are required"
      );

    }




    if(
      reversalReason.length < 10
    ){

      throw new InvalidArgumentError(
        "reversalReason must contain audit details"
      );

    }


  }








  validateAccounts(accounts){


    for(const account of accounts){


      if(
        account.status !== "ACTIVE"
      ){

        throw new InvalidStateError(
          `Account ${account.id} is ${account.status}`
        );

      }


    }


  }








  buildReversalLines(lines){


    let debit = 0n;
    let credit = 0n;



    const reversed =
      lines.map(line=>{


        const amount =
          toBigInt(
            line.amountInMinorUnits
          );



        if(amount <= 0n){

          throw new InvalidStateError(
            "Invalid reversal amount"
          );

        }



        const direction =
          line.direction === "DEBIT"
            ? "CREDIT"
            : "DEBIT";



        if(direction === "DEBIT"){
          debit += amount;
        }
        else{
          credit += amount;
        }



        return {

          accountId:
            line.accountId,


          amountInMinorUnits:
            amount.toString(),


          direction,


          currency:
            line.currency

        };


      });





    if(debit !== credit){

      throw new InvalidStateError(
        `Reversal is unbalanced ${debit}:${credit}`
      );

    }





    return reversed;


  }



}