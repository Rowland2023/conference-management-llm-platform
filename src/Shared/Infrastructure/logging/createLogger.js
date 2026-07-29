/**
 * @file src/shared/infrastructure/logging/createLogger.js
 *
 * Simple structured logger.
 *
 * Compatible with:
 *  - logger.child(...)
 *  - logger.info(...)
 *  - logger.warn(...)
 *  - logger.error(...)
 *  - logger.debug(...)
 */

export function createLogger(base = console) {

    function serializeScope(scope) {

        if (typeof scope === "string") {
            return scope;
        }

        if (
            scope &&
            typeof scope === "object"
        ) {
            return Object.entries(scope)
                .map(([k, v]) => `${k}:${v}`)
                .join(",");
        }

        return "app";

    }

    function write(level, scope, message, meta = {}) {

        const entry = {

            timestamp:
                new Date().toISOString(),

            level,

            scope,

            message,

            ...meta,

        };

        const writer =
            base[level] ??
            base.log;

        writer.call(base, entry);

    }

    function createScopedLogger(scope = "app") {

        const scopeName =
            serializeScope(scope);

        return {

            child(childScope) {

                const childName =
                    serializeScope(childScope);

                return createScopedLogger(
                    `${scopeName}:${childName}`
                );

            },

            info(message, meta = {}) {

                write(
                    "info",
                    scopeName,
                    message,
                    meta
                );

            },

            warn(message, meta = {}) {

                write(
                    "warn",
                    scopeName,
                    message,
                    meta
                );

            },

            error(message, meta = {}) {

                if (message instanceof Error) {

                    write(
                        "error",
                        scopeName,
                        message.message,
                        {
                            stack: message.stack,
                            ...meta,
                        }
                    );

                    return;

                }

                write(
                    "error",
                    scopeName,
                    message,
                    meta
                );

            },

            debug(message, meta = {}) {

                write(
                    "debug",
                    scopeName,
                    message,
                    meta
                );

            },

        };

    }

    return createScopedLogger("app");

}