// controllers/wikiController.js
const WikiPage = require('../models/wikiPageModel');

const wikiController = {
    createWikiPage: async (req, res) => {
        try {
            const { repositoryId, title, content } = req.body;
            const author = req.user.id;

            const wikiPage = new WikiPage({
                repository: repositoryId,
                title,
                content,
                author
            });

            await wikiPage.save();
            res.status(201).json({ message: 'Wiki page created successfully', wikiPage });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create wiki page' });
        }
    },

    getWikiPages: async (req, res) => {
        try {
            const { repositoryId } = req.params;
            const wikiPages = await WikiPage.find({ repository: repositoryId })
                .select('title updatedAt')
                .sort('-updatedAt');
            res.status(200).json(wikiPages);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch wiki pages' });
        }
    },

    getWikiPage: async (req, res) => {
        try {
            const { pageId } = req.params;
            const wikiPage = await WikiPage.findById(pageId).populate('author', 'username');
            if (!wikiPage) {
                return res.status(404).json({ error: 'Wiki page not found' });
            }
            res.status(200).json(wikiPage);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch wiki page' });
        }
    },

    updateWikiPage: async (req, res) => {
        try {
            const { pageId } = req.params;
            const { title, content } = req.body;
            const author = req.user.id;

            const wikiPage = await WikiPage.findById(pageId);
            if (!wikiPage) {
                return res.status(404).json({ error: 'Wiki page not found' });
            }

            wikiPage.title = title;
            wikiPage.content = content;
            wikiPage.author = author;
            wikiPage.updatedAt = Date.now();
            wikiPage.version += 1;

            await wikiPage.save();
            res.status(200).json({ message: 'Wiki page updated successfully', wikiPage });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update wiki page' });
        }
    }
};

module.exports = wikiController;