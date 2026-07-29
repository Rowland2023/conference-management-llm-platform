import {
  ValidationError,
  NotFoundError,
} from "../../../domain/error/DomainErrors.js";

export class LLMController {
  constructor({
    commandInterceptor,
    authService,
    logger,
  }) {
    if (!commandInterceptor) {
      throw new Error("LLMController requires commandInterceptor.");
    }

    if (!authService) {
      throw new Error("LLMController requires authService.");
    }

    this.commandInterceptor = commandInterceptor;
    this.authService = authService;
    this.logger = logger;

    this.chat = this.chat.bind(this);
  }

  async chat(req, res, next) {
    const abortController = new AbortController();

    let heartbeat;

    const cleanup = () => {
      clearInterval(heartbeat);
      abortController.abort();
    };

    req.once("close", cleanup);

    try {
      const { message } = req.body ?? {};

      if (!message?.trim()) {
        throw new ValidationError("message is required.");
      }

      const user = await this.authService.getUser(req);

      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      res.flushHeaders();

      heartbeat = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": ping\n\n");
        }
      }, 15000);

      await this.commandInterceptor.process(
        {
          message: message.trim(),
        },
        {
          id: user.id,
          tenantId: user.tenantId,
          roles: user.roles ?? [],
          timezone: user.timezone ?? "UTC",
          signal: abortController.signal,
          onToken(token) {
            if (!res.writableEnded) {
              res.write(
                `data: ${JSON.stringify({
                  token,
                })}\n\n`
              );
            }
          },
        }
      );

      if (!res.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } catch (err) {
      if (
        err.name === "AbortError" ||
        abortController.signal.aborted
      ) {
        return;
      }

      this.logger?.error?.(err);

      if (!res.headersSent) {
        return next(err);
      }

      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error: err.message,
          })}\n\n`
        );

        res.end();
      }
    } finally {
      cleanup();
    }
  }
}