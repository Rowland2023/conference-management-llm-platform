// src/cross-cutting/logging/PinoLogger.js

import pino from "pino";
import { ILogger } from "./ILogger.js";

export class PinoLogger extends ILogger {
    /**
     * @param {object} [options]
     * @param {import("pino").Logger} [logger]
     */
    constructor(options = {}, logger = null) {
        super();

        this.logger = logger ?? pino(options);
    }

    debug(message, context = {}) {
        this.logger.debug(context, message);
    }

    info(message, context = {}) {
        this.logger.info(context, message);
    }

    warn(message, context = {}) {
        this.#log("warn", message, context);
    }

    error(message, context = {}) {
        this.#log("error", message, context);
    }

    /**
     * Create a scoped logger.
     *
     * @param {object} bindings
     * @returns {PinoLogger}
     */
    child(bindings = {}) {
        return new PinoLogger(
            {},
            this.logger.child(bindings)
        );
    }

    /**
     * Internal helper for warning/error logging.
     *
     * @private
     */
    #log(level, message, context = {}) {
        // logger.error(error)
        if (message instanceof Error) {
            this.logger[level](
                {
                    err: message,
                    ...context,
                },
                message.message
            );
            return;
        }

        // logger.error("msg", error)
        if (context instanceof Error) {
            this.logger[level](
                {
                    err: context,
                },
                message
            );
            return;
        }

        // logger.error("msg", {...})
        this.logger[level](context, message);
    }
}