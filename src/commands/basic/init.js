'use strict';

import chalk from 'chalk';
import execa from 'execa';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import showBanner from 'node-banner';
import Table from 'cli-table3';
import validate from 'validate-npm-package-name';

import { isWin } from '../../utils/constants';
import {
  directoryExistsInPath,
  hasStrayArgs,
  invalidProjectName,
} from '../../utils/messages';
import Spinner from '../../utils/spinner';
import { validateInstallation } from '../../utils/validate';

let availableCommands = new Table();

let projectName;
let projectConfig;

const boilerplate = {
  basic: 'https://github.com/madlabsinc/mevn-boilerplate.git',
  pwa: 'https://github.com/madlabsinc/mevn-pwa-boilerplate.git',
  graphql: 'https://github.com/madlabsinc/mevn-graphql-boilerplate.git',
  nuxt: 'https://github.com/madlabsinc/mevn-nuxt-boilerplate.git',
};

/**
 * Creates an initial local commit
 *
 * @returns {Promise<void>}
 */

const makeInitialCommit = async () => {
  process.chdir(projectName);
  await execa('git', ['init']);
  await execa('git', ['add', '.']);
  await execa('git', ['commit', '-m', 'Initial commit', '-m', 'From Mevn-CLI']);
};

/**
 * Shows the list of available commands
 *
 * @returns {Void}
 */

const showCommandsList = () => {
  console.log();
  console.log(chalk.yellow(' Available commands:-'));

  availableCommands.push(
    {
      'mevn init': 'To bootstrap a MEVN webapp',
    },
    {
      'mevn serve': 'To launch client/server',
    },
    {
      'mevn add:package': 'Add additional packages',
    },
    {
      'mevn generate': 'To generate config files',
    },
    {
      'mevn codesplit <name>': 'Lazy load components',
    },
    {
      'mevn dockerize': 'Launch within docker containers',
    },
    {
      'mevn deploy': 'Deploy the app to Heroku',
    },
    {
      'mevn info': 'Prints local environment information',
    },
  );
  console.log(availableCommands.toString());

  console.log();
  console.log();
  console.log(
    chalk.cyanBright(
      ` Make sure that you've done ${chalk.greenBright(`cd ${projectName}`)}`,
    ),
  );

  console.log();
  console.log(
    `${chalk.yellow.bold(' Warning: ')} Do not delete the mevn.json file`,
  );

  let removeCmd = isWin ? 'rmdir /s /q' : 'rm -rf';
  execa.shellSync(`${removeCmd} ${path.join(projectName, '.git')}`);
  makeInitialCommit();
};

/**
 * Fetch the boilerplate template of choice
 *
 * @param {String} template - Boilerplate template of choice
 * @returns {Promise<void>}
 */

const fetchTemplate = async template => {
  await validateInstallation('git help -g');

  const fetchSpinner = new Spinner('Fetching the boilerplate template');
  fetchSpinner.start();
  try {
    await execa(`git`, ['clone', boilerplate[template], projectName]);
  } catch (err) {
    fetchSpinner.fail('Something went wrong');
    throw err;
  }

  fetchSpinner.stop();

  fs.writeFileSync(
    `./${projectName}/mevn.json`,
    projectConfig.join('\n').toString(),
  );

  if (template === 'nuxt') {
    const { requirePwaSupport } = await inquirer.prompt([
      {
        name: 'requirePwaSupport',
        type: 'confirm',
        message: 'Do you require pwa support',
      },
    ]);

    if (requirePwaSupport) {
      let configFile = JSON.parse(
        fs.readFileSync(`./${projectName}/mevn.json`).toString(),
      );
      configFile['isPwa'] = true;
      fs.writeFileSync(
        `./${projectName}/mevn.json`,
        JSON.stringify(configFile),
      );
    }

    const { mode } = await inquirer.prompt([
      {
        name: 'mode',
        type: 'list',
        message: 'Choose your preferred mode',
        choices: ['Universal', 'SPA'],
      },
    ]);

    if (mode === 'Universal') {
      let configFile = fs
        .readFileSync(`./${projectName}/nuxt.config.js`, 'utf8')
        .toString()
        .split('\n');

      let index = configFile.indexOf(
        configFile.find(line => line.includes('mode')),
      );
      configFile[index] = ` mode: 'universal',`;

      fs.writeFileSync(
        `./${projectName}/nuxt.config.js`,
        configFile.join('\n'),
      );
    }
  }
  showCommandsList();
};

/**
 * Bootstrap a basic MEVN stack based webapp
 *
 * @param {String} appName - Name of the project
 * @returns {Promise<void>}
 */

const initializeProject = async appName => {
  await showBanner('Mevn CLI', 'Light speed setup for MEVN stack based apps.');

  const hasMultipleProjectNameArgs =
    process.argv[4] && !process.argv[4].startsWith('-');

  // Validation for multiple directory names
  if (hasMultipleProjectNameArgs) {
    hasStrayArgs();
  }

  const validationResult = validate(appName);
  if (!validationResult.validForNewPackages) {
    invalidProjectName(appName);
  }

  if (fs.existsSync(appName)) {
    directoryExistsInPath(appName);
  }

  projectName = appName;

  let { template } = await inquirer.prompt([
    {
      name: 'template',
      type: 'list',
      message: 'Please select your template of choice',
      choices: ['basic', 'pwa', 'graphql', 'Nuxt-js'],
    },
  ]);

  projectConfig = [
    '{',
    `"name": "${appName}",`,
    `"template": "${template}"`,
    '}',
  ];

  if (template === 'Nuxt-js') {
    template = 'nuxt';
  }

  fetchTemplate(template);
};

module.exports = initializeProject;
