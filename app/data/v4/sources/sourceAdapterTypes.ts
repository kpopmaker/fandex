import type {
  FandexSourceDataOrigin,
  FandexSourceStage,
  FandexSourceType,
  SourceAdapterReadiness,
  SourceValidationResult,
} from './sourceDataTypes';

export type SourceAdapterContext = {
  sourceType: FandexSourceType;
  origin: FandexSourceDataOrigin;
};

export type SourceAdapterResult<TItem> = {
  sourceType: FandexSourceType;
  stage: FandexSourceStage;
  items: TItem[];
  validation: SourceValidationResult;
  readiness: SourceAdapterReadiness;
};

export type FandexSourceAdapter<TItem> = {
  sourceType: FandexSourceType;
  label: string;
  description: string;
  stage: FandexSourceStage;
  getItems: () => TItem[];
  validateItems: (items: TItem[]) => SourceValidationResult;
  getReadiness: () => SourceAdapterReadiness;
};
