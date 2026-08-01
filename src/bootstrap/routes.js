// src/bootstrap/routes.js

export function bootstrapRoutes({
    app,
    modules,
    logger,
}) {

    if (!Array.isArray(modules)) {
        throw new TypeError(
            "bootstrapRoutes: modules must be an array."
        );
    }


    for (const module of modules) {

        if (!module) {
            continue;
        }


        //
        // Standard router module
        //
        if (module.router) {

            app.use(
                module.basePath,
                module.router
            );

            logger.info(
                {
                    module: module.name,
                    basePath: module.basePath,
                },
                "Module router registered."
            );

            continue;
        }


        //
        // Accounting module exposes multiple routers
        //
        if (module.routes) {

            for (const route of Object.values(module.routes)) {

                const router =
                    typeof route === "function"
                        ? route()
                        : route;


                app.use(
                    module.basePath,
                    router
                );

            }


            logger.info(
                {
                    module: module.name,
                    basePath: module.basePath,
                },
                "Accounting routes registered."
            );


            continue;
        }


        logger.warn(
            {
                module,
            },
            "Module has no HTTP routes."
        );
    }



    //
    // Health endpoint
    //
    app.get(
        "/",
        (req, res) => {

            res.json({
                service:
                    "Conference Management API",

                status:
                    "healthy",
            });

        }
    );


    //
    // 404
    //
    app.use(
        (req,res)=>{

            res.status(404)
                .json({
                    error:
                        "Route not found",
                });

        }
    );

}