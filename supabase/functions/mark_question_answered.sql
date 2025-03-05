-- Create the mark_question_answered function
CREATE OR REPLACE FUNCTION mark_question_answered(question_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure the column exists
  UPDATE questions
  SET answered = TRUE
  WHERE id = question_id;
END;
$$; 