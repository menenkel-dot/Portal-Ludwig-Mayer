import { supabase } from '@/lib/supabase';
import { SiteNote } from '@/types';

const BUCKET_NAME = 'site_note_attachments';

export type NewNotePayload = {
  site_id: string;
  user_id: string;
  user_email: string;
  content: string | null;
  files: File[];
};

export const getNotesForSite = async (siteId: string): Promise<SiteNote[]> => {
  const { data, error } = await supabase
    .from('site_notes')
    .select('*, site_note_attachments(*)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const createNote = async ({ site_id, user_id, user_email, content, files }: NewNotePayload): Promise<SiteNote> => {
  // 1. Insert the note
  const { data: noteData, error: noteError } = await supabase
    .from('site_notes')
    .insert({ site_id, user_id, user_email, content })
    .select()
    .single();

  if (noteError) {
    console.error('Error creating note:', noteError);
    throw new Error(noteError.message);
  }

  // 2. Upload files and insert attachment records
  if (files.length > 0) {
    const uploadPromises = files.map(async (file) => {
      const filePath = `${site_id}/${noteData.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        await supabase.from('site_notes').delete().eq('id', noteData.id);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      return {
        note_id: noteData.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      };
    });

    const attachments = await Promise.all(uploadPromises);

    const { error: attachmentError } = await supabase
      .from('site_note_attachments')
      .insert(attachments);

    if (attachmentError) {
      console.error('Error creating attachment records:', attachmentError);
      await supabase.from('site_notes').delete().eq('id', noteData.id);
      const filePaths = attachments.map(a => a.file_path);
      await supabase.storage.from(BUCKET_NAME).remove(filePaths);
      throw new Error(attachmentError.message);
    }
  }

  const { data: completeNote, error: fetchError } = await supabase
    .from('site_notes')
    .select('*, site_note_attachments(*)')
    .eq('id', noteData.id)
    .single();
  
  if (fetchError) {
    console.error('Error fetching complete note:', fetchError);
    throw new Error(fetchError.message);
  }

  return completeNote;
};

export const deleteNote = async (note: SiteNote): Promise<boolean> => {
  if (note.site_note_attachments && note.site_note_attachments.length > 0) {
    const filePaths = note.site_note_attachments.map(a => a.file_path);
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);
    
    if (storageError) {
      console.error('Error deleting files from storage:', storageError);
      throw new Error(storageError.message);
    }
  }

  const { error: dbError } = await supabase
    .from('site_notes')
    .delete()
    .eq('id', note.id);

  if (dbError) {
    console.error('Error deleting note record:', dbError);
    throw new Error(dbError.message);
  }

  return true;
};

export const getAttachmentPublicUrl = (filePath: string): string => {
    const { data } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return data.publicUrl;
}