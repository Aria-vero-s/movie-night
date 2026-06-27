const ORIGINAL_API_URL =
  "https://script.google.com/macros/s/AKfycbweDFqppCsPIMpHkUhnOF0oGco9-AVP0s_su49fAvclLgcClDyRNP5uQ_EEtGeFolJ9/exec";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();

  console.log("RAW RESPONSE:", text);

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: true, raw: text };
  }
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export async function getFilms() {
  return requestJson(`${ORIGINAL_API_URL}?action=films`);
}

export async function getVotes() {
  return requestJson(`${ORIGINAL_API_URL}?action=votes`);
}

export async function getComments() {
  return requestJson(`${ORIGINAL_API_URL}?action=comments`);
}

export async function createFilm(title: string, username: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      action: "addFilm",
      title,
      username,
    }),
  });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }

  return result ?? { ok: true };
}

export async function voteFilm(filmId: string, username: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      action: "vote",
      filmId,
      username,
    }),
  });

  if (result?.ok === false) {
    return { ok: false };
  }

  return { ok: true };
}

export async function addComment(filmId: string, username: string, text: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      action: "comment",
      filmId,
      username,
      text,
    }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to add comment");
  }

  return result;
}

export async function deleteFilm(filmId: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      action: "deleteFilm",
      filmId,
    }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to delete film");
  }

  return result;
}

export async function updateFilm(filmId: string, title: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      action: "updateFilm",
      filmId,
      title,
    }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to update film");
  }

  return result;
}