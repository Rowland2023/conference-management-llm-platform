import { CompressionTypes } from "kafkajs";

export class KafkaConsumer {

    constructor({
        kafka,
        groupId,
        logger = console,
    }) {

        if (!kafka)
            throw new Error("KafkaConsumer requires kafka.");

        if (!groupId)
            throw new Error("KafkaConsumer requires groupId.");

        this.logger = logger;

        this.consumer = kafka.consumer({
            groupId,
            allowAutoTopicCreation: false,
        });

        this.connected = false;
    }

    async connect() {

        if (this.connected)
            return;

        await this.consumer.connect();

        this.connected = true;
    }

    async subscribe(topics) {

        for (const topic of topics) {

            await this.consumer.subscribe({

                topic,

                fromBeginning: false,

            });

        }

    }

    async start(handler) {

        await this.consumer.run({

            eachMessage: async ({
                topic,
                partition,
                message,
            }) => {

                const payload =
                    JSON.parse(message.value.toString());

                const headers = {};

                for (const key of Object.keys(message.headers || {})) {

                    headers[key] =
                        message.headers[key].toString();

                }

                await handler({

                    topic,

                    partition,

                    payload,

                    headers,

                });

            },

        });

    }

    async disconnect() {

        if (!this.connected)
            return;

        await this.consumer.disconnect();

        this.connected = false;

    }

}