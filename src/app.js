// src/app.js

import express from "express";

import { bootstrapInfrastructure } from "./bootstrap/infrastructure.js";
import { bootstrapModules } from "./bootstrap/modules.js";
import { bootstrapRoutes } from "./bootstrap/routes.js";
import { bootstrapLifecycle } from "./bootstrap/lifecycle.js";

import db from "./cross-cutting/database/knex.js";
import { config } from "./config/index.js";

import { PinoLogger } from "./cross-cutting/logging/PinoLogger.js";


const defaultLogger = new PinoLogger();


export async function createApp({
    logger = defaultLogger,
} = {}) {


    console.log(
        "APP LOGGER:",
        logger.constructor.name,
        typeof logger.child
    );


    const app = express();

    app.use(express.json({
        limit: "1mb",
    }));


    const infrastructure =
        bootstrapInfrastructure({
            db,
            config,
            logger,
        });

    
    const modules =
        await bootstrapModules({
            ...infrastructure,
            logger,
        });


    bootstrapRoutes({
        app,
        modules,
        infrastructure,
        logger,
    });


    const lifecycle =
        bootstrapLifecycle({
            modules,
            infrastructure,
            logger,
        });


    return {

        app,

        start: lifecycle.start,

        stop: lifecycle.stop,

    };

}