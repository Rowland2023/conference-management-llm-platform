import { performance } from "node:perf_hooks";

export class LLMAuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "LLMAuthorizationError";
  }
}

export class LLMFeatureDisabledError extends Error {
  constructor(message) {
    super(message);
    this.name = "LLMFeatureDisabledError";
  }
}

export class LLMUseCaseMappingError extends Error {
  constructor(message) {
    super(message);
    this.name = "LLMUseCaseMappingError";
  }
}

export class LLMCommandInterceptor {
  constructor({
    toolDefinitions = [],
    featureFlags = {},
    telemetry = null,
    logger,
  }) {
    this.logger = logger;
    this.telemetry = telemetry;
    this.featureFlags = featureFlags;

    this.tools = new Map();

    for (const tool of toolDefinitions) {
      this.tools.set(tool.name, tool);
    }
  }

  async process(parsedIntent, userContext = {}) {
    const {
      useCase: toolName,
      payload = {},
    } = parsedIntent;

    const tool = this.tools.get(toolName);

    if (!tool) {
      this.telemetry?.counter?.(
        "llm_unknown_tool",
        1,
        { tool: toolName }
      );

      throw new LLMUseCaseMappingError(
        `Unknown tool '${toolName}'.`
      );
    }

    this.ensureFeatureEnabled(tool);
    this.ensureAuthorized(tool, userContext);

    return this.execute(tool, payload, userContext);
  }

  ensureFeatureEnabled(tool) {
    if (
      tool.featureFlag &&
      this.featureFlags[tool.featureFlag] === false
    ) {
      throw new LLMFeatureDisabledError(
        `${tool.name} is disabled.`
      );
    }
  }

  ensureAuthorized(tool, userContext) {
    if (!tool.requiresRole?.length) {
      return;
    }

    const roles = userContext.roles ?? [];

    const authorized =
      tool.requiresRole.some(role =>
        roles.includes(role)
      );

    if (authorized) {
      return;
    }

    this.telemetry?.counter?.(
      "llm_authorization_failure",
      1,
      { tool: tool.name }
    );

    throw new LLMAuthorizationError(
      `Access denied for '${tool.name}'.`
    );
  }

  async execute(tool, payload, userContext) {
    if (typeof tool.handler !== "function") {
      throw new LLMUseCaseMappingError(
        `Tool '${tool.name}' has no executable handler.`
      );
    }

    const started = performance.now();

    try {
      const result =
        await tool.handler(payload, userContext);

      this.recordSuccess(
        tool,
        performance.now() - started
      );

      return result;
    } catch (error) {
      this.recordFailure(tool, error);
      throw error;
    }
  }

  recordSuccess(tool, duration) {
    this.telemetry?.histogram?.(
      "llm_execution_duration_ms",
      duration,
      { tool: tool.name }
    );

    this.telemetry?.counter?.(
      "llm_tool_success",
      1,
      { tool: tool.name }
    );

    if (
      tool.slaMs &&
      duration > tool.slaMs
    ) {
      this.logger?.warn?.(
        {
          tool: tool.name,
          duration,
          sla: tool.slaMs,
        },
        "LLM tool exceeded SLA."
      );
    }

    this.logger?.debug?.(
      {
        tool: tool.name,
        duration,
      },
      "LLM tool executed."
    );
  }

  recordFailure(tool, error) {
    this.telemetry?.counter?.(
      "llm_tool_failure",
      1,
      {
        tool: tool.name,
        error: error.name,
      }
    );

    this.logger?.error?.(
      {
        err: error,
        tool: tool.name,
      },
      "LLM tool failed."
    );
  }

  getTool(name) {
    return this.tools.get(name);
  }

  hasTool(name) {
    return this.tools.has(name);
  }
}