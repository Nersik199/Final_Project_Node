import Products from '../models/Products.js';
import ProductCategories from '../models/ProductCategories.js';
import Photo from '../models/Photo.js';
import Stores from '../models/Stores.js';
import Users from '../models/Users.js';
import Reviews from '../models/Reviews.js';
import Comments from '../models/Comments.js';
import Payments from '../models/Payments.js';
import { Op, Sequelize } from 'sequelize';

const calculatePagination = (page, limit, total) => {
	const maxPageCount = Math.ceil(total / limit);
	const offset = (page - 1) * limit;
	return { maxPageCount, offset };
};

const handleErrorResponse = (res, status, message, error = null) => {
	console.error(message, error);
	return res.status(status).json({ message, error: error?.message });
};

export default {
	async getStores(req, res) {
		try {
			const total = await Stores.count();
			const { page = 1, limit = 10 } = req.query;

			const { maxPageCount, offset } = calculatePagination(page, limit, total);

			if (page > maxPageCount) {
				return res.status(404).json({ message: 'Product does not exist' });
			}

			const stores = await Stores.findAll({
				attributes: ['id', 'name', 'location'],
				include: [
					{
						model: Photo,
						as: 'storeLogo',
						attributes: ['path'],
					},
				],
			});
			res.status(200).json({
				stores,
				message: 'Stores fetched successfully',
			});

			if (!stores) {
				return res.status(404).json({ message: 'No stores found' });
			}
		} catch (error) {
			return handleErrorResponse(res, 500, 'Error fetching products', error);
		}
	},

	async getProducts(req, res) {
		try {
			const {
				minPrice = 0,
				maxPrice = 1000000,
				page = 1,
				limit = 10,
			} = req.query;
			const total = await Products.count({
				where: {
					price: {
						[Op.gte]: +minPrice,
						[Op.lte]: +maxPrice,
					},
				},
			});

			const { maxPageCount, offset } = calculatePagination(page, limit, total);

			if (page > maxPageCount) {
				return res.status(404).json({ message: 'Product does not exist' });
			}

			const productsList = await Products.findAll({
				where: {
					price: {
						[Op.gte]: +minPrice,
						[Op.lte]: +maxPrice,
					},
				},
				include: [
					{
						model: Photo,
						as: 'productImage',
						attributes: ['id', 'path'],
					},
					{
						model: Stores,
						as: 'store',
						attributes: ['name'],
					},
				],
				order: [['createdAt', 'DESC']],
				limit: +limit,
				offset,
			});

			if (productsList.length === 0) {
				return res.status(404).json({ message: 'No products found' });
			}

			return res.status(200).json({
				message: 'Products retrieved successfully',
				products: productsList,
				total,
				currentPage: page,
				maxPageCount,
			});
		} catch (error) {
			return handleErrorResponse(res, 500, 'Error fetching products', error);
		}
	},

	async getProductById(req, res) {
		try {
			const { id } = req.params;
			const {
				limitReviews = 10,
				pageReviews = 1,
				limitComments = 10,
				pageComments = 1,
			} = req.query;

			const reviewsTotal = await Reviews.count({ where: { productId: id } });

			const { maxPageCountReviews, offsetReviews } = calculatePagination(
				pageReviews,
				limitReviews,
				reviewsTotal
			);

			if (pageReviews > maxPageCountReviews) {
				return res.status(404).json({ message: 'Review does not exist' });
			}

			if (!id) {
				return res.status(400).json({ message: 'Product id is required' });
			}

			const product = await Products.findOne({
				where: { id },
				include: [
					{
						model: Photo,
						as: 'productImage',
						attributes: ['id', 'path'],
					},
					{
						model: Stores,
						as: 'store',
						attributes: ['name'],
					},
					{
						model: Reviews,
						where: { productId: id },
						attributes: ['id', 'rating', 'review'],
						include: [
							{
								model: Users,
								attributes: ['firstName', 'lastName', 'email'],
							},
							{
								model: Comments,
								attributes: ['id', 'comment'],
								include: [
									{
										model: Users,
										attributes: ['firstName', 'lastName', 'email'],
									},
								],
								limit: +limitComments,
								offset: (pageComments - 1) * limitComments,
							},
						],
						order: [['createdAt', 'DESC']],
						limit: +limitReviews,
						offset: offsetReviews,
					},
				],
			});

			if (!product) {
				return res.status(404).json({ message: 'Product not found' });
			}

			const result = {
				product: {
					id: product.id,
					name: product.name,
					description: product.description,
					price: product.price,
					size: product.size,
					images: product.productImage
						? product.productImage.map(image => ({
								id: image.id,
								url: image.path,
						  }))
						: [],
					store: product.store
						? {
								id: product.store.id,
								name: product.store.name,
						  }
						: null,
				},
				information: product.reviews
					? product.reviews.map(review => ({
							review: {
								id: review.id,
								rating: review.rating,
								review: review.review,
								firstName: review.user.firstName,
								lastName: review.user.lastName,
								email: review.user.email,
							},
							comments: review.comments
								? review.comments.map(comment => ({
										id: comment.id,
										comment: comment.comment,
										firstName: comment.user.firstName,
										lastName: comment.user.lastName,
										email: comment.user.email,
								  }))
								: [],
					  }))
					: [],
			};

			res.status(200).json({
				result,
				reviewsTotal,
				pageReviews,
				pageComments,
				maxPageCountReviews,
				message: 'Product fetched successfully',
			});
		} catch (error) {
			return handleErrorResponse(res, 500, 'Error fetching product', error);
		}
	},

	async getProductsByCategory(req, res) {
		try {
			const { categoryId } = req.params;
			const page = +req.query.page || 1;
			const limit = +req.query.limit || 10;
			const { minPrice = 0, maxPrice = 1000000 } = req.query;

			const category = await ProductCategories.findOne({
				where: { categoryId },
			});
			if (!category) {
				return res.status(404).json({ message: 'Category not found' });
			}

			const total = await ProductCategories.count({ where: { categoryId } });
			const { maxPageCount, offset } = calculatePagination(page, limit, total);

			if (page > maxPageCount) {
				return res.status(404).json({ message: 'Page not found' });
			}

			const productsList = await ProductCategories.findAll({
				where: { categoryId },
				limit,
				offset,
				attributes: ['categoryId'],
				include: [
					{
						model: Products,
						where: {
							price: {
								[Op.gte]: minPrice,
								[Op.lte]: maxPrice,
							},
						},
						order: [['createdAt', 'DESC']],
						include: [
							{
								model: Photo,
								as: 'productImage',
								attributes: ['path', 'id'],
							},
							{
								model: Stores,
								as: 'store',
								attributes: ['name'],
							},
						],
					},
				],
			});

			if (productsList.length === 0) {
				return res
					.status(404)
					.json({ message: 'No products found for this category' });
			}

			return res.status(200).json({
				message: 'Products retrieved successfully',
				products: productsList,
			});
		} catch (error) {
			return handleErrorResponse(
				res,
				500,
				'Error fetching products by category',
				error
			);
		}
	},

	async getStoreAndProduct(req, res) {
		try {
			const { storeId } = req.params;
			const { minPrice = 0, maxPrice = 1000000 } = req.query;
			const page = +req.query.page || 1;
			const limit = +req.query.limit || 10;

			const store = await Stores.findOne({ where: { id: storeId } });
			if (!store) {
				return res.status(404).json({ message: 'Store not found' });
			}

			const total = await Products.count({
				where: {
					storeId,
					price: {
						[Op.gte]: +minPrice,
						[Op.lte]: +maxPrice,
					},
				},
			});
			const { maxPageCount, offset } = calculatePagination(page, limit, total);

			if (page > maxPageCount) {
				return res.status(404).json({ message: 'Page not found' });
			}

			const productsList = await Products.findAll({
				where: {
					storeId,
					price: {
						[Op.gte]: +minPrice,
						[Op.lte]: +maxPrice,
					},
				},
				limit,
				offset,
				include: [
					{
						model: Photo,
						as: 'productImage',
						attributes: ['id', 'path'],
					},
				],
				order: [['createdAt', 'DESC']],
			});

			return res.status(200).json({
				message: 'Products and store details retrieved successfully',
				store: { name: store.name, location: store.location },
				products: productsList,
				total,
				currentPage: page,
				maxPageCount,
			});
		} catch (error) {
			return handleErrorResponse(
				res,
				500,
				'Error fetching store and products',
				error
			);
		}
	},

	async searchProduct(req, res) {
		try {
			const { s } = req.query;
			const page = +req.query.page || 1;
			const limit = +req.query.limit || 10;

			if (!s) {
				return res.status(400).json({ message: 'Search query is required' });
			}

			const total = await Products.count({
				where: { name: { [Op.like]: `%${s}%` } },
			});

			const { maxPageCount, offset } = calculatePagination(page, limit, total);

			if (page > maxPageCount) {
				return res.status(404).json({ message: 'Page not found' });
			}

			const productsList = await Products.findAll({
				where: { name: { [Op.like]: `%${s}%` } },
				limit,
				offset,
				include: [
					{
						model: Photo,
						as: 'productImage',
						attributes: ['id', 'path'],
					},
					{
						model: Stores,
						as: 'store',
						attributes: ['name'],
					},
				],
				order: [['createdAt', 'DESC']],
			});

			if (productsList.length === 0) {
				return res
					.status(404)
					.json({ message: 'No products found matching your query' });
			}

			return res.status(200).json({
				message: 'Search results retrieved successfully',
				products: productsList,
			});
		} catch (error) {
			return handleErrorResponse(res, 500, 'Error searching products', error);
		}
	},

	async getMostPopularProducts(req, res) {
		try {
			const popularProducts = await Payments.findAll({
				attributes: [
					'productId',
					[Sequelize.fn('COUNT', Sequelize.col('productId')), 'purchaseCount'],
				],
				group: ['productId'],
				order: [[Sequelize.fn('COUNT', Sequelize.col('productId')), 'DESC']],
				limit: 10,
			});

			const productIds = popularProducts.map(item => item.productId);

			const productsWithImages = await Products.findAll({
				where: {
					id: productIds,
				},
				include: [
					{
						model: Photo,
						as: 'productImage',
						attributes: ['path'],
					},
				],
			});

			const formattedProducts = popularProducts.map(popular => {
				const product = productsWithImages.find(
					p => p.id === popular.productId
				);
				return {
					product: {
						purchaseCount: popular.dataValues.purchaseCount,
						id: product.id,
						name: product.name,
						size: product.size,
						price: product.price,
						description: product.description,
						brandName: product.brandName,
						productImage:
							product.productImage.length > 0
								? product.productImage[0].path
								: null,
					},
				};
			});

			if (formattedProducts.length === 0) {
				return res.json({ message: 'No popular products' });
			}

			res.json({ data: formattedProducts });
		} catch (error) {
			console.error(error);
			res.status(500).json({ success: false, message: error.message });
		}
	},
};
