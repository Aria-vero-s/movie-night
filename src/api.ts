const API_URL =
  "https://script.google.com/macros/s/AKfycbyuTwtfE8IWFQyji4UgrhBiK3eCwZ18SwldTMP_DmAfMogPMH7mhuR6gAXWmb-NJaG9/exec";

export async function getFilms() {
  return fetch(`${API_URL}?action=films`).then(r => r.json());
}

export async function getVotes() {
  return fetch(`${API_URL}?action=votes`).then(r => r.json());
}

export async function getComments() {
  return fetch(`${API_URL}?action=comments`).then(r => r.json());
}

export async function addFilm(title: string, username: string) {
  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addFilm",
      title,
      username
    }),
  });
}

export async function vote(filmId: string, username: string) {
  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "vote",
      filmId,
      username
    }),
  });
}

export async function comment(filmId: string, username: string, text: string) {
  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "comment",
      filmId,
      username,
      text
    }),
  });
}