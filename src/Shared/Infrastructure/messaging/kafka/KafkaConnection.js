/**
 * @file src/shared/infrastructure/messaging/kafka/KafkaConnection.js
 *
 * Centralized Kafka infrastructure lifecycle manager.
 *
 * Responsibilities:
 * - Create KafkaJS client
 * - Manage producer lifecycle
 * - Manage admin lifecycle
 * - Provide health checks
 * - Provide graceful shutdown
 */

import { Kafka, logLevel } from "kafkajs";


export class KafkaConnection {


    constructor({
        brokers,
        clientId = "conference-management",
        ssl,
        sasl,
        logger = console,
    }) {


        if (
            !brokers ||
            (Array.isArray(brokers) && brokers.length === 0)
        ) {
            throw new Error(
                "KafkaConnection requires at least one broker."
            );
        }


        this.logger = logger;

        this.clientId = clientId;


        const brokerList =
            typeof brokers === "string"
                ? brokers
                    .split(",")
                    .map((b) => b.trim())
                : brokers;



        this.kafka =
            new Kafka({

                clientId,

                brokers: brokerList,

                ssl,

                sasl,

                logLevel:
                    logLevel.WARN,

                logCreator:
                    this.createKafkaLogger(),

                retry: {

                    initialRetryTime: 300,

                    retries: 8,

                },

            });



        /*
        |--------------------------------------------------------------------------
        | Managed Clients
        |--------------------------------------------------------------------------
        */

        this.admin = null;

        this.producer = null;


        this.adminConnected = false;

        this.producerConnected = false;


    }



    /**
     * Bridge KafkaJS logs into application logger.
     */
    createKafkaLogger() {


        return () => ({ level, log }) => {


            const {
                message,
                ...metadata
            } = log;



            switch(level) {


                case logLevel.ERROR:
                case logLevel.NOTHING:

                    this.logger.error(
                        `[KafkaJS] ${message}`,
                        metadata
                    );

                    break;



                case logLevel.WARN:

                    this.logger.warn(
                        `[KafkaJS] ${message}`,
                        metadata
                    );

                    break;



                case logLevel.INFO:

                    this.logger.info(
                        `[KafkaJS] ${message}`,
                        metadata
                    );

                    break;



                case logLevel.DEBUG:

                    this.logger.debug(
                        `[KafkaJS] ${message}`,
                        metadata
                    );

                    break;


                default:

                    this.logger.info(
                        `[KafkaJS] ${message}`,
                        metadata
                    );

            }

        };

    }



    /**
     * Exposes KafkaJS instance when required by adapters.
     */
    getKafkaInstance() {

        return this.kafka;

    }




    /**
     * Creates and connects Kafka producer.
     *
     * Used by:
     * - KafkaProducer adapter
     * - Outbox dispatcher
     */
    async getProducer() {


        if (!this.producer) {


            this.producer =
                this.kafka.producer({

                    idempotent: true,

                    maxInFlightRequests: 5,

                });

        }



        if (!this.producerConnected) {


            await this.producer.connect();


            this.producerConnected = true;


            this.logger.info(
                "Kafka producer connected."
            );

        }



        return this.producer;

    }




    /**
     * Creates and connects Kafka admin client.
     */
    async getAdmin() {


        if (!this.admin) {

            this.admin =
                this.kafka.admin();

        }



        if (!this.adminConnected) {


            await this.admin.connect();


            this.adminConnected = true;


            this.logger.info(
                "Kafka admin connected."
            );

        }



        return this.admin;

    }




    /**
     * Kafka cluster health check.
     */
    async checkHealth() {


        try {


            const admin =
                await this.getAdmin();



            await admin.fetchTopicMetadata({
                topics: [],
            });



            return true;



        } catch(error) {


            this.logger.error(
                "Kafka health check failed.",
                {
                    error: error.message,
                }
            );


            this.adminConnected = false;


            return false;

        }

    }




    /**
     * Graceful shutdown.
     */
    async disconnect() {


        /*
        |--------------------------------------------------------------------------
        | Producer shutdown
        |--------------------------------------------------------------------------
        */

        if (
            this.producer &&
            this.producerConnected
        ) {


            try {


                await this.producer.disconnect();



            } catch(error) {


                this.logger.error(
                    "Failed disconnecting Kafka producer.",
                    {
                        error: error.message,
                    }
                );


            }
            finally {


                this.producerConnected = false;


            }

        }



        /*
        |--------------------------------------------------------------------------
        | Admin shutdown
        |--------------------------------------------------------------------------
        */

        if (
            this.admin &&
            this.adminConnected
        ) {


            try {


                await this.admin.disconnect();



            } catch(error) {


                this.logger.error(
                    "Failed disconnecting Kafka admin.",
                    {
                        error: error.message,
                    }
                );


            }
            finally {


                this.adminConnected = false;


            }

        }



        this.logger.info(
            "Kafka connection shutdown completed."
        );

    }


}