// controllers/webhookController.js
const Webhook = require('../models/webhookModel');
const axios = require('axios');

const webhookController = {
    createWebhook: async (req, res) => {
        try {
            const { repositoryId, url, events } = req.body;

            const webhook = new Webhook({
                repository: repositoryId,
                url,
                events
            });

            await webhook.save();
            res.status(201).json({ message: 'Webhook created successfully', webhook });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create webhook' });
        }
    },

    getWebhooks: async (req, res) => {
        try {
            const { repositoryId } = req.params;
            const webhooks = await Webhook.find({ repository: repositoryId });
            res.status(200).json(webhooks);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch webhooks' });
        }
    },

    triggerWebhook: async (repositoryId, event, payload) => {
        try {
            const webhooks = await Webhook.find({ repository: repositoryId, events: event, active: true });

            for (const webhook of webhooks) {
                try {
                    await axios.post(webhook.url, {
                        event,
                        payload
                    });
                } catch (error) {
                    console.error(`Failed to trigger webhook ${webhook._id}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to trigger webhooks:', error);
        }
    }
};

module.exports = webhookController;