const GitOperationsUtility = require('../../utils/gitOperation');

const gitController = {
    gitStatus: async (req, res) => {
        try {
            const { repositoryName } = req.params;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            const status = await gitUtil.status();
            res.status(200).json({ status });
        } catch (err) {
            res.status(500).json({ error: 'Failed to retrieve git status' });
        }
    },

    gitAdd: async (req, res) => {
        try {
            const { repositoryName } = req.params;
            const { files } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            await gitUtil.add(files);
            res.status(200).json({ message: 'Files added successfully' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to add files' });
        }
    },

    gitCommit: async (req, res) => {
        try {
            const { repositoryName } = req.params;
            const { commitMessage } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            const commitResult = await gitUtil.commit(commitMessage);
            res.status(200).json({ message: 'Commit successful', commitDetails: commitResult });
        } catch (err) {
            res.status(500).json({ error: 'Failed to commit changes' });
        }
    },

    gitPush: async (req, res) => {
        try {
            const { repositoryName } = req.params;
            const { remote, branch } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            const pushResult = await gitUtil.push(remote, branch);
            res.status(200).json({ message: 'Push successful', pushDetails: pushResult });
        } catch (err) {
            res.status(500).json({ error: 'Failed to push changes' });
        }
    },

    gitClone: async (req, res) => {
        try {
            const { repositoryName, cloneUrl } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            await gitUtil.clone(cloneUrl);
            res.status(200).json({ message: 'Repository cloned successfully' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to clone repository' });
        }
    },

    createBranch: async (req, res) => {
        try {
            const { repositoryName, branchName } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            await gitUtil.createBranch(branchName);
            res.status(200).json({ message: `Branch '${branchName}' created successfully` });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create branch' });
        }
    },

    mergeBranch: async (req, res) => {
        try {
            const { repositoryName, sourceBranch, targetBranch } = req.body;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            const mergeResult = await gitUtil.mergeBranch(sourceBranch, targetBranch);
            res.status(200).json({ message: 'Merge successful', mergeDetails: mergeResult });
        } catch (err) {
            res.status(500).json({ error: 'Failed to merge branch' });
        }
    },

    getBranches: async (req, res) => {
        try {
            const { repositoryName } = req.params;
            const gitUtil = await GitOperationsUtility.initialize(repositoryName);
            const branches = await gitUtil.getBranches();
            res.status(200).json({ branches });
        } catch (err) {
            res.status(500).json({ error: 'Failed to get branches' });
        }
    }
};

module.exports = gitController;