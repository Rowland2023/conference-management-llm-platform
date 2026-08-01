/**
 * @file src/index.js
 *
 * Application Process Bootstrap
 *
 * Responsibilities:
 * - Create application
 * - Start HTTP server
 * - Handle process lifecycle
 *
 * Does NOT know:
 * - Database details
 * - Kafka details
 * - Repository details
 * - Module wiring
 */

import "dotenv/config";

import { createApp } from "./app.js";


const PORT =
    Number(process.env.PORT ?? 3000);


const SHUTDOWN_TIMEOUT =
    15000;



async function bootstrap() {

    let application = null;

    let server = null;

    let shuttingDown = false;



    async function shutdown(signal, error) {


        if (shuttingDown) {
            return;
        }


        shuttingDown = true;


        const logger =
            application?.logger ?? console;



        logger.warn?.(
            {
                signal,
                error,
            },
            "Graceful shutdown initiated"
        );



        const forceTimer =
            setTimeout(
                () => {

                    logger.error?.(
                        "Shutdown timeout exceeded"
                    );

                    process.exit(1);

                },
                SHUTDOWN_TIMEOUT
            );


        forceTimer.unref?.();



        try {


            //
            // Stop HTTP server
            //
            if (server) {

                await new Promise(
                    resolve => {

                        server.close(
                            resolve
                        );

                    }
                );

            }



            //
            // Stop application lifecycle
            //
            await application?.stop?.();



            clearTimeout(forceTimer);



            logger.info?.(
                "Application shutdown completed"
            );



            process.exit(
                error ? 1 : 0
            );



        } catch(shutdownError) {


            clearTimeout(forceTimer);


            logger.error?.(
                {
                    shutdownError,
                },
                "Application shutdown failed"
            );


            process.exit(1);

        }

    }




    try {


        //
        // Create application
        //
        application =
            await createApp();



        const {
            app,
            start,
            logger = console,
        } =
            application;



        application.logger =
            logger;



        //
        // Start application lifecycle
        //
        await start?.();



        //
        // Start HTTP server
        //
        server =
            app.listen(
                PORT,
                () => {

                    logger.info?.(
                        {
                            port: PORT,
                        },
                        "Conference Management API started"
                    );

                }
            );



        server.on(
            "error",
            error => {

                logger.error?.(
                    {
                        error,
                    },
                    "HTTP server failure"
                );


                shutdown(
                    "server_error",
                    error
                );

            }
        );



        //
        // Process lifecycle signals
        //
        process.once(
            "SIGTERM",
            () => shutdown("SIGTERM")
        );


        process.once(
            "SIGINT",
            () => shutdown("SIGINT")
        );


        process.once(
            "uncaughtException",
            error =>
                shutdown(
                    "uncaughtException",
                    error
                )
        );


        process.once(
            "unhandledRejection",
            reason =>
                shutdown(
                    "unhandledRejection",
                    reason
                )
        );



    } catch(error) {


        console.error(
            "Fatal bootstrap failure:",
            error
        );


        await application?.stop?.()
            .catch(() => {});


        process.exit(1);

    }

}



bootstrap();