-- Notifications older than this are shown as read ("Mark all read").
ALTER TABLE "profiles" ADD COLUMN "notifications_read_at" TIMESTAMPTZ(6);
