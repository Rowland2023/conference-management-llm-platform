// src/conference-management/accounting-services/payment/serializers/payment.serializer.js

export default class PaymentSerializer {

    static serialize(payment) {

        if (!payment) {
            return null;
        }

        return {
            id: payment.id,
            tenantId: payment.tenantId,

            contextId: payment.contextId,
            contextType: payment.contextType,

            amount: payment.amount,
            currency: payment.currency,

            status: payment.status,

            sellerId: payment.sellerId ?? null,

            gateway: payment.gateway ?? null,
            gatewayTransactionId:
                payment.gatewayTransactionId ?? null,

            checkoutUrl:
                payment.checkoutUrl ?? null,

            paidAt:
                payment.paidAt ?? null,

            releasedAt:
                payment.releasedAt ?? null,

            createdAt:
                payment.createdAt ?? null,

            updatedAt:
                payment.updatedAt ?? null,
        };

    }

}