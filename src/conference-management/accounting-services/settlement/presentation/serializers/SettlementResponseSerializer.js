// settlement/presentation/serializers/SettlementResponseSerializer.js

export class SettlementResponseSerializer {

    static serialize(dto) {

        return {

            id:
                dto.id,

            merchantId:
                dto.merchantId,

            amount:
                dto.amount,

            currency:
                dto.currency,

            method:
                dto.method,

            status:
                dto.status,

            scheduledAt:
                dto.scheduledAt,

        };

    }

}