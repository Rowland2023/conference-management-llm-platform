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

        if (!module?.router) {
            continue;
        }

        app.use(module.router);

        logger.info?.(
            {
                router: module.router?.mountPath ?? "<dynamic>",
            },
            "Module router registered."
        );

    }

}