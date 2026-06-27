const ORIGINAL_API_URL =
  "https://script.google.com/macros/s/AKfycbwEew6lUMvImhcHIddOona90LTU-JhntDhx5lzQT84mCEKa2EsRSDifYfvPvHJwS3a0/exec";

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

function isOkResult(result: unknown): result is { ok: true } {
  return !!result && typeof result === "object" && (result as { ok?: boolean }).ok === true;
}

function postAction(params: Record<string, string>) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });
  return requestJson(ORIGINAL_API_URL, {
    method: "POST",
    body,
  });
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
  const result = await postAction({
    action: "addFilm",
    title,
    username,
  });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }

  if (!isOkResult(result)) {
    throw new Error("Failed to create film");
  }

  return result;
}

export async function voteFilm(filmId: string, username: string) {
  const result = await postAction({
    action: "vote",
    filmId,
    username,
  });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }

  return { ok: isOkResult(result) };
}

export async function unvoteFilm(filmId: string, username: string) {
  const result = await postAction({
    action: "unvote",
    filmId,
    username,
  });

  if (result && typeof result === "object" && "error" in result) {
    throw new Error(String(result.error));
  }

  return { ok: isOkResult(result) };
}

export async function addComment(filmId: string, username: string, text: string) {
  const result = await postAction({
    action: "comment",
    filmId,
    username,
    text,
  });

  if (!isOkResult(result)) {
    throw new Error(result?.error || "Failed to add comment");
  }

  return result;
}

export async function deleteFilm(filmId: string) {
  const result = await postAction({
    action: "deleteFilm",
    filmId,
  });

  if (!isOkResult(result)) {
    throw new Error(result?.error || "Failed to delete film");
  }

  return result;
}

export async function updateFilm(filmId: string, title: string) {
  const result = await postAction({
    action: "updateFilm",
    filmId,
    title,
  });

  if (!isOkResult(result)) {
    throw new Error(result?.error || "Failed to update film");
  }

  return result;
}