Directory structure:
└── boringmarketer-b17e82c4a3bf4a58c859e3e2a6e02545/
    ├── 1-README.md
    ├── 2-vibe-skill-creator.md
    ├── 3-bad-skill-patterns.md
    └── 4-cold-outreach-example.md

================================================
FILE: 1-README.md
================================================
# Vibe Skill Creator - Shareable Package

This package teaches you how to build world-class Claude skills that actually improve output.

## What's Included

| File | What It Does | Lines |
|------|--------------|-------|
| **SKILL.md** | The main skill - guides you through building skills from scratch | 656 |
| **references/bad-skill-patterns.md** | 10 patterns that make skills mediocre (avoid these) | 531 |
| **cold-outreach/SKILL.md** | Example skill built using this process | 455 |

---

## How to Use

### In Claude Desktop (claude.ai)

**Option A: Install as Custom Skill (Recommended)**
1. Create a folder named `vibe-skill-creator`
2. Save `2-vibe-skill-creator.md` as `SKILL.md` inside that folder
3. ZIP the folder
4. Go to Settings → Capabilities
5. Click "Upload skill" and upload your ZIP
6. The skill appears in your Skills list and can be toggled on/off

**Option B: Add to Project Knowledge**
1. Create a new Project
2. Click "Add Content" → "Add text content"
3. Paste the contents of `2-vibe-skill-creator.md`
4. Start chatting: "Help me create a skill for [your domain]"

**Option C: Upload as File (per-chat)**
1. In any chat, click the attachment icon
2. Upload `2-vibe-skill-creator.md`
3. Say: "Use this skill to help me build a skill for [your domain]"

**Note:** Option A installs the skill permanently and it auto-activates when relevant. Options B and C work per-project or per-chat.

### In Claude Code

**Option A: Project Skill (Recommended for teams)**
1. Create folder in your project: `.claude/skills/vibe-skill-creator/`
2. Save as `SKILL.md` in that folder
3. Commit to git — teammates get it automatically
4. Claude auto-invokes based on the description (no need to reference it)

**Option B: Personal Skill**
1. Create folder: `~/.claude/skills/vibe-skill-creator/`
2. Save as `SKILL.md` in that folder
3. Available in all your Claude Code projects

**Option C: As a Slash Command**
1. Create folder: `.claude/commands/`
2. Save as `build-skill.md`
3. Invoke manually by typing: `/build-skill`

**How Skills Work:**
- Skills are **model-invoked** — Claude decides when to use them based on the description
- You don't explicitly call them like slash commands
- Just say "help me create a skill" and Claude uses it automatically

---

## What Triggers It

Say any of these:
- "Help me create a skill"
- "Build a skill for [domain]"
- "Improve this skill"
- "Help me make a skill"

---

## What Happens

Claude guides you through a 10-step conversation:

```
1. UNDERSTAND → What skill? What problem?
2. EXPLORE    → See where Claude fails without guidance
3. RESEARCH   → Go deep on the domain (web search)
4. SYNTHESIZE → Extract principles from research
5. DRAFT      → Write initial skill
6. CRITIQUE   → Review against quality criteria
7. ITERATE    → Fix gaps, get feedback
8. TEST       → Use on a real scenario
9. FINALIZE   → Structure properly
10. REFERENCE → Build deep expertise docs (if needed)
```

You don't need to know how to build skills. Just have the conversation.

---

## Study the Example

`cold-outreach/SKILL.md` shows what a finished skill looks like:
- Expert voice (not documentation)
- Principles with WHY (not just WHAT)
- Anti-patterns explicitly named
- Real before/after examples
- Quality checklist

---

## Avoid These Mistakes

Read `references/bad-skill-patterns.md` to understand:
- Documentation voice (sounds like a wiki)
- Procedure over principle (step-by-step without thinking)
- Comprehensive coverage (information overload)
- Missing anti-patterns (what to avoid)
- Friction creation (intermediate documents)

---

## Quick Start

Paste this into Claude:

```
I want to build a skill for [YOUR DOMAIN]. Guide me through the process -
explore where you fail without guidance, research the domain, then help me
build a skill that actually improves your output.
```

Then follow the conversation.

---

## Need More Examples?

Other skills built with this process:
- `direct-response-copy` - Copywriting skill with 1,600 lines of embedded reference material
- `ai-creative-strategist` - Visual creative with separate reference files

Each demonstrates different approaches to skill structure.



================================================
FILE: 2-vibe-skill-creator.md
================================================
---
name: vibe-skill-creator
description: "Build world-class skills through guided conversation and recursive self-review. Use when creating or improving a skill. Triggers on: build skill, create skill, improve skill, help me make a skill. Guides users through discovery, research, drafting, testing, and iteration until the skill actually works."
---

# Vibe Skill Creator

Most skills are mediocre because people don't know what good looks like, what questions to ask, or how to improve what they have.

This skill fixes that. It guides you through building a skill from scratch — exploring the problem, researching the domain, drafting, self-critiquing, testing with real scenarios, and iterating until it actually works.

You don't need to know how to build a skill. You need to have a conversation, and the skill emerges.

---

## Core Truths (Non-Negotiable)

Before building anything, internalize these:

### Truth 1: Expertise Transfer, Not Instructions

A skill should make Claude think like an expert, not follow rules.

**Documentation (wrong):**
> "Step 1: Write a headline. Step 2: Write body copy. Step 3: Add CTA."

**Expertise (right):**
> "The headline does 80% of the work. One headline can outpull another by 19.5x. Here's what separates the winners..."

### Truth 2: Flow, Not Friction

**Flow skills produce output.** User asks → skill delivers → user can act immediately.

**Friction skills create intermediate documents.** Research reports, comprehensive analyses, strategic frameworks that feel obligatory to incorporate.

**The Audience-Intel Lesson:** We built a comprehensive audience research skill. Excellent output — segments, pain points, language patterns. Then we used it to write copy. The copy was *worse* than copy written without the research.

Why? Comprehensive research creates pressure to use it all. Cover all segments. Address all pain points. Be thorough. Result: verbose, diluted, trying to do everything.

**The lesson:** More information ≠ better output. Skills should enable, not obligate.

### Truth 3: Voice Matches Domain

A copywriting skill sounds like a copywriter. A creative skill sounds like a creative director. A cold outreach skill sounds like someone who actually sends cold emails.

If the skill reads like documentation, it's wrong.

### Truth 4: Focused Beats Comprehensive

A skill for "cold outreach for selling services" beats a skill for "all sales communication." Constrain ruthlessly. Every section must earn its place.

---

## The Process: Start to Finish

Here's the full flow for building a skill from scratch:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   1. UNDERSTAND → What skill? What problem?             │
│          ↓                                              │
│   2. EXPLORE → See where Claude fails without guidance  │
│          ↓                                              │
│   3. RESEARCH → Go deep on the domain                   │
│          ↓                                              │
│   4. SYNTHESIZE → Extract principles from research      │
│          ↓                                              │
│   5. DRAFT → Write initial skill                        │
│          ↓                                              │
│   6. SELF-CRITIQUE → Review against quality criteria    │
│          ↓                                              │
│   7. ITERATE → Fix gaps, get feedback, improve          │
│          ↓                                              │
│   8. TEST → Use skill on a real scenario                │
│          ↓                                              │
│   9. FINALIZE → Codify into optimal structure           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Understand

Start by getting clear on what you're building.

**Questions to answer:**

| Question | Why It Matters |
|----------|----------------|
| What domain? | "Email marketing" is too broad. "Cold outreach for selling services" is focused. |
| What problem does this solve? | Not "what does it do" — what does Claude get WRONG without it? |
| What does good look like? | Find examples of excellent work in this domain. |
| What's the output? | Landing page? Email? Strategy? Be specific. |

**Ask the user:**
- "What are you trying to produce with this skill?"
- "What have you tried? What wasn't good enough?"
- "Do you have examples of excellent work in this domain?"

**If you can't articulate the problem clearly, you're not ready to move forward.**

---

## Step 2: Explore (See Where Claude Fails)

Before researching or writing anything, **try to produce the output together.**

This is crucial. You need to see what Claude gets wrong without guidance.

**How to explore:**

> "Let me try writing a [cold email / landing page / whatever] without any special guidance. I want to see my default output so we know what the skill needs to fix."

Then produce the output. It will probably be bad. That's the point.

**Example from building cold-outreach skill:**

We asked Claude to write a cold email for a video production agency. The default output:

> "Hi [Name], I came across your YouTube channel while researching companies in the [industry] space, and I was impressed by the valuable insights you're sharing. I noticed your posting schedule has been inconsistent lately... At [Agency], we specialize in helping SaaS founders create high-quality video content. I'd love to schedule a quick 15-minute call to discuss..."

**What we identified:**
- Generic opener ("I came across your...")
- Backhanded compliment ("impressed... BUT inconsistent")
- Me-focused pitch (talks about the agency, not the prospect)
- Hard CTA ("schedule a 15-minute call")
- Too long (150+ words)

This exploration told us exactly what the skill needed to fix. Without it, we'd be guessing.

**Document what you find:**
- What patterns does Claude default to?
- What feels generic or AI-generated?
- What would an expert do differently?

---

## Step 3: Research (Go Deep)

Now research the domain. This is where most skill-builders cut corners. Don't.

**Best approach: Use a subagent with web search.**

Launch a research subagent (in Claude Code) or do multiple web searches to find:

1. **Foundational experts** — Who are the recognized authorities? What frameworks do they teach?
2. **What actually works** — Case studies, real examples, specific patterns that succeed
3. **Anti-patterns** — What makes output in this domain bad? What are the tells?
4. **The WHY** — Why do certain techniques work? What's the psychology?

**Research prompt for subagent:**

```
Research [domain] deeply. I need to understand what separates expert-level
work from amateur work.

Find:
1. Who are the foundational experts/thinkers? What frameworks do they teach?
2. What actually works? Case studies, real examples, specific patterns.
3. What are the anti-patterns? Common mistakes, things that make output feel generic/AI.
4. Why do the good techniques work? What's the underlying psychology?

Search for blogs, case studies, expert content, community discussions.
Return a synthesis of principles, not just a list of facts.
```

**Example from cold-outreach skill:**

Research found:
- **Alex Berman's 3C's:** Compliment → Case Study → CTA
- **Josh Braun's 4T:** Their Job → What's Hard → Your Alternative → Ask
- **Will Allred's Mouse Trap:** Personalized trigger + value prop question
- **Key data:** Each long sentence reduces reply rate by 17%
- **Anti-patterns:** "I hope this email finds you well," "Just following up," etc.

This research became the foundation of the skill.

**No MCP? Use web search directly:**

```
Search: "best cold email examples that got replies"
Search: "cold outreach experts frameworks"
Search: "what makes cold email feel like spam"
Search: "[domain] common mistakes"
Search: "[expert name] [domain] framework"
```

Go deep. Surface-level research = surface-level skill.

---

## Step 4: Synthesize

Turn research into principles.

Don't just list what you found. Extract the WHY behind it.

**From research to principle:**

| Research Finding | Principle |
|------------------|-----------|
| "Emails under 80 words get more replies" | **Short beats long** — People scan, not read. If they can't understand in 2 seconds, they filter. |
| "Alex Berman uses Compliment → Case Study → CTA" | **Give before ask** — Reciprocity is hardwired. Lead with value, not request. |
| "Experts say 'I hope this email finds you well' kills response rate" | **Anti-pattern: template openers** — They signal "I sent this to 1,000 people." |

The synthesis becomes the core of your skill.

---

## Step 5: Draft

Now write the initial skill. It won't be perfect. That's fine.

**Focus on:**
- Capturing what worked in exploration
- Writing in the domain's voice (not documentation voice)
- Stating principles with WHY, not just WHAT
- Including concrete examples (before/after)
- Explicitly listing anti-patterns

**Don't aim for comprehensive.** Aim for a working first draft.

**Structure for first draft:**

```markdown
# Skill Name

[Opening that establishes voice and frames the problem]

## Why [Default Approach] Fails

[What Claude gets wrong, based on exploration]

## Core Principles

[Principles from research, with WHY]

## Anti-Patterns

[What to avoid, explicitly]

## Examples

[Before/after showing the principles in action]
```

---

## Step 6: Self-Critique

**This is the key step.** Review your draft honestly against these criteria:

### Voice Check
- [ ] Does this sound like an expert in the domain?
- [ ] Or does it read like documentation / a wiki article?

*If documentation voice, rewrite with personality.*

### Principles Check
- [ ] Am I explaining WHY techniques work, not just WHAT to do?
- [ ] Could Claude adapt these principles to new situations?

*If it's procedures without reasoning, add the WHY.*

### Anti-Pattern Check
- [ ] Have I explicitly named what to AVOID?
- [ ] What does Claude get wrong by default?

*If no anti-patterns, add them. Often the most valuable part.*

### Example Check
- [ ] Do I have concrete before/after examples?
- [ ] Do they demonstrate the principles viscerally?

*If examples are theoretical, make them concrete.*

### Focus Check
- [ ] Does every section earn its place?
- [ ] Would removing any section make output worse?

*If anything is "just in case," cut it.*

**Example self-critique:**

> **Draft 1 Assessment:**
>
> ✓ **Voice:** Good — sounds like someone who sends cold outreach
>
> ✓ **Principles:** Strong — explains WHY short emails work, WHY soft CTAs convert
>
> ⚠️ **Anti-patterns:** Present but could be more explicit
>
> ❌ **Examples:** Missing follow-up sequence examples
>
> ❌ **Missing:** Trigger events section (user mentioned "timely" as key)
>
> **Priority fixes:** Add follow-up examples, add trigger events section

---

## Step 7: Iterate

Fix the gaps you identified. Get user feedback. Improve.

**The loop:**
1. Fix priority issues from self-critique
2. Present to user with honest assessment: "Here's what I improved, here's what's still weak"
3. Get feedback
4. Incorporate feedback (if it improves output, not just adds complexity)
5. Self-critique again
6. Repeat until it passes review

**Present with honesty:**

> "Here's draft 2.
>
> **Improved:** Added complete follow-up sequence with 4 email examples. Added trigger events section with 6 high-intent signals.
>
> **Still weak:** LinkedIn section is shorter than email section — might need more examples.
>
> **Questions:**
> - Does this cover the scenarios you care about?
> - Any anti-patterns I'm missing?"

---

## Step 8: Test (Critical)

**Before finalizing, test the skill on a real scenario.**

This is non-negotiable. You don't know if the skill works until you use it.

**How to test:**

> "Give me a real scenario — a specific service you'd sell to a specific type of prospect. I'll write outreach using the skill so we can see if it actually works."

Then produce output WITH the skill loaded. Compare to what you produced in Step 2 (exploration).

**Example from cold-outreach skill:**

Scenario: Selling AI automation services to a small law firm doing personal injury.

**Output with skill:**

> Sarah — saw you're hiring a paralegal. Guessing intake volume is part of why.
>
> Quick observation: your contact form goes to a generic inbox. Morgan & Morgan's triggers an instant callback + text sequence + case qualifier — all automated.
>
> We built something similar for [Small PI Firm] — went from 30% lead response rate to 85% without adding staff.
>
> Worth a 10-min look?

**What the skill changed:**
- Specific trigger (hiring → intake volume)
- Competitive comparison (Morgan & Morgan)
- Concrete proof (30% → 85%)
- Soft CTA ("Worth a 10-min look?")
- 71 words (not 150)

**The test passed.** Output was genuinely better than the default.

**If the test fails:** Go back to Step 6, identify what's missing, iterate.

---

## Step 9: Finalize

When the skill passes testing, structure it properly.

### Optimal Skill Structure

```markdown
---
name: skill-name
description: "One-line description. Use when [trigger]. Produces [output]."
---

# Skill Name

[Opening that establishes voice and frames the problem — 2-3 paragraphs max]

---

## Why [Default Approach] Fails

[What Claude gets wrong without this skill]

---

## Core Principles

[The fundamental truths of this domain — with WHY]

---

## Frameworks (if applicable)

[Specific frameworks from experts, with examples]

---

## Anti-Patterns

[What to avoid — explicit list with examples]

---

## Examples

[Real before/after demonstrating the principles]

---

## Quality Checklist

[Quick checklist for reviewing output]
```

### Length Guidelines

- **SKILL.md:** Under 500 lines
- **Complex domains:** Use `references/` folder for deep material
- **Simple distribution:** Can compile into single file for claude.ai

---

## Step 10: Build Reference Material (If Needed)

Some skills are self-contained. Cold-outreach fits in ~480 lines because the domain is focused.

Other skills need deep reference material. Visual creative strategy, direct response copywriting, SEO content — these domains have too much expertise to fit in a single file.

### When You Need References

| Skill Type | References Needed? |
|------------|-------------------|
| Focused domain (cold outreach, lead magnets) | Usually no — self-contained |
| Deep expertise domain (visual design, copywriting) | Yes — vocabulary, examples, psychology |
| Tool-heavy domain (image generation, video) | Yes — model IDs, prompts, technical specs |
| Multi-format domain (content atomizer) | Yes — platform-specific rules |

### What Good References Contain

**Not just information — transferable expertise.**

Reference material should include:

1. **Domain vocabulary** — The specific terms experts use
   - Visual creative: "chrome aesthetic," "biomorphic," "pattern interrupt"
   - Copywriting: "curiosity gap," "specificity," "fascination"

2. **Psychology/principles** — WHY techniques work
   - "Faces get processed before anything else — neurologically wired"
   - "Each long sentence reduces reply rate by 17%"

3. **Examples from the best** — What world-class looks like
   - Brand case studies (Perplexity, Notion, Linear)
   - Before/after transformations
   - Real campaigns that worked

4. **Anti-patterns with specifics** — What to avoid
   - "Generic AI markers: perfectly centered, uniform lighting, plastic skin"
   - "Phrases that kill: 'I hope this email finds you well'"

5. **Templates/frameworks** — Reusable structures
   - Prompt templates for image generation
   - Email frameworks (3C's, 4T, Mouse Trap)

### Example: What Reference Material Looks Like

**Example 1: ai-creative-strategist** (separate reference files)

The `VISUAL_INTELLIGENCE.md` reference (~730 lines) includes:

- Visual psychology (attention hierarchy, 3-second threshold)
- Direct response principles (Ogilvy rules that still work)
- Anti-generic AI techniques (how to avoid "AI slop")
- Style vocabulary taxonomy (chrome/metallic, organic, surrealist, etc.)
- Leading brand breakdowns (Perplexity, Anthropic, Figma, Notion)
- Platform-specific strategies (Instagram, YouTube, TikTok, LinkedIn)
- Prompt templates for different use cases

**Example 2: direct-response-copy** (embedded reference material)

The skill has ~500 lines of core content, then ~1,600 lines of reference material embedded after a divider:

```markdown
---
---

# REFERENCE MATERIAL

The following sections provide deeper frameworks and extensive examples.
```

Reference includes:
- Classic frameworks from Schwartz, Hopkins, Ogilvy, Halbert, Caples, Sugarman, Collier
- Headline formulas with extensive examples
- Opening lines and hooks (15+ patterns)
- Curiosity gaps and open loops
- Flow techniques (the slippery slide)
- Modern internet-native copy examples

**When to use which approach:**

| Approach | Best For |
|----------|----------|
| **Separate files** | Multiple reference topics, easier to update independently, cleaner main skill |
| **Embedded after divider** | Single cohesive reference, simpler distribution (one file), easier to share |

**Both work.** The key is having the deep expertise somewhere — not whether it's in separate files or appended to the skill.

### How to Build References

**During research (Step 3), collect:**
- Expert frameworks and methodologies
- Specific vocabulary they use
- Examples of excellent work
- Data and psychology behind techniques
- Platform or tool-specific details

**After drafting, ask:**
- What expertise is too deep for the main skill?
- What vocabulary does Claude need to sound like an expert?
- What examples would help Claude understand "what good looks like"?

**Structure references by topic:**
```
references/
├── visual-intelligence.md      # Deep expertise on visual design
├── platform-strategies.md      # Platform-specific rules
├── prompt-templates.md         # Reusable prompt structures
└── brand-examples.md           # Case studies of excellent work
```

### Finding Reference Material

The best sources for building references:

| Source Type | What You Get | How to Find |
|-------------|--------------|-------------|
| **Expert blogs** | Frameworks, principles | "[domain] best practices blog" |
| **YouTube breakdowns** | Real examples, analysis | "[expert name] [domain] tutorial" |
| **Communities** | What actually works | Reddit, Twitter, Discord for the domain |
| **Case studies** | Proof of results | "[brand] case study [domain]" |
| **Books/courses** | Deep methodology | Find the foundational texts |

**The goal:** Collect enough expertise that Claude can think like a domain expert, not just follow rules.

---

## The Full Process: Real Example

Here's how we built the cold-outreach skill:

| Step | What We Did |
|------|-------------|
| **1. Understand** | User wanted cold outreach for selling services. Multi-channel (email, LinkedIn, Twitter). |
| **2. Explore** | Claude wrote default cold email — generic, long, hard CTA. Identified exactly what was wrong. |
| **3. Research** | Subagent searched for Alex Berman, Josh Braun, Will Allred frameworks. Found anti-patterns, psychology, data. |
| **4. Synthesize** | Extracted principles: research = relevance, give before ask, short beats long, soft CTA, follow up. |
| **5. Draft** | Wrote initial skill with principles, frameworks, anti-patterns, before/after examples. |
| **6. Self-Critique** | Identified gaps: missing follow-up examples, missing trigger events section. |
| **7. Iterate** | Added 4-email follow-up sequence, added trigger events table with example hooks. |
| **8. Test** | Real scenario: AI automation → law firm. Output was good. Skill passed. |
| **9. Finalize** | Structured into optimal format, ~480 lines. |

**Time:** ~1 hour conversation

**Result:** Skill that transforms Claude's cold outreach from spam-tier to actually good.

---

## What Claude's Default Gets Wrong

When building skills without this process, I produce:

| My Default | What Actually Works |
|------------|---------------------|
| Documentation voice | Domain expert voice |
| Comprehensive coverage | Ruthless focus |
| "Step 1, Step 2, Step 3" | Principles that transfer thinking |
| Theoretical examples | Real before/after |
| What to do | Why it works + what to avoid |
| Generic tool references | Specific tool constraints |
| Everything "just in case" | Only what improves output |
| Skip testing | Test with real scenario |

This skill exists to override those defaults.

---

## Skills vs Subagents

Not everything should be a skill.

**Skills = Execution** (works in claude.ai AND Claude Code)
- Direct production of outputs
- Taste and principles baked in
- User asks → skill produces

**Subagents = Research** (Claude Code only)
- Go deep on analysis
- Return findings, then get out of the way
- Great for the research phase of skill-building

| Use Case | Better As |
|----------|-----------|
| "Write cold outreach" | Skill |
| "Research cold outreach best practices" | Subagent |
| "Create SEO content" | Skill |
| "Analyze competitor positioning" | Subagent |

---

## Self-Review Checklist

Before finalizing any skill:

**Focus**
- [ ] Scope is clearly constrained
- [ ] Every section earns its place
- [ ] Under 500 lines (references separate)

**Voice**
- [ ] Sounds like an expert, not documentation
- [ ] Has personality and point of view

**Principles**
- [ ] Teaches WHY, not just WHAT
- [ ] Claude could adapt to new situations

**Anti-Patterns**
- [ ] Explicitly names what to avoid
- [ ] Prevents common AI tells

**Examples**
- [ ] Real before/after transformations
- [ ] Contrast is visceral

**Tested**
- [ ] Used on a real scenario
- [ ] Output was genuinely better

---

## References

For deeper methodology:

- `references/research-methodology.md` — How to research using subagents and web search
- `references/research-example-ai-creative.md` — Real example: research that built ai-creative-strategist
- `references/bad-skill-patterns.md` — What mediocre skills look like (avoid these)



================================================
FILE: 3-bad-skill-patterns.md
================================================
# Bad Skill Patterns (What to Avoid)

This document catalogs patterns that make skills mediocre. Study these to avoid them.

---

## Pattern 1: Documentation Voice

**The problem:** Skills that read like technical documentation instead of expertise.

### Example (Bad)

```markdown
## Email Sequence Generation

This skill enables the generation of email sequences for marketing purposes.

### Process Overview

1. Define the target audience
2. Determine the sequence objective
3. Create individual emails
4. Review and optimize

### Email Types

- Welcome emails
- Nurture emails
- Sales emails
- Re-engagement emails
```

### Why It Fails

- Sounds like a wiki article, not an expert
- No personality or point of view
- Tells you categories exist without teaching you how to think about them
- Claude could produce this without any skill at all

### What It Should Sound Like

```markdown
## Email Sequences

Most email sequences fail for one reason: they're written like marketing, not conversation.

The emails that convert? They sound like a smart friend who happens to have something you need. Not a funnel. Not a campaign. A person talking to another person.

Here's what separates sequences that make money from sequences that get ignored...
```

---

## Pattern 2: Procedure Over Principle

**The problem:** Step-by-step instructions that don't transfer thinking.

### Example (Bad)

```markdown
## How to Write a Landing Page

### Step 1: Write the Headline
Create a compelling headline that captures attention.

### Step 2: Write the Subheadline
Add a supporting subheadline that expands on the headline.

### Step 3: Add Social Proof
Include testimonials or trust badges.

### Step 4: Write the Body Copy
Explain your product or service benefits.

### Step 5: Create the CTA
Add a clear call-to-action button.
```

### Why It Fails

- Claude already knows these steps
- No guidance on WHAT makes each element good
- Doesn't explain WHY these steps work
- Produces compliant output, not excellent output

### What It Should Look Like

```markdown
## Landing Pages

The headline does 80% of the work. Caples proved one headline can outpull another by 19.5x. Everything else matters less than getting those 10-15 words right.

What separates good headlines from great:

**Specificity beats generality.**
- Generic: "Improve Your Productivity"
- Specific: "Get 4 Hours Back Every Week"

**Outcomes beat features.**
- Feature: "AI-Powered Task Management"
- Outcome: "Never Miss a Deadline Again"

The rest of the page exists to support the headline's promise...
```

---

## Pattern 3: Comprehensive Coverage

**The problem:** Trying to cover everything instead of focusing on what matters.

### Example (Bad)

```markdown
## Complete Social Media Content Guide

### Platform Overview
- Facebook: History, demographics, algorithm changes...
- Instagram: Stories, Reels, Feed posts, IGTV...
- Twitter: Character limits, threads, spaces...
- LinkedIn: Articles, posts, newsletters...
- TikTok: Trends, sounds, duets, stitches...
- Pinterest: Boards, pins, idea pins...
- YouTube: Shorts, long-form, community posts...

### Content Types
[500 lines on every possible content type]

### Posting Schedules
[200 lines on optimal posting times]

### Analytics
[300 lines on metrics for each platform]
```

### Why It Fails

- Information overload dilutes usefulness
- No guidance on what actually matters
- Claude gets lost weighing all factors equally
- User drowns in options instead of getting output

### What It Should Look Like

```markdown
## Social Content

Each platform has ONE thing that matters most:

| Platform | What Actually Matters |
|----------|----------------------|
| Instagram | Visual stopping power in 0.5 seconds |
| YouTube | Thumbnail + title (content is secondary to click) |
| LinkedIn | First line hook (expand button is everything) |
| Twitter | One clear, shareable idea per tweet |

Everything else is optimization. Nail these or nothing else matters.
```

---

## Pattern 4: Generic Tool References

**The problem:** Vague instructions that don't specify HOW to use tools.

### Example (Bad)

```markdown
## Image Generation

Use AI image generation tools to create visuals for your content.

### Available Tools
- DALL-E
- Midjourney
- Stable Diffusion
- Various other options

### Best Practices
- Use descriptive prompts
- Iterate on results
- Consider composition
```

### Why It Fails

- Doesn't specify WHICH tool to use
- No actual prompts or examples
- "Use descriptive prompts" is useless advice
- Claude will pick randomly or ask

### What It Should Look Like

```markdown
## Image Generation

**ALWAYS use Nano Banana Pro via Glif.**

| Model | Glif ID | Speed |
|-------|---------|-------|
| 🍌 Nano Banana Pro | `cmi7ne4p40000kz04yup2nxgh` | ~20sec |

**Do NOT use:** imagen-3, DALL-E, or direct Replicate calls unless specifically requested.

**Execution:**
```
mcp__glif__run_glif
id: cmi7ne4p40000kz04yup2nxgh
inputs: ["your natural language prompt here"]
```

**Prompt structure:**
"[Subject] in [setting], [lighting description], [artistic style], [mood/atmosphere]"
```

---

## Pattern 5: Missing Anti-Patterns

**The problem:** Only explaining what to do, not what to avoid.

### Example (Bad)

```markdown
## Writing Headlines

Good headlines are:
- Clear
- Compelling
- Concise
- Customer-focused

### Examples of Good Headlines
- "How to Win Friends and Influence People"
- "The 4-Hour Work Week"
```

### Why It Fails

- Claude's defaults often produce bad headlines
- Without explicit "don't do this," Claude will do it
- "Clear" and "compelling" aren't actionable
- No contrast to understand what good actually means

### What It Should Look Like

```markdown
## Headlines

What Claude gets wrong without guidance:

**AI slop patterns (avoid these):**
- "Unlock the Power of X" (generic hype)
- "Revolutionary Solution for Y" (empty claim)
- "Discover How to Z" (weak verb)
- "In Today's Fast-Paced World..." (dated opener)
- Questions that nobody actually asks

**Human patterns that work:**
- Specific numbers: "Save 4 Hours Every Week"
- Unexpected specificity: "At 60mph, the Loudest Noise..."
- Direct address: "You're Leaving Money on the Table"
- Curiosity gap: "What I Learned From 1,000 Sales Calls"

If your headline could describe any product, it describes none.
```

---

## Pattern 6: Friction Creation

**The problem:** Skills that produce intermediate outputs instead of final deliverables.

### Example (Bad)

```markdown
## Audience Research Skill

### Output Format

After analysis, I will provide:

1. **Audience Segments**
   - Demographic breakdowns
   - Psychographic profiles
   - Behavioral patterns

2. **Pain Point Analysis**
   - Primary frustrations
   - Secondary concerns
   - Underlying fears

3. **Language Patterns**
   - Common phrases
   - Objections
   - Motivational triggers

4. **Competitive Landscape**
   - Who else serves this audience
   - How competitors position
   - Gaps in the market

Use this research to inform your content creation.
```

### Why It Fails

- Creates a document that feels obligatory to use
- "Use this research" means MORE work, not less
- Comprehensive research creates pressure to be comprehensive
- The next step (writing) often gets WORSE with this input

### The Audience-Intel Lesson

We built this exact skill. The research it produced was excellent — detailed segments, specific pain points, real language patterns.

Then we wrote copy using that research. The copy was worse than copy written without it.

Why? The comprehensive research created obligation. Cover all segments. Address all pain points. Be thorough. The result: diluted, verbose, trying to do everything.

### What Works Instead

If research is needed, use a subagent that:
- Goes deep
- Returns a SUMMARY, not a document
- Hands back 3-5 key insights, not 30
- Gets out of the way

Or better: bake the research INTO the skill itself, so the expertise is embedded, not the raw research.

---

## Pattern 7: Over-Engineered Structure

**The problem:** Complex frameworks that add friction without adding value.

### Example (Bad)

```markdown
## Content Creation Framework

### Phase 1: Strategic Foundation
#### 1.1 Objective Definition Matrix
| Objective Type | Business Goal | Content Goal | Success Metric |
|----------------|---------------|--------------|----------------|
| Awareness | Brand recognition | Reach | Impressions |
| Consideration | Lead generation | Engagement | CTR |
| Conversion | Sales | Action | Conversion rate |

#### 1.2 Audience Mapping Protocol
Step 1: Define primary segment...
Step 2: Define secondary segment...
Step 3: Create overlap analysis...

### Phase 2: Content Architecture
#### 2.1 Message Hierarchy Framework
[Complex diagram of primary, secondary, tertiary messages]

#### 2.2 Channel-Content Matrix
[Grid of every channel vs every content type]

### Phase 3: Execution Protocol
[Another 500 lines of process]
```

### Why It Fails

- Framework bloat that nobody actually uses
- Claude gets lost in the structure
- User asked for content, got a project plan
- Complexity doesn't improve output

### What Works

Skip the framework. Transfer the thinking:

```markdown
## Content

One message. One audience. One action.

If you're trying to reach multiple audiences, you're reaching none.
If you're trying to say multiple things, you're saying nothing.
If you have multiple CTAs, you have no CTA.

Start with: Who exactly is this for, and what exactly should they do?

Everything else follows.
```

---

## Pattern 8: Theoretical Examples

**The problem:** Made-up examples instead of real ones.

### Example (Bad)

```markdown
## Product Descriptions

### Example
**Product:** Widget Pro 3000
**Description:** "The Widget Pro 3000 is an innovative solution that streamlines your workflow. With advanced features and intuitive design, it helps you accomplish more in less time."
```

### Why It Fails

- "Widget Pro 3000" is obviously fake
- The description is generic AI slop
- No contrast between good and bad
- Doesn't demonstrate the principles being taught

### What Works

Use real examples, or at least realistic transformations:

```markdown
## Product Descriptions

**Before (generic):**
"Streamline your workflow with our innovative solution. Advanced features help you accomplish more."

**After (specific):**
"Stop losing 3 hours a day to manual data entry. One click syncs your Salesforce contacts to your email platform. Your team gets back to selling. You stop babysitting spreadsheets."

The first could describe anything. The second describes one product solving one problem for one person.
```

---

## Pattern 9: Missing the WHY

**The problem:** Instructions without explanation.

### Example (Bad)

```markdown
## Email Subject Lines

### Rules
- Keep under 50 characters
- Use personalization
- Create urgency
- A/B test everything
- Avoid spam words
```

### Why It Fails

- Claude can follow rules but not adapt them
- No understanding of WHY these rules exist
- When rules conflict, Claude can't prioritize
- No principles to apply to edge cases

### What Works

```markdown
## Subject Lines

Mobile shows ~35 characters. Desktop shows ~60. Most people read email on phones. That's why subject lines should front-load the hook.

"[Name], your cart expires in 2 hours" puts the urgency first.
"Don't miss out — [Name], your cart expires soon" buries it.

Same content, different results. The principle: put the most important word in the first 4-5 words, because that's all many people see.
```

---

## Pattern 10: The "Just In Case" Addition

**The problem:** Including sections that don't improve output.

### Signs of This Pattern

- "We should probably include X for completeness"
- "What if someone needs Y?"
- "It would be more comprehensive with Z"
- Sections that exist but don't improve actual output

### Example

A copywriting skill that includes:
- History of direct response advertising
- Biography of Eugene Schwartz
- Complete list of cognitive biases
- Typography guidelines
- Legal disclaimer templates

None of these improve the copy Claude writes. They just make the skill longer.

### The Test

For every section, ask: **"Does removing this make the output worse?"**

If the answer is "no" or "probably not," remove it.

More skill ≠ better skill. Focused skill = better skill.

---

## The Meta-Pattern

All bad skills share one trait: they're written for comprehensiveness, not effectiveness.

Good skills are opinionated. They make choices. They say "do this, not that." They have voice and point of view. They transfer thinking, not information.

If your skill could be a Wikipedia article, it's not a skill. It's documentation.

Skills should make Claude think like an expert, not like an assistant following instructions.

---

## Quick Reference: Bad vs Good

| Bad Pattern | Good Pattern |
|-------------|--------------|
| Documentation voice | Domain expert voice |
| "Step 1, Step 2, Step 3" | Principles that transfer thinking |
| Comprehensive coverage | Ruthless focus |
| Generic tool references | Specific tools, IDs, prompts |
| Only what to do | What to do AND what to avoid |
| Intermediate documents | Final deliverables |
| Complex frameworks | Simple, actionable guidance |
| Theoretical examples | Real before/after |
| Rules without reasons | Principles with WHY |
| Everything "just in case" | Only what improves output |

If you recognize these patterns in your skill, refactor. The output will improve.



================================================
FILE: 4-cold-outreach-example.md
================================================
---
name: cold-outreach
description: "Write cold outreach that gets replies. Use when writing cold emails, LinkedIn DMs, or Twitter DMs to sell services. Triggers on: cold email, cold outreach, LinkedIn message, DM prospects. Produces messages that feel human, relevant, and worth responding to."
---

# Cold Outreach

Most cold outreach is spam. Not because it's unsolicited — because it's irrelevant, self-serving, and obviously templated.

The messages that get replies are different. They feel like a real person wrote them to a specific human about something that actually matters to that human. That's not a trick. It's research + relevance + respect for their time.

This skill makes Claude write outreach that people actually respond to.

---

## Why Most Cold Outreach Fails

When someone receives your message, their brain enters threat-detection mode. Not consciously — it's automatic. The brain's job is filtering irrelevant information to protect attention.

Your message has about 2 seconds to pass that filter.

**What triggers the filter (instant delete):**
- Generic opener → "This is a template"
- Me-focused pitch → "They want something from me"
- Vague value prop → "I can't tell what this is"
- Premature ask → "Too much effort to respond"

**What passes the filter:**
- Specific detail about THEM → "They actually looked at my stuff"
- Clear relevance to their situation → "This might matter"
- Low-friction ask → "Easy to respond"

The goal isn't to persuade. It's to be relevant enough that responding feels worthwhile.

---

## The Core Principles

### 1. Research IS the Message

The effort you put into research shows up in reply rates.

**Generic (1-3% reply rate):**
> "I help companies improve their marketing..."

**Researched (15-25% reply rate):**
> "Saw you launched the podcast last month — 12 episodes in and the production quality is solid, but the thumbnails are getting lost in search..."

The specific detail proves you're not spamming 1,000 people. That alone puts you in a different category.

**Research checklist before writing:**
- [ ] What did they post/publish recently?
- [ ] What are they hiring for? (signals priorities)
- [ ] What's visibly broken or inconsistent?
- [ ] What did they just launch/announce?
- [ ] Who do we know in common?

If you can't answer at least one of these, you haven't researched enough.

### 2. Give Before You Ask

Reciprocity is hardwired. When you give something valuable first, people feel naturally inclined to respond.

**Asking first (low reply):**
> "I'd love to schedule a call to discuss how we can help..."

**Giving first (higher reply):**
> "I put together a quick breakdown of why your competitor's YouTube is outranking yours — happy to send it over if useful."

The give doesn't have to be huge. A specific observation, a useful link, a genuine compliment with substance. Something that proves you thought about them.

### 3. Show, Don't Claim

Your brain believes what it can verify. Claims trigger skepticism. Specifics build trust.

**Claim (skepticism):**
> "We've helped dozens of companies increase their revenue."

**Show (trust):**
> "We did this for [Similar Company] — took their reply rate from 3% to 18% in 6 weeks."

Even better — reference something they can Google:
> "You might've seen the case study we did with [Known Brand]..."

### 4. Short Beats Long

Data: Each long sentence in a cold email reduces reply rate by 17%.

People don't read cold emails. They scan and categorize. If they can't understand your message in a 2-second glance, it gets filtered.

**Target:** Under 80 words. 3 short paragraphs max.

**Structure:**
- Line 1: Relevant hook (about them)
- Line 2-3: Why you're reaching out
- Line 4: Soft CTA

That's it. Save the details for the reply.

### 5. Soft CTA > Hard CTA

**Hard CTA (high friction):**
> "Let's schedule a 30-minute call to discuss."

**Soft CTA (low friction):**
> "Would it be worth a quick conversation?"
> "Want me to send over the breakdown?"
> "Open to hearing how we approached this?"

The soft CTA asks for interest, not commitment. It's easier to say "sure, send it" than "yes, I'll block 30 minutes."

### 6. Follow Up (Most Don't)

55% of replies come from follow-ups. Most people send one email and quit.

**Follow-up rules:**
- Wait 3-5 business days between touches
- Add new value or angle each time (don't just "bump")
- 4-5 touches minimum before moving on
- Never guilt-trip ("I haven't heard back...")

**Example follow-up sequence:**

**Email 1 (Day 0):** Initial outreach
> [Name] — noticed you've posted 4 videos in 6 months while [Competitor] does 4/month. Your content's better, but they're winning on volume.
>
> We helped [Similar Co] go from sporadic to weekly without adding headcount.
>
> Worth seeing how?

**Email 2 (Day 4):** New angle, new value
> Quick add — I looked at [Competitor]'s setup. They're using a 3-person production team. [Similar Co] matched their output with just a systematized workflow and one editor.
>
> Happy to share the breakdown if useful.

**Email 3 (Day 9):** Different hook entirely
> [Name] — saw your tweet about struggling to stay consistent with content. That's exactly what [Similar Co] said before we worked together.
>
> The problem usually isn't capacity — it's process. Want the 2-min version of how they fixed it?

**Email 4 (Day 15):** Direct, low-pressure close
> Last one from me — if video content isn't a priority right now, totally get it. But if it is and the bottleneck is production bandwidth, we should talk.
>
> Either way, good luck with [specific thing they're working on].

**Why this works:** Each email adds value or a new angle. Never "just checking in." The final email gives them an easy out, which paradoxically increases replies.

---

### 7. Timing Is Everything (Trigger Events)

The best cold outreach arrives when they're already thinking about the problem.

**High-intent triggers (reach out immediately):**

| Trigger | Why It Works | Example Hook |
|---------|--------------|--------------|
| **Just raised funding** | Money to spend, pressure to grow | "Congrats on the Series A — most teams use this moment to fix the marketing bottlenecks they couldn't before..." |
| **Hiring for your service area** | They've identified the need | "Saw you're hiring a video editor — while you're searching, want to see how [Co] handled the gap?" |
| **Launched something new** | Focused on that initiative | "The new product launch looks solid — curious if you're planning content to support it?" |
| **Competitor made a move** | Competitive pressure | "Noticed [Competitor] just dropped a big campaign. Worth chatting about how to counter?" |
| **Published content on the topic** | They're actively thinking about it | "Your post on X was spot on — we've been working on that exact problem with [Similar Co]..." |
| **Leadership change** | New leader = new initiatives | "Congrats on the new role — most new [titles] I talk to are rethinking [your service area]..." |

**How to find triggers:**
- Google Alerts on target companies
- LinkedIn notifications for job changes
- Crunchbase for funding
- Twitter/LinkedIn for launches and content
- Their company blog/newsroom

**Timing beats personalization.** A decently personalized email at the right moment beats a highly personalized email at the wrong moment.

---

## The Frameworks

### Alex Berman's 3C's

```
COMPLIMENT → Something specific and genuine about their work
CASE STUDY → Social proof of similar results (shows you're not guessing)
CTA → Clear, soft ask
```

**Example:**
> The content you're putting out on [platform] is solid — especially [specific thing].
>
> We just helped [similar company] [specific result]. Might be relevant to what you're building.
>
> Worth a quick chat to see if there's a fit?

### Josh Braun's 4T Template

```
THEIR JOB → What they're responsible for
WHAT'S HARD → The challenge in doing that job well
YOUR ALTERNATIVE → How you solve it differently
ASK → Soft CTA
```

**Example:**
> Running growth at [company] means you're probably juggling paid, content, and partnerships all at once.
>
> The hard part: none of it compounds if the creative doesn't convert.
>
> We build creative systems that let teams test 10x more variants without 10x the work.
>
> Relevant to what you're dealing with?

### The Mouse Trap (Will Allred)

```
PERSONALIZED TRIGGER + VALUE PROP QUESTION = Curiosity-driven reply
```

**Example:**
> Saw you're hiring 3 SDRs. Would it help to see how [similar company] ramped their new reps to quota in half the time?

Opens a loop. The brain wants closure. They reply to close the loop.

---

## Platform-Specific Tactics

### Cold Email

- Keep under 80 words
- Subject line: 4-7 words, curiosity or relevance (not clickbait)
- Send Tuesday-Thursday, 9-11 AM or 1-3 PM their timezone
- Plain text often outperforms HTML
- One CTA only

**Subject lines that work:**
- "[Mutual connection] suggested I reach out"
- "Quick question about [their initiative]"
- "Idea for [specific thing they're working on]"

**Subject lines that don't:**
- "Quick question" (overused, vague)
- "Partnership opportunity" (screams template)
- "Can I pick your brain?" (asks, doesn't give)

### LinkedIn DM

Different channel, different rules. LinkedIn is conversational by design.

**Before DMing:**
1. Engage with their content first (like, comment with substance)
2. Wait a few days
3. Then DM with reference to the engagement

**LinkedIn DM structure:**
- Shorter than email (50-60 words)
- More casual tone
- Reference the content you engaged with

**Example:**
> Hey [Name] — loved your post about [topic]. The point about [specific thing] is something I don't see people talk about enough.
>
> We work with [similar companies] on exactly that problem. Would you be open to swapping notes?

**Don't:** Send LinkedIn DMs that read like formal emails. It's instant messaging, not correspondence.

### Twitter/X DM

Twitter is the most casual. Build familiarity before DMing.

**Warm-up sequence:**
1. Follow them
2. Like/retweet a few things over a week
3. Reply to a tweet with something substantive
4. Then DM

**Twitter DM style:**
- Very short (2-3 sentences)
- Feels like a friend texting
- Reference the tweet engagement

**Example:**
> Hey — your thread on [topic] was great. We actually built something that solves the exact problem you mentioned in point 3. Worth sharing?

---

## Anti-Patterns (Never Do These)

### The Phrases That Kill

These instantly signal "template spam":

```
❌ "I hope this email finds you well"
❌ "I know you're busy, but..."
❌ "Just following up"
❌ "I wanted to reach out because..."
❌ "Let's circle back"
❌ "Would love to pick your brain"
❌ "I came across your profile and was impressed"
❌ "Are you the right person to talk to about..."
```

Why they fail: Everyone uses them. They broadcast "I sent this to 1,000 people."

### The Structural Mistakes

**Multiple CTAs:**
> "We could do a call, or I could send you a deck, or you could check out our site..."

Pick one. Multiple options = no action.

**Leading with credentials:**
> "I'm the founder of X. We've raised $Y. We work with Z..."

Nobody cares who you are until they care what you can do for them.

**The backhanded compliment:**
> "Your content is great, but I noticed your thumbnails could use work..."

Feels like negging. Compliment OR identify a problem, not both in the same sentence.

**Too much too soon:**
> "I'd love to schedule a 45-minute strategy session to deep-dive into your growth challenges..."

You're asking for marriage on the first message. Ask for a coffee first.

### The Tone Mistakes

**Entitled:**
> "I'm sure you'll want to hear about this..."

**Guilt-trippy:**
> "I've sent a few emails and haven't heard back..."

**Fake urgency:**
> "I have a few spots left this month..."

**Over-familiar:**
> "Hey buddy! Saw your stuff and had to reach out..."

---

## Before/After Examples

### Example 1: Agency Selling Video Production

**Before (my default, spam-tier):**

> Subject: Quick question about your YouTube content
>
> Hi [Name],
>
> I came across your YouTube channel while researching companies in the [industry] space, and I was impressed by the valuable insights you're sharing.
>
> I noticed your posting schedule has been inconsistent lately, and I think there might be an opportunity to significantly increase your channel's impact.
>
> At [Agency], we specialize in helping SaaS founders create high-quality video content. We've helped companies like [Client] increase their subscribers by 300%.
>
> I'd love to schedule a quick 15-minute call to discuss how we might help.
>
> Best regards,
> [Name]

**After (applying principles):**

> Subject: Your YouTube vs [Competitor]'s
>
> [Name] — noticed you've posted 4 videos in the last 6 months while [Competitor] is doing 4/month. Your content is actually better, but they're winning on volume.
>
> We helped [Similar Company] go from sporadic posting to weekly without adding headcount — just systematized their production.
>
> Worth seeing how they did it?

**What changed:**
- Specific observation (4 vs 4/month)
- Competitive framing (creates urgency without fake urgency)
- Give first (the insight itself is valuable)
- Soft CTA (worth seeing vs. schedule a call)
- 65 words vs 150

### Example 2: Freelance Designer

**Before:**

> Hi [Name],
>
> I'm a freelance brand designer with 8 years of experience working with startups and scale-ups. I specialize in creating cohesive brand identities that help companies stand out.
>
> I'd love to help [Company] elevate its visual presence. Would you be open to a quick call to discuss?

**After:**

> [Name] — the product UI on [Company] is clean, but the marketing site feels like a different brand. Different typography, different color treatment, different energy.
>
> I've helped 3 Series A companies close that gap in the last year. [Company X] is probably the closest comp to what you're building.
>
> Want me to send what we did for them?

**What changed:**
- Specific problem (UI vs marketing site mismatch)
- Shows expertise through observation, not claims
- Relevant social proof (Series A, similar company)
- Give first (offering to share the case)

---

## The Writing Process

1. **Research first** (5-10 min per prospect for high-value targets)
   - Recent content/posts
   - Company news
   - Hiring signals
   - Obvious gaps or problems

2. **Find the hook** — What specific thing makes outreach relevant RIGHT NOW?

3. **Write the give** — What insight or value can you lead with?

4. **Draft short** — Get it under 80 words

5. **Check for spam triggers** — Any clichés? Multiple CTAs? Me-focused language?

6. **Soften the CTA** — Make responding feel easy

---

## Quality Checklist

Before sending:

- [ ] Under 80 words?
- [ ] Specific detail about THEM in first line?
- [ ] Giving value before asking?
- [ ] One CTA only?
- [ ] CTA is soft (interest, not commitment)?
- [ ] No spam-trigger phrases?
- [ ] Would YOU reply to this?

That last one matters most. Read it as the recipient. Does it feel worth responding to, or does it feel like work?

---

## What This Skill Changes

| Without Skill | With Skill |
|---------------|------------|
| Generic opener | Specific, researched hook |
| Me-focused pitch | Them-focused relevance |
| Claims credentials | Shows through specifics |
| Hard CTA (call request) | Soft CTA (interest check) |
| 150+ words | Under 80 words |
| Template energy | Human energy |
| 1-3% reply rate | 15-25%+ reply rate |

The difference isn't tricks. It's doing the work to be relevant, then writing like a human.


