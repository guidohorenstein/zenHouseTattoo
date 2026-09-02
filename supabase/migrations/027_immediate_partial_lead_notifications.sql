update public.app_settings
set value = value - 'delayMinutes'
where key = 'lead_notifications';

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'process-lead-notifications-every-minute'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
exception
  when undefined_table or invalid_schema_name then
    null;
end $$;

notify pgrst, 'reload schema';