describe("Outbox Worker", () => {

    test("dispatches pending events", async () => {

        await outboxRepository.save(event);

        await outboxWorker.runOnce();

        const row =
            await db("outbox_events")
                .first();

        expect(row.status)
            .toBe("DISPATCHED");

    });

});