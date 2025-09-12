// import { supabase } from "./supabaseClient"; 
// import * as FileSystem from "expo-file-system";

// export async function uploadImage(fileUri, fileName) {
//   try {
//     // Leer el archivo como base64
//     const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: "base64" });

//     // Subir a Supabase usando base64
//     const { data, error } = await supabase.storage
//       .from("eventos")
//       .upload(fileName, base64, {
//         contentType: "image/jpeg",
//         upsert: true,
//         // Indica que estás pasando un string base64
//         options: { upsert: true },
//       });

//     if (error) throw error;

//     const { data: urlData } = supabase.storage.from("eventos").getPublicUrl(fileName);

//     return urlData.publicUrl;
//   } catch (err) {
//     console.error("Error al subir imagen:", err);
//     return null;
//   }
// }

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
