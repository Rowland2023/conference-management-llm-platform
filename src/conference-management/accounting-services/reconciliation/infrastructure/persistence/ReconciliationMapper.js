// reconciliation/infrastructure/persistence/ReconciliationMapper.js

import { Reconciliation } from "../../domain/entities/Reconciliation.js";

export class ReconciliationMapper {

    static toDomain(record) {

        return new Reconciliation({

            id: record.id,

            type: record.type,

            createdBy: record.created_by,

            status: record.status,

        });

    }

    static toPersistence(entity) {

        return {

            id: entity.id,

            type: entity.type,

            created_by: entity.createdBy,

            status: entity.status,

            started_at: entity.startedAt,

            completed_at: entity.completedAt,

        };

    }

}