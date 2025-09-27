import React, { useCallback, useMemo, useRef, useState } from "react";
import { v4 as uid } from "uuid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Image as ImageIcon,
  X,
  Send,
  Trash2,
  AlertTriangle,
  Camera,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RefreshCw,
  Plus,
  Globe,
  Microscope,
  MoreHorizontal,
  Mic,
} from "lucide-react";

/**
 * Batch Vision QA — Single-file React component
 * -------------------------------------------------------------
 * What it does
 * - Up to 4 image uploads (drag/drop or file picker)
 * - Single question applied to all images in parallel
 * - Chat-like timeline showing each image + model's response
 * - Per-image loading states, progress and error handling
 * - Clean, responsive UI using Tailwind + shadcn/ui
 *
 * How to hook up a real model
 * - Replace `callBatchVisionAPI` with a fetch to your API route that calls
 *   your vision model (e.g., OpenAI, Google, Anthropic, etc.).
 * - Expected request: { prompt: string, images: string[] } where images are
 *   data URLs or presigned URLs; return shape documented below.
 *
 * Safe defaults
 * - If no backend is configured, the component uses a local demo responder
 *   (`demoVisionResponder`) so the UI still works end-to-end.
 */

// --------------------------- Types ----------------------------

type Img = {
  id: string;
  name: string;
  size: number;
  type: string;
  src: string; // data URL for preview and (optionally) sending
};

type PerImageResult = {
  id: string; // mirrors Img.id
  ok: boolean;
  answer?: string;
  error?: string;
  tokensUsed?: number;
  latencyMs?: number;
};

// --------------------- Helper Utilities ----------------------

const bytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 ** 2
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / 1024 ** 2).toFixed(1)} MB`;

const isImage = (file: File) => file.type.startsWith("image/");

// Demo fallback: synthesizes a plausible-looking answer deterministically
async function demoVisionResponder(
  prompt: string,
  images: Img[]
): Promise<PerImageResult[]> {
  // fake latency per image for a realistic feel
  const start = Date.now();
  return Promise.all(
    images.map(async (img, i) => {
      const wait = 400 + i * 250 + Math.random() * 300; // staggered
      await new Promise((r) => setTimeout(r, wait));

      // fabricate some tiny variability based on filename/prompt hash
      const hash = (img.name + prompt)
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);
      const flavor = [
        "I don't see obvious defects.",
        "Minor glare is visible near the top edge.",
        "Background looks consistent with guidelines.",
        "Possible dust or smudge near the center.",
        "Lighting appears even; no harsh shadows.",
        "Image might be slightly tilted clockwise.",
      ][hash % 6];

      return {
        id: img.id,
        ok: true,
        answer: `Demo mode — ${flavor}`,
        tokensUsed: 140 + (hash % 40),
        latencyMs: Date.now() - start,
      } satisfies PerImageResult;
    })
  );
}

// Replace this with a real API call when connecting your backend
async function callBatchVisionAPI(
  prompt: string,
  images: Img[]
): Promise<PerImageResult[]> {
  const USE_DEMO = true; // flip to false when you wire an API

  if (USE_DEMO) return demoVisionResponder(prompt, images);

  // Example real call shape (uncomment and adapt):
  /*
  const res = await fetch("/api/batch-vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images: images.map(i => i.src) }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data: { results: PerImageResult[] } = await res.json();
  return data.results;
  */

  return [];
}

// --------------------------- UI -------------------------------

const Dropzone: React.FC<{
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}> = ({ onFiles, disabled }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(isImage);
      onFiles(files);
    },
    [onFiles, disabled]
  );

  const onClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      const files = input.files ? Array.from(input.files).filter(isImage) : [];
      onFiles(files);
    };
    input.click();
  }, [onFiles, disabled]);

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`group border-2 border-dashed rounded-2xl p-6 w-full cursor-pointer transition hover:bg-muted ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-muted shadow-sm">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <div className="font-medium">Drag & drop images here</div>
          <div className="text-sm text-muted-foreground">
            or click to choose (up to 4)
          </div>
        </div>
      </div>
    </button>
  );
};

const Thumb: React.FC<{ img: Img; onRemove: () => void }> = ({
  img,
  onRemove,
}) => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <div className="relative">
        <img
          src={img.src}
          alt={img.name}
          className="w-full h-40 object-cover"
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 rounded-full"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 text-sm flex items-center justify-between">
        <span className="truncate" title={`${img.name} • ${bytes(img.size)}`}>
          {img.name}
        </span>
        <span className="text-muted-foreground ml-2">{bytes(img.size)}</span>
      </div>
    </CardContent>
  </Card>
);

const ActionsBar: React.FC<{
  onCopy?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onRead?: () => void;
  onRefresh?: () => void;
}> = ({ onCopy, onLike, onDislike, onRead, onRefresh }) => (
  <div className="flex items-center gap-2 text-muted-foreground px-1">
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2"
      onClick={onCopy}
      aria-label="Copy"
    >
      <Copy className="h-4 w-4" />
      <span className="text-xs">Copy</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2"
      onClick={onLike}
      aria-label="Like"
    >
      <ThumbsUp className="h-4 w-4" />
      <span className="text-xs">Like</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2"
      onClick={onDislike}
      aria-label="Dislike"
    >
      <ThumbsDown className="h-4 w-4" />
      <span className="text-xs">Dislike</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2"
      onClick={onRead}
      aria-label="Read"
    >
      <Volume2 className="h-4 w-4" />
      <span className="text-xs">Read</span>
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-2"
      onClick={onRefresh}
      aria-label="Refresh"
    >
      <RefreshCw className="h-4 w-4" />
      <span className="text-xs">Refresh</span>
    </Button>
  </div>
);

const ChatBubble: React.FC<{
  img: Img;
  state: "idle" | "loading" | "done" | "error";
  text?: string;
  error?: string;
}> = ({ img, state, text, error }) => (
  <div className="grid grid-cols-[80px,1fr] gap-3 items-start">
    <img
      src={img.src}
      alt={img.name}
      className="w-20 h-20 object-cover rounded-xl border"
    />
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        {state === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing…</span>
          </div>
        )}
        {state === "done" && (
          <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
        {state === "error" && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {/* Actions toolbar under the response */}
        <div className="border-t pt-2">
          <ActionsBar
            onCopy={() => navigator.clipboard.writeText(text || error || "")}
            onRefresh={() => {
              /* hook up re-run per image here */
            }}
          />
        </div>
      </CardContent>
    </Card>
  </div>
);

// ------------------------- Main App ---------------------------

export default function Backup() {
  const [images, setImages] = useState<Img[]>([]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<
    Record<string, PerImageResult | { state: "loading" }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    images.length > 0 && question.trim().length > 3 && !submitting;

  const addFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      if (!files.length) return;

      const imgs = await Promise.all(
        files.slice(0, Math.max(0, 4 - images.length)).map(
          (file) =>
            new Promise<Img>((resolve, reject) => {
              if (!isImage(file))
                return reject(new Error("Only image files are allowed."));
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: uid(),
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  src: String(reader.result),
                });
              reader.onerror = () => reject(new Error("Failed to read file."));
              reader.readAsDataURL(file);
            })
        )
      );

      if (images.length + imgs.length > 4) {
        setError("You can upload up to 4 images.");
        console.warn("Upload limited to 4 images. Extra files ignored.");
      }

      setImages((prev) => [...prev, ...imgs].slice(0, 4));
    },
    [images.length]
  );

  const removeImg = (id: string) =>
    setImages((prev) => prev.filter((i) => i.id !== id));
  const clearAll = () => {
    setImages([]);
    setResults({});
    setError(null);
  };

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!canSubmit) {
      setError(
        "Add at least one image and ask a clear question (4+ characters)."
      );
      return;
    }

    try {
      setSubmitting(true);
      // mark all images as loading in the chat timeline
      const initial: Record<string, { state: "loading" }> = {};
      images.forEach((img) => (initial[img.id] = { state: "loading" }));
      setResults(initial);

      const apiResults = await callBatchVisionAPI(question.trim(), images);
      const mapped: Record<string, PerImageResult> = {};
      apiResults.forEach((r) => (mapped[r.id] = r));
      // Ensure any missing responses turn into errors
      images.forEach((img) => {
        if (!mapped[img.id]) {
          mapped[img.id] = {
            id: img.id,
            ok: false,
            error: "No response returned for this image.",
          };
        }
      });
      setResults(mapped);
    } catch (e: Error | unknown) {
      console.error(e);
      setError(
        (e as Error)?.message ||
          "Something went wrong. Check console for details."
      );
      // Convert all to error bubbles for visibility
      const allErrors: Record<string, PerImageResult> = {};
      images.forEach(
        (img) =>
          (allErrors[img.id] = {
            id: img.id,
            ok: false,
            error: "Request failed.",
          })
      );
      setResults(allErrors);
    } finally {
      setSubmitting(false);
    }
  }, [images, question, canSubmit]);

  const timeline = useMemo(() => {
    // Build a newest-first conversation list like a chat
    const ordered = [...images];
    return ordered.map((img) => {
      const r = results[img.id];
      let state: "idle" | "loading" | "done" | "error" = "idle";
      let text: string | undefined;
      let err: string | undefined;
      if (!r) state = "idle";
      else if ("state" in r && r.state === "loading") state = "loading";
      else if (r && (r as PerImageResult).ok) {
        state = "done";
        text = (r as PerImageResult).answer || "(No answer returned.)";
      } else {
        state = "error";
        err = (r as PerImageResult).error || "Unknown error.";
      }
      return { img, state, text, err } as const;
    });
  }, [images, results]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Batch Vision QA</h1>
            <p className="text-sm text-muted-foreground">
              Upload up to 4 product images, ask one question, get per-image
              answers.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={!images.length && !Object.keys(results).length}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Reset
        </Button>
      </header>

      {/* Uploader */}
      <section className="space-y-3">
        <Dropzone
          onFiles={addFiles}
          disabled={images.length >= 4 || submitting}
        />
        {error && (
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {!!images.length && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {images.map((img) => (
              <Thumb
                key={img.id}
                img={img}
                onRemove={() => removeImg(img.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Question input */}
      <section className="flex flex-col gap-3">
        <label className="text-sm font-medium">Question for all images</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Are there any visible defects or issues?"
          className="min-h-[88px]"
          disabled={submitting}
        />
        {/* Main toolbar under the textbox */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              aria-label="Add"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">Add</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              aria-label="Search"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs">Search</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              aria-label="Deep Research"
            >
              <Microscope className="h-4 w-4" />
              <span className="text-xs">Deep Research</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              aria-label="More"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="text-xs">More</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              aria-label="Dictate"
            >
              <Mic className="h-4 w-4" />
              <span className="text-xs">Dictate</span>
            </Button>
          </div>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Ask model
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Chat timeline */}
      {!!images.length && (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.map(({ img, state, text, err }) => (
                <ChatBubble
                  key={img.id}
                  img={img}
                  state={state}
                  text={text}
                  error={err}
                />
              ))}
              {!timeline.length && (
                <div className="text-sm text-muted-foreground">
                  Upload images and ask a question to see responses here.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        Tip: Try questions like “Are there visible defects?”, “Does this look
        new or used?”, or “How many books are in this image?”.
      </p>
    </div>
  );
}
