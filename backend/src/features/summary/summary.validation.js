'use strict';
const Joi = require('joi');
const asyncHandler = require('../../shared/utils/asyncHandler');
const AppError = require('../../shared/utils/AppError');

const validateGenerateSummary = asyncHandler(async (req, res, next) => {
  const schema = Joi.object({});
  await schema.validateAsync(req.body, { abortEarly: false });
  next();
});

module.exports = { validateGenerateSummary };
