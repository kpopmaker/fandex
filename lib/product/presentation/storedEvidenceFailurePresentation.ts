import type {
  ProductStoredEvidenceJobDataIssue,
} from '../contracts/productEvidence';

export type StoredEvidenceFailurePresentation = Readonly<{
  kind: 'not-found' | 'load-error' | 'verification-issue';
  title: string;
  description: string;
}>;

const LOAD_ERROR_CODES = new Set<ProductStoredEvidenceJobDataIssue['code']>([
  'variable-read-model-unavailable',
  'stored-evidence-read-failed',
]);

const VERIFICATION_ISSUE_CODES =
  new Set<ProductStoredEvidenceJobDataIssue['code']>([
    'real-stored-evidence-trace-required',
    'stored-evidence-trace-inconsistent',
    'stored-evidence-source-mismatch',
  ]);

function verificationIssue(): StoredEvidenceFailurePresentation {
  return Object.freeze({
    kind: 'verification-issue' as const,
    title: 'Evidence를 확인할 수 없습니다.',
    description:
      'Stored Evidence의 추적 관계를 확인할 수 없습니다. 변수의 Product 값과 공개 상태는 변경하지 않습니다.',
  });
}

export function getStoredEvidenceFailurePresentation(
  issues: readonly ProductStoredEvidenceJobDataIssue[],
): StoredEvidenceFailurePresentation {
  if (
    issues.length === 1
    && issues[0]?.code === 'job-not-in-variable-evidence-trace'
  ) {
    return Object.freeze({
      kind: 'not-found' as const,
      title: 'Evidence를 찾을 수 없습니다.',
      description:
        '요청한 Evidence가 현재 변수의 Stored Evidence trace에 없습니다.',
    });
  }

  if (issues.some((issue) => VERIFICATION_ISSUE_CODES.has(issue.code))) {
    return verificationIssue();
  }

  if (issues.some((issue) => LOAD_ERROR_CODES.has(issue.code))) {
    return Object.freeze({
      kind: 'load-error' as const,
      title: 'Evidence를 불러올 수 없습니다.',
      description:
        'Stored Evidence를 현재 불러오지 못했습니다. 변수의 Product 값과 공개 상태는 변경하지 않습니다.',
    });
  }

  return verificationIssue();
}
