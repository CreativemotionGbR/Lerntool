# AGENTS.md

## Project goal

Build a local browser-based flashcard learning tool similar to a reduced version of Anki.

The application runs locally by opening index.html and stores learning data locally in the browser.

The MVP includes:
- deck overview
- deck creation
- card management
- learning mode
- custom repetition scheduling
- statistics
- JSON import/export

## Coding and style rules

- Use simple HTML, CSS, and JavaScript.
- Keep the code understandable for students.
- Do not add unnecessary frameworks.
- Prefer maintainable functions and clear names.
- Keep UI minimal and functional.
- Do not add backend code.
- Do not add login.
- Do not add cloud sync.
- Do not add GitHub sync.
- Do not add AI features in the MVP.

## Data and privacy rules

- Store learning data locally.
- Do not send data externally.
- No tracking.
- No analytics.

## Scheduling rules

Correct answer:
- interval_minutes increases by 1
- due_at = now + new interval

Incorrect answer:
- interval_minutes decreases by 2
- minimum interval is 1
- due_at = now + new interval

New cards:
- interval_minutes = 0
- due_at = now

## Testing expectations

Include happy path tests and failure tests.

Happy path:
- create deck
- create card
- learn card
- show answer
- mark correct
- verify interval becomes 1

Failure tests:
- missing deck name
- missing question
- missing answer
- invalid JSON import

## Agent behavior

- Build only from the specification.
- Do not invent missing requirements.
- Mark unclear requirements as open decisions.
