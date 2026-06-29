import {
  mockIssueSourceAdapter,
  runMockIssueSourceAdapterSmokeCheck,
} from './mockIssueSourceAdapter';
import { naverNewsIssueSourceAdapterMetadata } from './naverNewsIssueSourceAdapter';
import type {
  IssueSourceAdapter,
  IssueSourceAdapterCapability,
  IssueSourceAdapterSmokeCheckResult,
} from './issueSourceAdapter';

export type IssueSourceAdapterRegistryEntry = {
  name: string;
  adapter: IssueSourceAdapter;
  enabled: boolean;
  implementationStatus: 'mock' | 'planned';
};

export type PlannedIssueSourceAdapterName =
  | 'naver_news_issue_source_adapter'
  | 'NaverNewsIssueSourceAdapter'
  | 'GdeltIssueSourceAdapter'
  | 'YouTubeOfficialChannelIssueSourceAdapter'
  | 'OfficialSocialIssueSourceAdapter'
  | 'SupabaseIngestionAdapter';

export type PlannedIssueSourceAdapterRegistryEntry = {
  name: PlannedIssueSourceAdapterName;
  implementationStatus: 'planned';
  active: false;
  capabilities: IssueSourceAdapterCapability[];
};

export type IssueSourceAdapterRegistrySummary = {
  registeredAdapterCount: number;
  enabledAdapterCount: number;
  registeredAdapterNames: string[];
  plannedAdapterNames: PlannedIssueSourceAdapterName[];
};

const registeredIssueSourceAdapters: IssueSourceAdapterRegistryEntry[] = [
  {
    name: mockIssueSourceAdapter.sourceName,
    adapter: mockIssueSourceAdapter,
    enabled: true,
    implementationStatus: 'mock',
  },
];

export const plannedIssueSourceAdapterNames: PlannedIssueSourceAdapterName[] = [
  'naver_news_issue_source_adapter',
  'NaverNewsIssueSourceAdapter',
  'GdeltIssueSourceAdapter',
  'YouTubeOfficialChannelIssueSourceAdapter',
  'OfficialSocialIssueSourceAdapter',
  'SupabaseIngestionAdapter',
];

export const plannedIssueSourceAdapters: PlannedIssueSourceAdapterRegistryEntry[] = [
  {
    name: 'naver_news_issue_source_adapter',
    implementationStatus: 'planned',
    active: false,
    capabilities: [naverNewsIssueSourceAdapterMetadata.capability],
  },
];

export function getRegisteredIssueSourceAdapters(): IssueSourceAdapterRegistryEntry[] {
  return registeredIssueSourceAdapters.map((entry) => ({ ...entry }));
}

export function getIssueSourceAdapterByName(
  name: string,
): IssueSourceAdapter | undefined {
  return registeredIssueSourceAdapters.find((entry) => entry.name === name)?.adapter;
}

export function listIssueSourceAdapterCapabilities(): IssueSourceAdapterCapability[] {
  return registeredIssueSourceAdapters.flatMap(
    (entry) => entry.adapter.capabilities ?? [],
  );
}

export function listPlannedIssueSourceAdapterCapabilities(): IssueSourceAdapterCapability[] {
  return plannedIssueSourceAdapters.flatMap((entry) => entry.capabilities);
}

export function getIssueSourceAdapterRegistrySummary(): IssueSourceAdapterRegistrySummary {
  const registeredAdapterNames = registeredIssueSourceAdapters.map(
    (entry) => entry.name,
  );

  return {
    registeredAdapterCount: registeredIssueSourceAdapters.length,
    enabledAdapterCount: registeredIssueSourceAdapters.filter((entry) => entry.enabled)
      .length,
    registeredAdapterNames,
    plannedAdapterNames: plannedIssueSourceAdapterNames,
  };
}

export function runRegisteredIssueSourceAdapterSmokeChecks(): IssueSourceAdapterSmokeCheckResult[] {
  return registeredIssueSourceAdapters
    .filter((entry) => entry.enabled)
    .map((entry) => {
      if (entry.name === mockIssueSourceAdapter.sourceName) {
        return runMockIssueSourceAdapterSmokeCheck();
      }

      return {
        adapterName: entry.name,
        rawItemCount: 0,
        candidateCount: 0,
        signalDraftCount: 0,
        warningCount: 0,
        sourceTypes: [],
        hasBlockingErrors: true,
      };
    });
}
