// src/app.js

import express from "express";

/* -------------------------------------------------------------------------- */
/* Database */
/* -------------------------------------------------------------------------- */

import db from "./cross-cutting/database/knex.js";
import KnexUnitOfWork from "./cross-cutting/database/KnexUnitOfWork.js";
import { TopicResolver }
    from "./shared/infrastructure/messaging/outbox/TopicResolver.js";
/* -------------------------------------------------------------------------- */
/* Logging */
/* -------------------------------------------------------------------------- */

import { createLogger }
from "./shared/infrastructure/logging/createLogger.js";

/* -------------------------------------------------------------------------- */
/* Kafka */
/* -------------------------------------------------------------------------- */
import { KafkaProducer }
from "./shared/infrastructure/messaging/kafka/KafkaProducer.js";

import {
    KafkaConnection,
}
from "./shared/infrastructure/messaging/kafka/KafkaConnection.js";

import {
    KafkaEventBus,
}
from "./shared/infrastructure/messaging/kafka/KafkaEventBus.js";

/* -------------------------------------------------------------------------- */
/* Transactional Outbox */
/* -------------------------------------------------------------------------- */

import {
    PostgresOutboxRepository,
}
from "./shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import {
    OutboxDispatcher,
}
from "./shared/infrastructure/messaging/outbox/OutboxDispatcher.js";

import {
    OutboxWorker,
}
from "./shared/infrastructure/messaging/outbox/OutboxWorker.js";

/* -------------------------------------------------------------------------- */
/* Security */
/* -------------------------------------------------------------------------- */

import {
    PostgresUserRepository,
}
from "./shared-security-starter/infrastructure/persistence/PostgresUserRepository.js";

import {
    PostgresSessionRepository,
}
from "./shared-security-starter/infrastructure/persistence/PostgresSessionRepository.js";

import {
    Argon2PasswordHasher,
}
from "./shared-security-starter/infrastructure/password/Argon2PasswordHasher.js";

import {
    JwtTokenProvider,
}
from "./shared-security-starter/infrastructure/jwt/JwtTokenProvider.js";

import {
    AuthService,
}
from "./shared-security-starter/application/AuthService.js";

import {
    authenticate,
}
from "./shared-security-starter/presentation/authenticate.js";

/* -------------------------------------------------------------------------- */
/* Modules */
/* -------------------------------------------------------------------------- */

import {
    createConferenceEventScheduleSubModule,
}
from "./conference-management/event-schedule/index.js";

import {
    createAccountingServicesModule,
}
from "./conference-management/accounting-services/index.js";

import {
    createConferenceRegistrationSubModule,
}
from "./conference-management/registration/index.js";

import {
    createTicketModule,
}
from "./conference-management/ticket/index.js";

/* -------------------------------------------------------------------------- */
/* AI */
/* -------------------------------------------------------------------------- */

import {
    initLLM,
}
from "./shared/infrastructure/ai/index.js";

import {
    LLMController,
}
from "./shared/infrastructure/ai/api/llm.controller.js";

import {
    createLLMRouter,
}
from "./shared/infrastructure/ai/api/llm.route.js";

/* -------------------------------------------------------------------------- */

export async function createApp({

    logger,

} = {}) {

    logger =
        logger ??
        createLogger();

    const app =
        express();

    app.use(
        express.json({
            limit: "1mb",
        })
    );

    /* ---------------------------------------------------------------------- */
    /* Kafka Connection */
    /* ---------------------------------------------------------------------- */

    const kafkaConnection =
    new KafkaConnection({

        brokers:
            process.env.KAFKA_BROKERS,

        clientId:
            process.env.KAFKA_CLIENT_ID ??
            "conference-management",

        logger,

    });



const kafkaProducer =
    new KafkaProducer({
        kafka: kafkaConnection.getKafkaInstance(),
        logger,
    });

await kafkaProducer.connect();


    /* ---------------------------------------------------------------------- */
    /* Event Bus */
    /* ---------------------------------------------------------------------- */

    const eventBus =
        new KafkaEventBus({

            kafkaConnection,

            groupId:
                process.env.KAFKA_GROUP_ID ??
                "conference-management-group",

            logger,

        });

    /* ---------------------------------------------------------------------- */
    /* Unit Of Work */
    /* ---------------------------------------------------------------------- */

    const unitOfWorkFactory =
        () =>
            new KnexUnitOfWork({

                knex: db,

            });

    /* ---------------------------------------------------------------------- */
    /* Outbox */
    /* ---------------------------------------------------------------------- */

    const outboxRepository =
        new PostgresOutboxRepository({

            knex: db,

            logger,

        });

    const outboxDispatcher =
        new OutboxDispatcher({

            eventBus,

            logger,

        });

    const outboxWorker =
        new OutboxWorker({

            outboxRepository,

            dispatcher:
                outboxDispatcher,

            logger,

            pollIntervalMs:
                Number(
                    process.env.OUTBOX_POLL_INTERVAL ??
                    3000
                ),

            batchSize:
                Number(
                    process.env.OUTBOX_BATCH_SIZE ??
                    100
                ),

            maxRetries:
                Number(
                    process.env.OUTBOX_MAX_RETRIES ??
                    5
                ),

        });

    /* ---------------------------------------------------------------------- */
    /* Security Infrastructure */
    /* ---------------------------------------------------------------------- */

    const userRepository =
        new PostgresUserRepository({

            db,

            logger,

        });

    const sessionRepository =
        new PostgresSessionRepository({

            db,

            logger,

        });

    const passwordHasher =
        new Argon2PasswordHasher();

    const tokenProvider =
        new JwtTokenProvider({

            accessSecret:
                process.env.JWT_ACCESS_SECRET,

            refreshSecret:
                process.env.JWT_REFRESH_SECRET,

            accessExpiry:
                process.env.JWT_ACCESS_EXPIRY ??
                "15m",

            refreshExpiry:
                process.env.JWT_REFRESH_EXPIRY ??
                "7d",

        });

    const authService =
        new AuthService({

            userRepository,

            sessionRepository,

            passwordHasher,

            tokenProvider,

            logger,

        });
        
    /*
    Topic Resolver */
    /*------------------------------------------------------------------------*/
      const topicResolver = new TopicResolver({

    "conference.created": "conference.events",

    "conference.cancelled": "conference.events",

    "conference.rescheduled": "conference.events",

    "payment.released": "payment.events",

    "ledger.entry.posted": "ledger.events",

    "ledger.entry.reversed": "ledger.events",

});
    /* ---------------------------------------------------------------------- */
    /* Shared Dependencies */
    /* ---------------------------------------------------------------------- */

    const sharedDependencies = {

    dbConnection: db,

    db,

    logger,

    eventBus,
    kafkaProducer,
    topicResolver,

    unitOfWorkFactory,

    outboxRepository,

};
    /* ---------------------------------------------------------------------- */
/* Feature Modules */
/* ---------------------------------------------------------------------- */

const eventModule =
    createConferenceEventScheduleSubModule(
        sharedDependencies
    );

const accountingModule =
    createAccountingServicesModule(
        sharedDependencies
    );

const registrationModule =
    createConferenceRegistrationSubModule(
        sharedDependencies
    );

const ticketModule =
    createTicketModule(
        sharedDependencies
    );

const modules = [

    eventModule,

    accountingModule,

    registrationModule,

    ticketModule,

];

/* ---------------------------------------------------------------------- */
/* Register Event Subscribers */
/* ---------------------------------------------------------------------- */

for (const module of modules) {

    await module.subscribe?.(eventBus);

}
/* ---------------------------------------------------------------------- */
/* AI */
/* ---------------------------------------------------------------------- */

const ai = initLLM({
    openAIConfig: {
        apiKey: process.env.OPENAI_API_KEY,
    },

    featureFlags: {
        enablePayments: true,
        enableRegistration: true,
        enableTickets: true,
        enableAccounting: true,
    },

    useCases: {
        ...(eventModule.services ?? {}),
        ...(accountingModule.services ?? {}),
        ...(registrationModule.services ?? {}),
        ...(ticketModule.services ?? {}),
    },

    uowFactory: unitOfWorkFactory,

    logger,

    telemetry: null,
});

const llmController = new LLMController({
    commandInterceptor: ai.commandInterceptor,
    authService,
    logger,
});

const llmRouter = createLLMRouter({
    llmController,
    authenticate,
});

app.use("/api/ai", llmRouter);

/* ---------------------------------------------------------------------- */
/* Routes */
/* ---------------------------------------------------------------------- */

if (eventModule.router) {

    app.use(
        "/api/events",
        eventModule.router
    );

}

if (accountingModule.router) {

    app.use(
        "/api/accounting",
        accountingModule.router
    );

}

if (registrationModule.router) {

    app.use(
        "/api/registrations",
        registrationModule.router
    );

}

if (ticketModule.router) {

    app.use(
        "/api/tickets",
        ticketModule.router
    );

}

app.use(
    "/api/ai",
    llmRouter
);

app.get(
    "/health",
    (req, res) => {

        res.json({

            status: "UP",

            timestamp:
                new Date().toISOString(),

        });

    }
);

/* ---------------------------------------------------------------------- */
/* Error Middleware */
/* ---------------------------------------------------------------------- */

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: {

            code: "NOT_FOUND",

            message: "Route not found",

        },

    });

});

app.use((err, req, res, next) => {

    logger.error?.(err);

    res.status(
        err.statusCode || 500
    ).json({

        success: false,

        error: {

            code:
                err.code ||
                "INTERNAL_SERVER_ERROR",

            message:
                err.message,

        },

    });

});

/* ---------------------------------------------------------------------- */
/* Lifecycle */
/* ---------------------------------------------------------------------- */

async function start() {

    await eventBus.initialize();

    await eventBus.startConsuming();

    await outboxWorker.start();

    for (const module of modules) {

        await module.start?.();

    }

    logger.info?.(
        "Application started."
    );

}

async function stop() {

    for (const module of modules) {

        await module.stop?.();

    }

    await outboxWorker.stop();

    await eventBus.shutdown();

    await kafkaConnection.disconnect();

    await db.destroy();

    logger.info?.(
        "Application stopped."
    );

}

return {

    app,

    start,

    stop,

};

}