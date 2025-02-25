import Joi from 'joi';

export default {
	createProduct: Joi.object({
		name: Joi.string().required(),
		size: Joi.string().required(),
		price: Joi.number().required().positive(),
		description: Joi.string().required(),
		brandName: Joi.string().required(),
		productImage: Joi.string().optional(),
		quantity: Joi.number().required(),
	}),

	updateProduct: Joi.object({
		imageId: Joi.string().optional(),
		name: Joi.string().required(),
		size: Joi.string().required(),
		price: Joi.number().required().positive(),
		description: Joi.string().required(),
		brandName: Joi.string().required(),
		quantity: Joi.number().required(),
	}),
};
