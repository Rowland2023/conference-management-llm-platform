// tax/infrastructure/persistence/TaxRepository.js

import { TaxRepository as TaxRepositoryPort }
    from "../../domain/repositories/TaxRepository.js";

import { TaxMapper }
    from "./TaxMapper.js";


export class TaxRepository
    extends TaxRepositoryPort {

    constructor({

        knex,

    }) {

        super();

        this.knex =
            knex;

        this.table =
            "tax_assessments";

    }


    getClient(tx) {

        return tx || this.knex;

    }


    async save(entity, tx) {

        const db =
            this.getClient(tx);

        const row =
            TaxMapper.toPersistence(entity);

        const existing =
            await db(this.table)

                .where({

                    id: entity.id,

                })

                .first();


        if (existing) {

            await db(this.table)

                .where({

                    id: entity.id,

                })

                .update(row);

        }

        else {

            await db(this.table)

                .insert(row);

        }

    }


    async findById(id, tx) {

        const db =
            this.getClient(tx);

        const row =
            await db(this.table)

                .where({

                    id,

                })

                .first();

        return TaxMapper.toDomain(row);

    }


    async findAll(filters = {}, tx) {

        const db =
            this.getClient(tx);

        let query =
            db(this.table);

        if (filters.taxpayerId) {

            query.where({

                taxpayer_id:
                    filters.taxpayerId,

            });

        }

        if (filters.transactionId) {

            query.where({

                transaction_id:
                    filters.transactionId,

            });

        }

        if (filters.taxType) {

            query.where({

                tax_type:
                    filters.taxType,

            });

        }

        if (filters.status) {

            query.where({

                status:
                    filters.status,

            });

        }

        const rows =
            await query;

        return rows.map(

            TaxMapper.toDomain

        );

    }

}