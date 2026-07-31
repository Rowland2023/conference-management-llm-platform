describe("Kafka", () => {

    test("publishes message", async () => {

        await producer.publish(
            "conference.created",
            [
                {
                    value: {
                        id: "1"
                    }
                }
            ]
        );

    });

});