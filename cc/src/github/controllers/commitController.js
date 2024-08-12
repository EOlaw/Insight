const Commit = require('../models/commitModel');
const Repository = require('../models/repositoryModel');
const User = require('../../auth/models/userModel'); // Import User model for author reference

const commitController = {
    // Create a new commit
    createCommit: async (req, res) => {
        try {
            const { repositoryId, message, changes } = req.body;
            const author = req.user.id; // Assuming the user is authenticated and their ID is in req.user

            // Validate input
            if (!repositoryId || !message || !Array.isArray(changes)) {
                return res.status(400).json({ message: 'Invalid input data' });
            }

            // Check if the repository exists
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ message: 'Repository not found' });
            }

            const commit = new Commit({
                repository: repositoryId,
                author,
                message,
                changes
            });

            await commit.save();
            res.status(201).json({ message: 'Commit created successfully', commit });
        } catch (error) {
            res.status(500).json({ message: 'Error creating commit', error });
        }
    },

    // Get commits for a repository
    getCommitsForRepository: async (req, res) => {
        try {
            const { repositoryId } = req.params;

            // Validate ID
            if (!repositoryId || !repositoryId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid repository ID' });
            }

            const commits = await Commit.find({ repository: repositoryId }).populate('author', 'username');

            res.status(200).json(commits);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching commits', error });
        }
    },

    // Get a commit by ID
    getCommit: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid commit ID' });
            }

            const commit = await Commit.findById(id).populate('author', 'username');

            if (!commit) {
                return res.status(404).json({ message: 'Commit not found' });
            }

            res.status(200).json(commit);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching commit', error });
        }
    },

    // Update a commit by ID
    updateCommit: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid commit ID' });
            }

            const commit = await Commit.findById(id);
            if (!commit) {
                return res.status(404).json({ message: 'Commit not found' });
            }

            // Update commit
            Object.assign(commit, updates);
            await commit.save();

            res.status(200).json({ message: 'Commit updated successfully', commit });
        } catch (error) {
            res.status(500).json({ message: 'Error updating commit', error });
        }
    },

    // Delete a commit by ID
    deleteCommit: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid commit ID' });
            }

            const commit = await Commit.findByIdAndDelete(id);

            if (!commit) {
                return res.status(404).json({ message: 'Commit not found' });
            }

            res.status(200).json({ message: 'Commit deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting commit', error });
        }
    },

    // List all commits for a user
    listUserCommits: async (req, res) => {
        try {
            const author = req.user.id;

            // Fetch commits authored by the authenticated user
            const commits = await Commit.find({ author }).populate('repository', 'name');

            res.status(200).json(commits);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching commits', error });
        }
    }
};

module.exports = commitController;
