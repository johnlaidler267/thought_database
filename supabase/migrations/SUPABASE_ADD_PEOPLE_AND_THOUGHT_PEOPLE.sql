-- People table: one row per distinct person mentioned by the user
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  clarifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_user_display_lower ON people(user_id, lower(trim(display_name)));

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own people" ON people;
CREATE POLICY "Users can view own people" ON people FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own people" ON people;
CREATE POLICY "Users can insert own people" ON people FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own people" ON people;
CREATE POLICY "Users can update own people" ON people FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own people" ON people;
CREATE POLICY "Users can delete own people" ON people FOR DELETE USING (auth.uid() = user_id);

-- Join table: which thoughts mention which people
CREATE TABLE IF NOT EXISTS thought_people (
  thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (thought_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_thought_people_thought_id ON thought_people(thought_id);
CREATE INDEX IF NOT EXISTS idx_thought_people_person_id ON thought_people(person_id);

ALTER TABLE thought_people ENABLE ROW LEVEL SECURITY;

-- Users can manage thought_people for their own thoughts and people
DROP POLICY IF EXISTS "Users can view thought_people for own data" ON thought_people;
CREATE POLICY "Users can view thought_people for own data" ON thought_people FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM thoughts t WHERE t.id = thought_people.thought_id AND t.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM people p WHERE p.id = thought_people.person_id AND p.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can insert thought_people for own data" ON thought_people;
CREATE POLICY "Users can insert thought_people for own data" ON thought_people FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM thoughts t WHERE t.id = thought_people.thought_id AND t.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM people p WHERE p.id = thought_people.person_id AND p.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can delete thought_people for own data" ON thought_people;
CREATE POLICY "Users can delete thought_people for own data" ON thought_people FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM thoughts t WHERE t.id = thought_people.thought_id AND t.user_id = auth.uid())
  );
