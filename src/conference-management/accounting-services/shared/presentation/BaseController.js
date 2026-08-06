import { Result }
    from "../application/dto/result.js";


export class BaseController {

    /**
     * Sends a standardized HTTP response.
     *
     * @param {Response} res
     * @param {Result} result
     * @param {number} successStatus
     */
    respond(

        res,

        result,

        successStatus = 200,

    ) {

        if (!(result instanceof Result)) {

            throw new Error(

                "Controller expected a Result."

            );

        }


        if (!result.success) {

            return res.status(400).json({

                success: false,

                error: result.error,

            });

        }


        return res.status(successStatus).json({

            success: true,

            data: result.data,

        });

    }


    /**
     * Standard async wrapper.
     */
    async execute(

        res,

        next,

        callback,

        successStatus = 200,

    ) {

        try {

            const result =
                await callback();

            this.respond(

                res,

                result,

                successStatus,

            );

        }

        catch (error) {

            next(error);

        }

    }

}