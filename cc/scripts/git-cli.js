#!/usr/bin/env node

const GitOperationsUtility = require('../src/utils/gitOperation');
const yargs = require('yargs');

yargs
    .command('status <repositoryName>', 'Get git status', {}, async (argv) => {
        const gitUtil = await GitOperationsUtility.initialize(argv.repositoryName);
        const status = await gitUtil.status();
        console.log(status);
    })
    .command('add <repositoryName> [files..]', 'Add files to git', {}, async (argv) => {
        const gitUtil = await GitOperationsUtility.initialize(argv.repositoryName);
        await gitUtil.add(argv.files);
        console.log('Files added successfully');
    })
    .command('commit <repositoryName> <message>', 'Commit changes', {}, async (argv) => {
        const gitUtil = await GitOperationsUtility.initialize(argv.repositoryName);
        const result = await gitUtil.commit(argv.message);
        console.log('Commit successful', result);
    })
    .command('push <repositoryName> [remote] [branch]', 'Push changes', {}, async (argv) => {
        const gitUtil = await GitOperationsUtility.initialize(argv.repositoryName);
        const result = await gitUtil.push(argv.remote, argv.branch);
        console.log('Push successful', result);
    })
    // Add more commands for other git operations
    .help()
    .argv;