/**
 * @file ConferenceRepository.js
 * @description Repository abstraction for Conference aggregate persistence.
 */

export class ConferenceRepository {
  constructor({ db }) {
    this.db = db;
  }

  async findById(id) {
    throw new Error(
      '[ConferenceRepository] findById() not implemented'
    );
  }

  async findByIdWithLock(id, transaction) {
    throw new Error(
      '[ConferenceRepository] findByIdWithLock() not implemented'
    );
  }

  async save(conference, transaction = null) {
    throw new Error(
      '[ConferenceRepository] save() not implemented'
    );
  }
}