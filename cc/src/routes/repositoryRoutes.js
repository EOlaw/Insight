const express = require('express');
const repositoryController = require('../github/controllers/repositoryController');
const commitController = require('../github/controllers/commitController');

const router = express.Router();

// Repository Routes
router.route('/repositories')
    .get(repositoryController.listUserRepositories) // Get all repositories for the authenticated user
    .post(repositoryController.createRepository);   // Create a new repository

router.route('/repositories/:id')
    .get(repositoryController.getRepository)       // Get a specific repository by ID
    .put(repositoryController.updateRepository)    // Update a repository by ID
    .delete(repositoryController.deleteRepository); // Delete a repository by ID


module.exports = router;