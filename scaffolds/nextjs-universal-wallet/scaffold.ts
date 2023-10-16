import { Flags } from 'core/flags';
import BaseScaffold from 'core/types/BaseScaffold';
import { Prompt } from 'enquirer';
import { BlockchainNetworkPrompt, PublishableApiKeyPrompt } from 'scaffolds/prompts';

export type Data = BlockchainNetworkPrompt.Data & PublishableApiKeyPrompt.Data;

export const flags: Flags<Partial<Data>> = { ...BlockchainNetworkPrompt.flags, ...PublishableApiKeyPrompt.flags };

export const definition = {
  shortDescription: 'A Universal Wallet scaffold for Next.js',
  featured: true,
};

export default class UniversalScaffold extends BaseScaffold {
  public templateName = 'nextjs-universal-wallet';
  private data: Data;
  public installationCommand: string[] = ['npm', 'install'];
  public startCommand: string[] = ['npm', 'run', 'dev'];
  public source: string | string[] = './';

  constructor(data: Data) {
    super();
    this.data = data;
  }
}
