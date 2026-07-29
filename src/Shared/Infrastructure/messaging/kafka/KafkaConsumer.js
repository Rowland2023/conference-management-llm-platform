// src/shared/infrastructure/messaging/kafka/KafkaConsumer.js

export class KafkaConsumer {
  constructor({
    kafka,
    groupId,
    logger = console,
    config = {},
  }) {
    if (!kafka) {
      throw new Error(
        "KafkaConsumer requires a Kafka instance."
      );
    }

    if (!groupId) {
      throw new Error(
        "KafkaConsumer requires a groupId."
      );
    }

    this.logger = logger;

    this.consumer = kafka.consumer({
      groupId,
      allowAutoTopicCreation: false,

      sessionTimeout:
        config.sessionTimeout ?? 30000,

      heartbeatInterval:
        config.heartbeatInterval ?? 3000,

      maxBytesPerPartition:
        config.maxBytesPerPartition ??
        2 * 1024 * 1024,
    });

    this.connected = false;
    this.running = false;

    this.#registerEvents();
  }

  #registerEvents() {
    const events = this.consumer.events;

    this.consumer.on(events.CONNECT, () => {
      this.connected = true;

      this.logger.info?.(
        "[KafkaConsumer] Connected."
      );
    });

    this.consumer.on(events.DISCONNECT, () => {
      this.connected = false;

      this.logger.warn?.(
        "[KafkaConsumer] Disconnected."
      );
    });

    this.consumer.on(events.CRASH, ({ payload }) => {
      this.connected = false;

      this.logger.error?.(
        "[KafkaConsumer] Crash detected.",
        payload.error
      );
    });
  }

  async connect() {
    if (this.connected) {
      return;
    }

    await this.consumer.connect();

    this.connected = true;
  }

  async subscribe(topics) {
    if (!Array.isArray(topics)) {
      throw new Error(
        "subscribe() expects an array of topics."
      );
    }

    for (const topic of topics) {
      await this.consumer.subscribe({
        topic,
        fromBeginning: false,
      });
    }

    this.logger.info?.(
      `[KafkaConsumer] Subscribed to ${topics.length} topic(s).`
    );
  }

  async start(handler) {
    if (!this.connected) {
      throw new Error(
        "KafkaConsumer is not connected."
      );
    }

    if (this.running) {
      return;
    }

    this.running = true;

    await this.consumer.run({
      autoCommit: true,

      eachMessage: async ({
        topic,
        partition,
        message,
      }) => {
        let payload;

        try {
          payload =
            message.value == null
              ? null
              : JSON.parse(
                  message.value.toString()
                );
        } catch {
          payload =
            message.value?.toString() ?? null;
        }

        const headers = {};

        if (message.headers) {
          for (const [key, value] of Object.entries(
            message.headers
          )) {
            headers[key] =
              value?.toString();
          }
        }

        await handler({
          topic,
          partition,
          offset: message.offset,
          key:
            message.key?.toString() ??
            null,
          payload,
          headers,
        });
      },
    });

    this.logger.info?.(
      "[KafkaConsumer] Started."
    );
  }

  async disconnect() {
    if (!this.connected) {
      return;
    }

    await this.consumer.disconnect();

    this.connected = false;
    this.running = false;

    this.logger.info?.(
      "[KafkaConsumer] Disconnected."
    );
  }
}