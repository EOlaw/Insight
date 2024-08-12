const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

// Initialize Git in the repository directory
const git = simpleGit(path.join(__dirname, '../../../repositories'));

// Security Middleware Example (ensure this is properly defined elsewhere)
const { isAuthenticated, isDeveloper } = require('../../auth/utils/userUtils');

const gitController = {
    // Git Status
    gitStatus: async (req, res) => {
        try {
            const status = await git.status();
            return res.status(200).json({ status });
        } catch (err) {
            // Log the error for further analysis
            console.error('Git Status Error:', err);
            return res.status(500).json({ error: 'Failed to retrieve git status. Please try again.' });
        }
    },

    // Git Add All Files
    gitAdd: async (req, res) => {
        try {
            await git.add('.');
            return res.status(200).json({ message: 'Files added successfully' });
        } catch (err) {
            // Log the error for further analysis
            console.error('Git Add Error:', err);
            return res.status(500).json({ error: 'Failed to add files. Please try again.' });
        }
    },

    // Git Commit
    gitCommit: async (req, res) => {
        const { commitMessage } = req.body;

        if (!commitMessage || typeof commitMessage !== 'string' || commitMessage.trim() === '') {
            return res.status(400).json({ error: 'Commit message is required and cannot be empty.' });
        }

        try {
            await git.commit(commitMessage.trim());
            return res.status(200).json({ message: 'Commit successful' });
        } catch (err) {
            // Log the error for further analysis
            console.error('Git Commit Error:', err);
            return res.status(500).json({ error: 'Failed to commit changes. Please try again.' });
        }
    },

    // Git Push
    gitPush: async (req, res) => {
        const { remote = 'origin', branch = 'main' } = req.body;

        try {
            await git.push(remote, branch);
            return res.status(200).json({ message: 'Push successful' });
        } catch (err) {
            // Log the error for further analysis
            console.error('Git Push Error:', err);
            return res.status(500).json({ error: 'Failed to push changes. Please try again.' });
        }
    }
};

module.exports = gitController;
