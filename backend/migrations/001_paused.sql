ALTER TABLE requests DROP CONSTRAINT requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (status IN ('submitted','assigned','in_progress','awaiting_proof','paused','completed','cancelled'));
ALTER TABLE request_events DROP CONSTRAINT request_events_status_check;
ALTER TABLE request_events ADD CONSTRAINT request_events_status_check CHECK (status IN ('submitted','assigned','in_progress','awaiting_proof','paused','completed','cancelled'));
DROP INDEX one_active_job_per_staff;
CREATE UNIQUE INDEX one_working_job_per_staff ON requests (assigned_to) WHERE status IN ('in_progress','awaiting_proof');
