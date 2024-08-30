const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const Repository = require('../github/models/repositoryModel');
const Commit = require('../github/models/commitModel');

class GitOperationsUtility {
    constructor(repoPath) {
        this.git = simpleGit(repoPath);
        this.repoPath = repoPath;
    }

    static async initialize(repositoryName) {
        const repository = await Repository.findOne({ name: repositoryName });
        if (!repository) {
            throw new Error('Repository not found');
        }
        const repoPath = path.join(__dirname, '../../../repositories', repository.name);
        return new GitOperationsUtility(repoPath);
    }

    async status() {
        return await this.git.status();
    }

    async add(files = '.') {
        return await this.git.add(files);
    }

    async commit(message) {
        const commitResult = await this.git.commit(message);
        const newCommit = new Commit({
            repository: this.repoPath,
            message: message,
            hash: commitResult.commit,
            changes: commitResult.summary.changes
        });
        await newCommit.save();
        return commitResult;
    }

    async push(remote = 'origin', branch = 'main') {
        return await this.git.push(remote, branch);
    }

    async pull(remote = 'origin', branch = 'main') {
        return await this.git.pull(remote, branch);
    }

    async clone(cloneUrl) {
        await fs.mkdir(this.repoPath, { recursive: true });
        return await this.git.clone(cloneUrl, this.repoPath);
    }

    async createBranch(branchName) {
        return await this.git.checkoutLocalBranch(branchName);
    }

    async mergeBranch(sourceBranch, targetBranch) {
        await this.git.checkout(targetBranch);
        return await this.git.merge([sourceBranch]);
    }

    async getBranches() {
        const branches = await this.git.branch();
        return branches.all;
    }

    async getCommitHistory(branch = 'main', limit = 10) {
        return await this.git.log([branch, `-${limit}`]);
    }

    async getDiff(commitHash) {
        return await this.git.diff([`${commitHash}^`, commitHash]);
    }
}

module.exports = GitOperationsUtility;