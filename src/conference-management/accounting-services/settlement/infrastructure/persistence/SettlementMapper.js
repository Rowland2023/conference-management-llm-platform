// settlement/infrastructure/persistence/SettlementMapper.js

import { Settlement }
    from "../../domain/entities/Settlement.js";

export class SettlementMapper {

    static toPersistence(settlement) {

        return {

            id:
                settlement.id,

            merchant_id:
                settlement.merchantId,

            amount:
                settlement.amount,

            currency:
                settlement.currency,

            method:
                settlement.method,

            status:
                settlement.status,

            scheduled_at:
                settlement.scheduledAt,

        };

    }


    static toDomain(record) {

        if (!record) {

            return null;

        }

        return new Settlement({

            id:
                record.id,

            merchantId:
                record.merchant_id,

            amount:
                Number(record.amount),

            currency:
                record.currency,

            method:
                record.method,

            status:
                record.status,

            scheduledAt:
                record.scheduled_at,

        });

    }

}