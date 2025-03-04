
-- This is a PostgreSQL function to increment the count column
CREATE OR REPLACE FUNCTION public.increment_count(username TEXT) 
RETURNS integer 
LANGUAGE plpgsql 
AS $$
BEGIN
  UPDATE public.users 
  SET count = count + 1 
  WHERE name = username;
  
  RETURN (SELECT count FROM public.users WHERE name = username);
END;
$$;
