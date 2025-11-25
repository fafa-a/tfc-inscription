const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an image file for upload
 * Checks file size (max 1MB) and file type (JPEG/PNG only)
 */
export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné' };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Format de fichier invalide. Seuls les formats JPEG et PNG sont acceptés.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Le fichier est trop volumineux. Taille maximale : 1 Mo.' };
  }

  return { valid: true };
}

/**
 * Uploads an identity photo to Supabase Storage
 * Path format: avatars/<member_id>/identity.jpg
 */
export async function uploadIdentityPhoto(
  file: File,
  memberId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Lazy load supabase only when needed
    const { supabase } = await import('../lib/supabase');

    // Validate file first
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Determine file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const filePath = `${memberId}/identity.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Allow replacing existing file
    });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
    }

    // Return the path to store in database
    const storagePath = `avatars/${filePath}`;
    return { success: true, path: storagePath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
    };
  }
}

/**
 * Gets the public URL for an identity photo
 */
export async function getIdentityPhotoUrl(path: string): Promise<string> {
  const { supabase } = await import('../lib/supabase');
  const { data } = supabase.storage.from('avatars').getPublicUrl(path.replace('avatars/', ''));
  return data.publicUrl;
}
