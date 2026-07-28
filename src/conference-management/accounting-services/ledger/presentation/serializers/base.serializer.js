// src/modules/accounting/presentation/serializers/base.serializer.js

class BaseSerializer {
  static toIso(value) {
    if (!value) return null;

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString();
  }

  static toMoneyString(value) {
    if (value == null) return "0";

    // Money VO
    if (
      typeof value === "object" &&
      "amount" in value
    ) {
      return value.amount.toString();
    }

    // BigInt, Number, String
    return value.toString();
  }

  static serializeMany(items = [], serializer) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map(serializer)
      .filter(Boolean);
  }
}

export default BaseSerializer;