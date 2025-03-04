
-- This is a PostgreSQL function to increment the count column
CREATE OR REPLACE FUNCTION increment_count() 
RETURNS integer 
LANGUAGE plpgsql 
AS $$
BEGIN
  RETURN (SELECT count + 1 FROM users WHERE name = auth.current_user());
END;
$$;
