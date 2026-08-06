export class ApiResponseSerializer {

    static success(result) {

        return {

            success: result.success,

            message: result.message,

            data: result.data,

        };

    }

    static failure(result) {

        return {

            success: false,

            message: result.message,

            errors: result.errors,

        };

    }

}