const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commitSchema = new Schema({
    repository: {
        type: Schema.Types.ObjectId,
        ref: 'Repository',
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    changes: [{
        file: String,
        status: {
            type: String,
            enum: ['added', 'modified', 'deleted']
        },
        additions: Number,
        deletions: Number
    }],
    hash: {
        type: String,
        required: true,
        unique: true
    },
    parentHash: {
        type: String,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    branch: {
        type: String,
        default: 'main'
    }
});

commitSchema.index({ repository: 1, hash: 1 }, { unique: true });

const Commit = mongoose.model('Commit', commitSchema);

module.exports = Commit;