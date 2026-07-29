import { Router } from "express";

export function createLLMRouter({
  llmController,
  authenticate,
}) {
  if (!llmController) {
    throw new Error(
      "createLLMRouter requires llmController."
    );
  }

  const router = Router();

  if (authenticate) {
    router.post(
      "/chat",
      authenticate,
      llmController.chat
    );
  } else {
    router.post(
      "/chat",
      llmController.chat
    );
  }

  return router;
}