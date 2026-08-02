import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Registration API Integration Tests", () => {
    let app;
    let server;

    beforeAll(async () => {
        const application = await createApp();
        app = application.app;

        // If your createApp returns an HTTP server instance or if you need to 
        // explicitly spin it up/down to prevent socket leaks:
        if (application.server) {
            server = application.server;
        }
    });

    afterAll(async () => {
        // Explicitly close the server instance if it was started during bootstrap
        if (server && typeof server.close === "function") {
            await new Promise((resolve) => server.close(resolve));
        }

        // If your application has global database pools, Redis clients, or 
        // message brokers, disconnect them here to prevent hanging processes:
        // e.g., await db.destroy();
        // e.g., await redisClient.quit();
    });

    test("POST /registrations creates a registration", async () => {
        const response = await request(app)
            .post("/registrations")
            .send({
                conferenceId: "11111111-1111-1111-1111-111111111111",
                attendeeId: "22222222-2222-2222-2222-222222222222",
                ticketType: "STANDARD"
            });

        expect(response.status).toBe(201);
        expect(response.body).toBeDefined();
    });
});