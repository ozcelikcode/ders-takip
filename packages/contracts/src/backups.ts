import { z } from 'zod';
export const resetDataSchema = z
  .object({ mode: z.enum(['settings_only', 'all']) })
  .strict();
export const backupRecordSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  filename: z.string(),
  size: z.number().int().nonnegative(),
  type: z.enum(['auto', 'manual']),
  createdAt: z.iso.datetime(),
  verified: z.boolean().optional(),
});
export const backupListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(backupRecordSchema),
});
export const backupCreateResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: backupRecordSchema,
});
export const resetDataResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({ safetyBackupId: z.number().int().positive() }),
});
export type BackupRecord = z.infer<typeof backupRecordSchema>;
export type ResetMode = z.infer<typeof resetDataSchema>['mode'];

export const backupRestoreResponseSchema = resetDataResponseSchema.omit({
  data: true,
});
