import { supabase } from '@/lib/supabase';
import { SiteDocument } from '@/types';

const BUCKET_NAME = 'site_documents';

export const getDocumentsForSite = async (siteId: string): Promise<SiteDocument[]> => {
  const { data, error } = await supabase
    .from('site_documents')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(error.message);
  }
  return data || [];
};

export const uploadDocument = async (siteId: string, file: File, description: string | null): Promise<SiteDocument> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${siteId}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data, error: dbError } = await supabase
    .from('site_documents')
    .insert({
      site_id: siteId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      description: description,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Error creating document record:', dbError);
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    throw new Error(dbError.message);
  }

  return data;
};

export const deleteDocument = async (document: SiteDocument): Promise<boolean> => {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([document.file_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    throw new Error(storageError.message);
  }

  const { error: dbError } = await supabase
    .from('site_documents')
    .delete()
    .eq('id', document.id);

  if (dbError) {
    console.error('Error deleting document record:', dbError);
    throw new Error(dbError.message);
  }

  return true;
};

export const getDocumentPublicUrl = (filePath: string): string => {
    const { data } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return data.publicUrl;
}