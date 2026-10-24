/**
 * The server never sends words: a failed request carries a stable code (and values for it),
 * and each screen names the code in its own interface language from the frontend catalogs.
 */
export const apiErrorCodes = [
  'requestFailed',
  'serverError',
  'validation',
  'invalidSettings',
  'invalidDateOrZone',
  'duplicate',
  'relatedRecord',
  'endpointNotFound',
  'tooManyRequests',
  'tooManyAttempts',
  'originRejected',
  'siteMaintenance',
  'databaseMaintenance',
  'loginRequired',
  'sessionExpired',
  'invalidToken',
  'credentialsChanged',
  'accountInactive',
  'accountDisabled',
  'forbidden',
  'adminRequired',
  'registrationClosed',
  'emailTaken',
  'usernameTaken',
  'invalidCredentials',
  'userNotFound',
  'wrongCurrentPassword',
  'wrongPassword',
  'cannotDeactivateSelf',
  'cannotRemoveOwnAdmin',
  'cannotDeleteSelf',
  'lastAdmin',
  'resetLinkInactiveUser',
  'resetLinkExpired',
  'onboardingDone',
  'accountNotEmpty',
  'importInvalid',
  'importOutdated',
  'recordNotFound',
  'recordForbidden',
  'sharedCreateForbidden',
  'sharedChangeForbidden',
  'categoryNotFound',
  'targetCategoryNotFound',
  'sameTargetCategory',
  'categoryInUse',
  'sharedCategoryNameTaken',
  'personalCategoryNameTaken',
  'sharedNeedsSharedCategory',
  'duplicateRecordName',
  'duplicateSubRecordName',
  'orderLimit',
  'orderTaken',
  'listChanged',
  'planNotFound',
  'planEndBeforeStart',
  'planOverlap',
  'invalidPlan',
  'invalidParent',
  'sessionTimeRange',
  'sessionOverlap',
  'sessionChanged',
  'seriesChanged',
  'tagExists',
  'notPomodoro',
  'resetBeforeTypeChange',
  'finishedTimerLocked',
  'resetBeforeDurations',
  'transitionNotAllowed',
  'plannedEndPassed',
  'pauseActiveFirst',
  'pomodoroPhaseManaged',
  'activityKindRunningOnly',
  'statsRangeIncomplete',
  'statsRangeTooLong',
  'maintenanceBusy',
  'maintenanceFailed',
  'emailDisabled',
  'pushDisabled',
  'noPushSubscription',
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];
export const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === 'string' && (apiErrorCodes as readonly string[]).includes(value);

/** Field problems; shared schemas use these codes as their issue messages. */
export const validationCodes = [
  'invalid',
  'required',
  'email',
  'usernameLength',
  'usernameCharacters',
  'nameLength',
  'passwordLength',
  'passwordBytes',
  'passwordRequired',
  'currentPasswordRequired',
  'imageAddress',
  'nothingToUpdate',
  'resetLinkInvalid',
  'duplicateName',
  'unknownPushService',
  'searchTooShort',
  'endBeforeStart',
  'dateRange',
  'termWord',
  'termAccusative',
  'termWordEnglish',
  'tagName',
  'reorderList',
] as const;
export type ValidationCode = (typeof validationCodes)[number];
/** The schema's own code, or `invalid` for checks that carry none (zod's built-in messages). */
export const validationCode = (message: string): ValidationCode =>
  (validationCodes as readonly string[]).includes(message) ? (message as ValidationCode) : 'invalid';

export type ApiErrorParams = Record<string, string | number>;
export interface ValidationIssue {
  field: string;
  code: ValidationCode;
}
export interface ApiError {
  code: ApiErrorCode;
  params?: ApiErrorParams;
  details?: ValidationIssue[];
}
export function validationError(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  code: ApiErrorCode = 'validation',
): ApiError {
  return {
    code,
    details: issues.map((issue) => ({ field: issue.path.join('.'), code: validationCode(issue.message) })),
  };
}

/** A refused request: the error handler answers with `statusCode` and `{ success: false, error: { code, params } }`. */
export class ApiFailure extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    readonly params?: ApiErrorParams,
  ) {
    super(code);
    this.name = 'ApiFailure';
  }
}
export const fail = (statusCode: number, code: ApiErrorCode, params?: ApiErrorParams): never => {
  throw new ApiFailure(statusCode, code, params);
};
