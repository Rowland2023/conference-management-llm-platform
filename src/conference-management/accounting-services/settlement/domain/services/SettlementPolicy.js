// settlement/domain/services/SettlementPolicy.js

export class SettlementPolicy {

    canSettle({

        merchant,

        amount,

    }) {

        if (!merchant.isVerified()) {

            return false;

        }

        if (amount <= 0) {

            return false;

        }

        return true;

    }

}