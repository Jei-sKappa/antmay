A useful way to understand engineering documents is by **what question they answer in the lifecycle of a product**:

**Why are we doing this? → What are we building? → How should it behave? → How will we build it? → How do we know it works? → How do we operate it?**

## 1. Product direction — “Why are we doing this?”

| Term           | Meaning                                                                                             | Main question it answers                                           |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Vision**     | High-level description of the future the product aims to create.                                    | Where are we going?                                                |
| **Strategy**   | Choices about how the organization/product will achieve the vision.                                 | How will we win / succeed?                                         |
| **Roadmap**    | Time-oriented view of planned outcomes, initiatives, or major work.                                 | What are we focusing on next?                                      |
| **Initiative** | Large strategic body of work, usually spanning multiple teams or epics.                             | What major outcome are we pursuing?                                |
| **OKR**        | **Objectives and Key Results**. Goal-setting framework: qualitative objective + measurable results. | What outcome are we trying to achieve, and how will we measure it? |

A simplified hierarchy might be:

**Vision → Strategy → Initiative → Epic → User Story → Task**

But organizations use these names differently.

---

## 2. Product requirements — “What are we building?”

| Term             | Meaning                                                                                                                                  | Main question                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **PRD**          | **Product Requirements Document**. Explains the problem, users, goals, requirements, scope, success metrics, etc.                        | What product should we build, and why?   |
| **Requirement**  | A capability, constraint, or behavior the system must satisfy.                                                                           | What must be true?                       |
| **FR**           | **Functional Requirement**. Describes something the system must **do**.                                                                  | What behavior/functionality is required? |
| **NFR**          | **Non-Functional Requirement**. Describes a quality or constraint: performance, availability, security, scalability, accessibility, etc. | How well must the system behave?         |
| **Scope**        | Defines what is included in the project.                                                                                                 | What are we doing?                       |
| **Out of Scope** | Explicitly states what will **not** be done.                                                                                             | What are we intentionally not doing?     |
| **Constraint**   | A restriction the solution must respect.                                                                                                 | What limits our solution space?          |
| **Assumption**   | Something currently believed to be true and used in planning/design.                                                                     | What are we assuming?                    |

Example:

**FR:** “Users can reset their password by email.”

**NFR:** “95% of password reset emails must be delivered within 30 seconds.”

That distinction is very important.

---

## 3. Work decomposition — “How do we break the product into work?”

These terms commonly appear in Jira, Linear, Azure DevOps, etc.

| Term             | Meaning                                                                                         | Typical size |
| ---------------- | ----------------------------------------------------------------------------------------------- | -----------: |
| **Epic**         | Large body of product work containing multiple stories/tasks.                                   | Weeks–months |
| **Feature**      | A coherent user-facing capability. Depending on the company, it may sit above or below an Epic. |  Days–months |
| **User Story**   | Small requirement written from a user's perspective.                                            |         Days |
| **Task**         | Concrete piece of implementation work.                                                          |   Hours–days |
| **Subtask**      | Smaller unit belonging to a task/story.                                                         |        Hours |
| **Bug / Defect** | Existing behavior that differs from expected behavior.                                          |     Variable |
| **Spike**        | Time-boxed investigation or experiment intended to reduce uncertainty.                          |   Hours–days |

A classic user-story format is:

> As a **user**, I want **some capability**, so that **I receive some benefit**.

For example:

> As a customer, I want to reset my password so that I can regain access to my account.

The format itself matters less than expressing **actor + need + value** clearly.

---

## 4. AC — “What does success look like?”

**AC = Acceptance Criteria.**

Acceptance Criteria are specific conditions that must be satisfied for a requirement or user story to be considered correct.

For the password-reset story:

| Acceptance Criterion                                       |
| ---------------------------------------------------------- |
| User can request a reset using a registered email address. |
| A reset link is sent by email.                             |
| Reset links expire after 30 minutes.                       |
| A used reset link cannot be reused.                        |
| The new password must satisfy the password policy.         |

ACs remove ambiguity between product, engineering, QA, and design.

You'll sometimes see AC written using **Given / When / Then**:

> **Given** I have a valid reset link
> **When** I enter a valid new password
> **Then** my password is changed.

This style comes from **BDD — Behavior-Driven Development**.

---

# 5. Specifications — “Exactly how should this work?”

**Spec** is an overloaded word. It simply means **specification**, but the type matters.

| Document                       | Meaning                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Product Spec**               | Detailed definition of product behavior. Often overlaps with a PRD.                                      |
| **Functional Spec**            | Precise description of functionality and expected behavior.                                              |
| **Technical Spec / Tech Spec** | Engineering-oriented explanation of how something will be implemented.                                   |
| **Design Spec**                | Detailed UX/UI behavior, states, interactions, and visual requirements.                                  |
| **API Spec**                   | Contract describing an API: endpoints, parameters, schemas, errors, authentication, etc.                 |
| **Data Spec**                  | Definition of data structures, fields, semantics, constraints, events, etc.                              |
| **SRS**                        | **Software Requirements Specification**. Formal document containing comprehensive software requirements. |

There is no universal distinction between **PRD**, **Product Spec**, and **Functional Spec**. Companies often define these differently.

A reasonable interpretation is:

**PRD = what + why**
**Functional Spec = exact behavior**
**Technical Spec = how engineering will implement it**

---

# 6. Engineering design — “How will we build it?”

This is where engineering-specific documents become important.

| Term           | Meaning                                                                                                             | Main question                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Design Doc** | Engineering proposal describing architecture, components, tradeoffs, alternatives, risks, etc.                      | How should we design this system?        |
| **Tech Spec**  | Detailed technical implementation specification.                                                                    | How exactly will we implement it?        |
| **RFC**        | **Request for Comments**. Proposal circulated for technical discussion and feedback before a decision is finalized. | What approach should we agree on?        |
| **ADR**        | **Architecture Decision Record**. Short record documenting an important technical decision and why it was made.     | What did we decide, and why?             |
| **PoC**        | **Proof of Concept**. Small implementation proving that an idea or technology is feasible.                          | Can this approach actually work?         |
| **Prototype**  | Early model used to explore behavior/design.                                                                        | What would this solution look/feel like? |

### RFC vs ADR

This distinction is especially useful.

An **RFC** is usually written **before the decision**:

> “We propose replacing REST communication between these services with gRPC. Here are the options and tradeoffs. Please review.”

An **ADR** records the decision **afterwards**:

> **Decision:** Use gRPC.
> **Context:** We need strongly typed service contracts.
> **Alternatives:** REST, GraphQL.
> **Consequences:** Additional tooling and operational complexity.

So:

**RFC = discussion / proposal**

**ADR = historical decision record**

---

# 7. Architecture documentation

| Term                       | Meaning                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Architecture Diagram**   | Visual representation of systems, services, dependencies, infrastructure, or data flows.     |
| **System Context Diagram** | High-level view showing the system and external actors/systems interacting with it.          |
| **Component Diagram**      | Shows internal components and relationships.                                                 |
| **Sequence Diagram**       | Shows interactions between components over time.                                             |
| **ERD**                    | **Entity Relationship Diagram**. Describes database entities/tables and their relationships. |
| **Data Flow Diagram**      | Shows how information moves through the system.                                              |
| **C4 Model**               | Architecture documentation model using Context, Container, Component, and Code views.        |

A very common engineering documentation stack is:

**Architecture overview → Design Doc → ADRs → API/Data Specs**

---

# 8. API and interface documentation

| Term             | Meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **API Contract** | Agreed interface between systems.                                                                  |
| **OpenAPI Spec** | Machine-readable specification describing HTTP APIs; historically associated with Swagger.         |
| **Schema**       | Formal structure describing data: fields, types, constraints, etc.                                 |
| **IDL**          | **Interface Definition Language**. Machine-readable interface definition, common with RPC systems. |
| **Protocol**     | Rules governing communication between systems.                                                     |
| **Interface**    | Boundary through which systems/components interact.                                                |

The key concept here is the **contract**.

If Service A sends:

```text
POST /users

{
  "name": "Alice"
}
```

and Service B promises:

```text
201 Created

{
  "id": "123"
}
```

that behavior forms part of their contract.

---

# 9. Validation — “How do we know it's correct?”

| Term          | Meaning                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Test Plan** | Defines what will be tested, how, and under which conditions.                                  |
| **Test Case** | Specific inputs, actions, and expected results used to verify behavior.                        |
| **AC**        | Acceptance Criteria defining what the feature must satisfy.                                    |
| **DoD**       | **Definition of Done**. Shared checklist defining when work is considered completed.           |
| **QA**        | **Quality Assurance**. Processes for ensuring product/software quality.                        |
| **UAT**       | **User Acceptance Testing**. Validation that the product satisfies business/user requirements. |

**AC and DoD are different.**

Acceptance Criteria belong to a **specific feature/story**:

> Password reset link expires after 30 minutes.

Definition of Done applies broadly to work:

> Code reviewed
> Tests passing
> Documentation updated
> Monitoring added
> Deployed to staging

---

# 10. Delivery and change documentation

| Term                  | Meaning                                                               |
| --------------------- | --------------------------------------------------------------------- |
| **PR / Pull Request** | Proposed code changes submitted for review before being merged.       |
| **Code Review**       | Peer review of source-code changes.                                   |
| **Commit**            | Recorded change in version control.                                   |
| **Changelog**         | Chronological record of changes to software.                          |
| **Release Notes**     | User- or stakeholder-facing description of what changed in a release. |
| **Migration Plan**    | Describes how to move from an old system/version/state to a new one.  |
| **Rollout Plan**      | Describes how a feature will gradually be released.                   |
| **Rollback Plan**     | Procedure for reverting a release if something goes wrong.            |

Note that **PR** can unfortunately mean both:

**PR = Pull Request** in engineering
**PRD = Product Requirements Document** in product

Context usually makes it obvious.

---

# 11. Production and operations — “How do we run this?”

| Term                | Meaning                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Runbook**         | Step-by-step operational instructions for handling known situations.                     |
| **Playbook**        | Broader operational guidance for responding to classes of situations.                    |
| **SOP**             | **Standard Operating Procedure**. Formal procedure for recurring operational activities. |
| **SLA**             | **Service Level Agreement**. Contractual commitment about service performance.           |
| **SLO**             | **Service Level Objective**. Internal target for reliability/performance.                |
| **SLI**             | **Service Level Indicator**. Actual metric used to measure service behavior.             |
| **Incident Report** | Record of a production incident and its response.                                        |
| **Postmortem**      | Analysis of an incident: impact, timeline, causes, lessons, and follow-up actions.       |
| **RCA**             | **Root Cause Analysis**. Investigation into the underlying causes of a failure.          |

The SRE relationship is particularly worth remembering:

**SLI = measurement**

**SLO = target**

**SLA = promise**

For example:

**SLI:** 99.93% availability last month
**SLO:** target ≥ 99.9%
**SLA:** customer contract guarantees ≥ 99.5%

---

# 12. One example from beginning to end

Imagine your company wants to introduce **passwordless login**.

The documentation flow could look like this:

**Initiative**

> Improve authentication experience.

↓

**PRD**

Explains the user problem, goals, metrics, scope, target users, and passwordless-login requirements.

↓

**Epic**

> Passwordless authentication

↓

**User Story**

> As a user, I want to log in using a magic link so that I don't need to remember a password.

↓

**FR**

> The system must allow users to request a magic login link.

↓

**NFR**

> 99% of magic-link emails must be generated within 2 seconds.

↓

**AC**

> Links expire after 15 minutes.
> Links can only be used once.
> Invalid links show an appropriate error.

↓

**RFC**

Engineering proposes three approaches:

> JWT links vs database-backed tokens vs third-party authentication provider.

↓

**Design Doc / Tech Spec**

Explains:

```text
Web App
   ↓
Auth API
   ↓
Token Service
   ↓
Database
   ↓
Email Service
```

↓

**ADR**

Records:

> We chose database-backed one-time tokens because immediate revocation is required.

↓

**Tasks**

> Implement token endpoint
> Implement token storage
> Add email template
> Implement frontend flow
> Add metrics
> Add tests

↓

**PRs**

Engineers submit code for review.

↓

**Test Plan**

QA verifies normal, expired, reused, malformed, and malicious links.

↓

**Runbook**

Explains what to investigate if magic-link delivery failures spike.

↓

**Postmortem**

If an outage occurs later, the team records what happened, why, and what must change.

---
