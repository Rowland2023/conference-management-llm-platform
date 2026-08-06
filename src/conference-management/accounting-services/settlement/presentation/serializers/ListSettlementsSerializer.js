// settlement/presentation/serializers/ListSettlementsSerializer.js

import { ListSettlementsQuery }
    from "../../application/queries/ListSettlementsQuery.js";

export class ListSettlementsSerializer {

    static serialize(req) {

        return new ListSettlementsQuery({

            merchantId:
                req.query.merchantId,

            status:
                req.query.status,

            page:
                Number(req.query.page ?? 1),

            pageSize:
                Number(req.query.pageSize ?? 20),

        });

    }

}