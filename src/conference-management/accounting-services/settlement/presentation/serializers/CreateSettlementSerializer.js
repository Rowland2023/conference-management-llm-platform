// settlement/presentation/serializers/CreateSettlementSerializer.js

import { CreateSettlementCommand }
    from "../../application/commands/CreateSettlementCommand.js";

export class CreateSettlementSerializer {

    static serialize(req) {

        return new CreateSettlementCommand({

            merchantId:
                req.body.merchantId,

            amount:
                req.body.amount,

            currency:
                req.body.currency,

            method:
                req.body.method,

        });

    }

}