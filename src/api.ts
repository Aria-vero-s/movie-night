const ORIGINAL_API_URL =
  "https://script.google.com/macros/s/AKfycbxG4O-DbtB7AuUcCNkMF7h4V2TWnVy3iJDg2TiAxgNiknWtNUZWw9oQAaf5uAhnKZI/exec";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: true, raw: text };
  }
}

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
    body: new URLSearchParams({ action: "addFilm", title, username }),
  });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }

  return result ?? { ok: true };
}

export async function voteFilm(filmId: string, username: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body: new URLSearchParams({ action: "vote", filmId, username }),
  });

  if (result?.ok === false) {
    return { ok: false };
  }

  return { ok: true };
}

export async function unvoteFilm(filmId: string, username: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body: new URLSearchParams({ action: "unvote", filmId, username }),
  });

  if (result?.ok === false) {
    return { ok: false };
  }

  return { ok: true };
}

export async function addComment(filmId: string, username: string, text: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body: new URLSearchParams({ action: "comment", filmId, username, text }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to add comment");
  }

  return result;
}

export async function deleteFilm(filmId: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body: new URLSearchParams({ action: "deleteFilm", filmId }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to delete film");
  }

  return result;
}

export async function updateFilm(filmId: string, title: string) {
  const result = await requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body: new URLSearchParams({ action: "updateFilm", filmId, title }),
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Failed to update film");
  }

  return result;
}