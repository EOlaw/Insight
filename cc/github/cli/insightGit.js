#!/usr/bin/env node

const { program } = require('commander');
const simpleGit = require('simple-git');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const git = simpleGit();
const CONFIG_FILE = path.join(process.env.HOME, '.insightgitrc');

// Read config file
const readConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return {};
};

const config = readConfig();

program
  .version('1.0.0')
  .description('Custom Git CLI for InsightSerenity');

const formatStatus = (status) => {
  let output = '';

  if (status.current) {
    output += `On branch ${status.current}\n`;
  }

  if (status.tracking) {
    output += `Your branch is up to date with '${status.tracking}'.\n`;
  }

  if (status.ahead > 0) {
    output += `Your branch is ahead of '${status.tracking}' by ${status.ahead} commit(s).\n`;
  }

  if (status.behind > 0) {
    output += `Your branch is behind '${status.tracking}' by ${status.behind} commit(s).\n`;
  }

  if (status.staged.length > 0) {
    output += '\nChanges to be committed:\n';
    status.staged.forEach(file => {
      output += `  modified: ${file}\n`;
    });
  }

  if (status.modified.length > 0) {
    output += '\nChanges not staged for commit:\n';
    status.modified.forEach(file => {
      output += `  modified: ${file}\n`;
    });
  }

  if (status.not_added.length > 0) {
    output += '\nUntracked files:\n';
    status.not_added.forEach(file => {
      output += `  ${file}\n`;
    });
  }

  return output;
};

program
  .command('status')
  .description('Show the working tree status')
  .action(async () => {
    const status = await git.status();
    console.log(formatStatus(status));
  });

program
  .command('add <files...>')
  .description('Add file contents to the index')
  .action(async (files) => {
    await git.add(files);
    console.log('Files added to the index');
  });

program
  .command('commit <message>')
  .description('Record changes to the repository')
  .action(async (message) => {
    await git.commit(message);
    console.log('Changes committed');
  });

program
  .command('push')
  .description('Update remote refs along with associated objects')
  .action(async () => {
    await git.push('origin', 'main');
    console.log('Changes pushed to remote');
    
    // Notify your custom GitHub server
    if (config.serverUrl) {
      try {
        await axios.post(`${config.serverUrl}/api/github/notify-push`, {
          repository: path.basename(process.cwd()),
          branch: 'main'
        });
      } catch (error) {
        console.error('Failed to notify server:', error.message);
      }
    }
  });

program
  .command('create-repo <name>')
  .description('Create a new repository on your custom GitHub')
  .action(async (name) => {
    if (!config.serverUrl) {
      console.error('Server URL not configured. Use "insightgit config" to set it.');
      return;
    }

    try {
      const response = await axios.post(`${config.serverUrl}/api/github/create-repo`, { name });
      console.log(`Repository created: ${response.data.url}`);
      
      // Initialize local repo and add remote
      await git.init();
      await git.addRemote('origin', response.data.url);
    } catch (error) {
      console.error('Failed to create repository:', error.message);
    }
  });

program
  .command('config')
  .description('Configure the CLI tool')
  .action(() => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Enter your custom GitHub server URL: ', (url) => {
      config.serverUrl = url;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log('Configuration saved');
      readline.close();
    });
  });

program.parse(process.argv);