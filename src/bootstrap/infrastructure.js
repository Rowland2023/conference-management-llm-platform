// src/bootstrap/infrastructure.js

import Redis from "ioredis";

import { KafkaConnection } 
    from "../shared/infrastructure/messaging/kafka/KafkaConnection.js";

import { KafkaEventBus } 
    from "../shared/infrastructure/messaging/kafka/KafkaEventBus.js";

import { OutboxWorker } 
    from "../shared/infrastructure/messaging/outbox/OutboxWorker.js";

import { PostgresOutboxRepository } 
    from "../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import KnexUnitOfWork 
    from "../cross-cutting/database/KnexUnitOfWork.js";

import { registerLockCommands } 
    from "../shared/infrastructure/redis/registerLockCommands.js";


export function bootstrapInfrastructure({
    db,
    config,
    logger,
}) {


    // ======================================================
    // Redis
    // ======================================================

    const redis =
        new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
        });


    registerLockCommands(redis);



    // ======================================================
    // Kafka
    // ======================================================

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



    // ======================================================
    // Database
    // ======================================================

    const unitOfWorkFactory =
        () =>
            new KnexUnitOfWork({
                knex: db,
            });



    // ======================================================
    // Outbox
    // ======================================================

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



    // ======================================================
    // Shared Infrastructure
    // ======================================================

    return {

        db,

        redis,
        config,
        unitOfWorkFactory,

        kafkaConnection,

        eventBus,

        outboxRepository,

        outboxWorker,

        logger,
    };
}