// tax/application/dto/TaxResponseDTO.js

export class TaxResponseDTO {

    constructor({

        id,

        transactionId,

        taxpayerId,

        taxType,

        taxableAmount,

        taxAmount,

        currency,

        status,

    }) {

        this.id =
            id;

        this.transactionId =
            transactionId;

        this.taxpayerId =
            taxpayerId;

        this.taxType =
            taxType;

        this.taxableAmount =
            taxableAmount;

        this.taxAmount =
            taxAmount;

        this.currency =
            currency;

        this.status =
            status;

        Object.freeze(this);

    }

}