export class EventController {

    constructor({
        createEventUseCase,
        getEventUseCase,
        listEventsUseCase,
        rescheduleEventUseCase,
        cancelEventUseCase,
        logger,
    }) {

        this.createEventUseCase =
            createEventUseCase;

        this.getEventUseCase =
            getEventUseCase;

        this.listEventsUseCase =
            listEventsUseCase;

        this.rescheduleEventUseCase =
            rescheduleEventUseCase;

        this.cancelEventUseCase =
            cancelEventUseCase;


        this.logger =
            logger.child({
                context: "EventController"
            });


        this.createEvent =
            this.createEvent.bind(this);

        this.listEvents =
            this.listEvents.bind(this);

        this.getEventById =
            this.getEventById.bind(this);

        this.rescheduleEvent =
            this.rescheduleEvent.bind(this);

        this.cancelEvent =
            this.cancelEvent.bind(this);
    }


    async createEvent(req, res, next) {
        try {

            const result =
                await this.createEventUseCase.execute(
                    req.body
                );


            return res.status(201).json({
                success: true,
                data: result
            });

        } catch(error) {

            next(error);

        }
    }


    async listEvents(req,res,next) {

        try {

            const result =
                await this.listEventsUseCase.execute(
                    req.query
                );


            return res.json({
                success:true,
                data:result
            });

        } catch(error) {

            next(error);

        }

    }


    async getEventById(req,res,next) {

        try {

            const result =
                await this.getEventUseCase.execute({
                    id:req.params.id
                });


            return res.json({
                success:true,
                data:result
            });


        } catch(error) {

            next(error);

        }

    }


    async rescheduleEvent(req,res,next) {

        try {

            const result =
                await this.rescheduleEventUseCase.execute({

                    id:req.params.id,

                    ...req.body

                });


            return res.json({
                success:true,
                data:result
            });


        } catch(error) {

            next(error);

        }

    }


    async cancelEvent(req,res,next) {

        try {

            const result =
                await this.cancelEventUseCase.execute({

                    id:req.params.id,

                    ...req.body

                });


            return res.json({
                success:true,
                data:result
            });


        } catch(error) {

            next(error);

        }

    }

}