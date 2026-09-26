import type {
  ProductActivityExposureDataIssue,
  ProductActivityExposureReadModel,
} from './productActivityExposure';

export type ProductActivityExposurePublicRouteDataIssueReason =
  | 'execution-binding-invalid'
  | 'runtime-read-failed'
  | 'source-data-issue'
  | 'stored-evidence-trace-missing';

export type ProductActivityExposurePublicRouteResult =
  | Readonly<{
      status: 'ok';
      model: ProductActivityExposureReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      reason: ProductActivityExposurePublicRouteDataIssueReason;
      issues?: readonly ProductActivityExposureDataIssue[];
    }>;
