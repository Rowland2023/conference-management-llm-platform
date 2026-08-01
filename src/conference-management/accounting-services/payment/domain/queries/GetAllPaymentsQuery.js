// src/conference-management/accounting-services/payment/domain/queries/GetAllPaymentsQuery.js

import { ValidationError } from "../errors/PaymentErrors.js";

export class GetAllPaymentsQuery {
  /**
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {Object|null} [params.currentUser]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string|null} [params.status]
   * @param {string|null} [params.contextType]
   * @param {string|null} [params.contextId]
   * @param {Date|string|null} [params.from]
   * @param {Date|string|null} [params.to]
   * @param {string} [params.sortBy="createdAt"]
   * @param {"asc"|"desc"} [params.sortOrder="desc"]
   */
  constructor({
    tenantId,
    currentUser = null,
    page = 1,
    limit = 20,
    status = null,
    contextType = null,
    contextId = null,
    from = null,
    to = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    if (!tenantId || typeof tenantId !== "string") {
      throw new ValidationError("Tenant ID is required.");
    }

    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError("Page must be a positive integer.");
    }

    if (!Number.isInteger(limit) || limit < 1) {
      throw new ValidationError("Limit must be a positive integer.");
    }

    if (!["asc", "desc"].includes(sortOrder.toLowerCase())) {
      throw new ValidationError(
        "Sort order must be either 'asc' or 'desc'."
      );
    }

    this.tenantId = tenantId;
    this.currentUser = currentUser;

    this.page = page;
    this.limit = limit;
    this.offset = (page - 1) * limit;

    this.status = status;
    this.contextType = contextType;
    this.contextId = contextId;
    this.from = from;
    this.to = to;

    this.sortBy = sortBy;
    this.sortOrder = sortOrder.toLowerCase();

    Object.freeze(this);
  }
}