# Rework the Antmay artifact model around distinct durable homes

## Intent

Rework the Antmay artifact model so that architecture decisions, product and scope requirements, rules and guidelines for agents, and background information each have a distinct durable home, and so that thread-local artifacts such as spec FR/AC ids cannot leak into code.

The work is triggered by two independent audits and an engineering-terms overview produced on the Leitspace project, where the method produced 96 ADRs that were cut by hand to 46 at roadmap entry 2, and where FR/AC ids had to be scrubbed from code.

This thread covers the method itself and the role of the impacted skills. The wording of skill bodies is out of scope until the method is settled.
