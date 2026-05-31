import * as FileSystem from "expo-file-system/legacy";

const CLOUDINARY_CLOUD_NAME = "dg4si6icv";
const CLOUDINARY_UPLOAD_PRESET = "ecoguard_upload";

function getMimeType(fileUri, type = "image") {
  const extension = String(fileUri).split(".").pop()?.toLowerCase();

  if (type === "video") {
    if (extension === "mov") return "video/quicktime";
    if (extension === "webm") return "video/webm";
    return "video/mp4";
  }

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

export async function uploadToCloudinary(fileUri, type = "image") {
  if (!fileUri) return null;

  if (fileUri.startsWith("http")) {
    return fileUri;
  }

  const mimeType = getMimeType(fileUri, type);

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const dataUri = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();

  formData.append("file", dataUri);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "ecoguard");

  const resourceType = type === "video" ? "video" : "image";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const responseText = await response.text();

  let data = null;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.log("Resposta Cloudinary não JSON:", responseText);
  }

  if (!response.ok) {
    console.log("Erro Cloudinary:", data || responseText);

    throw new Error(
      data?.error?.message ||
        "Não foi possível enviar a mídia para a nuvem."
    );
  }

  return data.secure_url;
}