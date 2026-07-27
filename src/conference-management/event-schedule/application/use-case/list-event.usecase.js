export class ListEventsUseCase {
    constructor({ eventRepository }) {
        this.eventRepository = eventRepository;
    }

    async execute(filters) {
        return await this.eventRepository.findAll(filters);
    }
}