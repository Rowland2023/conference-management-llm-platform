// src/bootstrap/modules.js

import { createConferenceEventScheduleSubModule } 
    from "../conference-management/event-schedule/index.js";

import { createConferenceRegistrationSubModule } 
    from "../conference-management/registration/index.js";

import { createAccountingServicesModule } 
    from "../conference-management/accounting-services/index.js";

import { createTicketModule } 
    from "../conference-management/ticket/index.js";

import { createAuthenticationModule }
    from "../conference-management/authentication/index.js";

export function boostrapModules(shared) {

    const authenticationModule =
        createAuthenticationModule(shared);

    const eventScheduleModule =
        createConferenceEventScheduleSubModule(shared);

    const registrationModule =
        createConferenceRegistrationSubModule(shared);

    const accountingModule =
        createAccountingServicesModule(shared);

    const ticketModule =
        createTicketModule(shared);

    const modules = [

        authenticationModule,

        eventScheduleModule,

        registrationModule,

        accountingModule,

        ticketModule,

    ];

    shared.logger?.info(
        {
            modules: [
                "authentication",
                "eventSchedule",
                "registration",
                "accounting",
                "ticket",
            ],
        },
        "Conference management modules initialized"
    );

    return modules;
}