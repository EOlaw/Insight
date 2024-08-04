const Repository = require('../models/repositoryModel');
const User = require('../auth/models/userModel'); // Import User model for owner reference

const repositoryController = {
    // Create a new repository
    createRepository: async (req, res) => {
        try {
            const { name, description } = req.body;
            const owner = req.user.id; // Assuming the user is authenticated and their ID is in req.user

            // Validate input
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ message: 'Invalid repository name' });
            }

            // Check if the repository already exists
            const existingRepository = await Repository.findOne({ name });
            if (existingRepository) {
                return res.status(400).json({ message: 'Repository with this name already exists' });
            }

            const repository = new Repository({
                name,
                description,
                owner
            });

            await repository.save();
            res.status(201).json({ message: 'Repository created successfully', repository });
        } catch (error) {
            res.status(500).json({ message: 'Error creating repository', error });
        }
    },

    // Get a repository by ID
    getRepository: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid repository ID' });
            }

            const repository = await Repository.findById(id).populate('owner', 'username');

            if (!repository) {
                return res.status(404).json({ message: 'Repository not found' });
            }

            res.status(200).json(repository);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching repository', error });
        }
    },

    // Update a repository by ID
    updateRepository: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid repository ID' });
            }

            // Check if the repository exists
            const repository = await Repository.findById(id);
            if (!repository) {
                return res.status(404).json({ message: 'Repository not found' });
            }

            // Update repository
            Object.assign(repository, updates);
            await repository.save();

            res.status(200).json({ message: 'Repository updated successfully', repository });
        } catch (error) {
            res.status(500).json({ message: 'Error updating repository', error });
        }
    },

    // Delete a repository by ID
    deleteRepository: async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ID
            if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: 'Invalid repository ID' });
            }

            // Check if the repository exists
            const repository = await Repository.findByIdAndDelete(id);
            if (!repository) {
                return res.status(404).json({ message: 'Repository not found' });
            }

            res.status(200).json({ message: 'Repository deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting repository', error });
        }
    },

    // List all repositories for a user
    listUserRepositories: async (req, res) => {
        try {
            const owner = req.user.id;

            // Fetch repositories owned by the authenticated user
            const repositories = await Repository.find({ owner }).populate('owner', 'username');

            res.status(200).json(repositories);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching repositories', error });
        }
    }
};

module.exports = repositoryController;
