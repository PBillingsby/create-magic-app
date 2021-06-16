/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable no-param-reassign */

import React from 'react';
import { Zombi, Directory, scaffold } from 'zombi';
import fs from 'fs';
import { URL } from 'url';
import execa from 'execa';
import chalk from 'chalk';
import { downloadAndExtractRepo, getRepoInfo } from './utils/repo';
import { makeDir } from './utils/make-dir';
import { DEFAULT_CREATE_MAGIC_APP_REPO, GITHUB_BASE_URL } from './config';
import { getAbsoluteTemplatePath, getRelativeTemplatePath, resolveToDist } from './utils/path-helpers';
import { getScaffoldDefinition, getScaffoldRender } from './utils/scaffold-helpers';
import { filterNilValues } from './utils/filter-nil-values';
import { printWarning } from './utils/errors-warnings';
import { parseFlags } from './flags';

export interface CreateMagicAppData {
  /**
   * The `make-magic` project branch to source templates from.
   */
  branch: string;

  /**
   * The project name maps to a base directory
   * created to wrap the generated code.
   */
  projectName: string;

  /**
   * The base template to use for scaffolding your Magic-enabled application.
   */
  template: string;
}

export interface CreateMagicAppConfig extends Partial<CreateMagicAppData> {
  /**
   * Arbitrary data to passthrough to the template being scaffolded.
   * This data will be made available for any template-specific variables.
   */
  data?: {};
}

/**
 * Generates and runs a project scaffold.
 */
export async function createApp(config: CreateMagicAppConfig) {
  const isProgrammaticFlow = !!config.data;
  const destinationRoot = process.cwd();

  const availableScaffolds = fs
    .readdirSync(resolveToDist('scaffolds'))
    .filter((name) => fs.statSync(resolveToDist('scaffolds', name)).isDirectory())
    .map((name) => {
      return {
        name,
        message: getScaffoldDefinition(name).shortDescription,
        order: getScaffoldDefinition(name).order ?? 0,
      };
    });

  const isChosenTemplateValid = availableScaffolds.map((i) => i.name).includes(config?.template!);

  if (config?.template && !isChosenTemplateValid) {
    printWarning(chalk`'{bold ${config.template}}' does not match any templates.`);
    console.warn(); // Aesthetics!
  }

  const template = (
    <Zombi<CreateMagicAppData>
      name="create-magic-app"
      templateRoot={false}
      destinationRoot={destinationRoot}
      data={filterNilValues({
        branch: config?.branch ?? 'master',
        projectName: config?.projectName,
        template: isChosenTemplateValid ? config?.template : undefined,
      })}
      prompts={[
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project named?',
          initial: 'my-app',
        },

        !isChosenTemplateValid && {
          type: 'select',
          name: 'template',
          message: 'Choose a template:',
          choices: availableScaffolds.sort((a, b) => a.order - b.order),
        },
      ]}
    >
      {async (data) => {
        const repoUrl = new URL(`${DEFAULT_CREATE_MAGIC_APP_REPO}/tree/${data.branch}`, GITHUB_BASE_URL);
        const repoInfo = await getRepoInfo(repoUrl, getRelativeTemplatePath(data.template));

        if (repoInfo) {
          const templatePath = getAbsoluteTemplatePath(data.template);

          if (!fs.existsSync(templatePath)) {
            await makeDir(templatePath);
            await downloadAndExtractRepo(templatePath, repoInfo);
          }
        } else {
          // TODO: Handle case where repo info is not found
        }

        const templateData = await parseFlags(getScaffoldDefinition(data.template).flags, config?.data);
        const renderTemplate = getScaffoldRender(filterNilValues({ ...config, ...templateData, ...data }));

        return <Directory name={data.projectName}>{renderTemplate()}</Directory>;
      }}
    </Zombi>
  );

  const scaffoldResult = await scaffold<{ 'create-magic-app': CreateMagicAppData; [key: string]: any }>(template);
  const { projectName: chosenProjectName, template: chosenTemplate } = scaffoldResult.data['create-magic-app'];

  console.log(); // Aesthetics!

  // Save the current working directory and
  // change directories into the rendered scaffold.
  const cwd = process.cwd();
  process.chdir(chosenProjectName);

  // Do post-render actions...
  const baseDataMixedWithTemplateData = {
    ...scaffoldResult.data['create-magic-app'],
    ...scaffoldResult.data[chosenTemplate],
  };

  await executePostRenderAction(baseDataMixedWithTemplateData, 'installDependenciesCommand');
  if (!isProgrammaticFlow) {
    await executePostRenderAction(baseDataMixedWithTemplateData, 'startCommand');
  }

  // Return to the previous working directory
  // before "post-render actions" executed.
  process.chdir(cwd);

  return scaffoldResult;
}

/**
 * After the scaffold is rendered, we call this
 * function to invoke post-render shell commands.
 */
async function executePostRenderAction(
  data: CreateMagicAppData & Record<string, any>,
  cmdType: 'installDependenciesCommand' | 'startCommand',
) {
  const getCmd = getScaffoldDefinition(data.template)[cmdType];
  const [cmd, ...args] = typeof getCmd === 'function' ? getCmd(data) : getCmd ?? [];

  if (cmd) {
    await execa(cmd, args, { stdio: 'inherit' });
  }
}