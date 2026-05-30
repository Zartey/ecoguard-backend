export const API_URL = "https://ecoguard-api-hzut.onrender.com";

export async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      console.log("Erro da API:", {
        url: `${API_URL}${path}`,
        status: response.status,
        data,
      });

      const message =
        data?.message ||
        data?.error ||
        `Erro ${response.status}: não foi possível comunicar com o servidor.`;

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.log("Falha na requisição:", {
      url: `${API_URL}${path}`,
      erro: error.message,
    });

    throw new Error(error.message || "Não foi possível comunicar com o servidor.");
  }
}