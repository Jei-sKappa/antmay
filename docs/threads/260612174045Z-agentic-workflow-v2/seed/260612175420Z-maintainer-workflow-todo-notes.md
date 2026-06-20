# Maintainer workflow TODO notes (verbatim copy)

> Provenance: written by the maintainer while using Workflow V1 day-to-day; originally
> kept at `temp/my-workflow-skills/TODO.md` in the appaltiav2 workspace (gitignored,
> ephemeral). Copied verbatim into this thread on 2026-06-12 because the V2 proposal's
> traceability map (§17) cites these items by line; the line numbers below refer to the
> ORIGINAL file and are preserved by keeping the content byte-identical from here down.
> Artifact-type token `notes` is provisionally registered per the filename grammar's
> open token list. This is a record: immutable from emission.

---

- [ ] Add a type of review that, starting from a set of discussions and a document produced from them, verifies that the resulting document does not contain decisions or assumptions that the user did not explicitly see and accept in the discussions.

The goal is to ensure that the produced document maps the discussion content one-to-one into a single document: it must be lossless and must not add anything extra that the user did not discuss.

The output should be either:

- Nothing, if everything is OK; or
- A list of items that the final document includes but that were not explicitly discussed and accepted by the user; and, in a separate section,
- The decisions made by the user that were not captured in the final document.

Also, consider this distinction between “extra content” and “missing content,” and evaluate whether to implement this as two separate skills or as a single new skill with a flag.

- It might make sense to start differentiating the type of discussion. A creative discussion should include multiple options right away, so we can explore different possibilities. On the other hand, a more practical discussion—like reviewing a revision, discussing a code review, and fixing issues—makes more sense with a single proposal instead of multiple alternatives. In general, a discussion log should be wrote if it contains useful infos about the target of the discussion that are useful to a future reader.
- It definitely makes sense to make it clear to whoever is writing, for example, this document as a spec (or a plan, but probably more of a spec) that everything written must match what has been discussed with the user. They should never make decisions that the user has not been informed about. This helps reduce what this new review needs to check, since the person writing the spec is already aware of what they need to do.
---

- [ ] In the Discussion Loop I would like to add something like: "We both are on the same level, neither of us is more or less knowledgeable than the other. You will not blindly trust/accept anything that I say/propose unless you agree with it and I will do the same for you. We are both trying to reach the best decision together."

- [ ] I think (and it should be verified or we should build a conter argument againt it) that every discussion a has "a target"; maybe a spec, an idea, a review, some code, a document, website, etc.
Because of that the logged `P<N>`s should be scoped to the target of the discussion. The discussion, unless necessary (or for some reason that came up during the discussion itself) should not branch into multiple paths.
If the Agent asks the user something that is unrelated to the target of the discussion he should not prefix the point with `P<N>` and explicitly ask the user to allow not logging this point or log it with a different prefix that we could create a convention for like: branch/unrelated/general.
This is useful because it often happens that the agent ask me what he is supposed to do at the end of a discussion, within the discussion log itself. So when he ask what he should do, I might answer, “Update the spec with the points from this discussion,” and then he logs that "decision/answer" as an item in the original decision log—which is strange, because that question isn’t really the target of the discussion itself.


- [ ] Do not force the discussion loop to always provide options. Instead, allow the model to directly give a single recommended option when it is well explained, replacing the usual set of options plus the standard recommendation. Once the project called “Skillrouter” is finished, this could easily become an option that can be triggered via flags.
"Fable 5" likes a lot to explicitly give a single "Proposed Solution/Fix/Thing" instead of providing a list of options and a recommendation.
Take a look at the `Redesign Appaltia v2 (from MVP + Spike)` chat from appaltia repo.


- [ ] Add STATE.md or state.json to every thread.


- [ ] One a thread is closed it can no longer be edited and to enfoce this we add a property to the state files that hash all the content of the thread and put it in the state file. So we can detect if the thread has been edited after it has been closed.
Is this a good idea or is git enough?


- [ ] When we add the cli-based skills with `jastr` we need to add something like a "prerequisite" check that will be used to verify if the instructions outputted can be actually executed. Example: a skill may tell the agent to run the `my-cli dosomething --flag` but we need to verify if the `my-cli` is installed and available in the path, otherwise we should fail the instruction compltely and tell the agent to warn the user that the prerequisite is not met. This is better then letting the agent executute the instruction until if fails becuase something is not available.
Real Example: a skill `jastr run spec` could, in some cases, instruct the agent to run `jastr run research` to get instruction for research before creating the spec as part of the spec skill itself. So here the prerequisite check should fail because the `research` skill is not installed.


- [ ] Force discussion loop to add numbers/letters to the optioons` so the user can easily reference them. (like A. B. C. etc.)


- [ ] we should have an ad-hoc "update" spec and plan skills.
Because of the immutability rule we are forced to crate multiple version of a spec so if an agent needs to update a spec after a review for example it has to copy the spec, and modify the updated version.
This process should be documented by something like "update-spec" skill or a `create-spec --update` if we use skillrouter.
Also we should probably remove the spec immutability rule and let the agent update the spec in place.
We can add the a spec-delta that can record an update to the spec done after implementation phase.
So: during writing spec and plan phase the spec can be updated in place but after the implementation phase the spec is locked and can only be updated by adding a spec-delta.


- [ ] If we add a roadmap like feature here it should be flexible:
It's okay to define at the start a list of phases and implement them one by one but if a phase founds something like a follow-up, an issue or a new feature we should have a way to add/append this items into the next phase so that when we will discuss the next phase w can either choose to welcome them at this phase or move them to the next phase.


- [ ] Imporove spec creation UX.
The process of:
- discussing things before creating the spec
- crating the spec --auto
- (*LOOP_START*) reviewing the spec --auto
- discussing the spec review findings
- updating the spec based on the discussion about the spec review findings
- (*LOOP_END*)
Should have a better UX becuase currently every phase doesn't know about the other and


- [ ] Discussion loop mean header should have all the contxt possible of what is being discussed. If we are discussing a file we should clearly write it in the header.
Bad example:
```
# V1 Spec Review Discussion

This log records decisions for resolving the v1 spec review findings around output paths, directive syntax, include safety, included frontmatter, and skill-name validation.
```


- [ ] Review Spec Auto does not output what spec does it reviews; it directly starts with "## Verdict". It should output at least the spec path at beginning. We should probabilty move the "## References" section to the beginning and not make it a dumb list but a list with at least a `- description: path`.
Also if possible it should prefer path relative to the project root not the absolute path.
Bad exmaple:
```
## References

- `/Users/jacopo/Developer/projects/personal/tools/skillrouter/docs/threads/260526113604Z-agent-skill-router-cli/specs/260526140146Z-v1-spec.md`
- `/Users/jacopo/Developer/projects/personal/tools/skillrouter/docs/threads/260526113604Z-agent-skill-router-cli/discussions/2026-05-26-agent-skill-router-cli-design-discussion.md` - P2, P6, P9, P18, P22, P24, P25, P32
- `/Users/jacopo/Developer/projects/personal/tools/skillrouter/docs/threads/260526113604Z-agent-skill-router-cli/proposals/260526113604Z-agent-skill-router-cli-proposal.md`
```


- [ ] A spec should be able to explicitly leave something as ambiguos.
The current bar is the "handoff-grade" bar but sometimes a feature can be shipped also if something is deliberately unspecified.
For example in a Flutter app I might describe what I wanna be able to do in a screen, maybe also roughly how it should look like, but I might not know or want to specify the exact details of the implementation and I leave free choice. In this case what I enforce the "what I want" (handoff-grade) but deliberately leave the "how to achieve it" (free choice).
In general a spec should have a section near the bottom (if not the latest) that explicitly state what is deliberately left as ambiguos.


- [ ] Perhaps instead of having the concept of an inbox, we could make it so that when an AI agent is implementing code, rather than putting its notes in an inbox, every automatic implementation has an attached file—something like `implementation_report.md`. This file would be linked to the implementation (and likely to a plan) where the agent, if necessary, writes everything it needs me to know at the end of the execution. This would include any problems encountered, small notes, or deviations from the plan along with their justifications, and so on.


- [ ] We should never have a write-plan-interactive: A plan is designed to be generated from a specification; if the specification is written correctly, the plan must follow it 100%. Once a plan has been created, the next step is to conduct a review. There are four possible outcomes following a plan review:
1. The plan is perfect and can be implemented.
2. The plan did not follow the specification and must be modified (can be done automatically and in loop until the plan matches the specification)
3. The plan does not follow the specification because the spec itself was ambiguos, incomplete or not clear enough.
4. The plan is ambiguos because the spec itself was ambiguos, incomplete or not clear enough.

In this third/fourth case, the AI must ask a human for input and subsequently modify the specification to make it less ambiguous.

Note for future reader: we should probably merge the 3rd and 4th cases into a single one or leave them separate but provide a more detailed explanation of the difference between the two.


- [ ] (proposal) Discussion loop should stop at what you need to know before providing options/recommendations to ask user if he wanna answer directlty, provide more context, skip that point or continue normally by providing options/recommendations.
