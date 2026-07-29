// src/conference-management/event-schedule/infrastructure/repositories/PostgresEventRepository.js

import { Event } from "../../domain/entities/event.js";


export class ConcurrencyError extends Error {

    constructor(message) {

        super(message);

        this.name = "ConcurrencyError";

    }

}


export class DuplicateKeyError extends Error {

    constructor(message) {

        super(message);

        this.name = "DuplicateKeyError";

    }

}


export class PostgresEventRepository {


    constructor({

        knex,

        logger = console,

    }) {


        if (!knex || typeof knex !== "function") {

            throw new Error(
                "PostgresEventRepository requires a Knex instance."
            );

        }


        this.knex = knex;

        this.logger = logger;

    }



    /**
     * Find event by id.
     */
    async findById(id, trx = null) {


        const client =
            trx || this.knex;


        const row =
            await client("events")
                .where({
                    id,
                })
                .first();



        return row
            ? this.toDomain(row)
            : null;

    }



    /**
     * Find event and lock row.
     */
    async findByIdForUpdate(id, trx) {


        if (!trx) {

            throw new Error(
                "findByIdForUpdate requires an active transaction."
            );

        }


        const row =
            await trx("events")
                .where({
                    id,
                })
                .forUpdate()
                .first();



        return row
            ? this.toDomain(row)
            : null;

    }



    /**
     * Insert aggregate.
     */
    async insert(event, trx = null) {


        const client =
            trx || this.knex;


        try {


            const [row] =
                await client("events")
                    .insert({

                        id:
                            event.id,

                        title:
                            event.title,

                        room_id:
                            event.roomId,

                        start_time:
                            event.startTime,

                        end_time:
                            event.endTime,

                        status:
                            event.status,

                        version:
                            0,

                    })
                    .returning([
                        "version",
                    ]);



            event.version =
                Number(row.version);



            return event;



        } catch(error) {


            if (
                error.code === "23505"
            ) {

                throw new DuplicateKeyError(
                    `Event with id ${event.id} already exists.`
                );

            }


            throw error;

        }

    }



    /**
     * Optimistic concurrency update.
     */
    async update(event, trx = null) {


        const client =
            trx || this.knex;



        const updated =
            await client("events")
                .where({

                    id:
                        event.id,

                    version:
                        event.version,

                })
                .update({

                    title:
                        event.title,

                    room_id:
                        event.roomId,

                    start_time:
                        event.startTime,

                    end_time:
                        event.endTime,

                    status:
                        event.status,

                    version:
                        client.raw(
                            "version + 1"
                        ),

                    updated_at:
                        client.fn.now(),

                })
                .returning([
                    "version",
                ]);



        if (!updated.length) {


            throw new ConcurrencyError(
                `Event ${event.id} was modified concurrently. Retry transaction.`
            );

        }



        event.version =
            Number(updated[0].version);



        return event;

    }



    /**
     * Database -> Domain mapping.
     */
    toDomain(row) {


        return new Event({

            id:
                row.id,


            title:
                row.title,


            roomId:
                row.room_id,


            startTime:
                row.start_time instanceof Date
                    ? row.start_time
                    : new Date(row.start_time),


            endTime:
                row.end_time instanceof Date
                    ? row.end_time
                    : new Date(row.end_time),


            status:
                row.status,


            version:
                Number(row.version),

        });

    }

}