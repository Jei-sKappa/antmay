# Follow-ups

An agent just implemented `.wip/threads/2026/09/05-1339-address-failure-modes-report/spec.md`.
The work started after the commit `890b3d889356e9fd33c0aa0173855ff5a8b1cc08`.

I have some things that I don't like (ignore `cli` for this thread/discussion):
- `suite/shared/references/formats`: We need to decide whether the format file should describe only the format itself or whether it can add something else. I’m noticing that the format files have a structure that isn’t very consistent and feels strange. Above all, the worst offender is the ADR format file, because it adds other information that isn’t part of the ADR format. As a result, it becomes a hybrid file, which is exactly what we need to avoid.
- Retire "Primitives":
  We need to rethink the primitives because for example I'm not sure that for example the `allocate-thread` skill does actually need to exist because the only one that's calling it is `open-thread`. I think that we need to introduce the `instructions/` shared folder in `suite/shared/references` and use it to store common instructions instead of primitives.
  In most cases, it’s probably smarter to have an instructions file like this instead of a skill that acts as a primitive. However, there are some cases where a primitive skill can make sense. First of all, I think the name “Primitive” is wrong, because I now have a different concept in mind.
  For me, what we are currently calling “Primitives” are all the skills that the model can call at its own discretion, without me necessarily having to mention them. Therefore, they should be designed by our instruction method as instructions that the model can invoke whenever it wants—or, if needed, that we can suggest it invokes. The key point is that these are things that are always useful to the model in any situation.
  For example, I don’t like that the instruction to list the entire ADR catalog is in the ADR format file, because it has nothing to do with that. That should be a global skill, or “model-invocable.”
  We need to find a term to group them, but that’s the idea: something that can always be useful to the AI model.
- There are some dumb instructions like "**A decision settled with the user during the run.**" in the implementation skills. It's dumb because the implementation skills are completition oriented and the user is assumed to not be present it's impossibile to settle a decision with the user during the run. Check for other dumb instructions/phrases like this. (Use subagents to split the work and be more precise)
- We need to carefully craft our docs like `suite/method.md` and `suite/skill-authoring.md` and make sure that they are up to date and accurate with my preferences do avoid slop in the future. Maybe we can consider adding more files and/or split them in smaller files to make them clearer.
- We need to make AGENTS.md as small as possible and treat them just like pointers to the other files and on top of that write only the essential that every agent needs to know. Both root one and the one in `suite/`.
- Delete "recipes" quick, roadmap and standards. Both the docs and whatever file reference them.
- Delete the skill whats-next. I don't use it.
- Delete the skill finish. I don't use it.
- Make all the skill at version 0.0.0 because I change them too frequently for them be useful as versioned skills.
