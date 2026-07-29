export class TopicResolver {
    constructor(mapping = {}) {
        this.mapping = mapping;
    }

    resolve(eventName) {
        const topic = this.mapping[eventName];

        if (!topic) {
            throw new Error(
                `No Kafka topic configured for event '${eventName}'.`
            );
        }

        return topic;
    }
}