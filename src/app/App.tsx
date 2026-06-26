import { useState, useEffect } from "react";
import { getFilms, getComments, createFilm, voteFilm, addComment as addCommentApi, deleteFilm, updateFilm } from "../api";
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

function CommentSection({ comments, onAdd }: { comments: Comment[]; onAdd: (text: string) => void }) {
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
            <li key={c.id} className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-700">{c.author}</span>
              <span className="text-gray-400 mx-1">·</span>
              {c.text}
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
  onToggleVote,
  onComment,
  onDelete,
  onEdit,
}: {
  movie: Movie;
  isWinner: boolean;
  isOwner: boolean;
  voted: boolean;
  onToggleVote: () => void;
  onComment: (text: string) => void;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
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
      <CommentSection comments={movie.comments} onAdd={onComment} />
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
  async function loadData(): Promise<void> {
    const [films, comments] = await Promise.all([getFilms(), getComments()]);

    const normalizeFilms = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        if (Array.isArray((value as any).items)) return (value as any).items;
        if (Array.isArray((value as any).rows)) return (value as any).rows;
      }
      return [];
    };

    const normalizeComments = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        if (Array.isArray((value as any).items)) return (value as any).items;
        if (Array.isArray((value as any).rows)) return (value as any).rows;
      }
      return [];
    };

    const filmItems = normalizeFilms(films);
    const commentItems = normalizeComments(comments);

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

    setMovies(
      filmItems.map((movie: any, index: number) => {
        const payload = movie && typeof movie === "object" ? movie : { id: movie };
        const movieId = String(payload.id ?? payload[0] ?? index);
        const title = payload.title ?? payload[1] ?? "";
        const author = payload.author ?? payload[2] ?? "Anonyme";
        const votes = Number(payload.votes ?? payload[4] ?? 0);

        return {
          id: movieId,
          title,
          author,
          votes,
          comments: commentsByFilmId.get(movieId) ?? [],
          rotation: pickRotation(movieId),
        };
      })
    );
  }
  const [username, setUsername] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    loadData();
  }, []);
  if (!username) return <UsernameGate onEnter={setUsername} />;

  const sorted = [...movies].sort((a, b) => b.votes - a.votes);
  const topId = sorted[0]?.id ?? null;

  async function addMovie() {
    const title = input.trim();
    if (!title) return;

    try {
      await createFilm(title, username!);
      await loadData();
      setInput("");
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 2200);
    } catch (error) {
      console.error("Failed to create film", error);
    }
  }

  async function toggleVote(id: string) {
    try {
      const res = await voteFilm(id, username!);
      if (!res.ok) {
        return;
      }

      setVotedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      await loadData();
    } catch (error) {
      console.error("Failed to vote", error);
    }
  }

  async function deleteMovie(id: string) {
    try {
      await deleteFilm(id);
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadData();
    } catch (error) {
      console.error("Failed to delete film", error);
    }
  }

  async function editMovie(id: string, newTitle: string) {
    try {
      await updateFilm(id, newTitle);
      await loadData();
    } catch (error) {
      console.error("Failed to update film", error);
    }
  }

  async function addComment(id: string, text: string) {
    try {
      await addCommentApi(id, username!, text);
      await loadData();
    } catch (error) {
      console.error("Failed to add comment", error);
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
            ⭐ {movies.length} film{movies.length !== 1 ? "s" : ""} au total
          </span>
        </div>

        {movies.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-3">
            <span className="text-5xl">🎞️</span>
            <p className="text-gray-400 font-semibold">Aucun film pour l&apos;instant — soyez le premier !</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5" style={{ columnFill: "balance" }}>
            {sorted.map((movie) => (
              <div key={movie.id} className="mb-5 break-inside-avoid inline-block w-full">
                <PostIt
                  movie={movie}
                  isWinner={movie.id === topId && movie.votes > 0}
                  isOwner={movie.author === username}
                  voted={votedIds.has(movie.id)}
                  onToggleVote={() => toggleVote(movie.id)}
                  onComment={(text) => addComment(movie.id, text)}
                  onDelete={() => deleteMovie(movie.id)}
                  onEdit={(newTitle) => editMovie(movie.id, newTitle)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
