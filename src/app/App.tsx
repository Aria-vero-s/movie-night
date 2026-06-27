import { useState, useEffect } from "react";
import { getFilms, getComments, getVotes, createFilm, voteFilm, unvoteFilm, addComment as addCommentApi, deleteFilm, updateFilm } from "../api";
import { Heart, Plus, Send, Trophy, Trash2, Pencil, Check, X } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  author: string;
}

interface Movie {
  id: string;
  title: string;
  author: string;
  votes: number;
  comments: Comment[];
  rotation: number;
  isPending?: boolean;
}

const POSTIT_COLORS = [
  { bg: "#fffde7", border: "#f9e84a" },
  { bg: "#fce4ec", border: "#f48fb1" },
  { bg: "#e8f5e9", border: "#a5d6a7" },
  { bg: "#e3f2fd", border: "#90caf9" },
  { bg: "#fff3e0", border: "#ffcc80" },
  { bg: "#f3e5f5", border: "#ce93d8" },
  { bg: "#e0f7fa", border: "#80deea" },
];

function pickColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return POSTIT_COLORS[Math.abs(hash) % POSTIT_COLORS.length];
}

function pickRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (id.charCodeAt(i) * 31 + hash) | 0;
  const vals = [-3.5, -2.5, -1.5, -0.8, 0.8, 1.5, 2.5, 3.5];
  return vals[Math.abs(hash) % vals.length];
}

function normalizeItems(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.rows)) return obj.rows;
  }
  return [];
}

function extractValue(payload: any, ...keys: (string | number)[]) {
  for (const key of keys) {
    const value = payload?.[key as keyof typeof payload];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function extractFilmIdFromMutationResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const payload = result as any;
  const direct = extractValue(payload, "filmId", "id");
  if (direct) return String(direct);
  const nested = extractValue(payload, "film", "item", "data");
  if (nested && typeof nested === "object") {
    const nestedId = extractValue(nested as any, "filmId", "id");
    if (nestedId) return String(nestedId);
  }
  return null;
}

function findCreatedFilmId(
  filmsResponse: unknown,
  knownFilmIds: Set<string>,
  title: string,
  author: string
): string | null {
  const titleLower = title.trim().toLowerCase();
  const authorLower = author.trim().toLowerCase();

  const candidates = normalizeItems(filmsResponse)
    .map((movie: any, index: number) => {
      const payload = movie && typeof movie === "object" ? movie : { id: movie };
      const id = String(extractValue(payload, "id", 0, index) ?? "");
      return {
        id,
        title: String(extractValue(payload, "title", 1) ?? ""),
        author: String(extractValue(payload, "author", 2) ?? ""),
      };
    })
    .filter((movie) => movie.id);

  const exactNew = candidates.filter(
    (movie) =>
      !knownFilmIds.has(movie.id) &&
      movie.title.trim().toLowerCase() === titleLower &&
      movie.author.trim().toLowerCase() === authorLower
  );
  if (exactNew.length > 0) return exactNew[exactNew.length - 1].id;

  const exactAny = candidates.filter(
    (movie) =>
      movie.title.trim().toLowerCase() === titleLower &&
      movie.author.trim().toLowerCase() === authorLower
  );
  if (exactAny.length > 0) return exactAny[exactAny.length - 1].id;

  return null;
}

function mapApiState(
  films: unknown,
  comments: unknown,
  votes: unknown,
  username: string,
  previousMovies: Movie[]
): { movies: Movie[]; userVotedFilmIds: Set<string> } {
  const filmItems = normalizeItems(films);
  const commentItems = normalizeItems(comments);
  const voteItems = normalizeItems(votes);

  const commentsByFilmId = new Map<string, Comment[]>();
  commentItems.forEach((comment: any) => {
    const filmId = String(extractValue(comment, "filmId", "movieId", "film_id", 0) ?? "");
    if (!filmId) return;
    const next = commentsByFilmId.get(filmId) ?? [];
    next.push({
      id: String(extractValue(comment, "id", 4) ?? crypto.randomUUID()),
      text: String(extractValue(comment, "text", 2) ?? ""),
      author: String(extractValue(comment, "author", "username", 1) ?? "Anonyme"),
    });
    commentsByFilmId.set(filmId, next);
  });

  const voteCounts = new Map<string, number>();
  const userVotedFilmIds = new Set<string>();
  voteItems.forEach((vote: any) => {
    const filmId = String(extractValue(vote, "filmId", "movieId", "film_id", 0) ?? "");
    if (!filmId) return;
    voteCounts.set(filmId, (voteCounts.get(filmId) ?? 0) + 1);
    const voteAuthor = String(extractValue(vote, "username", "author", 1) ?? "");
    if (voteAuthor && voteAuthor === username) {
      userVotedFilmIds.add(filmId);
    }
  });

  const previousById = new Map(previousMovies.map((movie) => [movie.id, movie]));
  const seenIds = new Set<string>();
  const mappedMovies: Movie[] = [];

  filmItems.forEach((movie: any, index: number) => {
    const payload = movie && typeof movie === "object" ? movie : { id: movie };
    const movieId = String(extractValue(payload, "id", 0, index) ?? "");
    if (!movieId || seenIds.has(movieId)) return;
    seenIds.add(movieId);
    const previous = previousById.get(movieId);
    mappedMovies.push({
      id: movieId,
      title: String(extractValue(payload, "title", 1) ?? ""),
      author: String(extractValue(payload, "author", 2) ?? "Anonyme"),
      votes: Number(extractValue(payload, "votes", 4) ?? voteCounts.get(movieId) ?? 0),
      comments: commentsByFilmId.get(movieId) ?? [],
      rotation: previous?.rotation ?? pickRotation(movieId),
      isPending: false,
    });
  });

  return { movies: mappedMovies, userVotedFilmIds };
}

function HeartButton({
  count,
  voted,
  disabled,
  onToggle,
}: {
  count: number;
  voted: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const [popping, setPopping] = useState(false);

  function handleClick() {
    if (popping || disabled) return;
    setPopping(true);
    onToggle();
    setTimeout(() => setPopping(false), 350);
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label="Voter"
    >
      <span
        style={{
          display: "inline-flex",
          transform: popping ? "scale(1.5)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(.36,2,.6,.7)",
        }}
      >
        <Heart
          size={16}
          className={`transition-colors duration-200 ${
            voted ? "fill-rose-400 stroke-rose-400" : "stroke-gray-400 hover:stroke-rose-300"
          }`}
        />
      </span>
      <span className="text-sm font-bold text-gray-500 tabular-nums">{count}</span>
    </button>
  );
}

function CommentSection({
  comments,
  onAdd,
  onEdit,
  onDelete,
  disabled,
  username,
}: {
  comments: Comment[];
  onAdd: (text: string) => void;
  onEdit: (commentId: string, newText: string) => void;
  onDelete: (commentId: string) => void;
  disabled: boolean;
  username: string;
}) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onAdd(t);
    setText("");
  }

  function confirmEdit(commentId: string) {
    const t = editVal.trim();
    if (!t) return;
    onEdit(commentId, t);
    setEditingId(null);
    setEditVal("");
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-black/10">
      {comments.length > 0 && (
        <ul className="mb-2 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="text-xs text-gray-600 leading-relaxed flex items-start justify-between gap-2 group">
              <div className="min-w-0 flex-1">
                {editingId === c.id ? (
                  <div className="flex gap-1 items-center">
                    <input
                      autoFocus
                      type="text"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-white/70 border border-gray-300 rounded px-2 py-0.5 text-xs outline-none focus:border-gray-400 min-w-0"
                    />
                    <button
                      onClick={() => confirmEdit(c.id)}
                      className="text-emerald-500 hover:text-emerald-600 flex-shrink-0"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-gray-700">{c.author}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    {c.text}
                  </>
                )}
              </div>
              {!editingId && c.author === username && (
                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditVal(c.text);
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-gray-400 hover:text-rose-500"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={disabled}
          placeholder="Commenter…"
          className="flex-1 bg-transparent text-xs text-gray-600 placeholder:text-gray-400 outline-none border-b border-transparent focus:border-gray-300 disabled:opacity-50 transition-colors py-0.5"
        />
        {text.trim() && !disabled && (
          <button onClick={submit} className="text-gray-400 hover:text-gray-700 transition-colors">
            <Send size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function PostIt({
  movie,
  isWinner,
  isOwner,
  voted,
  voteDisabled,
  commentDisabled,
  pendingActions,
  onToggleVote,
  onComment,
  onEditComment,
  onDeleteComment,
  onDelete,
  onEdit,
  username,
}: {
  movie: Movie;
  isWinner: boolean;
  isOwner: boolean;
  voted: boolean;
  voteDisabled: boolean;
  commentDisabled: boolean;
  pendingActions: boolean;
  onToggleVote: () => void;
  onComment: (text: string) => void;
  onEditComment: (commentId: string, newText: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
  username: string;
}) {
  const color = pickColor(movie.id);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(movie.title);

  function confirmEdit() {
    const t = editVal.trim();
    if (t) onEdit(t);
    setEditing(false);
  }

  function cancelEdit() {
    setEditVal(movie.title);
    setEditing(false);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: color.bg,
        borderTop: `3px solid ${color.border}`,
        transform: `rotate(${hovered || editing ? 0 : movie.rotation}deg) ${hovered || editing ? "scale(1.02)" : "scale(1)"}`,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.13)"
          : isWinner
          ? "0 4px 16px rgba(244,114,182,0.18), 0 1px 4px rgba(0,0,0,0.08)"
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
      className={`rounded-sm p-4 w-full break-words cursor-default select-text ${movie.isPending ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="flex-1 bg-white/70 border border-gray-300 rounded px-2 py-0.5 text-sm font-bold text-gray-800 outline-none focus:border-gray-400 min-w-0"
              />
              <button onClick={confirmEdit} className="text-emerald-500 hover:text-emerald-600 flex-shrink-0">
                <Check size={14} />
              </button>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="font-bold text-gray-800 text-base leading-snug break-words">{movie.title}</p>
          )}

          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">
              proposé par <span className="font-bold text-gray-500">{movie.author}</span>
            </p>
            {isOwner && !editing && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pendingActions}
                  onClick={() => { setEditVal(movie.title); setEditing(true); }}
                  className="text-gray-400 hover:text-gray-700 transition-colors bg-black/5 hover:bg-black/10 rounded-md p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Modifier"
                >
                  <Pencil size={12} />
                </button>
                <button
                  disabled={pendingActions}
                  onClick={onDelete}
                  className="text-gray-400 hover:text-rose-500 transition-colors bg-black/5 hover:bg-rose-50 rounded-md p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-0.5">
          <HeartButton count={movie.votes} voted={voted} disabled={voteDisabled} onToggle={onToggleVote} />
        </div>
      </div>
      {movie.isPending && (
        <p className="text-[11px] font-semibold text-gray-500 mb-2">Synchronisation en cours…</p>
      )}
      <CommentSection
        comments={movie.comments}
        onAdd={onComment}
        onEdit={onEditComment}
        onDelete={onDeleteComment}
        disabled={commentDisabled}
        username={username}
      />
    </div>
  );
}

function UsernameGate({ onEnter }: { onEnter: (name: string) => void }) {
  const [val, setVal] = useState("");

  function submit() {
    const t = val.trim();
    if (!t) return;
    onEnter(t);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5" style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-7 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl leading-none">🍿</div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Movie Night</h1>
          <p className="text-gray-500 text-base font-medium">Choisis un pseudo !</p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ton prénom ou pseudo…"
            maxLength={24}
            className="w-full bg-gray-50 border-2 border-gray-100 focus:border-yellow-300 rounded-2xl px-5 py-3 text-base font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal outline-none transition-colors"
          />
          <button
            onClick={submit}
            disabled={!val.trim()}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-base font-black py-3 rounded-2xl transition-colors"
          >
            Entrer 🎬
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [votePendingIds, setVotePendingIds] = useState<Set<string>>(new Set());
  const [commentPendingIds, setCommentPendingIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isAddingMovie, setIsAddingMovie] = useState(false);

  async function loadData(): Promise<void> {
    const [films, comments, votes] = await Promise.all([getFilms(), getComments(), getVotes()]);
    const { movies: mappedMovies, userVotedFilmIds } = mapApiState(
      films,
      comments,
      votes,
      username!,
      movies
    );
    setMovies(mappedMovies);
    setVotedIds(userVotedFilmIds);
  }

  async function reconcileVotesForFilm(filmId: string): Promise<void> {
    const votes = await getVotes();
    const voteItems = normalizeItems(votes);
    let count = 0;
    let votedByCurrentUser = false;

    voteItems.forEach((vote: any) => {
      const votedFilmId = String(extractValue(vote, "filmId", "movieId", "film_id", 0) ?? "");
      if (votedFilmId !== filmId) return;
      count += 1;
      const voteAuthor = String(extractValue(vote, "username", "author", 1) ?? "");
      if (voteAuthor === username) {
        votedByCurrentUser = true;
      }
    });

    setMovies((prev) => prev.map((movie) => (movie.id === filmId ? { ...movie, votes: count } : movie)));
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (votedByCurrentUser) {
        next.add(filmId);
      } else {
        next.delete(filmId);
      }
      return next;
    });
  }

  useEffect(() => {
    if (username) {
      void loadData();
    }
  }, [username]);

  if (!username) return <UsernameGate onEnter={setUsername} />;

  const topId = movies.reduce<string | null>((maxId, movie) => {
    const maxVotes = movies.find((m) => m.id === maxId)?.votes ?? -1;
    return movie.votes > maxVotes ? movie.id : maxId;
  }, null);

  async function addMovie() {
    const title = input.trim();
    if (!title || isAddingMovie) return;

    const tempId = crypto.randomUUID();
    const knownFilmIds = new Set(movies.filter((movie) => !movie.isPending).map((movie) => movie.id));
    const optimisticMovie: Movie = {
      id: tempId,
      title,
      author: username!,
      votes: 0,
      comments: [],
      rotation: pickRotation(tempId),
      isPending: true,
    };

    const previousMovies = [...movies];

    setMovies((prev) => [optimisticMovie, ...prev]);
    setIsAddingMovie(true);
    setInput("");
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2200);

    try {
      const result = await createFilm(title, username!);
      if (!result?.ok) {
        throw new Error("Create film failed");
      }

      let persistedId = extractFilmIdFromMutationResult(result);
      if (!persistedId) {
        const films = await getFilms();
        persistedId = findCreatedFilmId(films, knownFilmIds, title, username!);
      }

      if (!persistedId) {
        throw new Error("Unable to resolve persisted film id");
      }

      setMovies((prev) => {
        const hasPersistedMovie = prev.some((movie) => movie.id === persistedId);
        if (hasPersistedMovie) {
          return prev.filter((movie) => movie.id !== tempId);
        }

        return prev.map((movie) =>
          movie.id === tempId
            ? {
                ...movie,
                id: persistedId,
                rotation: pickRotation(persistedId),
                isPending: false,
              }
            : movie
        );
      });
    } catch (error) {
      setMovies(previousMovies);
      console.error("Failed to create film", error);
    } finally {
      setIsAddingMovie(false);
    }
  }

  async function toggleVote(id: string) {
    const movie = movies.find((item) => item.id === id);
    if (!movie || movie.isPending || votePendingIds.has(id)) return;

    const alreadyVoted = votedIds.has(id);
    const previousVotedIds = new Set(votedIds);
    const previousMovies = [...movies];

    setVotePendingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setVotedIds((prev) => {
      const next = new Set(prev);
      alreadyVoted ? next.delete(id) : next.add(id);
      return next;
    });

    setMovies((prev) =>
      prev.map((currentMovie) =>
        currentMovie.id === id
          ? { ...currentMovie, votes: Math.max(0, currentMovie.votes + (alreadyVoted ? -1 : 1)) }
          : currentMovie
      )
    );

    try {
      const res = alreadyVoted ? await unvoteFilm(id, username!) : await voteFilm(id, username!);
      if (!res.ok) {
        setMovies(previousMovies);
        setVotedIds(new Set(previousVotedIds));
        await reconcileVotesForFilm(id).catch((reconcileError) => {
          console.error("Failed to reconcile votes", reconcileError);
        });
      }
    } catch (error) {
      setVotedIds(new Set(previousVotedIds));
      setMovies(previousMovies);
      console.error("Failed to vote", error);
      await reconcileVotesForFilm(id).catch((reconcileError) => {
        console.error("Failed to reconcile votes", reconcileError);
      });
    } finally {
      setVotePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteMovie(id: string) {
    const movie = movies.find((item) => item.id === id);
    if (!movie || movie.isPending) return;

    const previousMovies = [...movies];
    const previousVotedIds = new Set(votedIds);

    setMovies((prev) => prev.filter((movie) => movie.id !== id));
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await deleteFilm(id);
    } catch (error) {
      setMovies(previousMovies);
      setVotedIds(new Set(previousVotedIds));
      console.error("Failed to delete film", error);
    }
  }

  async function editMovie(id: string, newTitle: string) {
    const targetMovie = movies.find((movie) => movie.id === id);
    if (!targetMovie || targetMovie.isPending) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || trimmedTitle === targetMovie.title) return;

    const previousMovies = [...movies];

    setMovies((prev) => prev.map((movie) => (movie.id === id ? { ...movie, title: trimmedTitle } : movie)));

    try {
      const result = await updateFilm(id, trimmedTitle);
      if (!result?.ok) {
        setMovies(previousMovies);
      }
    } catch (error) {
      setMovies(previousMovies);
      console.error("Failed to update film", error);
    }
  }

  async function addComment(id: string, text: string) {
    const movie = movies.find((item) => item.id === id);
    if (!movie || movie.isPending || commentPendingIds.has(id)) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    const optimisticCommentId = crypto.randomUUID();
    const optimisticComment: Comment = {
      id: optimisticCommentId,
      text: trimmedText,
      author: username!,
    };

    setCommentPendingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setMovies((prev) =>
      prev.map((movieItem) =>
        movieItem.id === id
          ? {
              ...movieItem,
              comments: [...movieItem.comments, optimisticComment],
            }
          : movieItem
      )
    );

    try {
      await addCommentApi(id, username!, trimmedText);
    } catch (error) {
      setMovies((prev) =>
        prev.map((movieItem) =>
          movieItem.id === id
            ? {
                ...movieItem,
                comments: movieItem.comments.filter((comment) => comment.id !== optimisticCommentId),
              }
            : movieItem
        )
      );
      console.error("Failed to add comment", error);
    } finally {
      setCommentPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function editComment(filmId: string, commentId: string, newText: string) {
    const trimmedText = newText.trim();
    if (!trimmedText) return;

    setMovies((prev) =>
      prev.map((movieItem) =>
        movieItem.id === filmId
          ? {
              ...movieItem,
              comments: movieItem.comments.map((comment) =>
                comment.id === commentId ? { ...comment, text: trimmedText } : comment
              ),
            }
          : movieItem
      )
    );
  }

  async function deleteComment(filmId: string, commentId: string) {
    setMovies((prev) =>
      prev.map((movieItem) =>
        movieItem.id === filmId
          ? {
              ...movieItem,
              comments: movieItem.comments.filter((comment) => comment.id !== commentId),
            }
          : movieItem
      )
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🍿</span>
          <span className="text-xl font-black text-gray-900 tracking-tight">Movie Night</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5">
          <span className="text-base leading-none">👋</span>
          <span className="text-sm font-bold text-gray-700">{username}</span>
        </div>
      </div>

      {/* Tagline */}
      <div className="max-w-5xl mx-auto px-6 pt-5 pb-6">
        <p className="text-gray-400 font-semibold text-sm">😊 Proposez vos films et votez !</p>
      </div>

      {/* Add movie */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 flex flex-col gap-3">
          <p className="text-sm font-black text-gray-600 uppercase tracking-widest">🎥 Ajouter un film</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMovie()}
              disabled={isAddingMovie}
              placeholder="Titre du film…"
              className="flex-1 bg-white border-2 border-gray-100 focus:border-yellow-300 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal outline-none disabled:opacity-60 transition-colors"
            />
            <button
              onClick={addMovie}
              disabled={isAddingMovie || !input.trim()}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black px-5 py-2.5 rounded-2xl transition-colors whitespace-nowrap"
            >
              <Plus size={15} />
              Ajouter
            </button>
          </div>
          <div
            className="text-sm font-bold text-emerald-500 transition-all duration-300 leading-none"
            style={{ opacity: confirmed ? 1 : 0, transform: confirmed ? "translateY(0)" : "translateY(-4px)" }}
          >
            🎉 Ajouté !
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-black text-gray-600 uppercase tracking-widest">
            ⭐ {movies.length} film{movies.length !== 1 ? "s" : ""} au total
          </span>
        </div>

        {movies.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <span className="text-5xl">🎞️</span>
            <p className="text-gray-400 font-semibold">Aucun film pour l&apos;instant — soyez le premier !</p>
          </div>
        ) : (
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {movies.map((movie) => (
              <div key={movie.id}>
                <PostIt
                  movie={movie}
                  isWinner={movie.id === topId && movie.votes > 0}
                  isOwner={movie.author === username}
                  voted={votedIds.has(movie.id)}
                  voteDisabled={movie.isPending === true || votePendingIds.has(movie.id)}
                  commentDisabled={movie.isPending === true || commentPendingIds.has(movie.id)}
                  pendingActions={movie.isPending === true}
                  onToggleVote={() => toggleVote(movie.id)}
                  onComment={(text) => addComment(movie.id, text)}
                  onEditComment={(commentId, newText) => editComment(movie.id, commentId, newText)}
                  onDeleteComment={(commentId) => deleteComment(movie.id, commentId)}
                  onDelete={() => deleteMovie(movie.id)}
                  onEdit={(newTitle) => editMovie(movie.id, newTitle)}
                  username={username!}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
