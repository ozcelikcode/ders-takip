import { brandIconNames } from '@study-tracker/contracts';
import { useSettingsStore } from '../../store/settingsStore';
export const Brand = () => {
  const { siteLogo, siteIcon, siteName } = useSettingsStore(state => state.settings);
  return <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight" title={siteName}>
    <img src={siteLogo || (brandIconNames.some(name => name === siteIcon) ? `/brand-icons/${siteIcon}.svg` : siteIcon || '/brand-mark.svg')} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
    <span className="truncate">{siteName}</span>
  </span>;
};
