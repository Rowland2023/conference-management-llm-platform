// tax/infrastructure/persistence/TaxMapper.js

import { TaxAssessment }
    from "../../domain/entities/TaxAssessment.js";


export class TaxMapper {

    static toDomain(record) {

        if (!record) {

            return null;

        }

        return new TaxAssessment({

            id:
                record.id,

            transactionId:
                record.transaction_id,

            taxpayerId:
                record.taxpayer_id,

            taxType:
                record.tax_type,

            taxableAmount:
                record.taxable_amount,

            taxAmount:
                record.tax_amount,

            currency:
                record.currency,

            status:
                record.status,

        });

    }


    static toPersistence(entity) {

        return {

            id:
                entity.id,

            transaction_id:
                entity.transactionId,

            taxpayer_id:
                entity.taxpayerId,

            tax_type:
                entity.taxType,

            taxable_amount:
                entity.taxableAmount,

            tax_amount:
                entity.taxAmount,

            currency:
                entity.currency,

            status:
                entity.status,

        };

    }

}