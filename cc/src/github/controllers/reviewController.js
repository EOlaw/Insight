// controllers/reviewController.js
const Review = require('../models/reviewModel');
const PullRequest = require('../models/pullRequestModel');

const reviewController = {
    createReview: async (req, res) => {
        try {
            const { pullRequestId } = req.params;
            const reviewer = req.user.id;
            const { status, comments } = req.body;

            const pullRequest = await PullRequest.findById(pullRequestId);
            if (!pullRequest) {
                return res.status(404).json({ error: 'Pull request not found' });
            }

            const review = new Review({
                pullRequest: pullRequestId,
                reviewer,
                status,
                comments
            });

            await review.save();

            // Update pull request reviewers
            if (!pullRequest.reviewers.includes(reviewer)) {
                pullRequest.reviewers.push(reviewer);
                await pullRequest.save();
            }

            res.status(201).json({ message: 'Review created successfully', review });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create review' });
        }
    },

    getReviews: async (req, res) => {
        try {
            const { pullRequestId } = req.params;
            const reviews = await Review.find({ pullRequest: pullRequestId })
                .populate('reviewer', 'username');
            res.status(200).json(reviews);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch reviews' });
        }
    },

    updateReview: async (req, res) => {
        try {
            const { reviewId } = req.params;
            const { status, comments } = req.body;

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            review.status = status;
            review.comments = comments;
            review.updatedAt = Date.now();

            await review.save();
            res.status(200).json({ message: 'Review updated successfully', review });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update review' });
        }
    }
};

module.exports = reviewController;