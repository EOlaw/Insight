// controllers/pullRequestController.js
const PullRequest = require('../models/pullRequestModel');
const Repository = require('../models/repositoryModel');
const simpleGit = require('simple-git');
const path = require('path');

const pullRequestController = {
    createPullRequest: async (req, res) => {
        try {
            const { repositoryId, title, description, sourceBranch, targetBranch } = req.body;
            const author = req.user.id;

            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const pullRequest = new PullRequest({
                title,
                description,
                source_branch: sourceBranch,
                target_branch: targetBranch,
                repository: repositoryId,
                author
            });

            await pullRequest.save();
            res.status(201).json({ message: 'Pull request created successfully', pullRequest });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create pull request' });
        }
    },

    mergePullRequest: async (req, res) => {
        try {
            const { pullRequestId } = req.params;

            const pullRequest = await PullRequest.findById(pullRequestId).populate('repository');
            if (!pullRequest) {
                return res.status(404).json({ error: 'Pull request not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', pullRequest.repository.name);
            const git = simpleGit(repoPath);

            await git.checkout(pullRequest.target_branch);
            await git.merge([pullRequest.source_branch]);

            pullRequest.status = 'merged';
            await pullRequest.save();

            res.status(200).json({ message: 'Pull request merged successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to merge pull request' });
        }
    }
};

module.exports = pullRequestController;