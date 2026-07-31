<!-- BEGIN fluent -->
## Driving fluent

This project uses **fluent** to build changes through a structured, reviewed lifecycle.
The **fluent skill** is the deep reference — invoke it for the full stage procedures.
This section is the always-loaded summary and is enough to drive fluent on its own.

- **Lifecycle:** capture a brief → define behaviors → design an approach → plan →
  delegated execute → review → Learner → ready Merge Candidate. A human inspects and
  lands it. The first four stages are a user conversation — work through them one
  question at a time; don't skip them.
- **Work model:** a Work Item holds the plan; an Attempt runs writer → tester → reviewers
  in rounds, then runs the Learner after the reviewers pass. Only a successful Learner
  run makes the Merge Candidate ready. A relaunchable failure remains non-ready and
  `fluent attempt run` retries only the Learner; a non-relaunchable evidence failure
  stays blocked for human recovery and must not rerun or land.
- **Follow the next-action line:** most fluent commands print a `→ Next:` next-action line
  to stderr naming the command to run next; a state with no actionable step prints none.
  Run `fluent status` at session start and after any gap to see what needs attention, then
  follow the `→ Next:` line when it prints.
- **Observations:** capture durable lessons and future work with `fluent observation
  create`; list them with `fluent observation list`.
- **Pause for the user:** when a decision genuinely needs a human, fluent sets
  `needs-user` and pauses; read the named handoff file, then resume with `fluent attempt
  run` once resolved.
- **Committed scaffolding:** fluent commits its `.fluent/` notes and test config alongside
  your code changes, so its learned project state persists across runs.
- **Local Preview:** Attempts run locally in the foreground. Corrective follow-ups become
  proposed Work by default. `fluent work-item authorize` authorizes and queues Work;
  execution starts only while a human runs `fluent scheduler run`. The scheduler stops at a
  ready Merge Candidate after successful Learning, and every ready candidate is inspected
  and landed by a human.
  Post-merge review is off by default; opt in per land with
  `fluent merge-candidate land --post-merge-review`. `fluent auto-merge`, automatic
  scheduler lifecycle, automatic landing, and Fargate are outside this path. For an
  uninitialized project, use the full fluent skill to choose follow-up mode before running
  `fluent init`. If the user chooses execute, write this after init:

  ```yaml
  follow-up:
    mode: execute
  ```

### Ask the user easy-to-answer questions

One question at a time; leave a blank line after the question stem. Use two shapes:

- **Decision** — pick one option. Label the options (a)/(b)/(c), each self-contained; put
  the recommended option first and mark it `(recommended: <why>)`. The answer is a single
  letter.
- **Confirm gate** — approve or route back: "Reply **yes (y)**, or name what to revise:
  (a).../(b).../(c)...". The default is yes; a bare `y` is accepted.

Avoid the anti-pattern: an unlabeled "X or Y?" that forces the user to re-describe an option.

See the fluent skill for the full brief/behaviors/approach/plan procedure.
<!-- END fluent -->
