import Comments from '../models/Comments.js';
import Users from '../models/Users.js';
import Reviews from '../models/Reviews.js';
import Products from '../models/Products.js';

export default {
	async addComments(req, res) {
		try {
			const { reviewId } = req.params;
			const { id } = req.user;
			const { comment } = req.body;

			const review = await Reviews.findOne({
				where: { id: reviewId },
			});

			if (!review) {
				return res.status(404).json({
					message: 'Review not found ',
				});
			}

			const newComment = await Comments.create({
				reviewId: reviewId,
				userId: id,
				comment: comment,
			});

			res.status(200).json({
				message: 'Comment added successfully',
				comment: newComment,
			});
		} catch (err) {
			console.error('Server Error:', err);
			res.status(500).send({
				message: 'Server error',
				error: err.message,
			});
		}
	},
	async getComments(req, res) {
		try {
			const { reviewId } = req.params;
			const total = await Products.count();
			const { limit = 5, page = 1 } = req.query;
			let offset = (page - 1) * limit;

			const review = await Reviews.findOne({
				where: { id: reviewId },
			});

			if (!review) {
				return res.status(404).json({
					message: 'Review not found ,',
				});
			}

			const comments = await Comments.findAll({
				where: { reviewId },
				include: [
					{
						model: Users,
						attributes: ['firstName', 'lastName'],
					},
				],
				order: [['createdAt', 'DESC']],
				limit,
				offset,
			});

			if (comments.length > 0) {
				return res.status(200).json({
					message: 'Review and its comments',
					comments: comments,
				});
			} else {
				return res.status(200).json({
					message: 'No comments found for this review',
					comments: comments || [],
				});
			}
		} catch (err) {
			console.error('Server Error:', err);
			res.status(500).json({
				message: 'Server error',
				error: err.message,
			});
		}
	},
};
