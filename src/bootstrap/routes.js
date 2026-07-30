// src/bootstrap/routes.js

export function bootstrapRoutes({
    app,
    modules,
    logger,
}) {

    if (!Array.isArray(modules)) {
        throw new Error(
            "bootstrapRoutes: modules must be an array."
        );
    }


    for (const module of modules) {

        if (!module) {
            continue;
        }


        if (!module.router) {

            logger.warn(
                "Module does not expose router. Skipping."
            );

            continue;
        }


        app.use(
            module.router
        );

    }

}