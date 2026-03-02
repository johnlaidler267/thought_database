-- Allow multiple people with the same display_name per user (e.g. "Mike" + clarifier "T." and "Mike" + "coworker").
-- Drop the unique index so "No, different person" and "Someone new" can create a second person with the same name.
DROP INDEX IF EXISTS idx_people_user_display_lower ON people;
