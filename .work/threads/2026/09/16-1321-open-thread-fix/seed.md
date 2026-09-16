# Fix the open-thread skill

I have something to say about the latest open-thread implementation. Take a look the following 2 threads that I created for debug purposes:

- "open-thread `https://github.com/Jei-sKappa/antmay/issues/42`. I'm considering putting them in the frontmatter." -> `temp/.work/threads/2026/09/16-1257-seed-metadata-placement`
- "open-thread I wanna make all the skills much much shorter" -> `temp/.work/threads/2026/09/16-1300-shorten-the-skills`

The problem is 1 (and a half): in `.work/threads/2026/09/16-1257-seed-metadata-placement/seed.md` the agent has written the ticket section and at the end
he added my "I'm considering putting them in the frontmatter." addition. That's bad because a reader without gh access could think that that was writtin
in the ticket itself. Instead what we should do is make the ticked an explicit block and I need your help to define how. Maybe html tag? Maybe an ticket
section and another heading with the usual seed prose?

The other 2 problems (unrelated but problems) is that the agent:
- in `.work/threads/2026/09/16-1257-seed-metadata-placement/seed.md` wrote my comment literally with "I'm" and I think that's bad because the seed should
be impersonal.
- in `.work/threads/2026/09/16-1300-shorten-the-skills/seed.md` it took too much freedom and write a lot when I just told him literally "I wanna make all
the skills much much shorter" I don't think it's good that he infered all that wall of text. In this case we have 2 options:
  - write just what the user said
  - start interviewing the user to make the seed more complete
