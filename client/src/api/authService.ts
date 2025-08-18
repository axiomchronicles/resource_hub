const API_BASE_URL = `${import.meta.env.VITE_API_URL}/auth`;

export const loginUser = async (credentials: object) => {
  const response = await fetch(`${API_BASE_URL}/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Login failed");
  }

  return response.json();
};

export const fetchCurrentUser = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/me/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user data. Invalid token.");
  }

  return response.json();
};