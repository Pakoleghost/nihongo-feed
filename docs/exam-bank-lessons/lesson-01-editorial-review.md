# Lesson 01 Editorial Review

Source bank reviewed:
- `/Users/pako/nihongo-feed-safe/docs/exam-bank-lessons/lesson-01.md`
- `/Users/pako/nihongo-feed-safe/docs/exam-bank-review.json`

## Current state

- total questions: **138**
- vocab: **128**
- particles: **5**
- grammar: **3**
- reading: **2**
- kanji: **0**
- conjugation: **0**

This lesson is massively overbuilt in vocab and underbuilt in actual lesson-01 grammar.
It currently behaves more like a vocabulary dump than a lesson exam bank.

## Editorial diagnosis

### Main problems

1. Too many low-value vocab pairs
- The bank generates two questions for almost every vocab item:
  - JP -> ES
  - ES -> JP
- For lesson 01 this produces a bloated bank full of near-duplicates.

2. Too much marginal vocab for an exam
- Items like country lists, professions, majors, and family terms quickly bloat the bank.
- Many are valid vocabulary, but not all deserve equal exam weight.

3. Weak grammar coverage
- Only 3 grammar items is far too little for lesson 01.
- The grammar that matters most in L1 is foundational:
  - X は Y です
  - question formation with か
  - N1 の N2
  - negative copula じゃないです
  - basic self-introduction patterns
- The current bank barely covers this.

4. Reading is too thin
- Only 2 reading items.
- Both are simple and valid, but not enough to support comprehension as a category.

5. Wording is often too mechanical
- Many prompts are technically fine but repetitive and low-yield.
- The bank currently tests recall more than lesson understanding.

## Questions to keep

These should stay as the backbone because they are high-signal and useful for L1.

### Keep: core vocab only
- `exam-vocab-es-l1-0` / `exam-vocab-jp-l1-0` → がくせい
- `exam-vocab-es-l1-1` / `exam-vocab-jp-l1-1` → せんせい
- `exam-vocab-es-l1-3` / `exam-vocab-jp-l1-3` → せんこう
- `exam-vocab-es-l1-4` / `exam-vocab-jp-l1-4` → わたし
- `exam-vocab-es-l1-5` / `exam-vocab-jp-l1-5` → だいがく
- `exam-vocab-es-l1-19` / `exam-vocab-jp-l1-19` → だいがくせい
- `exam-vocab-es-l1-21` / `exam-vocab-jp-l1-21` → にほんじん
- `exam-vocab-es-l1-29` / `exam-vocab-jp-l1-29` → にほんご
- `exam-vocab-es-l1-32` / `exam-vocab-jp-l1-32` → なまえ
- `exam-vocab-es-l1-31` / `exam-vocab-jp-l1-31` → ばんごう

### Keep: existing grammar / particles / reading backbone
- `exam-particle-p-l1-1`
- `exam-particle-text-p-l1-1`
- `exam-particle-p-l1-2`
- `exam-particle-text-p-l1-2`
- `exam-grammar:reorder:intro`
- `exam-grammar:reorder:major`
- `exam-grammar:mcq:negative-copula`
- `exam-particles:text:theme`
- `exam-reading:self-intro-1`
- `exam-reading:self-intro-2`

## Questions to remove first

These are not necessarily "wrong", but they are poor first-class exam material for lesson 01.
They should be cut first to reduce noise.

### Remove first: low-priority vocab flood
- all country-name pairs beyond the most central one or two
  - `exam-vocab-es-l1-37` through `exam-vocab-jp-l1-44`
- major/profession vocab that inflates the bank without adding much lesson-01 assessment value
  - `exam-vocab-es-l1-45` through `exam-vocab-jp-l1-55`
- family vocabulary if the goal is a lesson-01 exam rather than full-dump recall
  - `exam-vocab-es-l1-56` through `exam-vocab-jp-l1-61`
- time-expression overflow beyond one or two representative items
  - `exam-vocab-es-l1-25` through `exam-vocab-jp-l1-27`
- duplicate academic-year expansion spam if not sampled tightly
  - `exam-vocab-es-l1-12` through `exam-vocab-jp-l1-15`

### Remove or heavily reduce: matching duplicates
- `exam-vocab-match-1-0`
- `exam-vocab-match-1-1`
- `exam-vocab-match-1-2`
- `exam-vocab-match-1-3`

These are the same exercise format repeated four times with little pedagogical differentiation.
One matching item is enough for L1.

## Questions to rewrite

### Rewrite for better wording / purpose
- `exam-grammar:mcq:negative-copula`
  - good topic, but should be framed in a more natural self-intro context
- `exam-reading:self-intro-1`
  - usable, but very bare
  - could become a slightly richer dialogue-based comprehension question
- `exam-reading:self-intro-2`
  - usable, but too easy and too close to pure fact extraction
- `exam-particle-p-l1-2`
  - okay mechanically, but this should probably sit under a broader copula/question cluster instead of particle-only treatment

## New question slots needed

Lesson 01 needs new curated items in the categories below.

### Grammar slots needed
Target: **4 strong grammar items** minimum

Add these:
1. copula affirmative in self-introduction
2. question sentence with `か`
3. `N1 の N2`
4. negative copula `じゃないです`

Optional fifth:
5. question-word usage with `なん` / `だれ`

### Reading slots needed
Target: **3 reading items** minimum

Add these:
1. short self-introduction paragraph
2. short classroom dialogue asking major / nationality
3. short profile card or mini conversation using name / year / major

Reading in L1 should stay short and concrete, but still require interpretation rather than just lifting one word.

## Proposed revised lesson 01 blueprint

Target total: **20 questions**

- vocab: 10
- particles: 4
- grammar: 4
- reading: 2

### Recommended composition

#### Vocab (10)
Use only high-signal lesson-01 vocabulary:
- student / teacher / university / major / Japanese / Japanese person / name / number / I / university student

#### Particles (4)
- topic marker `は`
- possession `の`
- one direct self-introduction sentence
- one noun-linking or profile-style sentence

#### Grammar (4)
- X は Y です
- X は Y ですか
- N1 の N2
- X は Y じゃないです

#### Reading (2)
- one short dialogue
- one short intro/profile text

## Lesson 01 as template for the rest

Lesson 01 should establish these editorial rules for later lessons:

1. not every vocab item deserves two question directions
2. category balance matters more than raw volume
3. grammar must be intentional, not incidental
4. reading should stay small but meaningful
5. one exercise format repeated many times is not a strong bank
6. exam content should reflect lesson priorities, not just available data volume

## Immediate action recommendation

If we start improving lessons manually, lesson 01 should be the first fully curated one.

The first pass should do this in order:
1. cut low-value vocab volume
2. keep only one matching item
3. add 4 solid grammar items
4. strengthen the 2 reading items or replace one with a better mini-dialogue
