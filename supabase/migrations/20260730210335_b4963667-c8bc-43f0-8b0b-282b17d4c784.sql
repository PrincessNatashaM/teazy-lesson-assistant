REVOKE EXECUTE ON FUNCTION public.consume_feature_usage(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_feature_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_feature_usage(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_feature_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_assessment_upload(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_status(uuid) TO authenticated, service_role;