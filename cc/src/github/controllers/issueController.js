// controllers/issueController.js
const Issue = require('../models/issueModel');
const Repository = require('../models/repositoryModel');
const User = require('../../auth/models/userModel');

const issueController = {
    createIssue: async (req, res) => {
        try {
            const { repositoryId, title, description, labels, priority, assignees } = req.body;
            const author = req.user.id;

            const repository = await Repository.findById(repositoryId);
            if (!repository) {
                return res.status(404).json({ error: 'Repository not found' });
            }

            const issue = new Issue({
                repository: repositoryId,
                title,
                description,
                author,
                labels,
                priority,
                assignees
            });

            await issue.save();
            res.status(201).json({ message: 'Issue created successfully', issue });
        } catch (error) {
            console.error('Create Issue Error:', error);
            res.status(500).json({ error: 'Failed to create issue' });
        }
    },

    getIssues: async (req, res) => {
        try {
            const { repositoryId } = req.params;
            const { status, label, assignee, author } = req.query;

            let query = { repository: repositoryId };

            if (status) query.status = status;
            if (label) query.labels = label;
            if (assignee) query.assignees = assignee;
            if (author) query.author = author;

            const issues = await Issue.find(query)
                .populate('author', 'username')
                .populate('assignees', 'username')
                .sort('-createdAt');

            res.status(200).json(issues);
        } catch (error) {
            console.error('Get Issues Error:', error);
            res.status(500).json({ error: 'Failed to fetch issues' });
        }
    },

    getIssue: async (req, res) => {
        try {
            const { issueId } = req.params;
            const issue = await Issue.findById(issueId)
                .populate('author', 'username')
                .populate('assignees', 'username')
                .populate('comments.author', 'username');

            if (!issue) {
                return res.status(404).json({ error: 'Issue not found' });
            }

            res.status(200).json(issue);
        } catch (error) {
            console.error('Get Issue Error:', error);
            res.status(500).json({ error: 'Failed to fetch issue' });
        }
    },

    updateIssue: async (req, res) => {
        try {
            const { issueId } = req.params;
            const { title, description, status, labels, assignees, priority } = req.body;

            const issue = await Issue.findById(issueId);
            if (!issue) {
                return res.status(404).json({ error: 'Issue not found' });
            }

            Object.assign(issue, { title, description, status, labels, assignees, priority });
            issue.updatedAt = Date.now();

            if (status === 'closed' && issue.status !== 'closed') {
                issue.closedAt = Date.now();
            }

            await issue.save();
            res.status(200).json({ message: 'Issue updated successfully', issue });
        } catch (error) {
            console.error('Update Issue Error:', error);
            res.status(500).json({ error: 'Failed to update issue' });
        }
    },

    addComment: async (req, res) => {
        try {
            const { issueId } = req.params;
            const { content } = req.body;
            const author = req.user.id;

            const issue = await Issue.findById(issueId);
            if (!issue) {
                return res.status(404).json({ error: 'Issue not found' });
            }

            issue.comments.push({ author, content });
            issue.updatedAt = Date.now();

            await issue.save();
            res.status(201).json({ message: 'Comment added successfully', issue });
        } catch (error) {
            console.error('Add Comment Error:', error);
            res.status(500).json({ error: 'Failed to add comment' });
        }
    },

    deleteIssue: async (req, res) => {
        try {
            const { issueId } = req.params;

            const issue = await Issue.findByIdAndDelete(issueId);
            if (!issue) {
                return res.status(404).json({ error: 'Issue not found' });
            }

            res.status(200).json({ message: 'Issue deleted successfully' });
        } catch (error) {
            console.error('Delete Issue Error:', error);
            res.status(500).json({ error: 'Failed to delete issue' });
        }
    }
};

module.exports = issueController;


