// src/test/outbox.test.js

import { OutboxWorker } from "../shared/infrastructure/messaging/outbox/OutboxWorker.js";

describe("OutboxWorker", () => {
  let outboxRepository;
  let eventBus;
  let logger;
  let worker;

  beforeEach(() => {
    outboxRepository = {
      findPending: jest.fn(),
      markProcessing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
    };

    eventBus = {
      publish: jest.fn(),
    };

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    worker = new OutboxWorker({
      outboxRepository,
      eventBus,
      logger,
      pollingIntervalMs: 100,
      batchSize: 10,
    });
  });

  afterEach(async () => {
    await worker.stop();
    jest.clearAllMocks();
  });

  describe("processBatch()", () => {
    it("publishes pending events", async () => {
      const event = {
        id: "event-1",
        eventType: "ConferenceCreated",
        payload: {
          conferenceId: "conf-1",
        },
      };

      outboxRepository.findPending.mockResolvedValue([event]);

      await worker.processBatch();

      expect(outboxRepository.findPending).toHaveBeenCalled();

      expect(outboxRepository.markProcessing)
        .toHaveBeenCalledWith(event.id);

      expect(eventBus.publish)
        .toHaveBeenCalledWith(event);

      expect(outboxRepository.markProcessed)
        .toHaveBeenCalledWith(event.id);
    });

    it("marks event as failed when publish throws", async () => {
      const event = {
        id: "event-2",
        eventType: "ConferenceCancelled",
        payload: {},
      };

      outboxRepository.findPending.mockResolvedValue([event]);

      eventBus.publish.mockRejectedValue(
        new Error("Kafka unavailable")
      );

      await worker.processBatch();

      expect(outboxRepository.markFailed)
        .toHaveBeenCalledWith(
          event.id,
          expect.any(Error)
        );
    });

    it("does nothing when there are no pending events", async () => {
      outboxRepository.findPending.mockResolvedValue([]);

      await worker.processBatch();

      expect(eventBus.publish).not.toHaveBeenCalled();
      expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
    });

    it("continues processing after one event fails", async () => {
      const first = {
        id: "1",
        eventType: "A",
        payload: {},
      };

      const second = {
        id: "2",
        eventType: "B",
        payload: {},
      };

      outboxRepository.findPending.mockResolvedValue([
        first,
        second,
      ]);

      eventBus.publish
        .mockRejectedValueOnce(new Error("Failure"))
        .mockResolvedValueOnce();

      await worker.processBatch();

      expect(outboxRepository.markFailed)
        .toHaveBeenCalledWith(
          first.id,
          expect.any(Error)
        );

      expect(outboxRepository.markProcessed)
        .toHaveBeenCalledWith(second.id);
    });
  });

  describe("start()", () => {
    it("starts polling", async () => {
      const spy = jest.spyOn(worker, "processBatch")
        .mockResolvedValue();

      await worker.start();

      expect(spy).toHaveBeenCalled();

      await worker.stop();
    });
  });

  describe("stop()", () => {
    it("stops polling without throwing", async () => {
      await worker.start();

      await expect(worker.stop())
        .resolves
        .not
        .toThrow();
    });
  });
});