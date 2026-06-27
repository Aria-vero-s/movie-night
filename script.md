###This is the google script
### https://script.google.com/home/projects/1XF98tD3j0WZ9rIjMtNX2t39mbteEwqEUo7gtWCq5lvp3TZkAzdR1n6wY/edit

```
const SHEET_ID = "1JKcOTaDa2d_elo07PKVg3F-MhspO11yTsOUYiwmOzpQ";

// ---------- ROUTING ----------

function doGet(e) {
  const action = e.parameter.action;

  switch (action) {
    case "films":
      return getFilms();
    case "votes":
      return getVotes();
    case "comments":
      return getComments();
    default:
      return json({ error: "bad request" });
  }
}

function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch { data = e.parameter || {}; }
    } else {
      data = e.parameter || {};
    }

    switch (data.action) {
      case "addFilm":
        return addFilm(data);
      case "vote":
        return vote(data);
      case "unvote":
        return unvote(data);
      case "comment":
        return addComment(data);
      case "deleteFilm":
        return deleteFilm(data);
      case "updateFilm":
        return updateFilm(data);
      default:
        return json({ error: "bad request" });
    }
  } catch (err) {
    return json({ error: "invalid JSON", details: String(err) });
  }
}

// ---------- SHEETS ----------

function sheet(name) {
  const s = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!s) throw new Error("Sheet not found: " + name);
  return s;
}

// ---------- GET ----------

function getFilms() {
  const rows = sheet("Films").getDataRange().getValues().slice(1);

  return json(
    rows.map(r => ({
      id: r[0],
      title: r[1],
      author: r[2],
      createdAt: r[3],
    }))
  );
}

function getVotes() {
  const rows = sheet("Votes").getDataRange().getValues().slice(1);

  return json(
    rows.map(r => ({
      filmId: r[0],
      username: r[1],
      createdAt: r[2],
    }))
  );
}

function getComments() {
  const rows = sheet("Comments").getDataRange().getValues().slice(1);

  return json(
    rows.map(r => ({
      filmId: r[0],
      author: r[1],
      text: r[2],
      createdAt: r[3],
    }))
  );
}

// ---------- POST ----------

function addFilm(d) {
  if (!d.title || !d.username) {
    return json({ error: "missing fields" });
  }

  sheet("Films").appendRow([
    Utilities.getUuid(),
    d.title,
    d.username,
    new Date(),
  ]);

  return json({ ok: true });
}

function vote(d) {
  if (!d.filmId || !d.username) {
    return json({ error: "missing fields" });
  }

  const votesSheet = sheet("Votes");
  const rows = votesSheet.getDataRange().getValues().slice(1);

  // check si déjà voté
  const alreadyVoted = rows.some(r =>
    r[0] === d.filmId && r[1] === d.username
  );

  if (alreadyVoted) {
    return json({ ok: false, message: "already voted" });
  }

  votesSheet.appendRow([
    d.filmId,
    d.username,
    new Date(),
  ]);

  return json({ ok: true });
}

function addComment(d) {
  if (!d.filmId || !d.username || !d.text) {
    return json({ error: "missing fields" });
  }

  sheet("Comments").appendRow([
    d.filmId,
    d.username,
    d.text,
    new Date(),
  ]);

  return json({ ok: true });
}

function unvote(d) {
  if (!d.filmId || !d.username) {
    return json({ error: "missing fields" });
  }

  const votesSheet = sheet("Votes");
  const rows = votesSheet.getDataRange().getValues();

  for (let i = rows.length - 1; i > 0; i--) {
    if (String(rows[i][0]) === String(d.filmId) && String(rows[i][1]) === String(d.username)) {
      votesSheet.deleteRow(i + 1);
      break;
    }
  }

  return json({ ok: true });
}

function deleteFilm(d) {
  if (!d.filmId) {
    return json({ error: "missing fields" });
  }

  const filmSheet = sheet("Films");
  const rows = filmSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.filmId)) {
      filmSheet.deleteRow(i + 1);
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: "film not found" });
}

function updateFilm(d) {
  if (!d.filmId || !d.title) {
    return json({ error: "missing fields" });
  }

  const filmSheet = sheet("Films");
  const rows = filmSheet.getDataRange().getValues();
  const rowIndex = rows.findIndex(r => String(r[0]) === String(d.filmId));

  if (rowIndex < 0) {
    return json({ ok: false, error: "film not found" });
  }

  filmSheet.getRange(rowIndex + 2, 2).setValue(d.title);
  return json({ ok: true });
}

// ---------- HELPER ----------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```