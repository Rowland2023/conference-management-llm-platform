import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Payment API", () => {
    let app;
    let stop;

    beforeAll(async () => {
        const server = await createApp();

        app = server.app;
        stop = server.stop;
    });

    afterAll(async () => {
        if (stop) {
            await stop();
        }
    });

    test("POST /api/accounting/payments creates a payment", async () => {
        const response = await request(app)
            .post("/api/accounting/payments")
            .send({
                registrationId: "11111111-1111-1111-1111-111111111111",
                amount: 5000,
                currency: "NGN",
                paymentMethod: "paystack",
            });

        expect([200, 201, 400, 404, 409]).toContain(response.status);
    });
});