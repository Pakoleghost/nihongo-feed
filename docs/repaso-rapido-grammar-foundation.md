# Repaso rápido: Grammar Foundation

This foundation is intentionally curation-first.

## Sources used

- Genki grammar topic structure by lesson:
  - https://steven-kraft.com/projects/japanese/genki/
  - https://wp.stolaf.edu/japanese/grammar-index/genki-i-ii-grammar-index/
- Lesson-grouped vocab and kanji already represented in:
  - `/Users/pako/nihongo-feed-safe/lib/genki-vocab-by-lesson.ts`
  - `/Users/pako/nihongo-feed-safe/lib/genki-kanji-by-lesson.ts`

## Files added

- `/Users/pako/nihongo-feed-safe/lib/genki-grammar-content.ts`
  - grammar schema
  - lesson-to-topic mapping
  - tiny sample grammar seed
- `/Users/pako/nihongo-feed-safe/lib/study-content.ts`
  - lesson-range getters for vocab, kanji, grammar topics, grammar items

## Safe exercise types

- `particle_choice`
- `verb_form`
- `fill_blank`
- `sentence_order`

## Why this is safe

- We are not auto-generating a large grammar bank.
- We separate:
  - lesson topic mapping
  - curated exercise items
- `Repaso rápido` can later query by lesson range without forcing us to invent low-quality content.
