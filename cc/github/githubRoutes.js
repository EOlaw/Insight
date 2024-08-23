const express = require('express');
const router = express.Router();
const githubController = require('../github/githubController');
const { isAuthenticated } = require('../src/auth/utils/userUtils');

router.post('/create-repo', isAuthenticated, githubController.createRepo);
router.post('/notify-push', isAuthenticated, githubController.notifyPush);
router.get('/repos', githubController.listRepos);
router.get('/repos/:repoName', isAuthenticated, githubController.getRepoDetails);

module.exports = router;