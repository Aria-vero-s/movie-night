const DB = "https://movie-night-c8c26-default-rtdb.europe-west1.firebasedatabase.app";

async function fbGet(path: string) {
  const res = await fetch(`${DB}/${path}.json`);
  return res.json();
}

async function fbPost(path: string, data: object) {
  const res = await fetch(`${DB}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function fbPut(path: string, data: unknown) {
  const res = await fetch(`${DB}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function fbPatch(path: string, data: object) {
  await fetch(`${DB}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function fbDelete(path: string) {
  await fetch(`${DB}/${path}.json`, { method: "DELETE" });
}

export async function getFilms() {
  const data = await fbGet("films");
  if (!data) return [];
  return Object.entries(data).map(([id, film]: [string, any]) => ({ id, ...film }));
}

export async function getVotes() {
  const data = await fbGet("votes");
  if (!data) return [];
  const votes: { filmId: string; username: string }[] = [];
  for (const [filmId, users] of Object.entries(data as Record<string, Record<string, boolean>>)) {
    for (const username of Object.keys(users)) {
      votes.push({ filmId, username });
    }
  }
  return votes;
}

export async function getComments() {
  const data = await fbGet("comments");
  if (!data) return [];
  const comments: { id: string; filmId: string; author: string; text: string }[] = [];
  for (const [filmId, filmComments] of Object.entries(data as Record<string, any>)) {
    for (const [id, comment] of Object.entries(filmComments as Record<string, any>)) {
      comments.push({ id, filmId, ...(comment as object) } as any);
    }
  }
  return comments;
}

export async function createFilm(title: string, username: string) {
  const result = await fbPost("films", {
    title,
    author: username,
    createdAt: new Date().toISOString(),
  });
  if (!result?.name) throw new Error("Failed to create film");
  return { ok: true, id: result.name as string };
}

export async function voteFilm(filmId: string, username: string) {
  await fbPut(`votes/${filmId}/${username}`, true);
  return { ok: true };
}

export async function unvoteFilm(filmId: string, username: string) {
  await fbDelete(`votes/${filmId}/${username}`);
  return { ok: true };
}

export async function addComment(filmId: string, username: string, text: string) {
  const result = await fbPost(`comments/${filmId}`, {
    author: username,
    text,
    createdAt: new Date().toISOString(),
  });
  if (!result?.name) throw new Error("Failed to add comment");
  return { ok: true, id: result.name as string };
}

export async function deleteComment(filmId: string, commentId: string) {
  await fbDelete(`comments/${filmId}/${commentId}`);
  return { ok: true };
}

export async function updateComment(filmId: string, commentId: string, text: string) {
  await fbPatch(`comments/${filmId}/${commentId}`, { text });
  return { ok: true };
}

export async function deleteFilm(filmId: string) {
  await Promise.all([
    fbDelete(`films/${filmId}`),
    fbDelete(`votes/${filmId}`),
    fbDelete(`comments/${filmId}`),
  ]);
  return { ok: true };
}

export async function updateFilm(filmId: string, title: string) {
  await fbPatch(`films/${filmId}`, { title });
  return { ok: true };
}
