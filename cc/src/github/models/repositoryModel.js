const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const repositorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['read', 'write', 'admin'],
            default: 'read'
        }
    }],
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'private'
    },
    default_branch: {
        type: String,
        default: 'main'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    last_commit: {
        type: Schema.Types.ObjectId,
        ref: 'Commit'
    },
    size: {
        type: Number,
        default: 0
    },
    fork_count: {
        type: Number,
        default: 0
    },
    star_count: {
        type: Number,
        default: 0
    }
});

repositorySchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

repositorySchema.index({ owner: 1, name: 1 }, { unique: true });

const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;