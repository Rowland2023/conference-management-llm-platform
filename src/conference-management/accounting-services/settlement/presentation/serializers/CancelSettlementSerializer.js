// settlement/presentation/serializers/CancelSettlementSerializer.js

import { CancelSettlementCommand }
    from "../../application/commands/CancelSettlementCommand.js";

export class CancelSettlementSerializer {

    static serialize(req) {

        return new CancelSettlementCommand({

            settlementId:
                req.params.settlementId,

            reason:
                req.body.reason,

        });

    }

}