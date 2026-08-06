export class CommandResult {

    constructor({

        data,

        events = [],

    }) {

        this.data = data;

        this.events = events;

        Object.freeze(this);

    }

    static success({

        data,

        events = [],

    }) {

        return new CommandResult({

            data,

            events,

        });

    }

}