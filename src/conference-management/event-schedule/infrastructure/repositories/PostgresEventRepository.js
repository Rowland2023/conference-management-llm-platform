export class KnexEventRepository {

    constructor({ db }) {

        if (!db) {
            throw new Error("KnexEventRepository requires a Knex instance.");
        }

        this.db = db;
    }

    async findById(id) {

        const row = await this.db("events")
            .where({ id })
            .first();

        return row ? this.toDomain(row) : null;
    }

    async findByIdForUpdate(id, trx = this.db) {

        const row = await trx("events")
            .where({ id })
            .forUpdate()
            .first();

        return row ? this.toDomain(row) : null;
    }

    async insert(event, trx = this.db) {

        await trx("events").insert({
            id: event.id,
            title: event.title,
            room_id: event.roomId,
            start_time: event.startTime,
            end_time: event.endTime,
            status: event.status,
            version: 0,
        });

        event.version = 0;

        return event;
    }

    async update(event, trx = this.db) {

        const updated = await trx("events")
            .where({
                id: event.id,
                version: event.version,
            })
            .update({
                title: event.title,
                room_id: event.roomId,
                start_time: event.startTime,
                end_time: event.endTime,
                status: event.status,
                version: this.db.raw("version + 1"),
                updated_at: this.db.fn.now(),
            });

        if (updated === 0) {
            throw new ConcurrencyError(
                `Event ${event.id} was modified concurrently.`
            );
        }

        event.version++;

        return event;
    }

    // keep your existing toDomain()
}