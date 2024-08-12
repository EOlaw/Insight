const express = require('express');
const commitController = require('../github/controllers/commitController');

const router = express.Router();

// Commit Routes
router.route('/commits')
    .post(commitController.createCommit);           // Create a new commit

router.route('/commits/repository/:repositoryId')
    .get(commitController.getCommitsForRepository); // Get commits for a specific repository

router.route('/commits/:id')
    .get(commitController.getCommit)                // Get a specific commit by ID
    .put(commitController.updateCommit)             // Update a commit by ID
    .delete(commitController.deleteCommit);         // Delete a commit by ID

router.route('/user/commits')
    .get(commitController.listUserCommits);         // Get all commits for the authenticated user

module.exports = router;