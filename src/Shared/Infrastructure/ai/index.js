// src/shared/infrastructure/ai/index.js

import { OpenAIClient } from "./OpenAIClient.js";
import { ToolRegistry } from "./ToolRegistry.js";
import { ToolExecutor } from "./ToolExecutor.js";
import { LLMCommandInterceptor } from "./command_interceptor.js";

export function initLLM({
  openAIConfig,
  featureFlags = {},
  useCases = {},
  uowFactory,
  logger,
  telemetry,
}) {

  /* -------------------------------------------------------------------------- */
  /* Tool Registry                                                               */
  /* -------------------------------------------------------------------------- */

  const toolRegistry = new ToolRegistry({
    featureFlags,
    useCases,
    logger,
  });

  /* -------------------------------------------------------------------------- */
  /* Tool Executor                                                               */
  /* -------------------------------------------------------------------------- */

  const toolExecutor = new ToolExecutor({
    uowFactory,
    useCases,
    logger,
  });

  /* -------------------------------------------------------------------------- */
  /* OpenAI Client (optional)                                                    */
  /* -------------------------------------------------------------------------- */

  let openAIClient = null;

  if (openAIConfig?.apiKey) {

    openAIClient = new OpenAIClient(openAIConfig);

  } else {

    logger?.warn(
      "OPENAI_API_KEY not configured. LLM functionality is disabled."
    );

  }

  /* -------------------------------------------------------------------------- */
  /* Command Interceptor                                                        */
  /* -------------------------------------------------------------------------- */

  const commandInterceptor = new LLMCommandInterceptor({
    useCaseRegistry: toolExecutor.handlers,
    toolDefinitions: toolRegistry.listAll(),
    featureFlags,
    telemetryEngine: telemetry,
  });

  /* -------------------------------------------------------------------------- */
  /* Public API                                                                  */
  /* -------------------------------------------------------------------------- */

  return {

    openAIClient,

    toolRegistry,

    toolExecutor,

    commandInterceptor,

  };

}