// src/bootstrap/modules.js

import { createConferenceEventScheduleSubModule } from "../conference-management/event-schedule/index.js";
import { createConferenceRegistrationSubModule } from "../conference-management/registration/index.js";
import { createAccountingServicesModule } from "../conference-management/accounting-services/index.js";
import { createTicketModule } from "../conference-management/ticket/index.js";

export function bootstrapModules(shared) {
    console.log("Shared dependencies:", Object.keys(shared));
    const eventModule =
        createConferenceEventScheduleSubModule(shared);

    const registrationModule =
        createConferenceRegistrationSubModule(shared);

    const accountingModule =
        createAccountingServicesModule(shared);

    const ticketModule =
        createTicketModule(shared);

    return [
        eventModule,
        registrationModule,
        accountingModule,
        ticketModule,
    ];
}