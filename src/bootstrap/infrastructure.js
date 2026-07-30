import { KafkaConnection } from "../shared/infrastructure/messaging/kafka/KafkaConnection.js";
import { KafkaEventBus } from "../shared/infrastructure/messaging/kafka/KafkaEventBus.js";
import { OutboxWorker } from "../shared/infrastructure/messaging/outbox/OutboxWorker.js";
import { PostgresOutboxRepository } from "../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";
import KnexUnitOfWork from "../cross-cutting/database/KnexUnitOfWork.js";


export function bootstrapInfrastructure({
    db,
    config,
    logger,
}) {

    const kafkaConnection =
        new KafkaConnection({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers,
            logger,
        });


    const eventBus =
        new KafkaEventBus({
            kafkaConnection,
            groupId: config.kafka.groupId,
            logger,
        });


    const unitOfWorkFactory =
        () => new KnexUnitOfWork({
            knex: db,
        });


    const outboxRepository =
        new PostgresOutboxRepository({
            db,
        });


    const outboxWorker =
        new OutboxWorker({
            outboxRepository,
            eventBus,
            logger,
        });


    return {
        db,
        unitOfWorkFactory,
        kafkaConnection,
        eventBus,
        outboxRepository,
        outboxWorker,
        logger,   // <-- IMPORTANT
    };
}