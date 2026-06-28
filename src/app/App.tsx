import { useState, useEffect } from "react";
import { getFilms, getComments, getVotes, createFilm, voteFilm, unvoteFilm, addComment as addCommentApi, deleteFilm, updateFilm, deleteComment as deleteCommentApi, updateComment as updateCommentApi } from "../api";
import { Heart, Plus, Send, Trophy, Trash2, Pencil, Check, X } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  author: string;
}

interface Movie {
  id: string;
  stableKey: string;
  title: string;
  author: string;
  votes: number;
  comments: Comment[];
  rotation: number;
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

function HeartButton({
  count,
  voted,
  onToggle,
}: {
  count: number;
  voted: boolean;
  onToggle: () => void;
}) {
  const [popping, setPopping] = useState(false);

  function handleClick() {
    if (popping) return;
    setPopping(true);
    onToggle();
    setTimeout(() => setPopping(false), 350);
  }

  return (
    <button onClick={handleClick} className="flex items-center gap-1 cursor-pointer" aria-label="Voter">
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

function CommentItem({ comment, isOwn, onDelete, onEdit }: {
  comment: Comment;
  isOwn: boolean;
  onDelete: () => void;
  onEdit: (newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(comment.text);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!editing) setEditVal(comment.text);
  }, [comment.text]);

  function confirmEdit() {
    const t = editVal.trim();
    if (t && t !== comment.text) onEdit(t);
    setEditing(false);
  }

  return (
    <li
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="text-xs text-gray-600 leading-relaxed flex items-start gap-1"
    >
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            autoFocus
            type="text"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdit();
              if (e.key === "Escape") { setEditVal(comment.text); setEditing(false); }
            }}
            className="flex-1 bg-white/70 border border-gray-300 rounded px-1.5 py-0.5 text-xs outline-none"
          />
          <button onClick={confirmEdit} className="text-emerald-500 hover:text-emerald-600 flex-shrink-0"><Check size={10} /></button>
          <button onClick={() => { setEditVal(comment.text); setEditing(false); }} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={10} /></button>
        </div>
      ) : (
        <>
          <span className="flex-1">
            <span className="font-bold text-gray-700">{comment.author}</span>
            <span className="text-gray-400 mx-1">·</span>
            {comment.text}
          </span>
          {isOwn && hovering && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-700 p-0.5"><Pencil size={9} /></button>
              <button onClick={onDelete} className="text-gray-400 hover:text-rose-500 p-0.5"><Trash2 size={9} /></button>
            </span>
          )}
        </>
      )}
    </li>
  );
}

function CommentSection({ comments, onAdd, onDelete, onEdit, username }: {
  comments: Comment[];
  onAdd: (text: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newText: string) => void;
  username: string;
}) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-black/10">
      {comments.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isOwn={c.author === username}
              onDelete={() => onDelete(c.id)}
              onEdit={(newText) => onEdit(c.id, newText)}
            />
          ))}
        </ul>
      )}
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Commenter…"
          className="flex-1 bg-transparent text-xs text-gray-600 placeholder:text-gray-400 outline-none border-b border-transparent focus:border-gray-300 transition-colors py-0.5"
        />
        {text.trim() && (
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
  username,
  onToggleVote,
  onComment,
  onDelete,
  onEdit,
  onDeleteComment,
  onEditComment,
}: {
  movie: Movie;
  isWinner: boolean;
  isOwner: boolean;
  voted: boolean;
  username: string;
  onToggleVote: () => void;
  onComment: (text: string) => void;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditComment: (commentId: string, newText: string) => void;
}) {
  const color = pickColor(movie.id);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(movie.title);

  useEffect(() => {
    if (!editing) setEditVal(movie.title);
  }, [movie.title]);

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
      className="rounded-sm p-4 w-full break-words cursor-default select-text"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          {isWinner && (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mb-1">
              <Trophy size={11} />
              Film gagnant
            </div>
          )}

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
                  onClick={() => { setEditVal(movie.title); setEditing(true); }}
                  className="text-gray-400 hover:text-gray-700 transition-colors bg-black/5 hover:bg-black/10 rounded-md p-1"
                  aria-label="Modifier"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={onDelete}
                  className="text-gray-400 hover:text-rose-500 transition-colors bg-black/5 hover:bg-rose-50 rounded-md p-1"
                  aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-0.5">
          <HeartButton count={movie.votes} voted={voted} onToggle={onToggleVote} />
        </div>
      </div>
      <CommentSection
        comments={movie.comments}
        onAdd={onComment}
        onDelete={onDeleteComment}
        onEdit={onEditComment}
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
          <p className="text-gray-500 text-base font-medium">Choisis un pseudo ! <br /> (Tu pourras le réutiliser plus tard!)</p>
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
            Entrer
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
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function loadData(): Promise<void> {
    const [films, comments, votes] = await Promise.all([getFilms(), getComments(), getVotes()]);

    const normalizeItems = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        if (Array.isArray((value as any).items)) return (value as any).items;
        if (Array.isArray((value as any).rows)) return (value as any).rows;
      }
      return [];
    };

    const filmItems = normalizeItems(films);
    const commentItems = normalizeItems(comments);
    const voteItems = normalizeItems(votes);

    const commentsByFilmId = new Map<string, Comment[]>();
    commentItems.forEach((comment: any) => {
      const filmId = String(
        comment.filmId ?? comment.movieId ?? comment.film_id ?? comment[0] ?? ""
      );
      if (!filmId) return;
      const next = commentsByFilmId.get(filmId) ?? [];
      next.push({
        id: String(comment.id ?? comment[4] ?? crypto.randomUUID()),
        text: comment.text ?? comment[2] ?? "",
        author: comment.author ?? comment.username ?? comment[1] ?? "Anonyme",
      });
      commentsByFilmId.set(filmId, next);
    });

    const voteCounts = new Map<string, number>();
    const userVotedFilmIds = new Set<string>();

    voteItems.forEach((vote: any) => {
      const filmId = String(vote.filmId ?? vote.movieId ?? vote.film_id ?? vote[0] ?? "");
      if (!filmId) return;
      voteCounts.set(filmId, (voteCounts.get(filmId) ?? 0) + 1);

      const voteAuthor = String(vote.username ?? vote.author ?? vote[1] ?? "");
      if (voteAuthor && username && voteAuthor === username) {
        userVotedFilmIds.add(filmId);
      }
    });

    setMovies(
      filmItems
        .map((movie: any, index: number) => {
          const payload = movie && typeof movie === "object" ? movie : { id: movie };
          const movieId = String(payload.id ?? payload[0] ?? index);
          const title = payload.title ?? payload[1] ?? "";
          const author = payload.author ?? payload[2] ?? "Anonyme";
          const votes = Number(payload.votes ?? voteCounts.get(movieId) ?? payload[4] ?? 0);

          return {
            id: movieId,
            stableKey: movieId,
            title,
            author,
            votes,
            comments: commentsByFilmId.get(movieId) ?? [],
            rotation: pickRotation(movieId),
          };
        })
        .sort((a, b) => b.votes - a.votes)
    );
    setVotedIds(userVotedFilmIds);
  }

  useEffect(() => {
    if (username) {
      void loadData();
    }
  }, [username]);

  if (!username) return <UsernameGate onEnter={setUsername} />;

  const sorted = movies;
  const maxVotes = movies.reduce((max, m) => Math.max(max, m.votes), 0);
  const topId = maxVotes > 0 ? (movies.find((m) => m.votes === maxVotes)?.id ?? null) : null;

  async function addMovie() {
    const title = input.trim();
    if (!title) return;

    const tempId = crypto.randomUUID();
    const optimisticMovie: Movie = {
      id: tempId,
      stableKey: tempId,
      title,
      author: username!,
      votes: 0,
      comments: [],
      rotation: pickRotation(tempId),
    };

    const previousMovies = [...movies];

    setMovies((prev) => [...prev, optimisticMovie]);
    setInput("");
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2200);

    try {
      const result = await createFilm(title, username!);
      if (!result?.ok) {
        setMovies(previousMovies);
        return;
      }
      // Replace temp ID with real Firebase ID in-place (keep rotation stable)
      setMovies((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: result.id } : m
        )
      );
    } catch (error) {
      setMovies(previousMovies);
      console.error("Failed to create film", error);
    }
  }

  async function toggleVote(id: string) {
    const alreadyVoted = votedIds.has(id);
    const previousVotedIds = new Set(votedIds);
    const previousMovies = [...movies];

    setVotedIds((prev) => {
      const next = new Set(prev);
      alreadyVoted ? next.delete(id) : next.add(id);
      return next;
    });

    setMovies((prev) =>
      prev.map((movie) =>
        movie.id === id
          ? { ...movie, votes: Math.max(0, movie.votes + (alreadyVoted ? -1 : 1)) }
          : movie
      )
    );

    try {
      const res = alreadyVoted ? await unvoteFilm(id, username!) : await voteFilm(id, username!);
      if (!res.ok) {
        setVotedIds(new Set(previousVotedIds));
        setMovies(previousMovies);
        return;
      }
    } catch (error) {
      setVotedIds(new Set(previousVotedIds));
      setMovies(previousMovies);
      console.error("Failed to vote", error);
    }
  }

  async function deleteMovie(id: string) {
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
    const previousMovies = [...movies];

    setMovies((prev) => prev.map((movie) => (movie.id === id ? { ...movie, title: newTitle } : movie)));

    try {
      await updateFilm(id, newTitle);
    } catch (error) {
      setMovies(previousMovies);
      console.error("Failed to update film", error);
    }
  }

  async function addComment(id: string, text: string) {
    const optimisticId = crypto.randomUUID();
    setMovies((prev) =>
      prev.map((movie) =>
        movie.id === id
          ? { ...movie, comments: [...movie.comments, { id: optimisticId, text, author: username! }] }
          : movie
      )
    );
    try {
      const result = await addCommentApi(id, username!, text);
      // Replace temp ID with real Firebase ID
      setMovies((prev) =>
        prev.map((movie) =>
          movie.id === id
            ? { ...movie, comments: movie.comments.map((c) => c.id === optimisticId ? { ...c, id: result.id } : c) }
            : movie
        )
      );
    } catch (error) {
      setMovies((prev) =>
        prev.map((movie) =>
          movie.id === id
            ? { ...movie, comments: movie.comments.filter((c) => c.id !== optimisticId) }
            : movie
        )
      );
      console.error("Failed to add comment", error);
    }
  }

  async function deleteCommentFromFilm(filmId: string, commentId: string) {
    const comment = movies.find((m) => m.id === filmId)?.comments.find((c) => c.id === commentId);
    if (!comment) return;
    setMovies((prev) =>
      prev.map((m) =>
        m.id === filmId ? { ...m, comments: m.comments.filter((c) => c.id !== commentId) } : m
      )
    );
    try {
      await deleteCommentApi(filmId, commentId);
    } catch (error) {
      setMovies((prev) =>
        prev.map((m) =>
          m.id === filmId ? { ...m, comments: [...m.comments, comment] } : m
        )
      );
      console.error("Failed to delete comment", error);
    }
  }

  async function editCommentInFilm(filmId: string, commentId: string, newText: string) {
    const comment = movies.find((m) => m.id === filmId)?.comments.find((c) => c.id === commentId);
    if (!comment) return;
    const oldText = comment.text;
    setMovies((prev) =>
      prev.map((m) =>
        m.id === filmId
          ? { ...m, comments: m.comments.map((c) => c.id === commentId ? { ...c, text: newText } : c) }
          : m
      )
    );
    try {
      await updateCommentApi(filmId, commentId, newText);
    } catch (error) {
      setMovies((prev) =>
        prev.map((m) =>
          m.id === filmId
            ? { ...m, comments: m.comments.map((c) => c.id === commentId ? { ...c, text: oldText } : c) }
            : m
        )
      );
      console.error("Failed to edit comment", error);
    }
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
        <p className="text-gray-400 font-semibold text-sm">Proposez vos films et votez ! 😊</p>
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
              placeholder="Titre du film…"
              className="flex-1 bg-white border-2 border-gray-100 focus:border-yellow-300 rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal outline-none transition-colors"
            />
            <button
              onClick={addMovie}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-black px-5 py-2.5 rounded-2xl transition-colors whitespace-nowrap"
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
            {movies.length} film{movies.length !== 1 ? "s" : ""} au total
          </span>
        </div>

        {movies.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <span className="text-5xl">🎞️</span>
            <p className="text-gray-400 font-semibold">Aucun film pour l&apos;instant — soyez le premier !</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {sorted.map((movie) => (
              <div key={movie.stableKey} className="mb-5 break-inside-avoid inline-block w-full">
                <PostIt
                  movie={movie}
                  isWinner={movie.id === topId && movie.votes > 0}
                  isOwner={movie.author === username}
                  username={username!}
                  voted={votedIds.has(movie.id)}
                  onToggleVote={() => toggleVote(movie.id)}
                  onComment={(text) => addComment(movie.id, text)}
                  onDelete={() => deleteMovie(movie.id)}
                  onEdit={(newTitle) => editMovie(movie.id, newTitle)}
                  onDeleteComment={(commentId) => deleteCommentFromFilm(movie.id, commentId)}
                  onEditComment={(commentId, newText) => editCommentInFilm(movie.id, commentId, newText)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
