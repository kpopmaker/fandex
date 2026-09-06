import type { ProductEvidenceReadModel } from '../contracts/productEvidence';

type ProductEvidencePresentationInput = Pick<
  ProductEvidenceReadModel,
  'presentation' | 'dataOrigin'
>;

export type ProductEvidencePresentation = Readonly<{
  presentationLabel: string;
  dataOriginLabel: string;
  disclosureText: string;
}>;

export function getProductEvidencePresentation(
  input: ProductEvidencePresentationInput,
): ProductEvidencePresentation {
  const presentationLabel =
    input.presentation === 'preview' ? '미리보기' : '표준 표시';

  const dataOriginLabel =
    input.dataOrigin === 'synthetic' ? '합성 데이터' : '관측 데이터';

  const disclosureText =
    input.presentation === 'preview' && input.dataOrigin === 'synthetic'
      ? '이 자료는 연결된 합성 미리보기 근거입니다. 실제 관측 데이터나 공식 발표 목록으로 해석하지 않습니다.'
      : `표시 상태: ${presentationLabel} · 데이터 유형: ${dataOriginLabel}`;

  return Object.freeze({
    presentationLabel,
    dataOriginLabel,
    disclosureText,
  });
}