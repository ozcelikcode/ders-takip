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
