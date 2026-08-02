import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Ticket API Integration Tests", () => {
    let app;

    beforeAll(async () => {
        const application = await createApp();
        app = application.app;
    });


    test("POST /tickets creates a ticket", async () => {
        const response = await request(app)
            .post("/tickets")
            .send({
                conferenceId: "11111111-1111-1111-1111-111111111111",
                registrationId: "22222222-2222-2222-2222-222222222222",
                ticketType: "STANDARD",
                price: {
                    amount: 10000,
                    currency: "NGN"
                }
            });


        expect(response.statusCode).toBe(201);

        expect(response.body).toHaveProperty("id");
        expect(response.body).toHaveProperty("conferenceId");
        expect(response.body).toHaveProperty("registrationId");
        expect(response.body.ticketType)
            .toBe("STANDARD");
    });


    test("GET /tickets/:id returns a ticket", async () => {

        const createResponse = await request(app)
            .post("/tickets")
            .send({
                conferenceId: "11111111-1111-1111-1111-111111111111",
                registrationId: "33333333-3333-3333-3333-333333333333",
                ticketType: "VIP",
                price: {
                    amount: 25000,
                    currency: "NGN"
                }
            });


        const ticketId = createResponse.body.id;


        const response = await request(app)
            .get(`/tickets/${ticketId}`);


        expect(response.statusCode).toBe(200);

        expect(response.body.id)
            .toBe(ticketId);

    });


    test("POST /tickets/:id/reserve reserves a ticket", async () => {

        const createResponse = await request(app)
            .post("/tickets")
            .send({
                conferenceId: "11111111-1111-1111-1111-111111111111",
                registrationId: "44444444-4444-4444-4444-444444444444",
                ticketType: "STANDARD",
                price: {
                    amount: 15000,
                    currency: "NGN"
                }
            });


        const ticketId = createResponse.body.id;


        const response = await request(app)
            .post(`/tickets/${ticketId}/reserve`)
            .send({
                userId: "55555555-5555-5555-5555-555555555555"
            });


        expect(response.statusCode)
            .toBe(200);


        expect(response.body.status)
            .toBe("RESERVED");

    });


    test("POST /tickets/:id/cancel cancels a ticket", async () => {

        const createResponse = await request(app)
            .post("/tickets")
            .send({
                conferenceId: "11111111-1111-1111-1111-111111111111",
                registrationId: "66666666-6666-6666-6666-666666666666",
                ticketType: "STANDARD",
                price: {
                    amount: 15000,
                    currency: "NGN"
                }
            });


        const ticketId = createResponse.body.id;


        const response = await request(app)
            .post(`/tickets/${ticketId}/cancel`);


        expect(response.statusCode)
            .toBe(200);


        expect(response.body.status)
            .toBe("CANCELLED");

    });

});