// settlement/presentation/serializers/ScheduleSettlementSerializer.js

import { ScheduleSettlementCommand }
    from "../../application/commands/ScheduleSettlementCommand.js";

export class ScheduleSettlementSerializer {

    static serialize(req) {

        return new ScheduleSettlementCommand({

            settlementId:
                req.params.settlementId,

            scheduledAt:
                req.body.scheduledAt,

        });

    }

}