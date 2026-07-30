// src/config/index.js

export const config = {
    kafka: {
        clientId:
            process.env.KAFKA_CLIENT_ID ||
            "conference-management",

        brokers:
            (
                process.env.KAFKA_BROKERS ||
                "localhost:9092"
            ).split(","),

        groupId:
            process.env.KAFKA_GROUP_ID ||
            "conference-management-group",
    },

    openAI: {
        apiKey:
            process.env.OPENAI_API_KEY,
    },
};