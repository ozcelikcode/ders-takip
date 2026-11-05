import type { SelectOption } from '../common/Select';
import { catalogIcons } from './catalogIcons';

/** Icon names for a picker, each shown with its icon; an unknown stored name stays choosable under `currentLabel`. */
export const iconChoices = (current: string, currentLabel: string): SelectOption<string>[] => [
  ...(Object.prototype.hasOwnProperty.call(catalogIcons, current) ? [] : [{ value: current, label: currentLabel }]),
  ...Object.entries(catalogIcons).map(([name, Icon]) => ({
    value: name,
    label: name,
    icon: <Icon className="h-4 w-4 shrink-0 text-(--muted)" aria-hidden="true" />,
  })),
];
