import { artistIndexChartProfiles } from '../../../app/data/v4/charts/artistIndexChartData';
import { getArtistRecentIssueSignals } from '../../../app/data/v4/charts/issueSignals';
import type {
  ProductEvidenceReadModel,
  ProductVariableEvidenceCollectionResult,
} from '../contracts/productEvidence';
import { getArtistProductEvidence } from './getArtistProductEvidence';
import { validateProductVariableId } from '../variables/productVariableDefinitions';

export type ArtistProductVariableEvidenceInput = Readonly<{
  artistId: string;
  variableId: string;
}>;

export function getArtistProductVariableEvidence(
  input: ArtistProductVariableEvidenceInput,
): ProductVariableEvidenceCollectionResult {
  const artistId = input.artistId.trim();
  const variableIdentity = validateProductVariableId(input.variableId);

  if (variableIdentity.status === 'invalid') {
    return Object.freeze({
      status: 'data-issue',
      artistId,
      rawVariableId: input.variableId,
      issues: Object.freeze([
        Object.freeze({ code: 'invalid-variable-identity' as const }),
      ]),
    });
  }

  const profile = artistIndexChartProfiles.find(
    (candidate) => candidate.artistId === artistId,
  );

  if (!profile) {
    return Object.freeze({
      status: 'data-issue',
      artistId,
      rawVariableId: input.variableId,
      issues: Object.freeze([
        Object.freeze({ code: 'artist-not-found' as const }),
      ]),
    });
  }

  const items: ProductEvidenceReadModel[] = [];

  for (const issue of getArtistRecentIssueSignals(profile.artistId, 100)) {
    if (issue.relatedVariableKey !== variableIdentity.variableId) {
      continue;
    }

    const result = getArtistProductEvidence({
      artistId: profile.artistId,
      evidenceId: issue.id,
    });

    if (result.status !== 'ok') {
      return Object.freeze({
        status: 'data-issue',
        artistId,
        rawVariableId: input.variableId,
        issues: result.issues,
      });
    }

    items.push(result.model);
  }

  return Object.freeze({
    status: 'ok',
    artistId: profile.artistId,
    variableId: variableIdentity.variableId,
    items: Object.freeze(items),
  });
}
