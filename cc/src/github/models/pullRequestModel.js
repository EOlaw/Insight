// models/pullRequestModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pullRequestSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    sourceBranch: { type: String, required: true },
    targetBranch: { type: String, required: true },
    repository: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['open', 'closed', 'merged'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const PullRequest = mongoose.model('PullRequest', pullRequestSchema);
module.exports = PullRequest;
