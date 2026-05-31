const CLOUDINARY_CLOUD_NAME = "dg4si6icv";
const CLOUDINARY_UPLOAD_PRESET = "ecoguard_upload";

export async function uploadToCloudinary(fileUri, type = "image") {
  if (!fileUri) return null;

  if (fileUri.startsWith("http")) {
    return fileUri;
  }

  const formData = new FormData();

  const fileName = fileUri.split("/").pop() || `ecoguard-${Date.now()}`;
  const extension = fileName.split(".").pop()?.toLowerCase();

  let mimeType = "image/jpeg";

  if (type === "video") {
    mimeType = extension === "mov" ? "video/quicktime" : "video/mp4";
  } else {
    mimeType = extension === "png" ? "image/png" : "image/jpeg";
  }

  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  });

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

  const data = await response.json();

  if (!response.ok) {
    console.log("Erro Cloudinary:", data);
    throw new Error(data?.error?.message || "Erro ao enviar mídia.");
  }

  return data.secure_url;
}