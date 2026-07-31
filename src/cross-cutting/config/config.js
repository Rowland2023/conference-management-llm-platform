export const kafkaConfig = {

    client: {

        clientId:
            process.env.KAFKA_CLIENT_ID ??
            "conference-management",

        brokers:
            (process.env.KAFKA_BROKERS ??
            "localhost:9092")
                .split(","),

        ssl:
            process.env.KAFKA_SSL === "true",

        sasl:
            undefined,

        connectionTimeout: 10000,

        requestTimeout: 30000,

        retry: {

            initialRetryTime: 300,

            retries:
                Number.MAX_SAFE_INTEGER,

        },

    },

    producer: {

        idempotent: true,

        maxInFlightRequests: 1,

        allowAutoTopicCreation: false,

        transactionTimeout: 30000,

    },

    consumer: {

        groupId:
            process.env.KAFKA_GROUP ??
            "conference-management",

        allowAutoTopicCreation: false,

        sessionTimeout: 30000,

        heartbeatInterval: 3000,

    },

};