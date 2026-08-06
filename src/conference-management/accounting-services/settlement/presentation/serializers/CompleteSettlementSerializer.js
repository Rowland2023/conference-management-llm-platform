// settlement/presentation/serializers/CompleteSettlementSerializer.js

import { CompleteSettlementCommand }
    from "../../application/commands/CompleteSettlementCommand.js";

export class CompleteSettlementSerializer {

    static serialize(req) {

        return new CompleteSettlementCommand({

            settlementId:
                req.params.settlementId,

        });

    }

}