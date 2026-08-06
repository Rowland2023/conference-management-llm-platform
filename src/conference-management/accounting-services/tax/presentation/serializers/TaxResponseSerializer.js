// tax/presentation/serializers/TaxResponseSerializer.js

export class TaxResponseSerializer {

    static serialize(dto) {

        return {

            id:
                dto.id,

            transactionId:
                dto.transactionId,

            taxpayerId:
                dto.taxpayerId,

            taxType:
                dto.taxType,

            taxableAmount:
                dto.taxableAmount,

            taxAmount:
                dto.taxAmount,

            currency:
                dto.currency,

            status:
                dto.status,

        };

    }


    static serializeCollection(dtos) {

        return dtos.map(

            (dto) =>

                this.serialize(dto)

        );

    }

}