// src/conference-management/ticket/infrastructure/schemas/TicketModel.js

export function TicketModelDefine(db) {

    if (!db) {
        throw new Error(
            "TicketModelDefine requires database connection."
        );
    }


    return {

        tableName: "tickets",


        query() {
            return db("tickets");
        },


        columns: {

            id: "id",

            conferenceId:
                "conference_id",

            type:
                "type",

            priceAmount:
                "price_amount",

            priceCurrency:
                "price_currency",

            capacity:
                "capacity",

            reserved:
                "reserved",

            sold:
                "sold",

            status:
                "status",

            createdAt:
                "created_at",

            updatedAt:
                "updated_at",

        }

    };
}