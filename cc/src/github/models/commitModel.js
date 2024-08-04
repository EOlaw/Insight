const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a commit
const commitSchema = new Schema({
    repository: {
        type: Schema.Types.ObjectId,
        ref: 'Repository', // Reference to the Repository model
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
    message: {
        type: String,
        required: true
    },
    changes: [{
        file: String,
        changes: String
    }],
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Create the model based on the schema
const Commit = mongoose.model('Commit', commitSchema);

module.exports = Commit;
