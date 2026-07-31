import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Health Check", () => {

    let app;

    beforeAll(async () => {
        app = await createApp();
    });

    test("GET /health returns 200", async () => {

        const response =
            await request(app)
                .get("/health");

        expect(response.status).toBe(200);

        expect(response.body.status)
            .toBe("UP");

    });

});