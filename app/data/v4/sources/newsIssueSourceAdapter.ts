import { NEWS_ISSUE_SOURCE_ITEMS } from './newsIssueSourceSeed';
import type { NewsIssueSourceItem } from './newsIssueSourceTypes';
import type { FandexSourceAdapter } from './sourceAdapterTypes';
import type { SourceAdapterReadiness } from './sourceDataTypes';
import { validateNewsIssueSourceItems } from './sourceValidators';

function getNewsIssueReadiness(): SourceAdapterReadiness {
  const items = NEWS_ISSUE_SOURCE_ITEMS;
  const validation = validateNewsIssueSourceItems(items);
  const errorCount = validation.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = validation.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;

  return {
    sourceType: 'news-issue',
    stage: 'adapter-ready',
    hasAdapter: true,
    hasSeedData: items.length > 0,
    hasExternalConnection: false,
    itemCount: items.length,
    validItemCount: validation.isValid ? items.length : 0,
    errorCount,
    warningCount,
  };
}

export const NEWS_ISSUE_SOURCE_ADAPTER: FandexSourceAdapter<NewsIssueSourceItem> = {
  sourceType: 'news-issue',
  label: '뉴스/이슈 데이터',
  description:
    '뉴스/이슈 source data를 FANDEX 지표 점수 파이프라인에 연결하기 위한 adapter foundation입니다.',
  stage: 'adapter-ready',
  getItems: () => NEWS_ISSUE_SOURCE_ITEMS,
  validateItems: validateNewsIssueSourceItems,
  getReadiness: getNewsIssueReadiness,
};
