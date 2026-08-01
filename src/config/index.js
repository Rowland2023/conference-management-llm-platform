export const config = {

    kafka: {
        clientId:
            process.env.KAFKA_CLIENT_ID ??
            "conference-management",

        brokers:
            (
                process.env.KAFKA_BROKERS ??
                "localhost:9092"
            ).split(","),

        groupId:
            process.env.KAFKA_GROUP_ID ??
            "conference-management-group",
    },


    redis: {
        host:
            process.env.REDIS_HOST ??
            "localhost",

        port:
            Number(
                process.env.REDIS_PORT ??
                6379
            ),

        password:
            process.env.REDIS_PASSWORD ??
            undefined,
    },


    paystack: {

        secretKey:
            process.env.PAYSTACK_SECRET_KEY,

        webhookSecret:
            process.env.PAYSTACK_WEBHOOK_SECRET,

    },


    stripe: {

        secretKey:
            process.env.STRIPE_SECRET_KEY,

        webhookSecret:
            process.env.STRIPE_WEBHOOK_SECRET,

    },


    security: {

        provider:
            process.env.AUTH_PROVIDER ??
            "default",

        jwt: {

            secret:
                process.env.JWT_SECRET,

            jwksUri:
                process.env.JWT_JWKS_URI,

            issuer:
                process.env.JWT_ISSUER,

            audience:
                process.env.JWT_AUDIENCE,

        },

    },


    openAI: {
        apiKey:
            process.env.OPENAI_API_KEY,
    },

};