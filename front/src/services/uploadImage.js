import { supabase } from "./supabaseClient";

export async function uploadImage(bucket, fileUri, fileName) {
  try {
    // Construir FormData para subir el archivo directamente
    const file = {
      uri: fileUri,
      name: fileName,
      type: "image/jpeg",
    };

    const formData = new FormData();
    formData.append("file", file);

    // Supabase Storage upload vía API nativa de fetch
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);

    if (error) throw error;

    // Obtener URL pública
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;

  } catch (err) {
    console.error("Error al subir imagen:", err);
    return null;
  }
}
