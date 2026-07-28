/**
 * @file src/Shared/infrastructure/messaging/KafkaConnection.js
 * @description Centralized Kafka client manager and connection lifecycle handler.
 */

import { Kafka, logLevel } from "kafkajs";

class KafkaConnection {
  /**
   * @param {Object} params
   * @param {string[]|string} params.brokers - Broker address array or comma-separated string
   * @param {string} [params.clientId='ledger-service'] - Client identifier
   * @param {Object} [params.ssl] - Optional SSL configuration
   * @param {Object} [params.sasl] - Optional SASL authentication credentials
   * @param {Object} [params.logger] - Application Logger instance
   */
  constructor({
    brokers,
    clientId = "ledger-service",
    ssl,
    sasl,
    logger,
  }) {
    if (!brokers || (Array.isArray(brokers) && brokers.length === 0)) {
      throw new Error(
        "KafkaConnection requires at least one broker address."
      );
    }

    this.logger = logger;
    this.clientId = clientId;

    const brokerList = typeof brokers === "string"
      ? brokers.split(",").map((b) => b.trim())
      : brokers;

    /**
     * Bridge KafkaJS internal logging into application logger.
     */
    const customLogCreator = () => {
      return ({ level, log }) => {
        if (!this.logger) return;

        const { message, ...extra } = log;

        switch (level) {
          case logLevel.ERROR:
          case logLevel.NOTHING:
            this.logger.error(`[KafkaJS] ${message}`, extra);
            break;

          case logLevel.WARN:
            this.logger.warn(`[KafkaJS] ${message}`, extra);
            break;

          case logLevel.INFO:
            this.logger.info(`[KafkaJS] ${message}`, extra);
            break;

          case logLevel.DEBUG:
            this.logger.debug(`[KafkaJS] ${message}`, extra);
            break;

          default:
            this.logger.info(`[KafkaJS] ${message}`, extra);
        }
      };
    };

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: brokerList,
      ssl,
      sasl,
      logLevel: logLevel.WARN,
      logCreator: customLogCreator,

      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
    });

    this.admin = null;
    this.isAdminConnected = false;
  }

  /**
   * Returns underlying KafkaJS instance.
   *
   * @returns {import("kafkajs").Kafka}
   */
  getKafkaInstance() {
    return this.kafka;
  }

  /**
   * Lazy initializes Kafka Admin client.
   *
   * @private
   */
  async _getAdmin() {
    if (!this.admin) {
      this.admin = this.kafka.admin();
    }

    if (!this.isAdminConnected) {
      await this.admin.connect();
      this.isAdminConnected = true;
    }

    return this.admin;
  }

  /**
   * Checks Kafka cluster health.
   *
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const admin = await this._getAdmin();

      // Lightweight broker connectivity check
      await admin.fetchTopicMetadata({
        topics: [],
      });

      return true;

    } catch (error) {
      this.isAdminConnected = false;

      this.logger?.error(
        "Kafka cluster healthcheck failed",
        {
          error: error.message,
          stack: error.stack,
        }
      );

      return false;
    }
  }

  /**
   * Disconnect Kafka admin client during shutdown.
   */
  async disconnect() {
    if (!this.admin || !this.isAdminConnected) {
      return;
    }

    try {
      await this.admin.disconnect();

    } catch (error) {
      this.logger?.error(
        "Error disconnecting Kafka Admin instance",
        {
          error: error.message,
        }
      );

    } finally {
      this.isAdminConnected = false;
    }
  }
}

export { KafkaConnection };