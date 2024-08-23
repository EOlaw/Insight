const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const issueSchema = new Schema({
    repository: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
    title: { type: String, required: true },
    description: String,
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    labels: [String],
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    comments: [{
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    closedAt: { type: Date }
});

const Issue = mongoose.model('Issue', issueSchema);
module.exports = Issue;