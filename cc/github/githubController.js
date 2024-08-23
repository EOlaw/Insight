const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

// Update this line to point to the correct repositories directory
const REPOS_DIR = path.join(__dirname, '..', 'repositories');

console.log('Repositories directory:', REPOS_DIR); // Log the repositories directory path

// Ensure repositories directory exists
if (!fs.existsSync(REPOS_DIR)) {
  fs.mkdirSync(REPOS_DIR, { recursive: true });
  console.log('Created repositories directory:', REPOS_DIR);
}

const githubController = {
  createRepo: async (req, res) => {
    const { name } = req.body;
    const repoPath = path.join(REPOS_DIR, name);
  
    if (fs.existsSync(repoPath)) {
      return res.status(400).json({ error: 'Repository already exists' });
    }
  
    fs.mkdirSync(repoPath);
    await simpleGit(repoPath).init(true);
  
    res.json({ 
      message: 'Repository created', 
      url: `http://${req.get('host')}/repos/${name}.git`
    });
  },
  notifyPush: (req, res) => {
    const { repository, branch } = req.body;
    console.log(`Received push notification for ${repository}/${branch}`);
    // Here you would typically update any necessary data or trigger CI/CD processes
    res.json({ message: 'Push notification received' });
  },
  listRepos: (req, res) => {
    console.log('listRepos function called'); // Log when the function is called
  
    fs.readdir(REPOS_DIR, (err, files) => {
      if (err) {
        console.error('Error reading repositories directory:', err);
        return res.status(500).render('github/error', { error: 'Failed to read repositories' });
      }
      
      console.log('Files in repositories directory:', files); // Log all files in the directory
      
      const repos = files.filter(file => fs.statSync(path.join(REPOS_DIR, file)).isDirectory());
      console.log('Found repositories:', repos);
      
      res.render('github/repos', { repos: repos });
      });
  },
  getRepoDetails: (req, res) => {
    const { repoName } = req.params;
    const repoPath = path.join(REPOS_DIR, repoName);
  
    if (!fs.existsSync(repoPath)) {
      return res.status(404).render('error', { error: 'Repository not found' });
    }
  
    simpleGit(repoPath).log((err, log) => {
      if (err) {
        return res.status(500).render('error', { error: 'Failed to get repository details' });
      }
      res.render('github/repo-details', { repoName, log });
    });
  },
}

module.exports = githubController;