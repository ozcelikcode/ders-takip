import { z } from 'zod';
import { catalogPathIdSchema } from './catalog.js';

/** The administrator's own password, asked again before an action that cannot be undone or that grants administration. */
export const adminPasswordSchema = z.string().min(1, 'passwordRequired');
export const adminConfirmationSchema = z.object({ adminPassword: adminPasswordSchema }).strict();
export type AdminConfirmation = z.infer<typeof adminConfirmationSchema>;
/** The actions that ask for the administrator's password again. */
export const confirmedOperations = ['backupRestore', 'dataReset', 'roleChange', 'adminCreate', 'userDelete'] as const;
export type ConfirmedOperation = (typeof confirmedOperations)[number];

/** What the administrator log records; the server sends these codes and each interface names them. */
export const adminAuditActions = [
  'signedIn',
  'signInFailed',
  'confirmationFailed',
  'settingsChanged',
  'backupCreated',
  'backupRestored',
  'dataReset',
  'userCreated',
  'userRoleChanged',
  'userActivated',
  'userDeactivated',
  'userDeleted',
  'resetLinkIssued',
] as const;
export const adminAuditActionSchema = z.enum(adminAuditActions);
export type AdminAuditAction = z.infer<typeof adminAuditActionSchema>;

const person = z.object({ id: z.number().int().positive(), username: z.string() });
const detail = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
/** One logged action. Names are copied at the time, so the entry still reads after an account is deleted. */
export const adminAuditEntrySchema = z.object({
  seq: z.number().int().positive(),
  at: z.iso.datetime({ offset: true }),
  action: adminAuditActionSchema,
  actor: person.nullable(),
  target: person.nullable(),
  details: z.record(z.string(), detail),
  ip: z.string().nullable(),
});
export type AdminAuditEntry = z.infer<typeof adminAuditEntrySchema>;
export type AdminAuditDetails = AdminAuditEntry['details'];

export const adminAuditQuerySchema = z
  .object({
    before: catalogPathIdSchema.optional(),
    limit: catalogPathIdSchema.refine((value) => Number(value) <= 200).default('50'),
  })
  .strict();
/**
 * Newest entries first. `integrity` reports whether every entry still links to the one before it;
 * `brokenAt` is the first entry where that chain no longer holds.
 */
export const adminAuditListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    entries: z.array(adminAuditEntrySchema),
    hasMore: z.boolean(),
    integrity: z.object({ intact: z.boolean(), brokenAt: z.number().int().positive().nullable(), total: z.number().int().min(0) }),
  }),
});
export type AdminAuditPage = z.infer<typeof adminAuditListResponseSchema>['data'];
