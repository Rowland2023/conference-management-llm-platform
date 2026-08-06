// tax/application/queries/ListTaxesQuery.js

export class ListTaxesQuery {

    constructor({

        taxpayerId = null,

        transactionId = null,

        taxType = null,

        status = null,

        page = 1,

        pageSize = 20,

    }) {

        this.taxpayerId =
            taxpayerId;

        this.transactionId =
            transactionId;

        this.taxType =
            taxType;

        this.status =
            status;

        this.page =
            page;

        this.pageSize =
            pageSize;

        Object.freeze(this);

    }

}