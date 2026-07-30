// src/bootstrap/routes.js

export function bootstrapRoutes(app, modules, llmRouter) {
    for (const module of modules) {
        if (module.router && module.basePath) {
            app.use(module.basePath, module.router);
        }
    }

    if (llmRouter) {
        app.use("/api/ai", llmRouter);
    }
}