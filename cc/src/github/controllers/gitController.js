const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const { isAuthenticated, authorizeDeveloper } = require('../../auth/utils/userUtils');
const Repository = require('../models/repositoryModel');
const Commit = require('../models/commitModel');

const gitController = {
    gitStatus: async (req, res) => {
        try {
            const { repositoryId } = req.params;
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', repository.name);
            const git = simpleGit(repoPath);

            const status = await git.status();
            return res.status(200).json({ status });
        } catch (err) {
            console.error('Git Status Error:', err);
            return res.status(500).json({ error: 'Failed to retrieve git status' });
        }
    },

    gitAdd: async (req, res) => {
        try {
            const { repositoryId, files } = req.body;
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', repository.name);
            const git = simpleGit(repoPath);

            if (files && Array.isArray(files)) {
                await git.add(files);
            } else {
                await git.add('.');
            }

            return res.status(200).json({ message: 'Files added successfully' });
        } catch (err) {
            console.error('Git Add Error:', err);
            return res.status(500).json({ error: 'Failed to add files' });
        }
    },

    gitCommit: async (req, res) => {
        const { repositoryId, commitMessage } = req.body;

        if (!commitMessage || typeof commitMessage !== 'string' || commitMessage.trim() === '') {
            return res.status(400).json({ error: 'Commit message is required and cannot be empty' });
        }

        try {
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', repository.name);
            const git = simpleGit(repoPath);

            const commitResult = await git.commit(commitMessage.trim());

            // Create a new Commit document
            const newCommit = new Commit({
                repository: repositoryId,
                author: req.user.id,
                message: commitMessage.trim(),
                changes: commitResult.summary.changes
            });
            await newCommit.save();

            return res.status(200).json({ message: 'Commit successful', commitDetails: commitResult });
        } catch (err) {
            console.error('Git Commit Error:', err);
            return res.status(500).json({ error: 'Failed to commit changes' });
        }
    },

    gitPush: async (req, res) => {
        const { repositoryId, remote = 'origin', branch = 'main' } = req.body;

        try {
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', repository.name);
            const git = simpleGit(repoPath);

            const pushResult = await git.push(remote, branch);
            return res.status(200).json({ message: 'Push successful', pushDetails: pushResult });
        } catch (err) {
            console.error('Git Push Error:', err);
            return res.status(500).json({ error: 'Failed to push changes' });
        }
    },

    gitClone: async (req, res) => {
        const { repositoryId, cloneUrl } = req.body;

        try {
            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const repoPath = path.join(__dirname, '../../../repositories', repository.name);
            await fs.mkdir(repoPath, { recursive: true });

            const git = simpleGit();
            await git.clone(cloneUrl, repoPath);

            return res.status(200).json({ message: 'Repository cloned successfully' });
        } catch (err) {
            console.error('Git Clone Error:', err);
            return res.status(500).json({ error: 'Failed to clone repository' });
        }
    }
};

module.exports = gitController;