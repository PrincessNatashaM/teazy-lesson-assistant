
CREATE POLICY "Users manage own assessment uploads read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assessment-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users manage own assessment uploads write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assessment-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users manage own assessment uploads update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assessment-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users manage own assessment uploads delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assessment-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
