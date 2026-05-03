-- Make chat-attachments bucket private and restrict read to owner
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

DROP POLICY IF EXISTS "Chat attachments read public" ON storage.objects;

CREATE POLICY "Chat attachments owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );