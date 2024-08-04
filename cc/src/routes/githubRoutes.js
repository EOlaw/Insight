const express = require('express');
const repositoryController = require('../github/controllers/repositoryController');
const commitController = require('../github/controllers/commitController');
const authMiddleware = require('/auth/middleware/authMiddleware'); // Middleware for authentication

const router = express.Router();

// Repository Routes
router.route('/repositories')
    .get(authMiddleware, repositoryController.listUserRepositories) // Get all repositories for the authenticated user
    .post(authMiddleware, repositoryController.createRepository);   // Create a new repository

router.route('/repositories/:id')
    .get(authMiddleware, repositoryController.getRepository)       // Get a specific repository by ID
    .put(authMiddleware, repositoryController.updateRepository)    // Update a repository by ID
    .delete(authMiddleware, repositoryController.deleteRepository); // Delete a repository by ID

// Commit Routes
router.route('/commits')
    .post(authMiddleware, commitController.createCommit);           // Create a new commit

router.route('/commits/repository/:repositoryId')
    .get(authMiddleware, commitController.getCommitsForRepository); // Get commits for a specific repository

router.route('/commits/:id')
    .get(authMiddleware, commitController.getCommit)                // Get a specific commit by ID
    .put(authMiddleware, commitController.updateCommit)             // Update a commit by ID
    .delete(authMiddleware, commitController.deleteCommit);         // Delete a commit by ID

router.route('/user/commits')
    .get(authMiddleware, commitController.listUserCommits);         // Get all commits for the authenticated user

module.exports = router;
