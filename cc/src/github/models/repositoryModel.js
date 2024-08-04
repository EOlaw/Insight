const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a repository
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
        ref: 'User', // Assuming you have a User model
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Update the 'updated_at' field before saving the document
repositorySchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

// Create the model based on the schema
const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;
