// src/bootstrap/modules.js

import { createConferenceEventScheduleSubModule } 
    from "../conference-management/event-schedule/index.js";

import { createConferenceRegistrationSubModule } 
    from "../conference-management/registration/index.js";

import { createAccountingServicesModule } 
    from "../conference-management/accounting-services/index.js";

import { createTicketModule } 
    from "../conference-management/ticket/index.js";


export function bootstrapModules(shared) {


    const eventScheduleModule =
        createConferenceEventScheduleSubModule(shared);


    const registrationModule =
        createConferenceRegistrationSubModule(shared);


    const accountingModule =
        createAccountingServicesModule(shared);


    const ticketModule =
        createTicketModule(shared);



    const modules = [
        eventScheduleModule,
        registrationModule,
        accountingModule,
        ticketModule,
    ];



    shared.logger?.info(
        {
            modules: [
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