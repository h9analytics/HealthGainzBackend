ALTER TABLE clinic ADD COLUMN logourl TEXT;

ALTER TABLE exercise ALTER COLUMN sets DROP NOT NULL;
ALTER TABLE exercise ALTER COLUMN reps DROP NOT NULL;
ALTER TABLE exercise ALTER COLUMN hold DROP NOT NULL;
