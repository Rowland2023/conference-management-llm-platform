// src/test/infrastructure/repositories/ConferenceRepository.test.js

import { randomUUID } from "crypto";

import knex from "../../../bootstrap/infrastructure.js";
import { ConferenceRepository } from "../../../src/conference-management/event-schedule/infrastructure/repositories/ConferenceRepository.js";
import { Conference } from "../../../src/conference-management/event-schedule/domain/entities/Conference.js";

describe("ConferenceRepository", () => {
    let repository;
    let trx;

    beforeAll(async () => {
        repository = new ConferenceRepository({ db: knex });
    });

    beforeEach(async () => {
        trx = await knex.transaction();
    });

    afterEach(async () => {
        await trx.rollback();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe("save()", () => {

        test("should persist a new conference", async () => {

            const conference = Conference.create({
                id: randomUUID(),
                title: "DDD Europe",
                venue: "Lagos",
                capacity: 300,
                startsAt: new Date("2027-05-10T09:00:00Z"),
                endsAt: new Date("2027-05-11T17:00:00Z"),
            });

            await repository.save(conference, trx);

            const persisted = await trx("conferences")
                .where({ id: conference.id })
                .first();

            expect(persisted).toBeDefined();
            expect(persisted.title).toBe("DDD Europe");
        });

    });

    describe("findById()", () => {

        test("returns conference when found", async () => {

            const conference = Conference.create({
                id: randomUUID(),
                title: "Node Summit",
                venue: "Abuja",
                capacity: 150,
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 86400000),
            });

            await repository.save(conference, trx);

            const result =
                await repository.findById(conference.id, trx);

            expect(result).not.toBeNull();
            expect(result.id).toBe(conference.id);
            expect(result.title).toBe("Node Summit");

        });

        test("returns null when conference does not exist", async () => {

            const result =
                await repository.findById(randomUUID(), trx);

            expect(result).toBeNull();

        });

    });

    describe("exists()", () => {

        test("returns true when conference exists", async () => {

            const conference = Conference.create({
                id: randomUUID(),
                title: "Clean Architecture",
                venue: "London",
                capacity: 100,
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 86400000),
            });

            await repository.save(conference, trx);

            expect(
                await repository.exists(conference.id, trx)
            ).toBe(true);

        });

        test("returns false when conference does not exist", async () => {

            expect(
                await repository.exists(randomUUID(), trx)
            ).toBe(false);

        });

    });

    describe("findAll()", () => {

        test("returns all conferences", async () => {

            const conferences =
                await repository.findAll({}, trx);

            expect(Array.isArray(conferences)).toBe(true);

        });

    });

    describe("update()", () => {

        test("updates an existing conference", async () => {

            const conference = Conference.create({
                id: randomUUID(),
                title: "Original",
                venue: "Lagos",
                capacity: 100,
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 86400000),
            });

            await repository.save(conference, trx);

            conference.rename("Updated");

            await repository.save(conference, trx);

            const updated =
                await repository.findById(conference.id, trx);

            expect(updated.title).toBe("Updated");

        });

    });

    describe("delete()", () => {

        test("soft deletes conference", async () => {

            const conference = Conference.create({
                id: randomUUID(),
                title: "Delete Me",
                venue: "Accra",
                capacity: 50,
                startsAt: new Date(),
                endsAt: new Date(Date.now() + 86400000),
            });

            await repository.save(conference, trx);

            await repository.delete(conference.id, trx);

            const result =
                await repository.findById(conference.id, trx);

            expect(result).toBeNull();

        });

    });

});