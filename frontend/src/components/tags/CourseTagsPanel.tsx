import { useId } from 'react';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTags } from '../../hooks/useTags';
import { useTerms } from '../../hooks/useTerms';
import { tagsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import TagPicker from './TagPicker';

/** The person's own tags on a record (shared or theirs); each change is saved at once. */
export default function CourseTagsPanel({ courseId }: { courseId: number }) {
  const t = useTerms();
  const text = useText().tags;
  const id = useId();
  const keys = useAccountQueryKeys();
  const tags = useTags();
  const mutation = useAccountMutation([keys.catalog('tags')]);
  const selected = tags.data?.courseTags.filter((row) => row.courseId === courseId).map((row) => row.tagId) ?? [];
  return (
    <section aria-labelledby={`${id}-heading`} className="panel">
      <div className="panel-heading">
        <div>
          <h2 id={`${id}-heading`} className="text-sm font-medium">{text.courseTitle}</h2>
          <p className="mt-1 text-xs text-(--muted)">{text.courseHint(t)}</p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {tags.isPending ? (
          <p role="status" className="text-sm text-(--muted)">{text.loading}</p>
        ) : tags.isError ? (
          <p className="text-sm text-red-600">{text.failed}</p>
        ) : (
          <TagPicker
            tags={tags.data.tags}
            selected={selected}
            disabled={mutation.isPending}
            onChange={(tagIds) => void mutation.save(() => tagsAPI.setCourseTags(courseId, tagIds), text.saved)}
          />
        )}
        {mutation.errorMessage && <p role="alert" className="text-sm text-red-600">{mutation.errorMessage}</p>}
      </div>
    </section>
  );
}
