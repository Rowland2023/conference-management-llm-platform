export class ToolExecutor {
    constructor({
        logger,
        tracer,
        registry
    }) {
        this.logger = logger;
        this.tracer = tracer;
        this.registry = registry;
    }

    async execute(name, payload, context) {

        const tool = this.registry.get(name);

        if (!tool) {
            throw new ApplicationError(
                `Unknown tool: ${name}`
            );
        }

        return this.tracer.startActiveSpan(
            `tool.${name}`,
            async span => {

                try {

                    const result =
                        await tool.execute(payload, context);

                    span.end();

                    return result;

                } catch (err) {

                    span.recordException(err);
                    span.end();

                    throw err;
                }

            }
        );

    }
}