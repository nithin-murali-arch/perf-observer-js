import { forwardToDatadog } from '../rum-integrations/datadog';

type ExclusionsAreRequired = Parameters<typeof forwardToDatadog> extends [unknown, readonly [string, ...string[]]] ? true : false;
export const exclusionsAreRequired: ExclusionsAreRequired = true;
