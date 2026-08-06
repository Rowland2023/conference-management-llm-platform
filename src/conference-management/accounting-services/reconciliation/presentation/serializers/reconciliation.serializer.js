// reconciliation/presentation/serializers/reconciliation.serializer.js

export class ReconciliationSerializer {

    static toResponse(entity) {

        return {

            id: entity.id,

            type: entity.type,

            status: entity.status,

            startedAt: entity.startedAt,

            completedAt: entity.completedAt,

        };

    }

    static toCollection(items) {

        return items.map(item =>

            this.toResponse(item)

        );

    }

}