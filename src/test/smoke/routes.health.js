import request from "supertest";
import { createApp } from "../../src/app.js";

describe("API Smoke Test", () => {

    let app;

    beforeAll(async () => {
        app = await createApp();
    });

    test("Unknown route returns 404", async () => {

        const response =
            await request(app)
                .get("/unknown");

        expect(response.status).toBe(404);

    });

});