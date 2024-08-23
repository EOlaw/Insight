// models/wikiPageModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wikiPageSchema = new Schema({
    repository: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
});

const WikiPage = mongoose.model('WikiPage', wikiPageSchema);
module.exports = WikiPage;
