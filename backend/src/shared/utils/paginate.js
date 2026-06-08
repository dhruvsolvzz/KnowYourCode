'use strict';

/**
 * Build pagination meta for list endpoints.
 * @param {number} total - total documents
 * @param {number} page  - current page (1-indexed)
 * @param {number} limit - items per page
 */
const paginate = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse and validate pagination query params with safe defaults.
 */
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = { paginate, parsePaginationParams };
