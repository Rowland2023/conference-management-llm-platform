// src/conference-management/accounting-services/payment/infrastructure/persistence/repositories/PostgresRefundRepository.js

export class PostgresRefundRepository {

    constructor({
        db,
    }) {

        if (!db) {
            throw new Error(
                "PostgresRefundRepository requires database connection"
            );
        }

        this.db = db;
    }


    async save(refund, trx = this.db) {

        const [savedRefund] =
            await trx("payment_refunds")
                .insert({
                    id: refund.id,
                    payment_id: refund.paymentId,
                    amount: refund.amount,
                    currency: refund.currency,
                    status: refund.status,
                    reason: refund.reason,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .returning("*");


        return savedRefund;
    }


    async findById(id, trx = this.db) {

        return trx("payment_refunds")
            .where({
                id,
            })
            .first();
    }


    async findByPaymentId(paymentId, trx = this.db) {

        return trx("payment_refunds")
            .where({
                payment_id: paymentId,
            })
            .orderBy(
                "created_at",
                "desc"
            );
    }

}