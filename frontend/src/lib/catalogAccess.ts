export function canManageCourse(
  course: { isGlobal: boolean; userId?: number | null },
  actor: { id: string | number; role: string } | null | undefined,
) {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  const ownerId = Number(course.userId);
  return (
    !course.isGlobal &&
    Number.isSafeInteger(ownerId) &&
    ownerId > 0 &&
    ownerId === Number(actor.id)
  );
}

/** Records on a user's own workspace: their own and shared ones. Admins can see everyone's, but their dashboard is still theirs. */
export function isOwnOrShared(
  course: { isGlobal: boolean; userId?: number | null },
  actor: { id: string | number } | null | undefined,
) {
  return course.isGlobal || (!!actor && Number(course.userId) === Number(actor.id));
}
