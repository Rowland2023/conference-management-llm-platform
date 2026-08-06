import { CommandUseCase }
    from "../../../../shared/application/use_cases/CommandUseCase.js";

import { CommandResult }
    from "../../../../shared/application/dto/CommandResult.js";

import { TaxAssessment }
    from "../../domain/entities/TaxAssessment.js";

import { TaxResponseDTO }
    from "../dto/TaxResponseDTO.js";


export class CalculateTaxCommand {

    constructor({

        transactionId,

        taxpayerId,

        taxType,

        taxableAmount,

        rate,

        currency,

    }) {

        this.transactionId =
            transactionId;

        this.taxpayerId =
            taxpayerId;

        this.taxType =
            taxType;

        this.taxableAmount =
            taxableAmount;

        this.rate =
            rate;

        this.currency =
            currency;

        Object.freeze(this);

    }

}