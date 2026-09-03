import { CsTagSeverity } from './tag-severity.type';

export type CsTagTone =
  | CsTagSeverity
  | 'purple'
  | 'pink'
  | 'teal'
  | 'orange'
  | 'blue'
  | 'slate'
  | 'money'
  | 'erp'
  | 'rede'
  | 'bank'
  | 'error';

export interface CsTagProps {
  severity?: CsTagSeverity;
  class?: string;
}

const PRIME_SEVERITIES: readonly CsTagSeverity[] = [
  'success',
  'info',
  'warn',
  'danger',
  'secondary',
  'contrast',
];

export function tagSeverityFromTone(tone: CsTagTone | null | undefined): CsTagSeverity | undefined {
  return isPrimeSeverity(tone) ? tone : undefined;
}

export function tagClassFromTone(tone: CsTagTone | null | undefined): string | undefined {
  return isPrimeSeverity(tone) || !tone ? undefined : `cs-tag-${tone}`;
}

export function tagPropsFromTone(tone: CsTagTone | null | undefined): CsTagProps {
  return {
    severity: tagSeverityFromTone(tone),
    class: tagClassFromTone(tone),
  };
}

function isPrimeSeverity(tone: CsTagTone | null | undefined): tone is CsTagSeverity {
  return !!tone && PRIME_SEVERITIES.includes(tone as CsTagSeverity);
}

export function iconClassFromTone(tone: CsTagTone | null | undefined): string {
  return `cs-icon-tone-${tone ?? 'secondary'}`;
}
