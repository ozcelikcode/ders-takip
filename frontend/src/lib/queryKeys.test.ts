import { expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { accountQueryKeys } from './queryKeys';
it('isolates accounts, timezones and dates while invalidating every derived session view',async()=>{
 const client=new QueryClient();const a=accountQueryKeys('A','Europe/Istanbul'),b=accountQueryKeys('B','Europe/Istanbul');
 const keys=[a.sessions('daily','2026-10-15'),a.sessions('daily','2026-10-16'),a.sessions('weekly','2026-10-12'),accountQueryKeys('A','UTC').sessions('daily','2026-10-15'),b.sessions('daily','2026-10-15')];
 keys.forEach((key,index)=>client.setQueryData(key,index));await client.invalidateQueries({queryKey:a.sessions()});
 for(const key of keys.slice(0,4))expect(client.getQueryState(key)?.isInvalidated).toBe(true);
 expect(client.getQueryState(keys[4]!)?.isInvalidated).toBe(false);expect(accountQueryKeys('A','UTC').sessions('daily','2026-10-15')).not.toEqual(keys[0]);client.clear();
});
