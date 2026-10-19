CREATE POLICY "Users read own workspace files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own workspace files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own workspace files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'workspace-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own lesson videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-videos' AND (storage.foldername(name))[1] = auth.uid()::text);