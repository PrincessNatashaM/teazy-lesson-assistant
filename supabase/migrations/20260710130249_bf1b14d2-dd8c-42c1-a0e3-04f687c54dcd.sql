
REVOKE EXECUTE ON FUNCTION public.consume_assessment_upload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assessment_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_assessment_upload(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_status(uuid) TO service_role;
