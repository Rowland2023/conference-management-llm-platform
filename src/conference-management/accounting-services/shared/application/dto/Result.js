export class Result {

    constructor({

        success,

        data = null,

        error = null,

    }) {

        this.success = success;

        this.data = data;

        this.error = error;

        Object.freeze(this);

    }

    static success(data) {

        return new Result({

            success: true,

            data,

        });

    }

    static failure(error) {

        return new Result({

            success: false,

            error,

        });

    }

}