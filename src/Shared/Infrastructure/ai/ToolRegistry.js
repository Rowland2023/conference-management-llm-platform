// src/shared/infrastructure/ai/ToolRegistry.js

import { z } from "zod";

export class ToolRegistry {

  constructor({
    featureFlags = {},
    useCases = {},
    logger,
  }) {

    this.flags = featureFlags;
    this.useCases = useCases;
    this.logger = logger;

    this.tools = new Map();

    this.registerDefaults();
  }

  registerDefaults() {

    /*
    |--------------------------------------------------------------------------
    | Event
    |--------------------------------------------------------------------------
    */

    if (this.useCases.createEventUseCase) {

      this.register({

        name: "create_event",

        description:
          "Create a new conference event.",

        zodSchema: z.object({

          title: z.string(),

          startsAt: z.string(),

          endsAt: z.string(),

          venueId: z.string()

        }),

        handler:
          this.useCases
            .createEventUseCase
            .execute
            .bind(this.useCases.createEventUseCase)

      });

    }

    if (this.useCases.cancelEventUseCase) {

      this.register({

        name: "cancel_event",

        description:
          "Cancel an existing conference event.",

        zodSchema: z.object({

          eventId: z.string().uuid(),

          reason: z.string()

        }),

        handler:
          this.useCases
            .cancelEventUseCase
            .execute
            .bind(this.useCases.cancelEventUseCase)

      });

    }

    /*
    |--------------------------------------------------------------------------
    | Registration
    |--------------------------------------------------------------------------
    */

    if (this.useCases.createRegistrationUseCase) {

      this.register({

        name: "create_registration",

        description:
          "Register an attendee.",

        zodSchema: z.object({

          conferenceId: z.string().uuid(),

          userId: z.string().uuid(),

          ticketTier: z.string()

        }),

        handler:
          this.useCases
            .createRegistrationUseCase
            .execute
            .bind(this.useCases.createRegistrationUseCase)

      });

    }

    /*
    |--------------------------------------------------------------------------
    | Ticket
    |--------------------------------------------------------------------------
    */

    if (this.useCases.ticketCommandService) {

      this.register({

        name: "reserve_ticket",

        description:
          "Reserve a conference ticket.",

        zodSchema: z.object({

          ticketId: z.string().uuid(),

          quantity: z.number().int().positive()

        }),

        handler:
          this.useCases
            .ticketCommandService
            .reserveTicket
            .bind(this.useCases.ticketCommandService)

      });

    }

    /*
    |--------------------------------------------------------------------------
    | Accounting
    |--------------------------------------------------------------------------
    */

    if (this.useCases.postJournalEntryUseCase) {

      this.register({

        name: "post_journal_entry",

        description:
          "Post a double-entry journal entry.",

        zodSchema: z.object({

          debitAccountId: z.string(),

          creditAccountId: z.string(),

          amount: z.number().positive()

        }),

        handler:
          this.useCases
            .postJournalEntryUseCase
            .execute
            .bind(this.useCases.postJournalEntryUseCase)

      });

    }

  }

  register(definition) {

    if (this.tools.has(definition.name)) {

      throw new Error(
        `Tool '${definition.name}' already registered.`
      );

    }

    this.tools.set(
      definition.name,
      definition
    );
  }

  getHandler(name) {

    return this.tools.get(name)?.handler;

  }

  getZodSchema(name) {

    return this.tools.get(name)?.zodSchema;

  }

  listAll() {

    return [...this.tools.values()];

  }

  getOpenAITools() {

    return [...this.tools.values()].map(tool => ({

      type: "function",

      function: {

        name: tool.name,

        description: tool.description,

        // Replace with zod-to-json-schema if desired
        parameters: {}

      }

    }));

  }

}