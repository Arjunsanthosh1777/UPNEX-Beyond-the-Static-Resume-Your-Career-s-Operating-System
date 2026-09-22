-- Marks whether an arena's questions were imported from a PDF/image quiz
-- (source = "pdf") or pulled from the built-in bank (source = "builtin").
ALTER TABLE "ClashGame" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'builtin';