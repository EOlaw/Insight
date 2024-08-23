// models/webhookModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const webhookSchema = new Schema({
    repository: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
    url: { type: String, required: true },
    events: [{ type: String }],
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Webhook = mongoose.model('Webhook', webhookSchema);
module.exports = Webhook;