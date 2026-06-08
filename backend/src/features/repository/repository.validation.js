'use strict';
const Joi = require('joi');

const addRepositorySchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid GitHub repository URL',
    'any.required': 'Repository URL is required',
  }),
  source: Joi.string().valid('github_oauth', 'public_url').default('public_url'),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      },
    });
  }
  req.body = value;
  next();
};

module.exports = {
  validateAddRepository: validate(addRepositorySchema),
};
